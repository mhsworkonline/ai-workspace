import "server-only";
import { resolveAIProvider } from "@/lib/ai/factory";
import { TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { buildSystemVariables, interpolate } from "@/lib/utils/variables";
import type { MemoryEntry, Workflow, WorkflowRun, Workspace } from "@/types/database";
import type {
  AIBlockData,
  BlockConnection,
  ConditionBlockData,
  ExportBlockData,
  InputBlockData,
  MemoryBlockData,
  RunStep,
  TransformBlockData,
  WorkflowBlock,
} from "@/types/workflow";
import { BlockType } from "@/types/workflow";
import type { AIProvider } from "@/types/ai";

const MERGE_SEPARATOR = "\n\n---\n\n";
const URL_FETCH_LIMIT_BYTES = 200_000;

interface EngineContext {
  run: WorkflowRun;
  workflow: Workflow;
  workspace: Workspace;
  variables: Record<string, string>;
  memory: MemoryEntry[];
  provider: AIProvider;
  model: string;
  steps: RunStep[];
  outputs: Record<string, string>;
  deadEdges: Set<string>;
  tokensUsed: number;
}

function topoSort(blocks: WorkflowBlock[], connections: BlockConnection[]): WorkflowBlock[] {
  const inDegree = new Map<string, number>(blocks.map((b) => [b.id, 0]));
  for (const edge of connections) {
    if (inDegree.has(edge.target)) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }
  const queue = blocks
    .filter((b) => (inDegree.get(b.id) ?? 0) === 0)
    .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  const order: WorkflowBlock[] = [];
  const remaining = new Map(inDegree);
  const byId = new Map(blocks.map((b) => [b.id, b]));
  while (queue.length > 0) {
    const block = queue.shift() as WorkflowBlock;
    order.push(block);
    for (const edge of connections.filter((e) => e.source === block.id)) {
      const next = remaining.get(edge.target);
      if (next !== undefined) {
        remaining.set(edge.target, next - 1);
        if (next - 1 === 0) {
          const target = byId.get(edge.target);
          if (target) {
            queue.push(target);
          }
        }
      }
    }
    queue.sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
  }
  // Blocks in cycles are appended so they at least appear (and fail loudly at runtime).
  for (const block of blocks) {
    if (!order.includes(block)) {
      order.push(block);
    }
  }
  return order;
}

function incomingEdges(blockId: string, connections: BlockConnection[]): BlockConnection[] {
  return connections.filter((edge) => edge.target === blockId);
}

function gatherInput(ctx: EngineContext, block: WorkflowBlock): string {
  const incoming = incomingEdges(block.id, ctx.workflow.connections);
  const liveInputs = incoming
    .filter((edge) => !ctx.deadEdges.has(edge.id) && ctx.outputs[edge.source] !== undefined)
    .map((edge) => ctx.outputs[edge.source]);
  if (liveInputs.length > 0) {
    return liveInputs.join(MERGE_SEPARATOR);
  }
  return ctx.run.input.text ?? "";
}

function memoryContext(memory: MemoryEntry[]): string {
  if (memory.length === 0) {
    return "";
  }
  const lines = memory
    .filter((entry) => entry.value)
    .map((entry) => `- ${entry.key}: ${entry.value}`);
  return `\n\nBrand memory (use this context to stay consistent):\n${lines.join("\n")}`;
}

async function runAI(
  ctx: EngineContext,
  systemPrompt: string | undefined,
  userPrompt: string,
  options: { model?: string; temperature?: number; maxTokens?: number }
): Promise<{ text: string; tokens: number }> {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system" as const, content: systemPrompt });
  }
  messages.push({ role: "user" as const, content: userPrompt });
  const response = await ctx.provider.generate(messages, {
    model: options.model || ctx.model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
  });
  return { text: response.text, tokens: response.tokensUsed };
}

const TRANSFORM_INSTRUCTIONS: Record<TransformBlockData["subtype"], string> = {
  summarize: "Summarize the following content concisely, keeping the key points.",
  rewrite: "Rewrite the following content, improving clarity and flow.",
  translate: "Translate the following content.",
  extract: "Extract the requested data from the following content.",
  merge: "Merge the following pieces of content into one coherent piece.",
  split: "Split the following content into clearly separated logical sections.",
  format: "Reformat the following content.",
  convert: "Convert the following content to the requested format.",
};

async function executeBlock(ctx: EngineContext, block: WorkflowBlock): Promise<string> {
  const input = gatherInput(ctx, block);
  switch (block.type) {
    case BlockType.Input: {
      const data = block.data as InputBlockData;
      switch (data.subtype) {
        case "text":
          return interpolate(data.value?.trim() || ctx.run.input.text || "", ctx.variables);
        case "form": {
          const fields = ctx.run.input.fields ?? {};
          const provided = (data.fields ?? [])
            .map((field) => `${field.label}: ${fields[field.id] ?? ""}`)
            .join("\n");
          return provided || ctx.run.input.text || "";
        }
        case "variable":
          return ctx.variables[data.variableKey ?? ""] ?? "";
        case "url": {
          const url = interpolate(data.url ?? data.value ?? "", ctx.variables);
          if (!url) {
            throw new Error("No URL configured on this input block.");
          }
          const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
          if (!response.ok) {
            throw new Error(`Could not fetch URL (HTTP ${response.status}).`);
          }
          const raw = (await response.text()).slice(0, URL_FETCH_LIMIT_BYTES);
          return raw
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
        case "file":
          return data.value || ctx.run.input.text || "";
        default:
          return ctx.run.input.text ?? "";
      }
    }
    case BlockType.AI: {
      const data = block.data as AIBlockData;
      const vars = { ...ctx.variables, input };
      let system = interpolate(data.systemPrompt ?? "", vars);
      if (data.useMemory) {
        system += memoryContext(ctx.memory);
      }
      const user = interpolate(data.userPrompt || "{{input}}", vars);
      const { text, tokens } = await runAI(ctx, system.trim() || undefined, user, {
        model: data.model,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
      });
      ctx.tokensUsed += tokens;
      return text;
    }
    case BlockType.Transform: {
      const data = block.data as TransformBlockData;
      const parts = [TRANSFORM_INSTRUCTIONS[data.subtype] ?? "Transform the following content."];
      if (data.instruction) {
        parts.push(`Instructions: ${interpolate(data.instruction, ctx.variables)}`);
      }
      if (data.subtype === "translate" && data.targetLanguage) {
        parts.push(`Target language: ${data.targetLanguage}`);
      }
      if (data.subtype === "format" && data.format) {
        parts.push(`Target format: ${data.format}`);
      }
      parts.push(`\nContent:\n${input}`);
      const { text, tokens } = await runAI(
        ctx,
        "You are a precise text transformation engine. Return only the transformed content.",
        parts.join("\n"),
        { temperature: 0.3 }
      );
      ctx.tokensUsed += tokens;
      return text;
    }
    case BlockType.Condition: {
      const data = block.data as ConditionBlockData;
      let result: boolean;
      switch (data.conditionType) {
        case "length":
          result = input.split(/\s+/).filter(Boolean).length > (data.minWords ?? 0);
          break;
        case "contains":
          result = data.keyword
            ? input.toLowerCase().includes(data.keyword.toLowerCase())
            : false;
          break;
        case "variable_equals":
          result = (ctx.variables[data.variableKey ?? ""] ?? "") === (data.expected ?? "");
          break;
        case "expression":
          result = interpolate(data.expression ?? "", { ...ctx.variables, input }) ===
            (data.expected ?? "true");
          break;
        default:
          result = true;
      }
      // Kill the branch that wasn't taken.
      for (const edge of ctx.workflow.connections) {
        if (edge.source === block.id && edge.sourceHandle && edge.sourceHandle !== String(result)) {
          ctx.deadEdges.add(edge.id);
        }
      }
      if (!result && data.stopOnFalse) {
        for (const edge of ctx.workflow.connections) {
          if (edge.source === block.id) {
            ctx.deadEdges.add(edge.id);
          }
        }
      }
      return String(result);
    }
    case BlockType.Memory: {
      const data = block.data as MemoryBlockData;
      const admin = createAdminSupabase();
      if (data.mode === "read") {
        const { data: entry } = await admin
          .from(TABLES.MEMORY)
          .select("value")
          .eq("workspace_id", ctx.workspace.id)
          .eq("key", data.key)
          .maybeSingle();
        return entry?.value ?? "";
      }
      const { data: existing } = await admin
        .from(TABLES.MEMORY)
        .select("id")
        .eq("workspace_id", ctx.workspace.id)
        .eq("key", data.key)
        .maybeSingle();
      if (existing) {
        await admin.from(TABLES.MEMORY).update({ value: input }).eq("id", existing.id);
      } else {
        await admin.from(TABLES.MEMORY).insert({
          workspace_id: ctx.workspace.id,
          key: data.key,
          value: input,
          type: "output",
          section: "outputs",
          created_by: ctx.run.triggered_by,
        });
      }
      return input;
    }
    case BlockType.Export: {
      const data = block.data as ExportBlockData;
      const step = ctx.steps.find((s) => s.blockId === block.id);
      if (step) {
        step.exportSubtype = data.subtype;
        step.exportFilename = interpolate(data.filename || "export", {
          ...ctx.variables,
          workflow_name: ctx.workflow.name,
        }).replace(/[^a-zA-Z0-9-_ ]/g, "");
      }
      return input;
    }
    case BlockType.Integration:
      throw new Error("Integration blocks are coming soon and cannot run yet.");
    default:
      return input;
  }
}

async function persist(
  ctx: EngineContextWithHelpers,
  patch: Partial<WorkflowRun> = {}
): Promise<void> {
  const admin = createAdminSupabase();
  await admin
    .from(TABLES.WORKFLOW_RUNS)
    .update({
      steps: ctx.steps,
      output: { text: ctx.lastOutput(), byBlock: ctx.outputs },
      tokens_used: ctx.tokensUsed,
      ...patch,
    })
    .eq("id", ctx.run.id);
}

interface EngineContextWithHelpers extends EngineContext {
  lastOutput: () => string;
}

async function loadContext(runId: string): Promise<EngineContextWithHelpers> {
  const admin = createAdminSupabase();
  const { data: run, error: runError } = await admin
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("id", runId)
    .single();
  if (runError || !run) {
    throw new Error("Run not found");
  }
  const { data: workflow } = await admin
    .from(TABLES.WORKFLOWS)
    .select("*")
    .eq("id", run.workflow_id)
    .single();
  const { data: workspace } = await admin
    .from(TABLES.WORKSPACES)
    .select("*")
    .eq("id", run.workspace_id)
    .single();
  if (!workflow || !workspace) {
    throw new Error("Workflow or workspace not found");
  }

  const { data: profile } = run.triggered_by
    ? await admin.from(TABLES.PROFILES).select("full_name, email").eq("id", run.triggered_by).single()
    : { data: null };

  const { data: memory } = await admin
    .from(TABLES.MEMORY)
    .select("*")
    .eq("workspace_id", workspace.id)
    .neq("section", "outputs")
    .limit(50);

  const { data: dbVariables } = await admin
    .from(TABLES.VARIABLES)
    .select("*")
    .eq("workspace_id", workspace.id);

  const variables: Record<string, string> = {};
  const scopeOrder = ["workspace", "project", "workflow"] as const;
  for (const scope of scopeOrder) {
    for (const variable of dbVariables ?? []) {
      if (variable.scope !== scope || variable.value == null) {
        continue;
      }
      if (scope === "project" && variable.project_id !== workflow.project_id) {
        continue;
      }
      if (scope === "workflow" && variable.workflow_id !== workflow.id) {
        continue;
      }
      variables[variable.key] = variable.value;
    }
  }
  for (const [key, value] of Object.entries(workflow.variables ?? {})) {
    variables[key] = value;
  }
  for (const [key, value] of Object.entries(run.input.variables ?? {})) {
    variables[key] = value;
  }
  // Brand memory entries double as {{variables}}.
  for (const entry of memory ?? []) {
    if (entry.value && variables[entry.key] === undefined) {
      variables[entry.key] = entry.value;
    }
  }
  Object.assign(
    variables,
    buildSystemVariables({
      userName: profile?.full_name || profile?.email || "there",
      workspaceName: workspace.name,
      runNumber: (workflow.runs_count ?? 0) + 1,
      timezone: workspace.timezone,
    })
  );

  const { provider, model } = await resolveAIProvider({
    userId: run.triggered_by ?? undefined,
    subscriptionTier: workspace.subscription_tier,
  });

  const existingSteps = (run.steps ?? []) as RunStep[];
  const steps: RunStep[] =
    existingSteps.length > 0
      ? existingSteps
      : topoSort(workflow.blocks, workflow.connections).map((block) => ({
          blockId: block.id,
          type: block.type,
          label: (block.data as { label?: string }).label ?? block.type,
          status: "idle" as const,
          input: null,
          output: null,
        }));

  const outputs: Record<string, string> = { ...(run.output?.byBlock ?? {}) };
  const deadEdges = new Set<string>();
  // Rebuild dead edges from already-executed condition blocks (resume case).
  for (const step of steps) {
    if (step.type === BlockType.Condition && step.status === "completed") {
      for (const edge of workflow.connections) {
        if (
          edge.source === step.blockId &&
          edge.sourceHandle &&
          edge.sourceHandle !== step.output
        ) {
          deadEdges.add(edge.id);
        }
      }
    }
    if (step.status === "skipped") {
      for (const edge of workflow.connections) {
        if (edge.source === step.blockId) {
          deadEdges.add(edge.id);
        }
      }
    }
  }

  const ctx: EngineContextWithHelpers = {
    run,
    workflow,
    workspace,
    variables,
    memory: memory ?? [],
    provider,
    model,
    steps,
    outputs,
    deadEdges,
    tokensUsed: run.tokens_used ?? 0,
    lastOutput(): string {
      const order = topoSort(workflow.blocks, workflow.connections);
      for (let index = order.length - 1; index >= 0; index -= 1) {
        const value = outputs[order[index].id];
        if (value !== undefined && order[index].type !== BlockType.Condition) {
          return value;
        }
      }
      return "";
    },
  };
  return ctx;
}

async function isCancelled(runId: string): Promise<boolean> {
  const admin = createAdminSupabase();
  const { data } = await admin
    .from(TABLES.WORKFLOW_RUNS)
    .select("status")
    .eq("id", runId)
    .single();
  return data?.status === "cancelled";
}

/**
 * Executes a run from its current position. Handles fresh starts and
 * resumption after a review block decision.
 */
export async function executeRun(runId: string): Promise<void> {
  const admin = createAdminSupabase();
  let ctx: EngineContextWithHelpers;
  try {
    ctx = await loadContext(runId);
  } catch (error) {
    await admin
      .from(TABLES.WORKFLOW_RUNS)
      .update({
        status: "failed",
        error_message: error instanceof Error ? error.message : "Could not start the run.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return;
  }

  const startedAt = ctx.run.started_at ? new Date(ctx.run.started_at) : new Date();
  await admin
    .from(TABLES.WORKFLOW_RUNS)
    .update({
      status: "running",
      started_at: startedAt.toISOString(),
      ai_provider: ctx.provider.name,
      ai_model: ctx.model,
      review_block_id: null,
    })
    .eq("id", runId);

  const order = topoSort(ctx.workflow.blocks, ctx.workflow.connections);
  const byId = new Map(ctx.workflow.blocks.map((b) => [b.id, b]));
  let failed = false;

  for (const block of order) {
    const step = ctx.steps.find((s) => s.blockId === block.id);
    if (!step || step.status === "completed" || step.status === "skipped") {
      continue;
    }
    if (await isCancelled(runId)) {
      return;
    }

    const incoming = incomingEdges(block.id, ctx.workflow.connections);
    const allDead =
      incoming.length > 0 &&
      incoming.every((edge) => ctx.deadEdges.has(edge.id) || !byId.has(edge.source));
    if (allDead) {
      step.status = "skipped";
      for (const edge of ctx.workflow.connections) {
        if (edge.source === block.id) {
          ctx.deadEdges.add(edge.id);
        }
      }
      await persist(ctx);
      continue;
    }

    if (block.type === BlockType.Review) {
      step.status = "running";
      step.input = gatherInput(ctx, block);
      await persist(ctx, { status: "awaiting_review", review_block_id: block.id });
      return;
    }

    step.status = "running";
    step.startedAt = new Date().toISOString();
    step.input = gatherInput(ctx, block);
    await persist(ctx);

    try {
      const output = await executeBlock(ctx, block);
      step.status = "completed";
      step.output = output;
      step.durationMs = Date.now() - new Date(step.startedAt).getTime();
      ctx.outputs[block.id] = output;
      await persist(ctx);
    } catch (error) {
      step.status = "failed";
      step.error = error instanceof Error ? error.message : "This step failed.";
      step.durationMs = Date.now() - new Date(step.startedAt).getTime();
      failed = true;
      await persist(ctx, {
        status: "failed",
        error_message: step.error,
        completed_at: new Date().toISOString(),
        duration_ms: Date.now() - startedAt.getTime(),
      });
      break;
    }
  }

  if (!failed) {
    await persist(ctx, {
      status: "completed",
      completed_at: new Date().toISOString(),
      duration_ms: Date.now() - startedAt.getTime(),
    });
    await admin
      .from(TABLES.WORKFLOWS)
      .update({
        runs_count: (ctx.workflow.runs_count ?? 0) + 1,
        last_run_at: new Date().toISOString(),
        last_run_status: "completed",
      })
      .eq("id", ctx.workflow.id);
  } else {
    await admin
      .from(TABLES.WORKFLOWS)
      .update({ last_run_at: new Date().toISOString(), last_run_status: "failed" })
      .eq("id", ctx.workflow.id);
  }

  await admin
    .from(TABLES.WORKSPACES)
    .update({
      tokens_used_this_month: (ctx.workspace.tokens_used_this_month ?? 0) + ctx.tokensUsed,
    })
    .eq("id", ctx.workspace.id);
}

/** Applies a review decision and resumes (approve) or fails (reject) the run. */
export async function applyReviewDecision(
  runId: string,
  decision: "approve" | "reject",
  editedOutput?: string
): Promise<void> {
  const admin = createAdminSupabase();
  const { data: run } = await admin
    .from(TABLES.WORKFLOW_RUNS)
    .select("*")
    .eq("id", runId)
    .single();
  if (!run || run.status !== "awaiting_review" || !run.review_block_id) {
    throw new Error("This run is not awaiting review.");
  }
  const steps = (run.steps ?? []) as RunStep[];
  const step = steps.find((s) => s.blockId === run.review_block_id);
  if (!step) {
    throw new Error("Review step not found.");
  }

  if (decision === "reject") {
    step.status = "failed";
    step.error = "Rejected by reviewer.";
    await admin
      .from(TABLES.WORKFLOW_RUNS)
      .update({
        steps,
        status: "cancelled",
        error_message: "Stopped: output was rejected during review.",
        completed_at: new Date().toISOString(),
      })
      .eq("id", runId);
    return;
  }

  const approvedOutput = editedOutput ?? step.input ?? "";
  step.status = "completed";
  step.output = approvedOutput;
  const byBlock = { ...(run.output?.byBlock ?? {}), [step.blockId]: approvedOutput };
  await admin
    .from(TABLES.WORKFLOW_RUNS)
    .update({ steps, output: { ...run.output, byBlock }, review_block_id: null })
    .eq("id", runId);
  await executeRun(runId);
}
