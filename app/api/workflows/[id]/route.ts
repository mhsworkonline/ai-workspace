import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { TABLES } from "@/lib/constants";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";

interface RouteParams {
  params: { id: string };
}

const positionSchema = z.object({ x: z.number(), y: z.number() });
const blockSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: positionSchema,
  data: z.record(z.string(), z.unknown()),
});
const connectionSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.enum(["true", "false"]).nullish(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).nullish(),
  projectId: z.string().uuid().nullish(),
  blocks: z.array(blockSchema).optional(),
  connections: z.array(connectionSchema).optional(),
  canvasState: z.record(z.string(), z.unknown()).optional(),
  variables: z.record(z.string(), z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const { data, error } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("id", params.id)
    .single();
  if (error || !data) {
    return jsonError("Workflow not found.", 404);
  }
  return jsonData(data);
}

export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid workflow update.");
  }
  const patch = parsed.data;

  const { data: existing } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("id", params.id)
    .single();
  if (!existing) {
    return jsonError("Workflow not found.", 404);
  }

  const structureChanged = patch.blocks !== undefined || patch.connections !== undefined;
  const nextVersion = structureChanged ? (existing.version ?? 1) + 1 : existing.version;

  const { data: updated, error } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.projectId !== undefined && { project_id: patch.projectId }),
      ...(patch.blocks !== undefined && { blocks: patch.blocks as never }),
      ...(patch.connections !== undefined && { connections: patch.connections as never }),
      ...(patch.canvasState !== undefined && { canvas_state: patch.canvasState as never }),
      ...(patch.variables !== undefined && { variables: patch.variables as never }),
      ...(patch.isArchived !== undefined && { is_archived: patch.isArchived }),
      version: nextVersion,
    })
    .eq("id", params.id)
    .select()
    .single();
  if (error || !updated) {
    return jsonError(error?.message ?? "Could not save workflow.", 500);
  }

  if (structureChanged) {
    await ctx.supabase.from(TABLES.WORKFLOW_VERSIONS).insert({
      workflow_id: params.id,
      version: nextVersion,
      blocks: (patch.blocks ?? existing.blocks) as never,
      connections: (patch.connections ?? existing.connections) as never,
      created_by: ctx.userId,
    });
  }

  return jsonData(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const { data: existing } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .select("id, workspace_id, name")
    .eq("id", params.id)
    .single();
  if (!existing) {
    return jsonError("Workflow not found.", 404);
  }
  const { error } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) {
    return jsonError(error.message, 500);
  }
  await logActivity(ctx.supabase, {
    workspaceId: existing.workspace_id,
    userId: ctx.userId,
    action: "workflow.deleted",
    resourceType: "workflow",
    resourceId: existing.id,
    details: { name: existing.name },
  });
  return jsonData({ ok: true });
}
