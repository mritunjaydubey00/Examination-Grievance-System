import { supabase } from "../lib/supabase.js";

const BUCKET = "grievance-documents";
const THREAD_ATTACHMENT_BUCKET = "grievance-thread-attachments";
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

function throwIfError({ data, error }) {
  if (error) throw error;
  return data;
}

export async function listGrievances() {
  const { data, error } = await supabase
    .from("grievances")
    .select("*, users!grievances_student_user_id_fkey(\"Full Name\", Branch), grievance_events(*)")
    .order("created_at", { ascending: false });
  return throwIfError({ data, error });
}

export async function listStudentGrievances(userId) {
  const { data, error } = await supabase.from("grievances")
    .select("*, grievance_events(*)").eq("student_user_id", userId)
    .order("created_at", { ascending: false });
  return throwIfError({ data, error });
}

export async function listAssignedGrievances(userIds) {
  const identities = [...new Set(
    (Array.isArray(userIds) ? userIds : [userIds])
      .flatMap((userId) => {
        const identity = String(userId || "").trim();
        return identity ? [identity, identity.toLowerCase()] : [];
      }),
  )];

  if (identities.length === 0) {
    throw new Error("Could not determine your staff account identity.");
  }

  const { data, error } = await supabase.from("grievances")
    .select('*, users!grievances_student_user_id_fkey("Full Name", Branch, Department), grievance_events(*)')
    .in("assigned_faculty_user_id", identities)
    .order("created_at", { ascending: false });
  return throwIfError({ data, error });
}

export async function listAssignableUsers(searchTerm = "") {
  const columns = [
    "account_identifier",
    "email",
    '"Full Name"',
    '"Ex Factor"',
    "Department",
  ].join(", ");
  const roles = ["Teaching Staff", "Teaching staff", "Examination Cell"];
  const search = String(searchTerm || "").trim();

  function buildQuery() {
    return supabase
      .from("users")
      .select(columns)
      .in('"Ex Factor"', roles)
      .limit(50);
  }

  if (!search) {
    const { data, error } = await buildQuery().order("Full Name");
    return throwIfError({ data, error });
  }

  const pattern = `%${search.replace(/[\\%_*]/g, "\\$&")}%`;
  const results = await Promise.all(
    ['"Full Name"', "email", "Department"].map((column) =>
      buildQuery().ilike(column, pattern),
    ),
  );
  const users = new Map();
  for (const result of results) {
    for (const user of throwIfError(result) || []) {
      users.set(user.account_identifier, user);
    }
  }
  return [...users.values()].sort((left, right) =>
    (left["Full Name"] || "").localeCompare(right["Full Name"] || ""),
  );
}

export async function createGrievance({ userId, subject, description, category, problemType, files }) {
  const paths = [];
  for (const file of files) {
    const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, file);
    if (error) throw error;
    paths.push({ path, name: file.name, type: file.type, size: file.size });
  }
  const { data: grievance, error } = await supabase.from("grievances").insert({
    student_user_id: userId,
    subject: subject.trim(), description: description.trim(),
    problem_category: category, problem_type: problemType,
    supporting_documents: paths,
  }).select().single();
  if (error) {
    await Promise.all(paths.map(({ path }) => supabase.storage.from(BUCKET).remove([path])));
    throw error;
  }
  return grievance;
}

export async function getGrievanceThread(grievanceId) {
  const { data: grievance, error: grievanceError } = await supabase
    .from("grievances")
    .select("*")
    .eq("id", grievanceId)
    .maybeSingle();
  if (grievanceError) throw grievanceError;
  if (!grievance) throw new Error("This grievance is not available to your account.");

  const { data: events, error: eventsError } = await supabase
    .from("grievance_events")
    .select("*")
    .eq("grievance_id", grievanceId)
    .order("created_at", { ascending: true });
  if (eventsError) throw eventsError;

  const eventIds = (events || []).map((event) => event.id);
  let recipients = [];
  if (eventIds.length) {
    const { data, error } = await supabase
      .from("grievance_event_recipients")
      .select("event_id, recipient_display_name")
      .in("event_id", eventIds);
    if (error) throw error;
    recipients = data || [];
  }

  const recipientsByEvent = new Map();
  for (const recipient of recipients) {
    const existing = recipientsByEvent.get(recipient.event_id) || [];
    existing.push(recipient);
    recipientsByEvent.set(recipient.event_id, existing);
  }

  return {
    grievance,
    events: (events || []).map((event) => ({
      ...event,
      recipients: recipientsByEvent.get(event.id) || [],
    })),
  };
}

export async function addGrievanceRemark({ grievanceId, notes }) {
  const { data, error } = await supabase.rpc("add_grievance_remark", {
    target_grievance_id: grievanceId,
    action_remark: notes.trim(),
  });
  if (error) throw error;
  return data;
}

export async function addGrievanceRemarkWithAttachments({
  grievanceId,
  userId,
  notes,
  files = [],
}) {
  const uploaded = [];
  try {
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "";
      const contentType =
        (ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.type) ||
        ATTACHMENT_TYPE_BY_EXTENSION[extension] ||
        "";
      if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
        throw new Error(`“${file.name}” is not a supported document type.`);
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        throw new Error(`“${file.name}” exceeds the 10 MB per-file limit.`);
      }

      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const path = `${grievanceId}/${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from(THREAD_ATTACHMENT_BUCKET)
        .upload(path, file, { contentType });
      if (uploadError) throw uploadError;
      uploaded.push({
        path,
        name: file.name,
        type: contentType,
        size: file.size,
      });
    }

    const { data, error } = await supabase.rpc(
      "add_grievance_remark_with_attachments",
      {
        target_grievance_id: grievanceId,
        action_remark: notes.trim(),
        target_attachments: uploaded,
      },
    );
    if (error) throw error;
    return data;
  } catch (error) {
    if (uploaded.length) {
      const { error: cleanupError } = await supabase.storage
        .from(THREAD_ATTACHMENT_BUCKET)
        .remove(uploaded.map(({ path }) => path));
      if (cleanupError) {
        throw new Error(
          `${error.message || "Could not post your remark."} Uploaded files could not be removed: ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
}

export async function getThreadAttachmentUrl(path) {
  const { data, error } = await supabase.storage
    .from(THREAD_ATTACHMENT_BUCKET)
    .createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function updateGrievance({
  grievance,
  action,
  faculty,
  notes,
  dueDate,
  priority,
}) {
  if (grievance.resolution_pending) {
    throw new Error(
      "This grievance is awaiting student confirmation of the proposed resolution.",
    );
  }

  if (action === "forward" && dueDate) {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    if (dueDate < today) {
      throw new Error("Due date cannot be in the past.");
    }
  }

  if (action === "remark") {
    return addGrievanceRemark({ grievanceId: grievance.id, notes });
  }

  if (action === "resolve") {
    const { data, error } = await supabase.rpc(
      "examination_cell_grievance_action",
      {
        target_grievance_id: grievance.id,
        requested_action: action,
        action_remark: notes.trim(),
      },
    );
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.rpc("assign_grievance", {
    target_grievance_id: grievance.id,
    target_faculty_user_id: faculty.account_identifier,
    requested_due_date: dueDate || null,
    requested_priority: priority,
    action_remark: notes.trim(),
  });
  if (error) throw error;
  return data;
}

export async function confirmGrievanceResolution(grievanceId) {
  const { error } = await supabase.rpc("confirm_grievance_resolution", {
    target_grievance_id: grievanceId,
  });
  if (error) throw error;
}

export async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
