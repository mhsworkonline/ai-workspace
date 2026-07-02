import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { testProviderConnection } from "@/lib/ai/factory";
import { AIProviderName } from "@/lib/constants";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";

export const maxDuration = 30;

const schema = z.object({
  provider: z.nativeEnum(AIProviderName),
  apiKey: z.string().min(1),
  model: z.string().optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Provider and API key are required.");
  }
  const result = await testProviderConnection(
    parsed.data.provider,
    parsed.data.apiKey,
    parsed.data.model
  );
  if (!result.ok) {
    return jsonError(result.error ?? "Connection failed.", 502);
  }
  return jsonData({ ok: true });
}
