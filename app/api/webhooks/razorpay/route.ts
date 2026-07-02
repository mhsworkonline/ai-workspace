import crypto from "crypto";
import { NextResponse, type NextRequest } from "next/server";
import { PlanTier, TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { tierForPlanId } from "@/lib/server/razorpay";

interface RazorpaySubscriptionEntity {
  id: string;
  plan_id: string;
  status: string;
  notes?: { workspace_id?: string; tier?: string };
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: RazorpayWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const subscription = payload.payload.subscription?.entity;
  const workspaceId = subscription?.notes?.workspace_id;
  if (!subscription || !workspaceId) {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminSupabase();

  switch (payload.event) {
    case "subscription.activated": {
      const tier = tierForPlanId(subscription.plan_id) ?? PlanTier.Pro;
      await admin
        .from(TABLES.WORKSPACES)
        .update({
          subscription_tier: tier,
          subscription_status: "active",
          razorpay_subscription_id: subscription.id,
        })
        .eq("id", workspaceId);
      break;
    }
    case "subscription.charged": {
      await admin
        .from(TABLES.WORKSPACES)
        .update({
          runs_used_this_month: 0,
          tokens_used_this_month: 0,
          runs_reset_at: new Date().toISOString(),
          subscription_status: "active",
        })
        .eq("id", workspaceId);
      break;
    }
    case "subscription.cancelled":
    case "subscription.expired": {
      await admin
        .from(TABLES.WORKSPACES)
        .update({
          subscription_tier: PlanTier.Free,
          subscription_status: "cancelled",
          razorpay_subscription_id: null,
        })
        .eq("id", workspaceId);
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
