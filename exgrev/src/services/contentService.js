import { supabase } from "../lib/supabase.js";

export async function listContent(type) {
  const table = type === "guideline" ? "guidelines" : "notices";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listAllContent(type) {
  const table = type === "guideline" ? "guidelines" : "notices";
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveContent({ type, id, title, content, attachmentUrl = null, isActive = true }) {
  const table = type === "guideline" ? "guidelines" : "notices";
  const row = {
    title: title.trim(),
    content: content.trim(),
    attachment_url: attachmentUrl,
    is_active: isActive,
  };
  if (!row.title || !row.content) throw new Error("Title and content are required.");

  const query = id
    ? supabase.from(table).update(row).eq("id", id).select().single()
    : supabase.from(table).insert(row).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteContent({ type, id }) {
  const table = type === "guideline" ? "guidelines" : "notices";
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function uploadContentAttachment({ type, file }) {
  if (!file) return null;
  const allowed = new Set(["application/pdf", "image/png", "image/jpeg"]);
  if (!allowed.has(file.type)) throw new Error("Only PDF, PNG, or JPG files are supported.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Attachment must be 10 MB or smaller.");
  const bucket = type === "guideline" ? "guidelines" : "notices";
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl || null;
}
