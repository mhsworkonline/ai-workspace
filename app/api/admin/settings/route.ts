import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SETTING_KEYS, AIProviderName, TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminContext, jsonData, jsonError } from "@/lib/server/auth";
import { decryptSecret, encryptSecret, maskKey } from "@/lib/utils/encrypt";

const ENV_KEYS: Record<string, string | undefined> = {
  groq: process.env.GROQ_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
};

const saveSchema = z.object({
  activeProvider: z.nativeEnum(AIProviderName),
  fallbackProvider: z.union([z.nativeEnum(AIProviderName), z.literal("")]),
  defaultModels: z.record(z.string(), z.string()),
  apiKeys: z.record(z.string(), z.string()),
});

export async function GET(): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const admin = createAdminSupabase();
  const { data } = await admin.from(TABLES.ADMIN_SETTINGS).select("key, value");
  const map = new Map((data ?? []).map((row) => [row.key, row.value ?? ""]));

  const providers = Object.values(AIProviderName).map((name) => {
    const stored = map.get(`${ADMIN_SETTING_KEYS.API_KEY_PREFIX}${name}`) ?? "";
    let masked: string | null = null;
    let source: "stored" | "env" | "none" = "none";
    if (stored) {
      try {
        masked = maskKey(decryptSecret(stored));
        source = "stored";
      } catch {
        masked = null;
      }
    }
    if (!masked && ENV_KEYS[name]) {
      masked = maskKey(ENV_KEYS[name] as string);
      source = "env";
    }
    return {
      name,
      maskedKey: masked,
      keySource: source,
      defaultModel: map.get(`${ADMIN_SETTING_KEYS.DEFAULT_MODEL_PREFIX}${name}`) ?? "",
    };
  });

  return jsonData({
    activeProvider: map.get(ADMIN_SETTING_KEYS.ACTIVE_PROVIDER) ?? "groq",
    fallbackProvider: map.get(ADMIN_SETTING_KEYS.FALLBACK_PROVIDER) ?? "",
    providers,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid settings.");
  }
  const input = parsed.data;
  const admin = createAdminSupabase();

  const rows: { key: string; value: string; updated_by: string }[] = [
    { key: ADMIN_SETTING_KEYS.ACTIVE_PROVIDER, value: input.activeProvider, updated_by: ctx.userId },
    {
      key: ADMIN_SETTING_KEYS.FALLBACK_PROVIDER,
      value: input.fallbackProvider,
      updated_by: ctx.userId,
    },
  ];
  for (const [provider, model] of Object.entries(input.defaultModels)) {
    rows.push({
      key: `${ADMIN_SETTING_KEYS.DEFAULT_MODEL_PREFIX}${provider}`,
      value: model,
      updated_by: ctx.userId,
    });
  }
  for (const [provider, apiKey] of Object.entries(input.apiKeys)) {
    if (apiKey) {
      rows.push({
        key: `${ADMIN_SETTING_KEYS.API_KEY_PREFIX}${provider}`,
        value: encryptSecret(apiKey),
        updated_by: ctx.userId,
      });
    }
  }

  const { error } = await admin
    .from(TABLES.ADMIN_SETTINGS)
    .upsert(rows as never[], { onConflict: "key" });
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData({ ok: true });
}
