import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { TABLES } from "@/lib/constants";
import { checkWorkflowLimit, limitMessage } from "@/lib/limits";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid().nullish(),
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  templateId: z.string().uuid().optional(),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) {
    return jsonError("workspaceId is required.");
  }
  const { data, error } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData(data);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid workflow details.");
  }
  const input = parsed.data;

  const workspace = await getWorkspaceForUser(ctx, input.workspaceId);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }

  const limit = await checkWorkflowLimit(ctx.supabase, workspace);
  if (!limit.allowed) {
    return jsonError(limitMessage(limit), 403, true);
  }

  let blocks: unknown = [];
  let connections: unknown = [];
  let variables: unknown = {};
  if (input.templateId) {
    const { data: template } = await ctx.supabase
      .from(TABLES.TEMPLATES)
      .select("*")
      .eq("id", input.templateId)
      .single();
    if (!template) {
      return jsonError("Template not found.", 404);
    }
    blocks = template.blocks;
    connections = template.connections;
    variables = template.variables;
    await ctx.supabase
      .from(TABLES.TEMPLATES)
      .update({ use_count: (template.use_count ?? 0) + 1 })
      .eq("id", template.id);
  }

  const { data: workflow, error } = await ctx.supabase
    .from(TABLES.WORKFLOWS)
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId ?? null,
      created_by: ctx.userId,
      name: input.name,
      description: input.description ?? null,
      blocks: blocks as never,
      connections: connections as never,
      variables: variables as never,
    })
    .select()
    .single();
  if (error || !workflow) {
    return jsonError(error?.message ?? "Could not create workflow.", 500);
  }

  await logActivity(ctx.supabase, {
    workspaceId: input.workspaceId,
    userId: ctx.userId,
    action: "workflow.created",
    resourceType: "workflow",
    resourceId: workflow.id,
    details: { name: workflow.name },
  });

  return jsonData(workflow, 201);
}
