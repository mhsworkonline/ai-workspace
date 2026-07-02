import type { NextResponse } from "next/server";
import { TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminContext, jsonData, jsonError } from "@/lib/server/auth";

export async function GET(): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const admin = createAdminSupabase();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [users, paidWorkspaces, runsToday, revenueSetting] = await Promise.all([
    admin.from(TABLES.PROFILES).select("id", { count: "exact", head: true }),
    admin
      .from(TABLES.WORKSPACES)
      .select("id", { count: "exact", head: true })
      .neq("subscription_tier", "free"),
    admin
      .from(TABLES.WORKFLOW_RUNS)
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfToday.toISOString()),
    admin.from(TABLES.ADMIN_SETTINGS).select("value").eq("key", "revenue_this_month").maybeSingle(),
  ]);

  return jsonData({
    totalUsers: users.count ?? 0,
    activeSubscriptions: paidWorkspaces.count ?? 0,
    runsToday: runsToday.count ?? 0,
    revenueThisMonth: revenueSetting.data?.value ?? "0",
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
  });
}
