import "server-only";
import Razorpay from "razorpay";
import { PlanTier } from "@/lib/constants";

export function getRazorpay(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Billing is not configured yet. Add Razorpay keys to the environment.");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function planIdFor(tier: PlanTier): string {
  const planId =
    tier === PlanTier.Pro
      ? process.env.RAZORPAY_PLAN_ID_PRO
      : tier === PlanTier.Business
        ? process.env.RAZORPAY_PLAN_ID_BUSINESS
        : undefined;
  if (!planId) {
    throw new Error(
      `No Razorpay plan configured for the ${tier} tier. Set RAZORPAY_PLAN_ID_${tier.toUpperCase()}.`
    );
  }
  return planId;
}

export function tierForPlanId(planId: string): PlanTier | null {
  if (planId === process.env.RAZORPAY_PLAN_ID_PRO) {
    return PlanTier.Pro;
  }
  if (planId === process.env.RAZORPAY_PLAN_ID_BUSINESS) {
    return PlanTier.Business;
  }
  return null;
}
