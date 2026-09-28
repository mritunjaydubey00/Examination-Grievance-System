import { supabase } from "../lib/supabase.js";

const PROFILE_KEY = "exgrev.profile";

export async function authenticateUser(userId, password) {
  const { data, error } = await supabase.functions.invoke("login-by-user-id", {
    body: { userId: userId.trim(), password },
  });

  if (error) {
    if (error.context?.status === 404) {
      return {
        user: null,
        error: "The login function is not deployed to this Supabase project yet.",
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
        error: "Could not reach the login function. Check your connection and Supabase project settings.",
      };
    }
    return { user: null, error: "Invalid user ID or password." };
  }

  if (!data?.session || !data?.profile) {
    return { user: null, error: "Invalid user ID or password." };
  }

  const { error: sessionError } = await supabase.auth.setSession(data.session);
  if (sessionError) {
    return { user: null, error: "Unable to start your session. Please try again." };
  }

  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(data.profile));
  return { user: data.profile, error: null };
}

export async function getAuthenticatedProfile() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const storedProfile = sessionStorage.getItem(PROFILE_KEY);
  if (storedProfile) return JSON.parse(storedProfile);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.user_metadata?.user_id) return null;
  const metadata = data.user.user_metadata;
  const profile = {
    userId: metadata.user_id,
    name: metadata.full_name,
    department: metadata.department,
    branch: metadata.branch,
    mustChangePassword: metadata.must_change_password === true,
  };
  sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export async function changePassword(password) {
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  sessionStorage.removeItem(PROFILE_KEY);
}
