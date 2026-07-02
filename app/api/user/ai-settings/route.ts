import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { AIProviderName, TABLES } from "@/lib/constants";
import { getAuthedContext, jsonData, jsonError, unauthorized } from "@/lib/server/auth";
import { encryptSecret, maskKey } from "@/lib/utils/encrypt";

const schema = z.object({
  useCustomProvider: z.boolean(),
  provider: z.nativeEnum(AIProviderName).optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
});

export async function GET(): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const { data } = await ctx.supabase
    .from(TABLES.USER_AI_SETTINGS)
    .select("use_custom_provider, provider, model, api_key_encrypted")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  return jsonData({
    useCustomProvider: data?.use_custom_provider ?? false,
    provider: data?.provider ?? "groq",
    model: data?.model ?? null,
    hasKey: Boolean(data?.api_key_encrypted),
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid AI settings.");
  }
  const input = parsed.data;

  if (input.useCustomProvider) {
    const { data: workspace } = await ctx.supabase
      .from(TABLES.WORKSPACES)
      .select("subscription_tier")
      .eq("owner_id", ctx.userId)
      .maybeSingle();
    const tier = workspace?.subscription_tier ?? "free";
    if (tier === "free") {
      return jsonError("Using your own API key requires the Pro or Business plan.", 403, true);
    }
  }

  const row: Record<string, unknown> = {
    user_id: ctx.userId,
    use_custom_provider: input.useCustomProvider,
    provider: input.provider ?? "groq",
    model: input.model ?? null,
  };
  if (input.apiKey) {
    row.api_key_encrypted = encryptSecret(input.apiKey);
  }

  const { error } = await ctx.supabase
    .from(TABLES.USER_AI_SETTINGS)
    .upsert(row as never, { onConflict: "user_id" });
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData({ ok: true, maskedKey: input.apiKey ? maskKey(input.apiKey) : null });
}
