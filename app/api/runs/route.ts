import type { NextRequest, NextResponse } from "next/server";
import { TABLES } from "@/lib/constants";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return jsonError("workspaceId is required.");
  }
  const { data, error } = await ctx.supabase
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData(data);
}
