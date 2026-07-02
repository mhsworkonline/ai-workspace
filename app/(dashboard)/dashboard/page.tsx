"use client";

import { HardDrive, History, Users, Workflow } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentRuns } from "@/components/dashboard/recent-runs";
import { StatsCard } from "@/components/dashboard/stats-card";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useRuns } from "@/hooks/use-runs";
import { useSession } from "@/hooks/use-session";
import { useMembers } from "@/hooks/use-team";
import { useWorkflows } from "@/hooks/use-workflows";
import { PLAN_LIMITS, PlanTier } from "@/lib/constants";
import { formatBytes, formatNumber } from "@/lib/utils/format";

export default function DashboardPage(): JSX.Element {
  const router = useRouter();
  const { session, isLoading } = useSession();
  const workspace = session?.workspace;
  const { data: workflows } = useWorkflows(workspace?.id);
  const { data: runs, isLoading: runsLoading } = useRuns(workspace?.id, { limit: 100 });
  const { data: members } = useMembers(workspace?.id);

  // Session resolved but there's no profile or workspace — route back into
  // onboarding rather than sitting on skeletons.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (session === null) {
      router.replace("/login");
    } else if (session && !session.workspace) {
      router.replace(session.profile.onboarding_completed ? "/workspace" : "/welcome");
    }
  }, [isLoading, session, router]);

  if (isLoading || !workspace) {
    return <LoadingSkeleton variant="cards" count={4} />;
  }

  const tier = (workspace.subscription_tier as PlanTier) ?? PlanTier.Free;
  const limits = PLAN_LIMITS[tier];
  const runsHint = Number.isFinite(limits.runsPerMonth)
    ? `of ${formatNumber(limits.runsPerMonth)} on ${limits.label}`
    : "Unlimited plan";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back${session?.profile.full_name ? `, ${session.profile.full_name.split(" ")[0]}` : ""}`}
        description="Here's what's happening in your workspace."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Workflows"
          value={String(workflows?.length ?? 0)}
          icon={Workflow}
        />
        <StatsCard
          label="Runs This Month"
          value={String(workspace.runs_used_this_month)}
          icon={History}
          hint={runsHint}
        />
        <StatsCard label="Team Members" value={String((members?.length ?? 0) + 1)} icon={Users} />
        <StatsCard
          label="Storage Used"
          value={formatBytes(workspace.storage_used_bytes)}
          icon={HardDrive}
          hint={`of ${formatBytes(limits.storageBytes)}`}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {runsLoading ? <LoadingSkeleton variant="list" count={3} /> : <UsageChart runs={runs ?? []} />}
        <QuickActions />
      </div>
      {runsLoading ? <LoadingSkeleton variant="list" count={5} /> : <RecentRuns runs={runs ?? []} />}
    </div>
  );
}
