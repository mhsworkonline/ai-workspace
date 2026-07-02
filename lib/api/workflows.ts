import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Workflow } from "@/types/database";
import type { BlockConnection, CanvasState, RunInput, WorkflowBlock } from "@/types/workflow";
import { api } from "./http";

export async function listWorkflows(
  workspaceId: string,
  projectId?: string
): Promise<Workflow[]> {
  const supabase = createClient();
  let query = supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (projectId) {
    query = query.eq("project_id", projectId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export interface CreateWorkflowInput {
  workspaceId: string;
  projectId?: string | null;
  name: string;
  description?: string;
  templateId?: string;
}

export async function createWorkflow(input: CreateWorkflowInput): Promise<Workflow> {
  return api<Workflow>("/api/workflows", { method: "POST", body: JSON.stringify(input) });
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string | null;
  projectId?: string | null;
  blocks?: WorkflowBlock[];
  connections?: BlockConnection[];
  canvasState?: CanvasState;
  variables?: Record<string, string>;
  isArchived?: boolean;
}

export async function updateWorkflow(id: string, patch: UpdateWorkflowInput): Promise<Workflow> {
  return api<Workflow>(`/api/workflows/${id}`, { method: "PUT", body: JSON.stringify(patch) });
}

export async function deleteWorkflow(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/workflows/${id}`, { method: "DELETE" });
}

export async function runWorkflow(id: string, input: RunInput): Promise<{ runId: string }> {
  return api<{ runId: string }>(`/api/workflows/${id}/run`, {
    method: "POST",
    body: JSON.stringify({ input }),
  });
}
