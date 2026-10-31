import { supabase } from "../lib/supabase.js";

const CONTENT_TYPES = new Set(["notice", "guideline"]);
const CONTENT_COLUMNS =
  "id, content_type, title, body, is_published, created_at, updated_at";

function assertContentType(contentType) {
  if (!CONTENT_TYPES.has(contentType)) {
    throw new Error("Choose a valid notice or guideline type.");
  }
}

function throwIfError({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listPortalContent(
  contentType,
  { includeUnpublished = false, limit } = {},
) {
  assertContentType(contentType);

  let query = supabase
    .from("portal_content")
    .select(CONTENT_COLUMNS)
    .eq("content_type", contentType)
    .order("created_at", { ascending: false });

  if (!includeUnpublished) {
    query = query.eq("is_published", true);
  }
  if (Number.isInteger(limit) && limit > 0) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  return throwIfError({ data, error });
}

export async function savePortalContent({
  id,
  contentType,
  title,
  body,
}) {
  assertContentType(contentType);
  const normalizedTitle = String(title || "").trim();
  const normalizedBody = String(body || "").trim();

  if (normalizedTitle.length < 3 || normalizedTitle.length > 180) {
    throw new Error("Title must be between 3 and 180 characters.");
  }
  if (!normalizedBody || normalizedBody.length > 10000) {
    throw new Error("Content must be between 1 and 10,000 characters.");
  }

  const values = { title: normalizedTitle, body: normalizedBody };
  const query = id
    ? supabase.from("portal_content").update(values).eq("id", id)
    : supabase.from("portal_content").insert({
        ...values,
        content_type: contentType,
        is_published: true,
      });
  const { data, error } = await query
    .select(CONTENT_COLUMNS)
    .single();
  return throwIfError({ data, error });
}

export async function setPortalContentPublished(id, isPublished) {
  const { data, error } = await supabase
    .from("portal_content")
    .update({ is_published: Boolean(isPublished) })
    .eq("id", id)
    .select(CONTENT_COLUMNS)
    .single();
  return throwIfError({ data, error });
}

export async function deletePortalContent(id) {
  const { error } = await supabase
    .from("portal_content")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export function subscribeToPortalContent(channelName, onChange) {
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "portal_content" },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
