import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TABLES } from "@/lib/constants";
import { checkRunLimit, limitMessage } from "@/lib/limits";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";
import { applyReviewDecision, executeRun } from "@/lib/workflow/engine";

export const maxDuration = 300;

interface RouteParams {
  params: { id: string };
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel") }),
  z.object({
    action: z.literal("review"),
    decision: z.enum(["approve", "reject"]),
    editedOutput: z.string().optional(),
  }),
  z.object({ action: z.literal("rerun") }),
]);

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const { data, error } = await ctx.supabase
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) {
    return jsonError("Run not found.", 404);
  }
  return jsonData(data);
}

export async function PATCH(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid action.");
  }

  const { data: run } = await ctx.supabase
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("id", params.id)
    .single();
  if (!run) {
    return jsonError("Run not found.", 404);
  }

  switch (parsed.data.action) {
    case "cancel": {
      const { error } = await ctx.supabase
        .from(TABLES.WORKFLOW_RUNS)
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          error_message: "Cancelled by user.",
        })
        .eq("id", params.id)
        .in("status", ["pending", "running", "awaiting_review"]);
      if (error) {
        return jsonError(error.message, 500);
      }
      return jsonData({ ok: true });
    }
    case "review": {
      try {
        await applyReviewDecision(params.id, parsed.data.decision, parsed.data.editedOutput);
        return jsonData({ ok: true });
      } catch (error) {
        return jsonError(error instanceof Error ? error.message : "Review failed.", 400);
      }
    }
    case "rerun": {
      const workspace = await getWorkspaceForUser(ctx, run.workspace_id);
      if (!workspace) {
        return jsonError("Workspace not found.", 404);
      }
      const limit = checkRunLimit(workspace);
      if (!limit.allowed) {
        return jsonError(limitMessage(limit), 403, true);
      }
      const { data: newRun, error } = await ctx.supabase
        .from(TABLES.WORKFLOW_RUNS)
        .insert({
          workflow_id: run.workflow_id,
          workspace_id: run.workspace_id,
          triggered_by: ctx.userId,
          status: "pending",
          input: run.input as never,
        })
        .select()
        .single();
      if (error || !newRun) {
        return jsonError(error?.message ?? "Could not rerun.", 500);
      }
      await ctx.supabase
        .from(TABLES.WORKSPACES)
        .update({ runs_used_this_month: workspace.runs_used_this_month + 1 })
        .eq("id", workspace.id);
      void executeRun(newRun.id).catch(() => undefined);
      return jsonData({ runId: newRun.id }, 201);
    }
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const { error } = await ctx.supabase.from(TABLES.WORKFLOW_RUNS).delete().eq("id", params.id);
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData({ ok: true });
}
