import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return respond({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = request.headers.get("Authorization");
    if (!url || !serviceRoleKey || !authorization?.startsWith("Bearer ")) {
      return respond({ error: "Unable to verify your signed-in account." }, 401);
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const accessToken = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } =
      await admin.auth.getUser(accessToken);
    const authUser = authData.user;
    const email = authUser?.email?.trim().toLowerCase();
    if (authError || !authUser || !email || !authUser.email_confirmed_at) {
      return respond(
        { error: "Unable to verify your Google account email." },
        401,
      );
    }

    const { data: row, error: lookupError } = await admin
      .from("users")
      .select('"User ID", "Full Name", "Ex Factor", Department, Branch, email')
      .ilike("email", email.replace(/[\\%_]/g, "\\$&"))
      .maybeSingle();

    if (lookupError) {
      return respond(
        { error: "Unable to verify your account against the ExGrev user list." },
        500,
      );
    }
    if (!row) {
      return respond(
        {
          error:
            "This Google account is not approved for ExGrev. Contact your administrator.",
        },
        403,
      );
    }

    const role = normalizeUserRole(row["Ex Factor"]);
    const userId =
      role === "student"
        ? String(row["User ID"] ?? "").trim()
        : String(row.email ?? "").trim().toLowerCase();
    if (!role || !userId) {
      return respond(
        {
          error:
            "This account has no valid Ex Factor or user identity. Contact the administrator.",
        },
        403,
      );
    }

    const appMetadata = {
      ...(authUser.app_metadata ?? {}),
      exgrev_profile_version: 3,
      user_id: userId,
      full_name: row["Full Name"],
      department: row.Department,
      branch: row.Branch,
      role,
    };
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authUser.id,
      { app_metadata: appMetadata },
    );
    if (updateError) {
      return respond(
        { error: "Unable to load your ExGrev account. Please try again." },
        500,
      );
    }

    return respond({
      profile: {
        userId,
        name: row["Full Name"],
        department: row.Department,
        branch: row.Branch,
        role,
        mustChangePassword:
          authUser.user_metadata?.must_change_password === true,
      },
    });
  } catch {
    return respond(
      { error: "Unable to verify your ExGrev account. Please try again." },
      500,
    );
  }
});

function normalizeUserRole(value: unknown) {
  const role = String(value ?? "")
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

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
