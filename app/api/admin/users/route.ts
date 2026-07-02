import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminContext, jsonData, jsonError } from "@/lib/server/auth";

const patchSchema = z.object({
  userId: z.string().uuid(),
  isAdmin: z.boolean().optional(),
  isSuspended: z.boolean().optional(),
  tier: z.enum(["free", "pro", "business"]).optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const search = request.nextUrl.searchParams.get("q")?.toLowerCase() ?? "";
  const admin = createAdminSupabase();

  const { data: profiles, error } = await admin
    .from(TABLES.PROFILES)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return jsonError(error.message, 500);
  }

  const { data: workspaces } = await admin
    .from(TABLES.WORKSPACES)
    .select("id, owner_id, subscription_tier, runs_used_this_month, storage_used_bytes");
  const byOwner = new Map((workspaces ?? []).map((workspace) => [workspace.owner_id, workspace]));

  const users = (profiles ?? [])
    .filter(
      (profile) =>
        !search ||
        profile.email.toLowerCase().includes(search) ||
        (profile.full_name ?? "").toLowerCase().includes(search)
    )
    .map((profile) => {
      const workspace = byOwner.get(profile.id);
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        isAdmin: profile.is_admin,
        isSuspended: profile.is_suspended,
        createdAt: profile.created_at,
        tier: workspace?.subscription_tier ?? "free",
        workspaceId: workspace?.id ?? null,
        runsUsed: workspace?.runs_used_this_month ?? 0,
        storageUsed: workspace?.storage_used_bytes ?? 0,
      };
    });

  return jsonData(users);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid update.");
  }
  const { userId, isAdmin, isSuspended, tier } = parsed.data;
  if (userId === ctx.userId && (isAdmin === false || isSuspended === true)) {
    return jsonError("You cannot demote or suspend yourself.");
  }
  const admin = createAdminSupabase();

  if (isAdmin !== undefined || isSuspended !== undefined) {
    const { error } = await admin
      .from(TABLES.PROFILES)
      .update({
        ...(isAdmin !== undefined && { is_admin: isAdmin }),
        ...(isSuspended !== undefined && { is_suspended: isSuspended }),
      })
      .eq("id", userId);
    if (error) {
      return jsonError(error.message, 500);
    }
  }

  if (tier !== undefined) {
    const { error } = await admin
      .from(TABLES.WORKSPACES)
      .update({ subscription_tier: tier })
      .eq("owner_id", userId);
    if (error) {
      return jsonError(error.message, 500);
    }
  }

  return jsonData({ ok: true });
}
