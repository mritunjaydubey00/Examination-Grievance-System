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
    const { userId, password } = await request.json();
    if (
      typeof userId !== "string" ||
      typeof password !== "string" ||
      !userId.trim() ||
      !password
    ) {
      return respond({ error: "Invalid user ID or password." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(
      url,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
      },
    );
    const { data: row, error: lookupError } = await admin
      .from("users")
      .select("*")
      .eq("User ID", userId.trim())
      .maybeSingle();

    if (lookupError) {
      return respond(
        {
          code: "LOGIN_SETUP_ERROR",
          error:
            "The login function could not read the Users table. Check its secret key and column names.",
        },
        500,
      );
    }
    if (!row) return respond({ error: "Invalid user ID or password." }, 401);
    if (!row["Phone Number"] || !row.email) {
      return respond(
        {
          code: "LOGIN_SETUP_ERROR",
          error:
            "This user needs both a phone number and email in the Users table.",
        },
        500,
      );
    }

    const authClient = createClient(url, request.headers.get("apikey") ?? "", {
      auth: { persistSession: false },
    });
    let { data: authData, error: authError } =
      await authClient.auth.signInWithPassword({
        email: String(row.email),
        password,
      });

    // On first login, the phone number is the temporary password for the email-based Auth account.
    if (authError && password === String(row["Phone Number"])) {
      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: String(row.email),
          email_confirm: true,
          password,
          user_metadata: { must_change_password: true },
        });

      if (!createError && created.user) {
        ({ data: authData, error: authError } =
          await authClient.auth.signInWithPassword({
            email: String(row.email),
            password,
          }));
      }
    }

    if (authError || !authData.session || !authData.user) {
      const message = authError?.message?.toLowerCase() ?? "";
      if (
        message.includes("provider") &&
        (message.includes("disabled") || message.includes("not enabled"))
      ) {
        return respond(
          {
            code: "EMAIL_AUTH_DISABLED",
            error:
              "Enable Email password sign-in in the Supabase Auth settings.",
          },
          503,
        );
      }
      return respond({ error: "Invalid user ID or password." }, 401);
    }

    const profileMetadata = {
      ...(authData.user.user_metadata ?? {}),
      user_id: row["User ID"],
      full_name: row["Full Name"],
      department: row.Department,
      branch: row.Branch,
      role: row["Ex Factor"] ?? "",
    };
    const { error: metadataError } = await admin.auth.admin.updateUserById(
      authData.user.id,
      {
        user_metadata: profileMetadata,
      },
    );
    if (metadataError)
      return respond(
        { error: "Unable to load your account. Please try again." },
        500,
      );

    return respond({
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      },
      profile: {
        userId: row["User ID"],
        name: row["Full Name"],
        department: row.Department,
        branch: row.Branch,
        role: row["Ex Factor"] ?? "",
        mustChangePassword:
          authData.user.user_metadata?.must_change_password === true,
      },
    });
  } catch {
    return respond({ error: "Invalid user ID or password." }, 400);
  }
});

function respond(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
