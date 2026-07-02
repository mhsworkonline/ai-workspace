import type {
  BlockConnection,
  CanvasState,
  RunInput,
  RunOutput,
  RunStatus,
  RunStep,
  WorkflowBlock,
} from "./workflow";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Row shapes are type aliases (not interfaces) so they satisfy supabase-js's
// Record<string, unknown> table constraint.

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  is_admin: boolean;
  is_suspended: boolean;
  onboarding_completed: boolean;
  onboarding_step: number;
  notification_prefs: NotificationPrefs;
  created_at: string;
  updated_at: string;
};

export type NotificationPrefs = {
  runComplete?: boolean;
  runFailed?: boolean;
  weeklySummary?: boolean;
};

export type SubscriptionTier = "free" | "pro" | "business";

export type Workspace = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  timezone: string;
  team_size: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: string;
  razorpay_subscription_id: string | null;
  runs_used_this_month: number;
  tokens_used_this_month: number;
  runs_reset_at: string;
  storage_used_bytes: number;
  created_at: string;
  updated_at: string;
};

export type MemberRoleValue = "admin" | "editor" | "viewer";
export type MemberStatus = "pending" | "active" | "removed";

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  email: string | null;
  role: MemberRoleValue;
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: MemberStatus;
};

export type Project = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_archived: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type VariableScope = "workspace" | "project" | "workflow" | "system";

export type Variable = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  workflow_id: string | null;
  scope: VariableScope;
  key: string;
  value: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Workflow = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  created_by: string | null;
  name: string;
  description: string | null;
  is_template: boolean;
  template_category: string | null;
  is_public: boolean;
  blocks: WorkflowBlock[];
  connections: BlockConnection[];
  canvas_state: CanvasState;
  variables: Record<string, string>;
  runs_count: number;
  last_run_at: string | null;
  last_run_status: string | null;
  version: number;
  is_archived: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkflowVersion = {
  id: string;
  workflow_id: string;
  version: number;
  blocks: WorkflowBlock[];
  connections: BlockConnection[];
  created_by: string | null;
  created_at: string;
};

export type WorkflowRun = {
  id: string;
  workflow_id: string;
  workspace_id: string;
  triggered_by: string | null;
  status: RunStatus;
  input: RunInput;
  output: RunOutput;
  steps: RunStep[];
  error_message: string | null;
  review_block_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: number;
  ai_provider: string | null;
  ai_model: string | null;
  created_at: string;
};

export type MemoryType = "text" | "file" | "variable" | "output";

export type MemoryEntry = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  created_by: string | null;
  key: string;
  value: string | null;
  type: MemoryType;
  section: string;
  file_url: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  workspace_id: string;
  project_id: string | null;
  uploaded_by: string | null;
  name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  mime_type: string | null;
  tags: string[];
  folder: string | null;
  notes: string | null;
  used_in_workflows: string[];
  version: number;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Template = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  icon: string | null;
  blocks: WorkflowBlock[];
  connections: BlockConnection[];
  variables: Record<string, string>;
  is_active: boolean;
  use_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminSetting = {
  id: string;
  key: string;
  value: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type UserAISettings = {
  id: string;
  user_id: string;
  use_custom_provider: boolean;
  provider: string;
  api_key_encrypted: string | null;
  model: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityLogEntry = {
  id: string;
  workspace_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, Json>;
  created_at: string;
};

type Tbl<R extends Record<string, unknown>> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      aiw_profiles: Tbl<Profile>;
      aiw_workspaces: Tbl<Workspace>;
      aiw_workspace_members: Tbl<WorkspaceMember>;
      aiw_projects: Tbl<Project>;
      aiw_variables: Tbl<Variable>;
      aiw_workflows: Tbl<Workflow>;
      aiw_workflow_versions: Tbl<WorkflowVersion>;
      aiw_workflow_runs: Tbl<WorkflowRun>;
      aiw_memory: Tbl<MemoryEntry>;
      aiw_assets: Tbl<Asset>;
      aiw_templates: Tbl<Template>;
      aiw_admin_settings: Tbl<AdminSetting>;
      aiw_user_ai_settings: Tbl<UserAISettings>;
      aiw_activity_log: Tbl<ActivityLogEntry>;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
