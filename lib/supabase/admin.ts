import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client. Server-side only — bypasses RLS.
 * Used by the run engine, admin settings reads, and webhooks.
 */
export function createAdminSupabase(): ReturnType<typeof createClient<Database>> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Paste it into .env.local from the Supabase dashboard."
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL as string, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
