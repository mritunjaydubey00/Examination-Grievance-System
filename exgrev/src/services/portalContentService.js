import { supabase } from "../lib/supabase.js";

const CONTENT_CONFIG = {
  notices: { bucket: "notices", table: "notices" },
  guidelines: { bucket: "guidelines", table: "guidelines" },
};
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/png", "image/jpeg"]);
const TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

function getConfig(kind) {
  const config = CONTENT_CONFIG[kind];
  if (!config) throw new Error("Unknown portal content type.");
  return config;
}

function safeFileName(name) {
  return name.replace(/[^\w.-]/g, "_");
}

export async function listPortalContent(
  kind,
  { includeInactive = false, limit = 20 } = {},
) {
  const { bucket, table } = getConfig(kind);
  let query = supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!includeInactive) {
    query = query.eq("is_active", true);
    if (kind === "notices") {
      query = query.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return Promise.all(
    (data || []).map(async (item) => {
      if (!item.attachment_url) {
        return { ...item, attachment_signed_url: null };
      }
      const { data: signedUrl, error: signedUrlError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(item.attachment_url, 3600);
      if (signedUrlError) throw signedUrlError;
      return {
        ...item,
        attachment_signed_url: signedUrl.signedUrl,
      };
    }),
  );
}

export async function savePortalContent({
  kind,
  id,
  userId,
  title,
  content,
  isActive = true,
  expiresAt = "",
  file,
}) {
  const { bucket, table } = getConfig(kind);
  const cleanTitle = String(title || "").trim();
  const cleanContent = String(content || "").trim();
  const fileType = file
    ? file.type || TYPE_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase()]
    : null;
  if (!cleanTitle || cleanTitle.length > 200) {
    throw new Error("Enter a title of no more than 200 characters.");
  }
  if (!cleanContent) throw new Error("Content is required.");
  if (file && !ALLOWED_TYPES.has(fileType)) {
    throw new Error("Attachments must be PDF, PNG, or JPG files.");
  }
  if (file && file.size > MAX_FILE_SIZE) {
    throw new Error("Attachments must not exceed 10 MB.");
  }

  let previousPath = null;
  if (id) {
    const { data: existing, error } = await supabase
      .from(table)
      .select("attachment_url")
      .eq("id", id)
      .single();
    if (error) throw error;
    previousPath = existing.attachment_url;
  }

  let uploadedPath = null;
  let saved = false;
  try {
    if (file) {
      uploadedPath = `${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(uploadedPath, file, { contentType: fileType });
      if (error) throw error;
    }

    const values = {
      title: cleanTitle,
      content: cleanContent,
      is_active: isActive,
      ...(file ? {
        attachment_url: uploadedPath,
        attachment_name: file.name,
      } : {}),
      ...(kind === "notices"
        ? { expires_at: expiresAt ? new Date(expiresAt).toISOString() : null }
        : {}),
      ...(kind === "guidelines" && id
        ? { updated_at: new Date().toISOString() }
        : {}),
    };

    const query = id
      ? supabase.from(table).update(values).eq("id", id)
      : supabase.from(table).insert({ ...values, created_by: userId });
    const { data: savedContent, error } = await query
      .select("id")
      .single();
    if (error) throw error;
    if (!savedContent) throw new Error("Portal content was not saved.");
    saved = true;

    if (file && previousPath) {
      const { error: removeError } = await supabase.storage
        .from(bucket)
        .remove([previousPath]);
      if (removeError) {
        throw new Error(
          `Content was saved, but its previous attachment could not be removed: ${removeError.message}`,
        );
      }
    }
  } catch (error) {
    if (uploadedPath && !saved) {
      const { error: cleanupError } = await supabase.storage
        .from(bucket)
        .remove([uploadedPath]);
      if (cleanupError) {
        throw new Error(
          `${error.message || "Could not save portal content."} Uploaded file could not be removed: ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
}

export async function setPortalContentActive(kind, id, isActive) {
  const { table } = getConfig(kind);
  const { error } = await supabase
    .from(table)
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}

export async function deletePortalContent(kind, item) {
  const { bucket, table } = getConfig(kind);
  const { error } = await supabase
    .from(table)
    .delete()
    .eq("id", item.id)
    .select("id")
    .single();
  if (error) throw error;
  if (item.attachment_url) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove([item.attachment_url]);
    if (removeError) {
      throw new Error(
        `Content was deleted, but its attachment could not be removed: ${removeError.message}`,
      );
    }
  }
}
