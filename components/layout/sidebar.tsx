"use client";

import { Workflow } from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/hooks/use-session";
import { PLAN_LIMITS, PlanTier } from "@/lib/constants";
import { SidebarNav } from "./sidebar-nav";

export function Sidebar(): JSX.Element {
  const { session } = useSession();
  const workspace = session?.workspace;
  const tier = (workspace?.subscription_tier as PlanTier) ?? PlanTier.Free;
  const limits = PLAN_LIMITS[tier];
  const runsLimit = limits.runsPerMonth;
  const runsUsed = workspace?.runs_used_this_month ?? 0;
  const runsPct = Number.isFinite(runsLimit) ? Math.min(100, (runsUsed / runsLimit) * 100) : 0;

  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
      <div className="flex items-center gap-2 px-4 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Workflow className="h-4 w-4 text-sidebar-primary-foreground" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{workspace?.name ?? "AI Workspace"}</p>
          <Badge
            variant="outline"
            className="mt-0.5 border-sidebar-border text-[10px] uppercase tracking-wide text-sidebar-muted"
          >
            {limits.label}
          </Badge>
        </div>
      </div>
      <SidebarNav isAdmin={session?.profile.is_admin} />
      <div className="border-t border-sidebar-border p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-sidebar-muted">
            <span>Runs this month</span>
            <span className="font-mono">
              {runsUsed}
              {Number.isFinite(runsLimit) ? ` / ${runsLimit}` : ""}
            </span>
          </div>
          {Number.isFinite(runsLimit) ? (
            <Progress
              value={runsPct}
              className="h-1.5 bg-sidebar-accent"
              aria-label="Monthly run usage"
            />
          ) : null}
          {tier === PlanTier.Free ? (
            <Link
              href="/settings/billing"
              className="block text-xs font-medium text-sidebar-primary hover:underline"
            >
              Upgrade to Pro →
            </Link>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
