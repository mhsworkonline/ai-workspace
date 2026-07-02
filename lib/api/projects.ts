import { createClient } from "@/lib/supabase/client";
import { PLAN_LIMITS, PlanTier, TABLES } from "@/lib/constants";
import type { Project, Workspace } from "@/types/database";
import { ApiError } from "./http";

export async function listProjects(workspaceId: string): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.PROJECTS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getProject(id: string): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLES.PROJECTS).select("*").eq("id", id).single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export interface CreateProjectInput {
  workspace: Workspace;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = createClient();
  const tier = (input.workspace.subscription_tier as PlanTier) ?? PlanTier.Free;
  const limit = PLAN_LIMITS[tier].projects;
  const { count } = await supabase
    .from(TABLES.PROJECTS)
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", input.workspace.id)
    .is("deleted_at", null);
  if ((count ?? 0) >= limit) {
    throw new ApiError(
      `You've reached the ${limit} project limit on the ${PLAN_LIMITS[tier].label} plan.`,
      403,
      true
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from(TABLES.PROJECTS)
    .insert({
      workspace_id: input.workspace.id,
      created_by: user?.id ?? null,
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#0D9488",
      icon: input.icon ?? "folder",
    })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.PROJECTS).update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function softDeleteProject(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLES.PROJECTS)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
