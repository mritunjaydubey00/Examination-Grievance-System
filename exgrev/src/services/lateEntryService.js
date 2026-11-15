import { supabase } from "../lib/supabase.js";

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const ATTACHMENT_TYPE_BY_EXTENSION = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function throwIfLateEntryApiMissing(error, operation) {
  const message = String(error?.message || "");
  const code = String(error?.code || "");
  const details = [error?.details, error?.hint].filter(Boolean).join(" ");

  if (
    (code === "42P01" || code === "PGRST205") &&
    /late_entry_(requests|exam_schedules|qr_sessions|events)/i.test(
      `${message} ${details}`,
    )
  ) {
    throw new Error(
      `Supabase could not find a late-entry table while ${operation} (${code}). Confirm the app's VITE_SUPABASE_URL is the project where the late-entry migrations were run, and verify that project exposes the table in its API schema. ${message}`,
    );
  }

  if (code === "PGRST202") {
    throw new Error(
      `Supabase could not resolve the late-entry API operation "${operation}" (${code}). This indicates an RPC name/signature or API schema-cache mismatch, not a missing table. Confirm the browser is using the intended Supabase project, then inspect the RPC named in this error. ${message}${details ? ` ${details}` : ""}`,
    );
  }

  throw error;
}

function sanitizeFileDetails(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  const contentType =
    (ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.type) ||
    ATTACHMENT_TYPE_BY_EXTENSION[extension] ||
    "";

  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
    throw new Error(`“${file.name}” is not a supported document type.`);
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    throw new Error(`“${file.name}” exceeds the 10 MB file size limit.`);
  }

  return {
    name: file.name,
    type: contentType,
    size: file.size,
  };
}

export async function getStudentProfileSnapshot(userId) {
  const { data, error } = await supabase
    .from("users")
    .select(
      '"User ID", "Full Name", "Ex Factor", Department, Branch, email, "Phone Number", account_identifier',
    )
    .eq("account_identifier", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Your ExGrev student profile could not be found.");
  if (String(data["Ex Factor"] || "").trim().toLowerCase() !== "student") {
    throw new Error("Only authenticated student profiles can submit this request.");
  }
  return data;
}

export async function listExamSchedulesForStudent({ department, branch }) {
  const { data, error } = await supabase
    .from("late_entry_exam_schedules")
    .select("*")
    .eq("is_published", true)
    .eq("department", department)
    .order("exam_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throwIfLateEntryApiMissing(error, "loading student exam schedules");

  return (data || []).filter(
    (schedule) =>
      !schedule.branch ||
      String(schedule.branch).trim().toLowerCase() ===
        String(branch || "").trim().toLowerCase(),
  );
}

export async function listExamSchedulesForExamCell() {
  const { data, error } = await supabase
    .from("late_entry_exam_schedules")
    .select("*")
    .order("exam_date", { ascending: true })
    .order("start_time", { ascending: true });
  if (error) throwIfLateEntryApiMissing(error, "loading Examination Cell exam schedules");
  return data || [];
}

export async function listStudentDepartments() {
  const { data, error } = await supabase
    .from("users")
    .select("Department, Branch")
    .eq('"Ex Factor"', "Student")
    .not("Department", "is", null);
  if (error) throw error;

  const departments = new Map();
  for (const student of data || []) {
    const department = String(student.Department || "").trim();
    const branch = String(student.Branch || "").trim();
    if (department) {
      const key = `${department.toLowerCase()}|${branch.toLowerCase()}`;
      departments.set(key, { department, branch });
    }
  }
  return [...departments.values()].sort((left, right) =>
    `${left.department} ${left.branch}`.localeCompare(
      `${right.department} ${right.branch}`,
    ),
  );
}

export async function createExamSchedule({
  department,
  branch,
  examType,
  courseName,
  courseCode,
  examDate,
  startTime,
}) {
  const { data, error } = await supabase
    .from("late_entry_exam_schedules")
    .insert({
      department: String(department || "").trim(),
      branch: String(branch || "").trim() || null,
      exam_type: String(examType || "").trim(),
      course_name: String(courseName || "").trim(),
      course_code: String(courseCode || "").trim(),
      exam_date: examDate,
      start_time: startTime,
    })
    .select()
    .single();
  if (error) throwIfLateEntryApiMissing(error, "creating an exam schedule");
  return data;
}

export async function createLateEntryRequest({
  userId,
  scheduleId,
  reason,
  files = [],
}) {
  if (!userId || !scheduleId || !String(reason || "").trim()) {
    throw new Error("Please provide a valid reason for your late arrival.");
  }

  const uploadedDocuments = [];
  try {
    for (const file of files) {
      const validated = sanitizeFileDetails(file);
      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      if (supabase?.storage) {
        const { error } = await supabase.storage
          .from("late-entry-documents")
          .upload(path, file, { contentType: validated.type });
        if (error) throw error;
      }
      uploadedDocuments.push({
        path,
        name: file.name,
        type: validated.type,
        size: validated.size,
      });
    }

    try {
      const { data, error } = await supabase
        .from("late_entry_requests")
        .insert({
          schedule_id: scheduleId,
          reason: String(reason).trim(),
          supporting_documents: uploadedDocuments,
        })
        .select()
        .single();

      if (error) throwIfLateEntryApiMissing(error, "submitting a late-entry request");
      return data;
    } catch (error) {
      throwIfLateEntryApiMissing(error, "submitting a late-entry request");
    }
  } catch (error) {
    if (uploadedDocuments.length) {
      const { error: cleanupError } = await supabase.storage
        .from("late-entry-documents")
        .remove(uploadedDocuments.map(({ path }) => path));
      if (cleanupError) {
        throw new Error(
          `${error.message || "Could not submit the late-entry request."} Uploaded documents could not be removed: ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
}

export async function listLateEntryRequestsForStudent(userId) {
  const { data, error } = await supabase
    .from("late_entry_requests")
    .select("*, late_entry_exam_schedules(*)")
    .eq("student_user_id", userId)
    .order("requested_at", { ascending: false });
  if (error) throwIfLateEntryApiMissing(error, "loading your late-entry requests");
  return data || [];
}

export async function listLateEntryRequestsForExamCell() {
  const { data, error } = await supabase
    .from("late_entry_requests")
    .select("*, late_entry_exam_schedules(*)")
    .order("requested_at", { ascending: false });
  if (error) throwIfLateEntryApiMissing(error, "loading Examination Cell late-entry requests");
  return data || [];
}

export async function updateLateEntryRequestStatus({
  requestId,
  status,
  decisionReason,
}) {
  const { data, error } = await supabase.rpc("decide_late_entry_request", {
    p_request_id: requestId,
    p_decision: status,
    p_reason: decisionReason || null,
  });
  if (error) throwIfLateEntryApiMissing(error, "deciding a late-entry request");
  return data;
}

export async function createLateEntrySession({ requestId }) {
  const { data, error } = await supabase.rpc(
    "create_late_entry_qr_session",
    { p_request_id: requestId },
  );
  if (error) throwIfLateEntryApiMissing(error, "creating the approved entry pass");
  return data;
}

export async function getLateEntryQRCodeToken(sessionId) {
  const { data, error } = await supabase.rpc("get_late_entry_qr_token", {
    p_session_id: sessionId,
  });
  if (error) throwIfLateEntryApiMissing(error, "refreshing the approved entry pass");
  return data;
}

export async function verifyLateEntryQRCode(payload) {
  const { data, error } = await supabase.rpc("verify_late_entry_qr", {
    p_payload: payload,
  });
  if (error) throwIfLateEntryApiMissing(error, "verifying the entry pass");
  return data;
}
