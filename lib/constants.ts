export const APP_NAME = "AI Workspace";

/** Every AI Workspace table lives in the shared `my-common` Supabase project, prefixed aiw_. */
export const TABLES = {
  PROFILES: "aiw_profiles",
  WORKSPACES: "aiw_workspaces",
  WORKSPACE_MEMBERS: "aiw_workspace_members",
  PROJECTS: "aiw_projects",
  VARIABLES: "aiw_variables",
  WORKFLOWS: "aiw_workflows",
  WORKFLOW_VERSIONS: "aiw_workflow_versions",
  WORKFLOW_RUNS: "aiw_workflow_runs",
  MEMORY: "aiw_memory",
  ASSETS: "aiw_assets",
  TEMPLATES: "aiw_templates",
  ADMIN_SETTINGS: "aiw_admin_settings",
  USER_AI_SETTINGS: "aiw_user_ai_settings",
  ACTIVITY_LOG: "aiw_activity_log",
} as const;

export const BUCKETS = {
  ASSETS: "aiw-assets",
  AVATARS: "aiw-avatars",
} as const;

export enum PlanTier {
  Free = "free",
  Pro = "pro",
  Business = "business",
}

export interface PlanLimits {
  label: string;
  priceInr: number;
  projects: number;
  workflows: number;
  runsPerMonth: number;
  tokensPerMonth: number;
  storageBytes: number;
  teamMembers: number;
  customApiKey: boolean;
}

export const UNLIMITED = Number.POSITIVE_INFINITY;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.Free]: {
    label: "Free",
    priceInr: 0,
    projects: 3,
    workflows: 3,
    runsPerMonth: 10,
    tokensPerMonth: 50_000,
    storageBytes: 100 * 1024 * 1024,
    teamMembers: 1,
    customApiKey: false,
  },
  [PlanTier.Pro]: {
    label: "Pro",
    priceInr: 999,
    projects: UNLIMITED,
    workflows: UNLIMITED,
    runsPerMonth: 1_000,
    tokensPerMonth: UNLIMITED,
    storageBytes: 10 * 1024 * 1024 * 1024,
    teamMembers: 5,
    customApiKey: true,
  },
  [PlanTier.Business]: {
    label: "Business",
    priceInr: 4_999,
    projects: UNLIMITED,
    workflows: UNLIMITED,
    runsPerMonth: UNLIMITED,
    tokensPerMonth: UNLIMITED,
    storageBytes: 100 * 1024 * 1024 * 1024,
    teamMembers: UNLIMITED,
    customApiKey: true,
  },
};

export enum AIProviderName {
  Groq = "groq",
  Anthropic = "anthropic",
  OpenAI = "openai",
  Gemini = "gemini",
}

export interface AIModelInfo {
  id: string;
  label: string;
  costPer1kTokensUsd: number;
}

export const AI_PROVIDER_MODELS: Record<AIProviderName, AIModelInfo[]> = {
  [AIProviderName.Groq]: [
    { id: "llama-3.1-70b-versatile", label: "Llama 3.1 70B Versatile", costPer1kTokensUsd: 0.0008 },
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant", costPer1kTokensUsd: 0.0001 },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", costPer1kTokensUsd: 0.0003 },
  ],
  [AIProviderName.Anthropic]: [
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6", costPer1kTokensUsd: 0.009 },
    { id: "claude-opus-4-8", label: "Claude Opus 4.8", costPer1kTokensUsd: 0.03 },
  ],
  [AIProviderName.OpenAI]: [
    { id: "gpt-4o", label: "GPT-4o", costPer1kTokensUsd: 0.0075 },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", costPer1kTokensUsd: 0.0004 },
  ],
  [AIProviderName.Gemini]: [
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", costPer1kTokensUsd: 0.0044 },
    { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", costPer1kTokensUsd: 0.0003 },
  ],
};

export const AI_PROVIDER_LABELS: Record<AIProviderName, string> = {
  [AIProviderName.Groq]: "Groq",
  [AIProviderName.Anthropic]: "Anthropic",
  [AIProviderName.OpenAI]: "OpenAI",
  [AIProviderName.Gemini]: "Google Gemini",
};

export const DEFAULT_AI_TEMPERATURE = 0.7;
export const DEFAULT_AI_MAX_TOKENS = 2048;

export const SYSTEM_VARIABLE_KEYS = [
  "current_date",
  "current_time",
  "current_datetime",
  "user_name",
  "workspace_name",
  "run_number",
] as const;

export const CANVAS_GRID_SIZE = 16;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ACTIVITY_PAGE_SIZE = 50;
export const RUN_POLL_INTERVAL_MS = 1500;

export enum MemberRole {
  Admin = "admin",
  Editor = "editor",
  Viewer = "viewer",
}

export enum TemplateCategory {
  Creator = "creator",
  Founder = "founder",
  Business = "business",
  Research = "research",
  Developer = "developer",
}

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.Creator]: "Creator",
  [TemplateCategory.Founder]: "Founder",
  [TemplateCategory.Business]: "Business",
  [TemplateCategory.Research]: "Research",
  [TemplateCategory.Developer]: "Developer",
};

export const ADMIN_SETTING_KEYS = {
  ACTIVE_PROVIDER: "ai_active_provider",
  FALLBACK_PROVIDER: "ai_fallback_provider",
  API_KEY_PREFIX: "ai_api_key_",
  DEFAULT_MODEL_PREFIX: "ai_default_model_",
} as const;
