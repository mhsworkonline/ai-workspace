import type { NextRequest } from "next/server";
import { z } from "zod";
import { resolveAIProvider } from "@/lib/ai/factory";
import { getAuthedContext } from "@/lib/server/auth";

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

export async function POST(request: NextRequest): Promise<Response> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return new Response("Unauthorized", { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return new Response("Invalid AI request", { status: 400 });
  }

  const { provider, model } = await resolveAIProvider({ userId: ctx.userId });
  const { messages, temperature, maxTokens } = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of provider.stream(messages, {
          model: parsed.data.model || model,
          temperature,
          maxTokens,
        })) {
          if (chunk.text) {
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`\n[Error: ${error instanceof Error ? error.message : "stream failed"}]`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" },
  });
}
