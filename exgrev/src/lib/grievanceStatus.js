export function isResolutionWindowOpen(grievance, now = Date.now()) {
  const expiresAt = Date.parse(grievance?.window_expires_at || "");
  return Boolean(
    grievance?.resolution_pending &&
      Number.isFinite(expiresAt) &&
      expiresAt > now,
  );
}

export function isAutoResolved(grievance, now = Date.now()) {
  if (grievance?.auto_resolved_at) return true;
  const expiresAt = Date.parse(grievance?.window_expires_at || "");
  return Boolean(
    grievance?.resolution_pending &&
      Number.isFinite(expiresAt) &&
      expiresAt <= now,
  );
}

export function getGrievanceStatusLabel(grievance, audience = "staff") {
  if (isResolutionWindowOpen(grievance)) {
    return audience === "student"
      ? "Resolved by Exam Cell, Awaiting Your Response"
      : "Resolved, Awaiting Student Response";
  }
  if (isAutoResolved(grievance)) {
    return audience === "student" ? "Auto-Resolved" : "Closed (Auto-Resolved)";
  }
  if (grievance?.student_confirmed_at) return "Resolved (Accepted)";
  return grievance?.status || "Unknown";
}
