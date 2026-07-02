"use client";

import { Check, Loader2 } from "lucide-react";
import Script from "next/script";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSession } from "@/hooks/use-session";
import { api } from "@/lib/api/http";
import { PLAN_LIMITS, PlanTier } from "@/lib/constants";
import { formatBytes, formatInr, formatNumber } from "@/lib/utils/format";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PLAN_FEATURES: Record<PlanTier, string[]> = {
  [PlanTier.Free]: ["3 projects", "3 workflows", "10 runs/month", "100 MB storage", "1 member"],
  [PlanTier.Pro]: [
    "Unlimited projects & workflows",
    "1,000 runs/month",
    "10 GB storage",
    "5 team members",
    "Brand memory & version history",
    "Bring your own API key",
    "All export formats",
  ],
  [PlanTier.Business]: [
    "Everything in Pro",
    "Unlimited runs",
    "100 GB storage",
    "Unlimited team members",
    "Shared memory & audit logs",
    "API access & custom models",
    "Dedicated support",
  ],
};

export default function BillingSettingsPage(): JSX.Element {
  const { session, refresh } = useSession();
  const workspace = session?.workspace;
  const tier = (workspace?.subscription_tier as PlanTier) ?? PlanTier.Free;
  const limits = PLAN_LIMITS[tier];
  const [upgrading, setUpgrading] = useState<PlanTier | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const runsPct = Number.isFinite(limits.runsPerMonth)
    ? Math.min(100, ((workspace?.runs_used_this_month ?? 0) / limits.runsPerMonth) * 100)
    : 0;
  const storagePct = Math.min(
    100,
    ((workspace?.storage_used_bytes ?? 0) / limits.storageBytes) * 100
  );

  async function upgrade(target: PlanTier): Promise<void> {
    if (!workspace) {
      return;
    }
    setUpgrading(target);
    try {
      const { subscriptionId, keyId } = await api<{ subscriptionId: string; keyId: string }>(
        "/api/billing/checkout",
        { method: "POST", body: JSON.stringify({ workspaceId: workspace.id, tier: target }) }
      );
      if (!window.Razorpay) {
        toast.error("Payment gateway failed to load. Please refresh and try again.");
        return;
      }
      const checkout = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionId,
        name: "AI Workspace",
        description: `${PLAN_LIMITS[target].label} plan`,
        theme: { color: "#0D9488" },
        handler: () => {
          toast.success("Payment received! Your plan activates within a minute.");
          setTimeout(() => void refresh(), 4000);
        },
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start checkout");
    } finally {
      setUpgrading(null);
    }
  }

  async function cancelSubscription(): Promise<void> {
    if (!workspace) {
      return;
    }
    try {
      await api<{ ok: boolean }>("/api/billing/cancel", {
        method: "POST",
        body: JSON.stringify({ workspaceId: workspace.id }),
      });
      toast.success("Subscription cancelled. You keep access until the period ends.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel subscription");
    }
  }

  return (
    <div className="max-w-none space-y-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Current plan <StatusBadge status={tier} />
          </CardTitle>
          <CardDescription>Usage this month for “{workspace?.name}”.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Runs</span>
              <span className="font-mono text-xs text-muted-foreground">
                {workspace?.runs_used_this_month ?? 0} /{" "}
                {formatNumber(limits.runsPerMonth)}
              </span>
            </div>
            {Number.isFinite(limits.runsPerMonth) ? (
              <Progress value={runsPct} className="h-2" aria-label="Run usage" />
            ) : null}
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span>Storage</span>
              <span className="font-mono text-xs text-muted-foreground">
                {formatBytes(workspace?.storage_used_bytes ?? 0)} /{" "}
                {formatBytes(limits.storageBytes)}
              </span>
            </div>
            <Progress value={storagePct} className="h-2" aria-label="Storage usage" />
          </div>
          {tier !== PlanTier.Free ? (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              Cancel subscription
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {(Object.values(PlanTier) as PlanTier[]).map((planTier) => {
          const plan = PLAN_LIMITS[planTier];
          const isCurrent = planTier === tier;
          return (
            <Card key={planTier} className={isCurrent ? "border-primary" : undefined}>
              <CardHeader>
                <CardTitle className="text-base">{plan.label}</CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {plan.priceInr === 0 ? "Free" : formatInr(plan.priceInr)}
                  </span>
                  {plan.priceInr > 0 ? "/month" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-1.5">
                  {PLAN_FEATURES[planTier].map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : planTier === PlanTier.Free ? null : (
                  <Button
                    className="w-full"
                    onClick={() => void upgrade(planTier)}
                    disabled={upgrading !== null}
                  >
                    {upgrading === planTier ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    Upgrade to {plan.label}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel subscription?"
        description="You'll be downgraded to the Free plan at the end of your billing period."
        confirmLabel="Cancel subscription"
        destructive
        onConfirm={() => void cancelSubscription()}
      />
    </div>
  );
}
