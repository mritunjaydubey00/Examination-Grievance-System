import { supabase } from "../lib/supabase.js";

const PROFILE_KEY = "exgrev.profile";
const PROFILE_VERSION = 3;

function normalizeUserRole(value) {
  const role = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  if (role === "student") return "student";
  if (
    ["examination cell", "exam cell", "admin", "exam cell admin"].includes(role)
  ) {
    return "examination cell";
  }
  if (["teaching staff", "teaching", "faculty"].includes(role)) {
    return "teaching staff";
  }
  return "";
}

export async function authenticateUser(identifier, password) {
  const loginIdentifier = String(identifier ?? "").trim();
  const { data, error } = await supabase.functions.invoke("login-by-user-id", {
    body: { identifier: loginIdentifier, password },
  });

  if (error) {
    if (error.context?.status === 404) {
      return {
        user: null,
        error:
          "The login function is not deployed to this Supabase project yet.",
      };
    }

    let responseBody;
    try {
      responseBody = await error.context?.clone?.().json();
    } catch {
      responseBody = null;
    }

    if (responseBody?.error && responseBody?.code !== "INVALID_CREDENTIALS") {
      return { user: null, error: responseBody.error };
    }
    if (!error.context) {
      return {
        user: null,
        error:
          "Could not reach the login function. Check your connection and Supabase project settings.",
      };
    }
    return { user: null, error: "Invalid User ID/email or password." };
  }

  if (!data?.session || !data?.profile) {
    return { user: null, error: "Invalid User ID/email or password." };
  }

  const role = normalizeUserRole(data.profile.role);
  if (!role) {
    return {
      user: null,
      error:
        "This account has no valid Ex Factor. Contact the administrator to set it to Student, Examination Cell, or Teaching staff.",
    };
  }

  const { error: sessionError } = await supabase.auth.setSession(data.session);
  if (sessionError) {
    return {
      user: null,
      error: "Unable to start your session. Please try again.",
    };
  }

  const profile = { ...data.profile, role };
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return { user: profile, error: null };
}

export async function getAuthenticatedProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  let appMetadata = sessionData.session.user.app_metadata ?? {};
  if (appMetadata.exgrev_profile_version !== PROFILE_VERSION) {
    const { data, error } = await supabase.functions.invoke(
      "resolve-authenticated-profile",
    );
    if (error) {
      let responseBody;
      try {
        responseBody = await error.context?.clone?.().json();
      } catch {
        responseBody = null;
      }
      throw new Error(
        responseBody?.error ||
          "Unable to verify your ExGrev account. Please try again.",
      );
    }
    if (!data?.profile) {
      throw new Error(
        "This Google account is not approved for ExGrev. Contact your administrator.",
      );
    }

    const { data: refreshedSession, error: refreshError } =
      await supabase.auth.refreshSession();
    if (refreshError || !refreshedSession.session) {
      throw new Error("Unable to start your session. Please try again.");
    }
    appMetadata = refreshedSession.session.user.app_metadata ?? {};
  }

  if (!appMetadata.user_id) {
    throw new Error("Unable to load your ExGrev account profile.");
  }
  const profile = {
    userId: appMetadata.user_id,
    name: appMetadata.full_name,
    department: appMetadata.department,
    branch: appMetadata.branch,
    role: normalizeUserRole(appMetadata.role),
    mustChangePassword:
      sessionData.session.user.user_metadata?.must_change_password === true,
  };
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
      queryParams: { prompt: "select_account" },
    },
  });
  return { error: error?.message ?? null };
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    String(email ?? "").trim(),
    {
      redirectTo: `${window.location.origin}${window.location.pathname}`,
    },
  );
  if (error) throw error;
}

async function saveNewPassword(password) {
  const { error } = await supabase.auth.updateUser({
    password,
    data: { must_change_password: false },
  });
  if (error) throw error;
  const storedProfile = sessionStorage.getItem(PROFILE_KEY);
  const profile = storedProfile ? JSON.parse(storedProfile) : {};
  const updatedProfile = { ...profile, mustChangePassword: false };
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(updatedProfile));
  return updatedProfile;
}

export async function changePassword(password) {
  return saveNewPassword(password);
}

export async function resetPassword(password) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) {
    throw new Error("This password reset link is invalid or has expired.");
  }
  await saveNewPassword(password);
}

export async function changeSignedInPassword(currentPassword, newPassword) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const currentUser = data.session?.user;
  if (!currentUser?.email) {
    throw new Error("Your session has expired. Sign in again to continue.");
  }

  const { data: verified, error: verificationError } =
    await supabase.auth.signInWithPassword({
      email: currentUser.email,
      password: currentPassword,
    });
  if (
    verificationError ||
    !verified.user ||
    verified.user.id !== currentUser.id
  ) {
    throw new Error("The current password is incorrect.");
  }

  return saveNewPassword(newPassword);
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  sessionStorage.removeItem(PROFILE_KEY);
}
