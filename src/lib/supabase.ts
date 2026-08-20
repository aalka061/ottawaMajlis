import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

/** True once both Supabase env vars are set. */
export const isSupabaseConfigured = Boolean(url && serviceKey);

let client: SupabaseClient | null = null;

/**
 * Server-only client. It uses the service role key and bypasses RLS, so it
 * must never be imported into a component that runs in the browser.
 */
export function supabase(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).",
    );
  }
  if (!client) {
    client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
