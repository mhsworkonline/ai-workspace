import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { WorkflowRun } from "@/types/database";
import { api } from "./http";

export interface RunWithWorkflow extends WorkflowRun {
  workflow: { name: string } | null;
}

export async function listRuns(
  workspaceId: string,
  options: { workflowId?: string; limit?: number } = {}
): Promise<RunWithWorkflow[]> {
  const supabase = createClient();
  let query = supabase
    .from(TABLES.WORKFLOW_RUNS)
    .select(`*, workflow:${TABLES.WORKFLOWS}(name)`)
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 50);
  if (options.workflowId) {
    query = query.eq("workflow_id", options.workflowId);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as RunWithWorkflow[];
}

export async function getRun(id: string): Promise<RunWithWorkflow> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.WORKFLOW_RUNS)
    .select(`*, workflow:${TABLES.WORKFLOWS}(name)`)
    .eq("id", id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as unknown as RunWithWorkflow;
}

export async function cancelRun(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/runs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "cancel" }),
  });
}

export async function reviewRun(
  id: string,
  decision: "approve" | "reject",
  editedOutput?: string
): Promise<void> {
  await api<{ ok: boolean }>(`/api/runs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "review", decision, editedOutput }),
  });
}

export async function rerunWorkflow(id: string): Promise<{ runId: string }> {
  return api<{ runId: string }>(`/api/runs/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "rerun" }),
  });
}

export async function deleteRun(id: string): Promise<void> {
  await api<{ ok: boolean }>(`/api/runs/${id}`, { method: "DELETE" });
}
