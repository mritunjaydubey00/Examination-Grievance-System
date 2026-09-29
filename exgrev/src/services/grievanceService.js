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

export async function listAssignedGrievances(userId) {
  const { data, error } = await supabase.from("grievances")
    .select("*, grievance_events(*)").eq("assigned_faculty_user_id", userId)
    .order("created_at", { ascending: false });
  return throwIfError({ data, error });
}

export async function listAssignableUsers() {
  const { data, error } = await supabase.from("users")
    .select('"User ID", "Full Name", "Ex Factor", Department')
    .in('"Ex Factor"', ["Teaching staff", "Examination Cell"])
    .order("Full Name");
  return throwIfError({ data, error });
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

export async function updateGrievance({ grievance, action, userId, faculty, notes, dueDate, priority }) {
  const updates = action === "resolve"
    ? { status: "Resolved", resolution_remark: notes.trim() }
    : { status: "In Progress", assigned_faculty_user_id: faculty["User ID"], assigned_faculty: faculty["Full Name"], due_date: dueDate || null, priority };
  const { data, error } = await supabase.from("grievances").update(updates)
    .eq("id", grievance.id).select().single();
  if (error) throw error;
  const details = action === "resolve" ? { remark: notes.trim() } : {
    assigned_user_id: faculty["User ID"], assigned_name: faculty["Full Name"],
    due_date: dueDate || null, priority, note: notes.trim() || null,
  };
  const { error: eventError } = await supabase.from("grievance_events").insert({
    grievance_id: grievance.id, actor_user_id: userId,
    event_type: action === "resolve" ? "resolved" : grievance.assigned_faculty_user_id ? "reassigned" : "forwarded", details,
  });
  if (eventError) throw eventError;
  return data;
}

export async function getDocumentUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (error) throw error;
  return data.signedUrl;
}
