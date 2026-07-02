import type { NextResponse } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";

export async function POST(): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  try {
    const admin = createAdminSupabase();
    // Cascades through aiw_profiles → workspaces → all workspace data.
    const { error } = await admin.auth.admin.deleteUser(ctx.userId);
    if (error) {
      return jsonError(error.message, 500);
    }
    await ctx.supabase.auth.signOut();
    return jsonData({ ok: true });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not delete account.", 500);
  }
}
