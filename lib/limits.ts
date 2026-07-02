import { PLAN_LIMITS, PlanTier, TABLES } from "@/lib/constants";
import type { Workspace } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type LimitKind = "runs" | "workflows" | "projects" | "storage" | "team";

export interface LimitCheck {
  allowed: boolean;
  kind: LimitKind;
  used: number;
  limit: number;
  tier: PlanTier;
}

function tierOf(workspace: Workspace): PlanTier {
  return (workspace.subscription_tier as PlanTier) ?? PlanTier.Free;
}

export function checkRunLimit(workspace: Workspace): LimitCheck {
  const tier = tierOf(workspace);
  const limit = PLAN_LIMITS[tier].runsPerMonth;
  return {
    allowed: workspace.runs_used_this_month < limit,
    kind: "runs",
    used: workspace.runs_used_this_month,
    limit,
    tier,
  };
}

export function checkStorageLimit(workspace: Workspace, incomingBytes: number): LimitCheck {
  const tier = tierOf(workspace);
  const limit = PLAN_LIMITS[tier].storageBytes;
  return {
    allowed: workspace.storage_used_bytes + incomingBytes <= limit,
    kind: "storage",
    used: workspace.storage_used_bytes,
    limit,
    tier,
  };
}

export async function checkWorkflowLimit(
  supabase: SupabaseClient<Database>,
  workspace: Workspace
): Promise<LimitCheck> {
  const tier = tierOf(workspace);
  const limit = PLAN_LIMITS[tier].workflows;
  const { count } = await supabase
    .from(TABLES.WORKFLOWS)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  return { allowed: (count ?? 0) < limit, kind: "workflows", used: count ?? 0, limit, tier };
}

export async function checkProjectLimit(
  supabase: SupabaseClient<Database>,
  workspace: Workspace
): Promise<LimitCheck> {
  const tier = tierOf(workspace);
  const limit = PLAN_LIMITS[tier].projects;
  const { count } = await supabase
    .from(TABLES.PROJECTS)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .is("deleted_at", null);
  return { allowed: (count ?? 0) < limit, kind: "projects", used: count ?? 0, limit, tier };
}

export async function checkTeamLimit(
  supabase: SupabaseClient<Database>,
  workspace: Workspace
): Promise<LimitCheck> {
  const tier = tierOf(workspace);
  const limit = PLAN_LIMITS[tier].teamMembers;
  const { count } = await supabase
    .from(TABLES.WORKSPACE_MEMBERS)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspace.id)
    .neq("status", "removed");
  // Owner counts as a member.
  const used = (count ?? 0) + 1;
  return { allowed: used < limit || limit === Number.POSITIVE_INFINITY, kind: "team", used, limit, tier };
}

export function limitMessage(check: LimitCheck): string {
  const labels: Record<LimitKind, string> = {
    runs: "monthly run limit",
    workflows: "workflow limit",
    projects: "project limit",
    storage: "storage limit",
    team: "team member limit",
  };
  return `You've reached your ${labels[check.kind]} on the ${PLAN_LIMITS[check.tier].label} plan. Upgrade to continue.`;
}
