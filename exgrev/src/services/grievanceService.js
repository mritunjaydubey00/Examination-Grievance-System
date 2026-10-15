import { supabase } from "../lib/supabase.js";

const BUCKET = "grievance-documents";

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
  const { error: eventError } = await supabase.from("grievance_events").insert({
    grievance_id: grievance.id, actor_user_id: userId, event_type: "submitted",
    details: { status: "New" },
  });
  if (eventError) throw eventError;
  return grievance;
}

export async function addFacultyGrievanceRemark({ grievanceId, notes }) {
  const { data, error } = await supabase.rpc(
    "teaching_staff_add_grievance_remark",
    {
      target_grievance_id: grievanceId,
      action_remark: notes.trim(),
    },
  );
  if (error) throw error;
  return data;
}

export async function updateGrievance({
  grievance,
  action,
  userId,
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

  if (action === "remark" || action === "resolve") {
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

  const { data, error } = await supabase
    .from("grievances")
    .update({
      status: "In Progress",
      assigned_faculty_user_id: faculty.account_identifier,
      assigned_faculty: faculty["Full Name"],
      due_date: dueDate || null,
      priority,
    })
    .eq("id", grievance.id).select().single();
  if (error) throw error;
  const { error: eventError } = await supabase.from("grievance_events").insert({
    grievance_id: grievance.id, actor_user_id: userId,
    event_type: grievance.assigned_faculty_user_id ? "reassigned" : "forwarded",
    details: {
      assigned_user_id: faculty.account_identifier,
      assigned_name: faculty["Full Name"],
      due_date: dueDate || null,
      priority,
      note: notes.trim() || null,
    },
  });
  if (eventError) throw eventError;
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
