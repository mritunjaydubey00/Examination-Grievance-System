import {
  DEFAULT_MAJOR_EXAM_CYCLE_ID,
  MAJOR_EXAM_COURSE_OFFERINGS,
  MAJOR_EXAM_CYCLES,
  MAJOR_EXAM_MATERIALS,
  MAJOR_EXAM_SESSIONS,
} from "../data/majorExamData.js";

const normalizeText = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getCourseOfferingsForStudent = (profile, cycleId = DEFAULT_MAJOR_EXAM_CYCLE_ID) => {
  const cycle = MAJOR_EXAM_CYCLES.find((entry) => entry.id === cycleId) || MAJOR_EXAM_CYCLES[0];
  const department = profile?.department || cycle.department;
  const branch = profile?.branch || cycle.department;

  return MAJOR_EXAM_COURSE_OFFERINGS.filter(
    (course) =>
      normalizeText(course.department) === normalizeText(department) &&
      normalizeText(course.branch) === normalizeText(branch),
  );
};

export function getStudentMajorExamOverview(profile, cycleId = DEFAULT_MAJOR_EXAM_CYCLE_ID) {
  const cycle = MAJOR_EXAM_CYCLES.find((entry) => entry.id === cycleId) || MAJOR_EXAM_CYCLES[0];
  const courseOfferings = getCourseOfferingsForStudent(profile, cycleId);
  const relevantSessions = MAJOR_EXAM_SESSIONS.filter(
    (session) =>
      session.cycleId === cycle.id &&
      courseOfferings.some((course) => course.id === session.courseOfferingId),
  );

  const completedCount = relevantSessions.filter(
    (session) => session.status === "completed",
  ).length;
  const pendingCount = relevantSessions.length - completedCount;
  const eligible = relevantSessions.length > 0 && pendingCount === 0;

  const materials = relevantSessions
    .map((session) => {
      const course = courseOfferings.find(
        (offering) => offering.id === session.courseOfferingId,
      );
      return {
        ...session,
        course,
        publishedMaterials: MAJOR_EXAM_MATERIALS.filter(
          (material) =>
            material.courseOfferingId === session.courseOfferingId &&
            material.cycleId === cycle.id &&
            material.publicationStatus === "published",
        ),
      };
    })
    .filter((session) => session.course)
    .map((session) => ({
      ...session.course,
      examinationDate: session.examinationDate,
      examinationType: cycle.examinationType,
      sessionStatus: session.status,
      materials: session.publishedMaterials,
      totalQuestionPapers: session.publishedMaterials.filter(
        (material) => material.materialType === "question-paper",
      ).length,
      totalAnswerKeys: session.publishedMaterials.filter(
        (material) => material.materialType === "answer-key",
      ).length,
    }));

  return {
    cycle,
    courseOfferings,
    allSessions: relevantSessions,
    completedCount,
    pendingCount,
    totalApplicableSessions: relevantSessions.length,
    eligible,
    materials,
    message: eligible
      ? "Your Major Examination materials are available."
      : "Your Major Examination materials will become available after all your applicable Major Examinations have been completed and the examination cell publishes the materials.",
  };
}

export function getStudentCourseMaterials(profile, cycleId = DEFAULT_MAJOR_EXAM_CYCLE_ID) {
  const overview = getStudentMajorExamOverview(profile, cycleId);
  return overview.materials
    .filter((course) => course.materials.length > 0)
    .map((course) => ({
      ...course,
      questionPapers: course.materials.filter(
        (material) => material.materialType === "question-paper",
      ),
      answerKeys: course.materials.filter(
        (material) => material.materialType === "answer-key",
      ),
    }));
}

export function isMaterialAccessibleForStudent(profile, materialId, cycleId = DEFAULT_MAJOR_EXAM_CYCLE_ID) {
  const material = MAJOR_EXAM_MATERIALS.find((entry) => entry.id === materialId);
  if (!material || material.cycleId !== cycleId) {
    return { allowed: false, reason: "Material not found in the requested examination cycle." };
  }

  const studentOverview = getStudentMajorExamOverview(profile, cycleId);
  const studentCourse = studentOverview.courseOfferings.find(
    (course) => course.id === material.courseOfferingId,
  );

  if (!studentCourse) {
    return { allowed: false, reason: "This material does not belong to your verified course registrations." };
  }

  if (material.publicationStatus !== "published") {
    return { allowed: false, reason: "The material has not been published by the examination cell." };
  }

  if (!studentOverview.eligible) {
    return { allowed: false, reason: "The student has pending Major Examination obligations." };
  }

  return { allowed: true, reason: "Authorized" };
}

export function listExamCellMaterialInventory(cycleId = DEFAULT_MAJOR_EXAM_CYCLE_ID) {
  return MAJOR_EXAM_MATERIALS.filter((material) => material.cycleId === cycleId).map(
    (material) => {
      const session = MAJOR_EXAM_SESSIONS.find(
        (entry) => entry.courseOfferingId === material.courseOfferingId,
      );
      const course = MAJOR_EXAM_COURSE_OFFERINGS.find(
        (entry) => entry.id === material.courseOfferingId,
      );
      return {
        ...material,
        session,
        course,
        mapped: Boolean(course && session),
      };
    },
  );
}

export function setExaminationSessionStatus(sessionId, status) {
  const sessionIndex = MAJOR_EXAM_SESSIONS.findIndex((session) => session.id === sessionId);
  if (sessionIndex === -1) {
    return { success: false, message: "Examination session was not found." };
  }

  MAJOR_EXAM_SESSIONS[sessionIndex] = {
    ...MAJOR_EXAM_SESSIONS[sessionIndex],
    status,
  };

  return {
    success: true,
    message: `Examination status updated to ${status}.`,
    session: MAJOR_EXAM_SESSIONS[sessionIndex],
  };
}

export function toggleMaterialPublication(materialId, nextStatus = "published") {
  const materialIndex = MAJOR_EXAM_MATERIALS.findIndex(
    (material) => material.id === materialId,
  );

  if (materialIndex === -1) {
    return { success: false, message: "Material ID was not found." };
  }

  MAJOR_EXAM_MATERIALS[materialIndex] = {
    ...MAJOR_EXAM_MATERIALS[materialIndex],
    publicationStatus: nextStatus,
  };

  return {
    success: true,
    message: `Material publication status set to ${nextStatus}.`,
    material: MAJOR_EXAM_MATERIALS[materialIndex],
  };
}

export function getRoleBasedStudentSummary(profile) {
  const overview = getStudentMajorExamOverview(profile);
  return {
    department: profile?.department || "Unknown department",
    branch: profile?.branch || "Unknown branch",
    totalApplicableExaminations: overview.totalApplicableSessions,
    completedExaminations: overview.completedCount,
    remainingExaminations: overview.pendingCount,
    eligibility: overview.eligible,
  };
}
