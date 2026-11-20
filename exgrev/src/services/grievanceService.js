import { supabase } from "../lib/supabase.js";
import { getStudyYearFilter } from "../lib/enrollment.js";
import {
  categoryOptions,
  otherCategoryValue,
  problemTypeOptions,
} from "../data/tagOptions.js";

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

function getDateBoundary(value, offsetDays = 0) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("Enter a valid grievance date range.");
  }
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString();
}

function applyGrievanceFilters(query, filters = {}, metric = "") {
  if (filters.department) {
    query = query.eq("users.Department", filters.department);
  }
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.status && filters.status !== "ALL") {
    query = query.eq("status", filters.status);
  }
  if (filters.dateFrom) {
    query = query.gte("created_at", getDateBoundary(filters.dateFrom));
  }
  if (filters.dateTo) {
    query = query.lt("created_at", getDateBoundary(filters.dateTo, 1));
  }
  let searchConditions = "";
  if (filters.search) {
    const term = String(filters.search)
      .replace(/[^a-zA-Z0-9\s-]/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    if (term) {
      searchConditions =
        `title.ilike.%${term}%,subject.ilike.%${term}%,` +
        `grievance_code.ilike.%${term}%,student_user_id.ilike.%${term}%`;
    }
  }
  const activeCondition = "status.neq.Resolved,resolution_pending.eq.true";
  if (metric === "active" && searchConditions) {
    query = query.or(
      `and(or(${searchConditions}),or(${activeCondition}))`,
    );
  } else if (searchConditions) {
    query = query.or(searchConditions);
  } else if (metric === "active") {
    query = query.or(activeCondition);
  }
  if (filters.year) {
    const yearFilter = getStudyYearFilter(filters.year);
    if (yearFilter?.type === "unknown") {
      query = query.is("admission_year", null);
    } else if (yearFilter?.type === "before") {
      query = query.lt("admission_year", yearFilter.year);
    } else if (yearFilter?.type === "admission") {
      query = query.eq("admission_year", yearFilter.year);
    }
  }
  if (metric === "pending") {
    query = query.eq("status", "New");
  } else if (metric === "resolved") {
    query = query.eq("status", "Resolved").eq("resolution_pending", false);
  } else if (metric === "awaiting-response") {
    query = query.eq("resolution_pending", true);
  } else if (metric === "forwarded") {
    query = query
      .eq("status", "In Progress")
      .not("assigned_faculty_user_id", "is", null);
  }
  return query;
}

export async function listGrievances({
  filters = {},
  metric = "",
  page = 1,
  pageSize = 25,
} = {}) {
  let query = supabase
    .from("grievances")
    .select(
      '*, users!grievances_student_user_id_fkey!inner("Full Name", "User ID", Branch, Department), grievance_events(*)',
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  query = applyGrievanceFilters(query, filters, metric);
  const start = (page - 1) * pageSize;
  const { data, error, count } = await query.range(start, start + pageSize - 1);
  if (error) throw error;
  return { rows: data || [], count: count || 0 };
}

export async function countGrievancesByFilters(filters = {}) {
  const metrics = ["total", "pending", "resolved", "awaiting-response", "forwarded"];
  const counts = await Promise.all(
    metrics.map(async (metric) => {
      let query = supabase
        .from("grievances")
        .select(
          "id, users!grievances_student_user_id_fkey!inner(Department)",
          { count: "exact", head: true },
        );
      query = applyGrievanceFilters(query, filters, metric === "total" ? "" : metric);
      const { count, error } = await query;
      if (error) throw error;
      return [metric, count || 0];
    }),
  );
  return Object.fromEntries(counts);
}

export async function listGrievanceFilterOptions() {
  const [
    { data: users, error: usersError },
    { data: grievances, error: grievanceError },
  ] =
    await Promise.all([
      supabase
        .from("users")
        .select("Department")
        .not("Department", "is", null)
        .limit(5000),
      supabase
        .from("grievances")
        .select("admission_year, category")
        .order("admission_year", { ascending: false })
        .limit(5000),
    ]);
  if (usersError) throw usersError;
  if (grievanceError) throw grievanceError;
  return {
    departments: [...new Set(
      (users || [])
        .map(({ Department }) => String(Department || "").trim())
        .filter(Boolean),
    )].sort((left, right) => left.localeCompare(right)),
    admissionYears: [...new Set(
      (grievances || [])
        .map(({ admission_year }) => admission_year)
        .filter(Number.isInteger),
    )].sort((left, right) => right - left),
    categories: [...new Set([
      ...categoryOptions,
      ...(grievances || [])
        .map(({ category }) => String(category || "").trim())
        .filter(Boolean),
    ])],
  };
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

export async function createGrievance({
  userId,
  title,
  description,
  category,
  subCategory,
  otherText,
  files = [],
}) {
  const trimmedTitle = String(title || "").trim();
  const trimmedDescription = String(description || "").trim();
  const trimmedOtherText = String(otherText || "").trim();
  if (trimmedTitle.length < 5 || trimmedTitle.length > 200) {
    throw new Error("Problem title must contain 5–200 non-space characters.");
  }
  if (trimmedDescription.length < 20 || trimmedDescription.length > 10000) {
    throw new Error("Description must contain 20–10,000 non-space characters.");
  }
  if (
    !categoryOptions.includes(category) ||
    !problemTypeOptions[category]?.includes(subCategory)
  ) {
    throw new Error("Select a category and sub-category.");
  }
  if (trimmedOtherText.length > 500) {
    throw new Error("Other details cannot exceed 500 characters.");
  }
  if (
    (category === otherCategoryValue || subCategory === otherCategoryValue) &&
    !trimmedOtherText
  ) {
    throw new Error("Please specify the other category or sub-category.");
  }

  const paths = [];
  try {
    for (const file of files) {
      const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) throw error;
      paths.push({ path, name: file.name, type: file.type, size: file.size });
    }
    const { data: grievance, error } = await supabase.from("grievances").insert({
      student_user_id: userId,
      title: trimmedTitle,
      subject: trimmedTitle,
      description: trimmedDescription,
      category,
      sub_category: subCategory,
      other_text: trimmedOtherText || null,
      problem_category: category,
      problem_type: subCategory,
      supporting_documents: paths,
    }).select().single();
    if (error) throw error;
    return grievance;
  } catch (error) {
    if (paths.length) {
      const { error: cleanupError } = await supabase.storage
        .from(BUCKET)
        .remove(paths.map(({ path }) => path));
      if (cleanupError) {
        throw new Error(
          `${error.message || "Could not submit your grievance."} Uploaded files could not be removed: ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
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
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });
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

function getAttachmentType(file) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return (
    (ALLOWED_ATTACHMENT_TYPES.has(file.type) && file.type) ||
    ATTACHMENT_TYPE_BY_EXTENSION[extension] ||
    ""
  );
}

async function uploadThreadAttachments(grievanceId, userId, files) {
  const uploaded = [];
  try {
    for (const file of files) {
      const contentType = getAttachmentType(file);
      if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
        throw new Error(`“${file.name}” is not a supported document type.`);
      }
      if (file.size > MAX_ATTACHMENT_SIZE) {
        throw new Error(`“${file.name}” exceeds the 10 MB per-file limit.`);
      }

      const safeName = file.name.replace(/[^\w.-]/g, "_");
      const path = `${grievanceId}/${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from(THREAD_ATTACHMENT_BUCKET)
        .upload(path, file, { contentType });
      if (error) throw error;
      uploaded.push({
        path,
        name: file.name,
        type: contentType,
        size: file.size,
      });
    }
  } catch (error) {
    if (uploaded.length) {
      try {
        await removeThreadAttachments(uploaded);
      } catch (cleanupError) {
        throw new Error(
          `${error.message || "Could not upload attachments."} ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
  return uploaded;
}

async function removeThreadAttachments(attachments) {
  if (!attachments.length) return;
  const { error } = await supabase.storage
    .from(THREAD_ATTACHMENT_BUCKET)
    .remove(attachments.map(({ path }) => path));
  if (error) {
    throw new Error(`Uploaded files could not be removed: ${error.message}`);
  }
}

export async function addGrievanceRemarkWithAttachments({
  grievanceId,
  userId,
  notes,
  files = [],
}) {
  const uploaded = [];
  try {
    uploaded.push(...await uploadThreadAttachments(grievanceId, userId, files));

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
      try {
        await removeThreadAttachments(uploaded);
      } catch (cleanupError) {
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
  userId,
  files = [],
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
    const uploaded = [];
    try {
      uploaded.push(
        ...await uploadThreadAttachments(grievance.id, userId, files),
      );
      const { data, error } = await supabase.rpc(
        "examination_cell_resolve_with_attachments",
        {
          target_grievance_id: grievance.id,
          action_remark: notes.trim(),
          target_attachments: uploaded,
        },
      );
      if (error) throw error;
      return data;
    } catch (error) {
      if (uploaded.length) {
        try {
          await removeThreadAttachments(uploaded);
        } catch (cleanupError) {
          throw new Error(
            `${error.message || "Could not propose a resolution."} ${cleanupError.message}`,
          );
        }
      }
      throw error;
    }
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

export async function getActiveGroupForMaster(grievanceId) {
  const { data: group, error: groupError } = await supabase
    .from("grievance_groups")
    .select("id, name, master_grievance_id, status")
    .eq("master_grievance_id", grievanceId)
    .eq("status", "active")
    .maybeSingle();
  if (groupError) throw groupError;
  if (!group) return null;

  const { data: memberships, error: membershipError } = await supabase
    .from("grievance_group_members")
    .select("grievance_id")
    .eq("group_id", group.id)
    .eq("is_active", true);
  if (membershipError) throw membershipError;

  const memberIds = (memberships || [])
    .map(({ grievance_id }) => grievance_id)
    .filter((id) => id !== grievanceId);
  if (!memberIds.length) return { group, members: [] };

  const { data: members, error: membersError } = await supabase
    .from("grievances")
    .select("id, grievance_code, title, subject, student_user_id, status")
    .in("id", memberIds)
    .order("created_at", { ascending: true });
  if (membersError) throw membersError;
  return { group, members: members || [] };
}

export async function getGrievanceGroupForForward(groupId) {
  const { data: group, error: groupError } = await supabase
    .from("grievance_groups")
    .select("id, name, master_grievance_id, status")
    .eq("id", groupId)
    .eq("status", "active")
    .maybeSingle();
  if (groupError) throw groupError;
  if (!group) return null;

  const [{ data: master, error: masterError }, { data: memberships, error: membershipError }] =
    await Promise.all([
      supabase
        .from("grievances")
        .select("*")
        .eq("id", group.master_grievance_id)
        .maybeSingle(),
      supabase
        .from("grievance_group_members")
        .select("grievance_id")
        .eq("group_id", group.id)
        .eq("is_active", true),
    ]);
  if (masterError) throw masterError;
  if (membershipError) throw membershipError;
  if (
    master?.status !== "Resolved" ||
    !String(master.resolution_remark || "").trim()
  ) return null;

  const memberIds = (memberships || [])
    .map(({ grievance_id }) => grievance_id)
    .filter((id) => id !== group.master_grievance_id);
  const { data: members, error: membersError } = memberIds.length
    ? await supabase
        .from("grievances")
        .select("id, grievance_code, title, subject, student_user_id, status")
        .in("id", memberIds)
        .order("created_at", { ascending: true })
    : { data: [], error: null };
  if (membersError) throw membersError;
  return { group, master, members: members || [] };
}

export async function listPendingGrievanceGroups() {
  const { data: groups, error } = await supabase
    .from("grievance_groups")
    .select("id, name, master_grievance_id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!groups?.length) return [];

  const { data: masters, error: mastersError } = await supabase
    .from("grievances")
    .select("id, grievance_code, title, subject, resolution_remark, resolution_pending, status")
    .in(
      "id",
      groups.map(({ master_grievance_id }) => master_grievance_id),
    );
  if (mastersError) throw mastersError;
  const masterById = new Map((masters || []).map((master) => [master.id, master]));
  return groups
    .filter(({ master_grievance_id }) => {
      const master = masterById.get(master_grievance_id);
      return (
        master?.status === "Resolved" &&
        Boolean(String(master.resolution_remark || "").trim())
      );
    })
    .map((group) => ({ ...group, master: masterById.get(group.master_grievance_id) }));
}

export async function createGrievanceGroup({ name, masterId, grievanceIds }) {
  const { data, error } = await supabase.rpc("create_grievance_group", {
    target_name: name.trim(),
    target_master_grievance_id: masterId,
    target_grievance_ids: grievanceIds,
  });
  if (error) throw error;
  return data;
}

export async function suggestSimilarGrievances(grievanceId) {
  const { data, error } = await supabase.rpc("suggest_similar_grievances", {
    target_grievance_id: grievanceId,
  });
  if (error) throw error;
  return data || [];
}

export async function forwardGrievanceGroupSolution({
  groupId,
  memberIds,
  userId,
  masterAttachments = [],
}) {
  const uploaded = [];
  const attachmentsByGrievance = {};
  try {
    for (const grievanceId of memberIds) {
      const memberAttachments = [];
      for (const attachment of masterAttachments) {
        const { data: file, error: downloadError } = await supabase.storage
          .from(THREAD_ATTACHMENT_BUCKET)
          .download(attachment.path);
        if (downloadError) throw downloadError;

        const safeName = attachment.name.replace(/[^\w.-]/g, "_");
        const path = `${grievanceId}/${userId}/${crypto.randomUUID()}-${safeName}`;
        const contentType = getAttachmentType({
          name: attachment.name,
          type: attachment.type,
        });
        const { error: uploadError } = await supabase.storage
          .from(THREAD_ATTACHMENT_BUCKET)
          .upload(path, file, { contentType });
        if (uploadError) throw uploadError;

        const copiedAttachment = {
          path,
          name: attachment.name,
          type: contentType,
          size: file.size,
        };
        uploaded.push(copiedAttachment);
        memberAttachments.push(copiedAttachment);
      }
      attachmentsByGrievance[grievanceId] = memberAttachments;
    }

    const { data, error } = await supabase.rpc(
      "forward_grievance_group_solution",
      {
        target_group_id: groupId,
        target_member_grievance_ids: memberIds,
        target_attachments: attachmentsByGrievance,
      },
    );
    if (error) throw error;
    return data;
  } catch (error) {
    if (uploaded.length) {
      try {
        await removeThreadAttachments(uploaded);
      } catch (cleanupError) {
        throw new Error(
          `${error.message || "Could not forward the grouped solution."} ${cleanupError.message}`,
        );
      }
    }
    throw error;
  }
}

export async function listInAppNotifications(userId) {
  const { data, error } = await supabase
    .from("in_app_notifications")
    .select("id, grievance_id, title, content, created_at, read_at")
    .eq("recipient_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data || [];
}
