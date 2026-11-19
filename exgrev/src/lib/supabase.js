import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const placeholderValues = [
  "example.supabase.co",
  "your-project-ref",
  "your-supabase",
  "demo-publishable-key",
];

const isValidPublishableKeyFormat =
  supabasePublishableKey?.startsWith("sb_publishable_") ||
  supabasePublishableKey?.startsWith("eyJ");

export const supabaseConfigurationError =
  !supabaseUrl ||
  !supabasePublishableKey ||
  !isValidPublishableKeyFormat ||
  placeholderValues.some(
    (value) =>
      supabaseUrl.toLowerCase().includes(value) ||
      supabasePublishableKey.toLowerCase().includes(value),
  )
    ? "Local Supabase configuration is incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in exgrev/.env.local, then restart Vite."
    : "";

export const supabase = createClient(
  supabaseConfigurationError ? "http://127.0.0.1:54321" : supabaseUrl,
  supabaseConfigurationError ? "missing-local-supabase-key" : supabasePublishableKey,
);
