import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TABLES } from "@/lib/constants";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";
import { getRazorpay } from "@/lib/server/razorpay";

const schema = z.object({ workspaceId: z.string().uuid() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request.");
  }
  const workspace = await getWorkspaceForUser(ctx, parsed.data.workspaceId);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }
  if (workspace.owner_id !== ctx.userId) {
    return jsonError("Only the workspace owner can manage billing.", 403);
  }
  if (!workspace.razorpay_subscription_id) {
    return jsonError("No active subscription to cancel.");
  }

  try {
    const razorpay = getRazorpay();
    await razorpay.subscriptions.cancel(workspace.razorpay_subscription_id, true);
    await ctx.supabase
      .from(TABLES.WORKSPACES)
      .update({ subscription_status: "cancelling" })
      .eq("id", workspace.id);
    return jsonData({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not cancel subscription.",
      502
    );
  }
}
