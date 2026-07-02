import type { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_PAGE_SIZE, TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminContext, jsonData, jsonError } from "@/lib/server/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const page = Math.max(0, Number(request.nextUrl.searchParams.get("page") ?? "0"));
  const action = request.nextUrl.searchParams.get("action");
  const admin = createAdminSupabase();

  let query = admin
    .from(TABLES.ACTIVITY_LOG)
    .select(`*, profile:${TABLES.PROFILES}(email)`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * ACTIVITY_PAGE_SIZE, (page + 1) * ACTIVITY_PAGE_SIZE - 1);
  if (action) {
    query = query.ilike("action", `${action}%`);
  }
  const { data, count, error } = await query;
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData({ entries: data ?? [], total: count ?? 0, pageSize: ACTIVITY_PAGE_SIZE });
}
