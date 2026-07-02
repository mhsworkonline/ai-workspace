import "server-only";
import type { AIProvider, ResolvedAIProvider } from "@/types/ai";
import { ADMIN_SETTING_KEYS, AIProviderName, TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { decryptSecret } from "@/lib/utils/encrypt";
import { GroqProvider } from "./providers/groq";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAIProvider } from "./providers/openai";
import { GeminiProvider } from "./providers/gemini";

const ENV_KEYS: Record<AIProviderName, string | undefined> = {
  [AIProviderName.Groq]: process.env.GROQ_API_KEY,
  [AIProviderName.Anthropic]: process.env.ANTHROPIC_API_KEY,
  [AIProviderName.OpenAI]: process.env.OPENAI_API_KEY,
  [AIProviderName.Gemini]: process.env.GEMINI_API_KEY,
};

export function instantiateProvider(name: AIProviderName, apiKey: string): AIProvider {
  switch (name) {
    case AIProviderName.Groq:
      return new GroqProvider(apiKey);
    case AIProviderName.Anthropic:
      return new AnthropicProvider(apiKey);
    case AIProviderName.OpenAI:
      return new OpenAIProvider(apiKey);
    case AIProviderName.Gemini:
      return new GeminiProvider(apiKey);
  }
}

function isProviderName(value: string | null | undefined): value is AIProviderName {
  return Object.values(AIProviderName).includes(value as AIProviderName);
}

async function loadAdminSettings(): Promise<Map<string, string>> {
  const admin = createAdminSupabase();
  const { data, error } = await admin.from(TABLES.ADMIN_SETTINGS).select("key, value");
  if (error) {
    throw new Error(`Failed to load AI settings: ${error.message}`);
  }
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.key && row.value) {
      map.set(row.key, row.value);
    }
  }
  return map;
}

function resolveKeyFor(name: AIProviderName, settings: Map<string, string>): string | null {
  const stored = settings.get(`${ADMIN_SETTING_KEYS.API_KEY_PREFIX}${name}`);
  if (stored) {
    try {
      return decryptSecret(stored);
    } catch {
      return null;
    }
  }
  return ENV_KEYS[name] ?? null;
}

export interface ResolveOptions {
  userId?: string;
  subscriptionTier?: string;
  /** Preferred model — used only if it belongs to the resolved provider. */
  model?: string;
}

/**
 * Provider resolution order:
 * 1. User's own key (Pro/Business with custom provider enabled)
 * 2. Admin-selected active provider (stored key or env fallback)
 * 3. Admin-selected fallback provider
 */
export async function resolveAIProvider(options: ResolveOptions = {}): Promise<ResolvedAIProvider> {
  const settings = await loadAdminSettings();

  if (
    options.userId &&
    (options.subscriptionTier === "pro" || options.subscriptionTier === "business")
  ) {
    const admin = createAdminSupabase();
    const { data: userSettings } = await admin
      .from(TABLES.USER_AI_SETTINGS)
      .select("*")
      .eq("user_id", options.userId)
      .maybeSingle();
    if (
      userSettings?.use_custom_provider &&
      userSettings.api_key_encrypted &&
      isProviderName(userSettings.provider)
    ) {
      try {
        const key = decryptSecret(userSettings.api_key_encrypted);
        const provider = instantiateProvider(userSettings.provider, key);
        return {
          provider,
          model: userSettings.model || provider.defaultModel,
          source: "user",
        };
      } catch {
        // Fall through to platform provider on bad user key.
      }
    }
  }

  const activeName = settings.get(ADMIN_SETTING_KEYS.ACTIVE_PROVIDER);
  if (isProviderName(activeName)) {
    const key = resolveKeyFor(activeName, settings);
    if (key) {
      const provider = instantiateProvider(activeName, key);
      const model =
        options.model ||
        settings.get(`${ADMIN_SETTING_KEYS.DEFAULT_MODEL_PREFIX}${activeName}`) ||
        provider.defaultModel;
      return { provider, model, source: "admin" };
    }
  }

  const fallbackName = settings.get(ADMIN_SETTING_KEYS.FALLBACK_PROVIDER);
  if (isProviderName(fallbackName)) {
    const key = resolveKeyFor(fallbackName, settings);
    if (key) {
      const provider = instantiateProvider(fallbackName, key);
      const model =
        settings.get(`${ADMIN_SETTING_KEYS.DEFAULT_MODEL_PREFIX}${fallbackName}`) ||
        provider.defaultModel;
      return { provider, model, source: "fallback" };
    }
  }

  throw new Error(
    "No AI provider is configured. Add a GROQ_API_KEY to the environment or configure a provider in Admin → Settings → AI."
  );
}

/** Makes a tiny test call to verify a provider + key works. */
export async function testProviderConnection(
  name: AIProviderName,
  apiKey: string,
  model?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const provider = instantiateProvider(name, apiKey);
    await provider.generate([{ role: "user", content: "Reply with the single word: ok" }], {
      model: model || provider.defaultModel,
      maxTokens: 10,
      temperature: 0,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Connection failed" };
  }
}
