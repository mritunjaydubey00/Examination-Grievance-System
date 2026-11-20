import { supabase } from "../lib/supabase.js";

export function validateGoogleDriveUrl(value) {
  let url;
  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw new Error("Enter a valid Google Drive link.");
  }

  const host = url.hostname.toLowerCase();
  if (!["drive.google.com", "docs.google.com"].includes(host)) {
    throw new Error("The answer-key link must be a Google Drive or Google Docs link.");
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("The answer-key link must use HTTP or HTTPS.");
  }
  return url.toString();
}

export async function listAnswerKeysForStudent({ branchCode, admissionYear }) {
  const { data, error } = await supabase
    .from("answer_keys")
    .select("*")
    .eq("branch_code", branchCode)
    .eq("admission_year", admissionYear)
    .eq("is_published", true)
    .order("semester")
    .order("subject_code");
  if (error) throw error;
  return data || [];
}

export async function listAnswerKeysForStaff() {
  const { data, error } = await supabase
    .from("answer_keys")
    .select("*")
    .order("admission_year", { ascending: false })
    .order("semester")
    .order("subject_code");
  if (error) throw error;
  return data || [];
}

export async function saveAnswerKey({
  subjectCode,
  subjectName,
  admissionYear,
  branchCode,
  branchName,
  department,
  semester,
  title,
  driveUrl,
  uploadedBy,
  isPublished,
}) {
  const normalizedDriveUrl = validateGoogleDriveUrl(driveUrl);
  const { data, error } = await supabase
    .from("answer_keys")
    .insert({
      subject_code: subjectCode.trim().toUpperCase(),
      subject_name: subjectName.trim(),
      admission_year: Number(admissionYear),
      branch_code: branchCode,
      branch_name: branchName,
      department: department?.trim() || null,
      semester: semester.trim(),
      title: title.trim(),
      drive_url: normalizedDriveUrl,
      uploaded_by: uploadedBy,
      is_published: Boolean(isPublished),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAnswerKey(id, updates) {
  const payload = { ...updates };
  if (payload.drive_url) {
    payload.drive_url = validateGoogleDriveUrl(payload.drive_url);
  }
  const { data, error } = await supabase
    .from("answer_keys")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
