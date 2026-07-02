import {
  Brain,
  Download,
  Eye,
  GitBranch,
  Plug,
  Sparkles,
  TextCursorInput,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_AI_MAX_TOKENS, DEFAULT_AI_TEMPERATURE } from "@/lib/constants";
import type { BlockData } from "@/types/workflow";
import { BlockType } from "@/types/workflow";

export interface BlockDefinition {
  type: BlockType;
  label: string;
  description: string;
  icon: LucideIcon;
  colorClass: string;
  comingSoon?: boolean;
  defaultData: () => BlockData;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: BlockType.Input,
    label: "Input",
    description: "Text, file, URL, form, or variable",
    icon: TextCursorInput,
    colorClass: "text-info",
    defaultData: () => ({ label: "Input", subtype: "text", value: "", placeholder: "" }),
  },
  {
    type: BlockType.AI,
    label: "AI",
    description: "Generate with your AI provider",
    icon: Sparkles,
    colorClass: "text-primary",
    defaultData: () => ({
      label: "AI",
      systemPrompt: "",
      userPrompt: "{{input}}",
      temperature: DEFAULT_AI_TEMPERATURE,
      maxTokens: DEFAULT_AI_MAX_TOKENS,
      useMemory: false,
    }),
  },
  {
    type: BlockType.Transform,
    label: "Transform",
    description: "Summarize, rewrite, translate…",
    icon: Wand2,
    colorClass: "text-chart-5",
    defaultData: () => ({ label: "Transform", subtype: "summarize", instruction: "" }),
  },
  {
    type: BlockType.Condition,
    label: "Condition",
    description: "Branch on if/else logic",
    icon: GitBranch,
    colorClass: "text-warning",
    defaultData: () => ({
      label: "Condition",
      conditionType: "contains",
      keyword: "",
      stopOnFalse: false,
    }),
  },
  {
    type: BlockType.Memory,
    label: "Memory",
    description: "Read or write brand memory",
    icon: Brain,
    colorClass: "text-chart-2",
    defaultData: () => ({ label: "Memory", mode: "read", key: "" }),
  },
  {
    type: BlockType.Review,
    label: "Review",
    description: "Pause for human approval",
    icon: Eye,
    colorClass: "text-chart-3",
    defaultData: () => ({ label: "Review", instructions: "" }),
  },
  {
    type: BlockType.Export,
    label: "Export",
    description: "PDF, Markdown, DOCX, JSON…",
    icon: Download,
    colorClass: "text-success",
    defaultData: () => ({
      label: "Export",
      subtype: "markdown",
      filename: "{{workflow_name}}-{{current_date}}",
    }),
  },
  {
    type: BlockType.Integration,
    label: "Integrations",
    description: "Email, Slack, Notion — Coming Soon",
    icon: Plug,
    colorClass: "text-muted-foreground",
    comingSoon: true,
    defaultData: () => ({ label: "Integration", service: "email" }),
  },
];

export function getBlockDefinition(type: BlockType): BlockDefinition {
  return (
    BLOCK_DEFINITIONS.find((definition) => definition.type === type) ?? BLOCK_DEFINITIONS[0]
  );
}
