import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PlanTier } from "@/lib/constants";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";
import { getRazorpay, planIdFor } from "@/lib/server/razorpay";

const schema = z.object({
  workspaceId: z.string().uuid(),
  tier: z.enum([PlanTier.Pro, PlanTier.Business]),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid checkout request.");
  }
  const workspace = await getWorkspaceForUser(ctx, parsed.data.workspaceId);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }
  if (workspace.owner_id !== ctx.userId) {
    return jsonError("Only the workspace owner can manage billing.", 403);
  }

  try {
    const razorpay = getRazorpay();
    const subscription = await razorpay.subscriptions.create({
      plan_id: planIdFor(parsed.data.tier),
      total_count: 12,
      customer_notify: 1,
      notes: { workspace_id: workspace.id, tier: parsed.data.tier },
    });
    return jsonData({
      subscriptionId: subscription.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not start checkout.",
      502
    );
  }
}
