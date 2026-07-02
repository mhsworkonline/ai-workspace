import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Variable, VariableScope } from "@/types/database";

export async function listVariables(workspaceId: string): Promise<Variable[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.VARIABLES)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("key", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export interface SaveVariableInput {
  workspaceId: string;
  key: string;
  value: string;
  scope?: VariableScope;
  projectId?: string | null;
  workflowId?: string | null;
  description?: string;
}

export async function saveVariable(input: SaveVariableInput): Promise<Variable> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from(TABLES.VARIABLES)
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId ?? null,
      workflow_id: input.workflowId ?? null,
      scope: input.scope ?? "workspace",
      key: input.key,
      value: input.value,
      description: input.description ?? null,
      created_by: user?.id ?? null,
    })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateVariable(id: string, patch: Partial<Variable>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.VARIABLES).update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteVariable(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.VARIABLES).delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
