export enum BlockType {
  Input = "input",
  AI = "ai",
  Transform = "transform",
  Condition = "condition",
  Memory = "memory",
  Review = "review",
  Export = "export",
  Integration = "integration",
}

export type BlockStatus = "idle" | "running" | "completed" | "failed" | "skipped";

export type RunStatus =
  | "pending"
  | "running"
  | "awaiting_review"
  | "completed"
  | "failed"
  | "cancelled";

export interface BlockPosition {
  x: number;
  y: number;
}

export type InputSubtype = "text" | "file" | "url" | "form" | "variable";
export type TransformSubtype =
  | "summarize"
  | "rewrite"
  | "translate"
  | "extract"
  | "merge"
  | "split"
  | "format"
  | "convert";
export type ConditionType = "length" | "contains" | "variable_equals" | "expression";
export type MemoryMode = "read" | "write" | "update";
export type ExportSubtype = "pdf" | "markdown" | "docx" | "json" | "clipboard" | "asset";
export type IntegrationService = "email" | "slack" | "notion" | "google-docs" | "webhook";

export interface FormField {
  id: string;
  label: string;
  placeholder?: string;
}

export interface InputBlockData {
  label: string;
  subtype: InputSubtype;
  value?: string;
  placeholder?: string;
  url?: string;
  assetId?: string;
  variableKey?: string;
  fields?: FormField[];
}

export interface AIBlockData {
  label: string;
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  temperature: number;
  maxTokens: number;
  useMemory?: boolean;
  stream?: boolean;
}

export interface TransformBlockData {
  label: string;
  subtype: TransformSubtype;
  instruction?: string;
  targetLanguage?: string;
  format?: string;
}

export interface ConditionBlockData {
  label: string;
  conditionType: ConditionType;
  minWords?: number;
  keyword?: string;
  variableKey?: string;
  expected?: string;
  expression?: string;
  stopOnFalse?: boolean;
}

export interface MemoryBlockData {
  label: string;
  mode: MemoryMode;
  key: string;
}

export interface ReviewBlockData {
  label: string;
  instructions?: string;
  timeoutHours?: number;
}

export interface ExportBlockData {
  label: string;
  subtype: ExportSubtype;
  filename: string;
}

export interface IntegrationBlockData {
  label: string;
  service: IntegrationService;
}

export type BlockData =
  | InputBlockData
  | AIBlockData
  | TransformBlockData
  | ConditionBlockData
  | MemoryBlockData
  | ReviewBlockData
  | ExportBlockData
  | IntegrationBlockData;

export interface WorkflowBlock {
  id: string;
  type: BlockType;
  position: BlockPosition;
  data: BlockData;
}

export interface BlockConnection {
  id: string;
  source: string;
  target: string;
  /** For condition blocks: which branch this edge belongs to. */
  sourceHandle?: "true" | "false" | null;
}

export interface CanvasState {
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface RunStep {
  blockId: string;
  type: BlockType;
  label: string;
  status: BlockStatus;
  input: string | null;
  output: string | null;
  startedAt?: string;
  durationMs?: number;
  tokensUsed?: number;
  error?: string;
  /** For export steps: what the client should render/download. */
  exportSubtype?: ExportSubtype;
  exportFilename?: string;
}

export interface RunInput {
  text?: string;
  fields?: Record<string, string>;
  variables?: Record<string, string>;
}

export interface RunOutput {
  text?: string;
  byBlock?: Record<string, string>;
}
