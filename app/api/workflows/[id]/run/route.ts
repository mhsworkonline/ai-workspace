import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { TABLES } from "@/lib/constants";
import { checkRunLimit, limitMessage } from "@/lib/limits";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";
import { executeRun } from "@/lib/workflow/engine";

export const maxDuration = 300;

interface RouteParams {
  params: { id: string };
}

const runSchema = z.object({
  input: z.object({
    text: z.string().max(50_000).optional(),
    fields: z.record(z.string(), z.string()).optional(),
    variables: z.record(z.string(), z.string()).optional(),
  }),
});

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid run input.");
  }

  const { data: workflow } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("id", params.id)
    .single();
  if (!workflow) {
    return jsonError("Workflow not found.", 404);
  }
  if (!Array.isArray(workflow.blocks) || workflow.blocks.length === 0) {
    return jsonError("Add at least one block before running this workflow.");
  }

  const workspace = await getWorkspaceForUser(ctx, workflow.workspace_id);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }

  const limit = checkRunLimit(workspace);
  if (!limit.allowed) {
    return jsonError(limitMessage(limit), 403, true);
  }

  const { data: run, error } = await ctx.supabase
    .from(TABLES.WORKFLOW_RUNS)
    .insert({
      workflow_id: workflow.id,
      workspace_id: workspace.id,
      triggered_by: ctx.userId,
      status: "pending",
      input: parsed.data.input as never,
    })
    .select()
    .single();
  if (error || !run) {
    return jsonError(error?.message ?? "Could not start run.", 500);
  }

  await ctx.supabase
    .from(TABLES.WORKSPACES)
    .update({ runs_used_this_month: workspace.runs_used_this_month + 1 })
    .eq("id", workspace.id);

  await logActivity(ctx.supabase, {
    workspaceId: workspace.id,
    userId: ctx.userId,
    action: "run.started",
    resourceType: "run",
    resourceId: run.id,
    details: { workflow: workflow.name },
  });

  // Fire-and-forget: the engine persists progress to the DB and the client polls.
  void executeRun(run.id).catch(() => undefined);

  return jsonData({ runId: run.id }, 201);
}
