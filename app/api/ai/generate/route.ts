import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveAIProvider } from "@/lib/ai/factory";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";

export const maxDuration = 120;

const schema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string().max(100_000),
      })
    )
    .min(1),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().max(8192).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid AI request.");
  }
  try {
    const { provider, model } = await resolveAIProvider({ userId: ctx.userId });
    const response = await provider.generate(parsed.data.messages, {
      model: parsed.data.model || model,
      temperature: parsed.data.temperature,
      maxTokens: parsed.data.maxTokens,
    });
    return jsonData(response);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "AI provider connection failed. Check your API key in Settings.",
      502
    );
  }
}
