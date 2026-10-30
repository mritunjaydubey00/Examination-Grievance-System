import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH_SIZE = 10;
const MAX_ERROR_LENGTH = 1000;
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type Notification = {
  notification_id: string;
  recipient_email: string;
  attempt_count: number;
  event_type: string;
  actor_display_name: string;
  grievance_code: string | null;
};

function constantTimeEqual(left: string, right: string) {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  let difference = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < length; index += 1) {
    difference |=
      (leftBytes[index] ?? 0) ^ (rightBytes[index] ?? 0);
  }
  return difference === 0;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function describeEvent(eventType: string) {
  const descriptions: Record<string, string> = {
    submitted: "A new grievance was submitted",
    forwarded: "A grievance was assigned to you",
    reassigned: "A grievance was reassigned",
    status_changed: "A grievance status was updated",
    resolved: "A grievance was resolved",
    remark_added: "A new update was added to a grievance",
    resolution_proposed: "A resolution was proposed",
    student_confirmed_resolution: "A resolution was confirmed",
  };
  return descriptions[eventType] || "A grievance was updated";
}

function getEmailConfiguration() {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EXGREV_EMAIL_FROM");
  const appUrl = Deno.env.get("EXGREV_APP_URL");
  const webhookSecret = Deno.env.get("NOTIFICATION_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!apiKey || !from || !appUrl || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    throw new Error("Email notification worker secrets are not fully configured.");
  }

  const parsedAppUrl = new URL(appUrl);
  if (
    parsedAppUrl.protocol !== "https:" &&
    parsedAppUrl.hostname !== "localhost"
  ) {
    throw new Error("EXGREV_APP_URL must use HTTPS outside local development.");
  }

  return {
    apiKey,
    from,
    appUrl: parsedAppUrl.origin,
    webhookSecret,
    supabaseUrl,
    serviceRoleKey,
  };
}

async function sendNotification(
  notification: Notification,
  configuration: ReturnType<typeof getEmailConfiguration>,
) {
  const eventDescription = describeEvent(notification.event_type);
  const caseReference = notification.grievance_code || "your grievance";
  const actor = notification.actor_display_name || "An account participant";
  const subject = `${eventDescription} — ${caseReference}`;
  const html = [
    "<!doctype html><html><body>",
    `<p>${escapeHtml(eventDescription)}.</p>`,
    `<p>Case: <strong>${escapeHtml(caseReference)}</strong></p>`,
    `<p>Update by: ${escapeHtml(actor)}</p>`,
    `<p><a href="${escapeHtml(configuration.appUrl)}">Open ExGrev and sign in to view the case.</a></p>`,
    "<p>This message contains no grievance details. Sign in to ExGrev to view updates available to your account.</p>",
    "</body></html>",
  ].join("");
  const text = [
    `${eventDescription}.`,
    `Case: ${caseReference}`,
    `Update by: ${actor}`,
    `Open ExGrev and sign in to view the case: ${configuration.appUrl}`,
    "This message contains no grievance details.",
  ].join("\n");

  const response = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${configuration.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": notification.notification_id,
    },
    body: JSON.stringify({
      from: configuration.from,
      to: [notification.recipient_email],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(8000),
  });
  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      retryable:
        response.status === 408 ||
        response.status === 425 ||
        response.status === 429 ||
        response.status >= 500,
      error: `Email provider returned HTTP ${response.status}.`.slice(
        0,
        MAX_ERROR_LENGTH,
      ),
    };
  }

  return {
    success: true,
    retryable: false,
    providerMessageId:
      typeof responseBody?.id === "string" ? responseBody.id : null,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  let configuration: ReturnType<typeof getEmailConfiguration>;
  try {
    configuration = getEmailConfiguration();
  } catch (error) {
    console.error(
      "Grievance email worker configuration error:",
      error instanceof Error ? error.message : "Unknown configuration error.",
    );
    return Response.json(
      { error: "Email notification worker is not configured." },
      { status: 503 },
    );
  }

  const suppliedSecret = request.headers.get("x-notification-secret") || "";
  if (!constantTimeEqual(suppliedSecret, configuration.webhookSecret)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createClient(
    configuration.supabaseUrl,
    configuration.serviceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: notifications, error: claimError } = await admin.rpc(
    "claim_grievance_email_notifications",
    { requested_batch_size: BATCH_SIZE },
  );

  if (claimError) {
    console.error("Could not claim grievance email notifications:", claimError.message);
    return Response.json(
      { error: "Could not claim pending notifications." },
      { status: 500 },
    );
  }

  let sent = 0;
  let failed = 0;
  for (const notification of (notifications || []) as Notification[]) {
    let delivery: Awaited<ReturnType<typeof sendNotification>>;
    try {
      delivery = await sendNotification(notification, configuration);
    } catch (error) {
      delivery = {
        success: false,
        retryable: true,
        error:
          error instanceof Error
            ? error.message.slice(0, MAX_ERROR_LENGTH)
            : "Email provider request failed.",
      };
    }

    const { error: completionError } = await admin.rpc(
      "complete_grievance_email_notification",
      {
        target_notification_id: notification.notification_id,
        delivery_succeeded: delivery.success,
        target_provider_message_id:
          "providerMessageId" in delivery ? delivery.providerMessageId : null,
        target_error: "error" in delivery ? delivery.error : null,
        should_retry: delivery.retryable,
      },
    );

    if (completionError) {
      console.error(
        "Could not record grievance email delivery result:",
        completionError.message,
      );
      return Response.json(
        { error: "Could not record notification delivery." },
        { status: 500 },
      );
    }

    if (delivery.success) sent += 1;
    else failed += 1;
  }

  return Response.json({ processed: sent + failed, sent, failed });
});
