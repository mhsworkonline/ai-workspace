"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/hooks/use-session";
import { useVariables } from "@/hooks/use-variables";
import { AI_PROVIDER_MODELS, SYSTEM_VARIABLE_KEYS } from "@/lib/constants";
import { useCanvasStore } from "@/stores/canvas.store";
import type {
  AIBlockData,
  ConditionBlockData,
  ExportBlockData,
  InputBlockData,
  MemoryBlockData,
  ReviewBlockData,
  TransformBlockData,
  WorkflowBlock,
} from "@/types/workflow";
import { BlockType } from "@/types/workflow";
import { getBlockDefinition } from "./block-defs";

const ALL_MODELS = Object.values(AI_PROVIDER_MODELS).flat();

function VariableChips({ onInsert }: { onInsert: (token: string) => void }): JSX.Element {
  const { session } = useSession();
  const { data: variables } = useVariables(session?.workspace?.id);
  const keys = [
    "input",
    ...SYSTEM_VARIABLE_KEYS,
    ...(variables ?? []).map((variable) => variable.key),
  ];
  return (
    <div className="flex flex-wrap gap-1" aria-label="Insert variable">
      {keys.slice(0, 14).map((key) => (
        <Badge
          key={key}
          variant="outline"
          role="button"
          tabIndex={0}
          className="cursor-pointer font-mono text-[10px] hover:bg-accent"
          onClick={() => onInsert(`{{${key}}}`)}
          onKeyDown={(event) => event.key === "Enter" && onInsert(`{{${key}}}`)}
        >
          {`{{${key}}}`}
        </Badge>
      ))}
    </div>
  );
}

export function BlockSettings(): JSX.Element | null {
  const { blocks, selectedIds, updateBlockData, deleteSelected } = useCanvasStore();
  const block = blocks.find((candidate) => candidate.id === selectedIds[0]);
  if (!block || selectedIds.length !== 1) {
    return null;
  }
  const definition = getBlockDefinition(block.type);

  return (
    <aside
      className="flex w-80 shrink-0 flex-col border-l bg-background"
      aria-label="Block settings"
    >
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <definition.icon className={`h-4 w-4 ${definition.colorClass}`} aria-hidden />
          <span className="text-sm font-semibold">{definition.label} settings</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-error"
          aria-label="Delete block"
          onClick={deleteSelected}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label htmlFor="block-label">Label</Label>
          <Input
            id="block-label"
            value={block.data.label}
            onChange={(event) => updateBlockData(block.id, { label: event.target.value })}
          />
        </div>
        <TypeSettings block={block} onChange={(data) => updateBlockData(block.id, data)} />
      </div>
    </aside>
  );
}

interface TypeSettingsProps {
  block: WorkflowBlock;
  onChange: (data: Record<string, unknown>) => void;
}

function TypeSettings({ block, onChange }: TypeSettingsProps): JSX.Element | null {
  switch (block.type) {
    case BlockType.Input: {
      const data = block.data as InputBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label>Input type</Label>
            <Select value={data.subtype} onValueChange={(subtype) => onChange({ subtype })}>
              <SelectTrigger aria-label="Input type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="form">Form</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
                <SelectItem value="file">File</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.subtype === "text" ? (
            <div className="space-y-1.5">
              <Label htmlFor="input-value">Default text (blank = ask at run time)</Label>
              <Textarea
                id="input-value"
                rows={4}
                value={data.value ?? ""}
                onChange={(event) => onChange({ value: event.target.value })}
              />
              <VariableChips onInsert={(token) => onChange({ value: `${data.value ?? ""}${token}` })} />
            </div>
          ) : null}
          {data.subtype === "url" ? (
            <div className="space-y-1.5">
              <Label htmlFor="input-url">URL to fetch</Label>
              <Input
                id="input-url"
                value={data.url ?? ""}
                onChange={(event) => onChange({ url: event.target.value })}
                placeholder="https://…"
              />
            </div>
          ) : null}
          {data.subtype === "variable" ? (
            <div className="space-y-1.5">
              <Label htmlFor="input-variable">Variable key</Label>
              <Input
                id="input-variable"
                value={data.variableKey ?? ""}
                onChange={(event) => onChange({ variableKey: event.target.value })}
                placeholder="brand_name"
              />
            </div>
          ) : null}
          {data.subtype === "form" ? (
            <div className="space-y-2">
              <Label>Form fields</Label>
              {(data.fields ?? []).map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    value={field.label}
                    aria-label={`Field ${index + 1} label`}
                    onChange={(event) => {
                      const fields = [...(data.fields ?? [])];
                      fields[index] = { ...field, label: event.target.value };
                      onChange({ fields });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove field"
                    onClick={() =>
                      onChange({ fields: (data.fields ?? []).filter((f) => f.id !== field.id) })
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onChange({
                    fields: [
                      ...(data.fields ?? []),
                      { id: crypto.randomUUID(), label: `Field ${(data.fields?.length ?? 0) + 1}` },
                    ],
                  })
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden /> Add field
              </Button>
            </div>
          ) : null}
        </>
      );
    }
    case BlockType.AI: {
      const data = block.data as AIBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="ai-system">System prompt</Label>
            <Textarea
              id="ai-system"
              rows={3}
              value={data.systemPrompt ?? ""}
              onChange={(event) => onChange({ systemPrompt: event.target.value })}
              placeholder="You are a helpful expert…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-user">User prompt</Label>
            <Textarea
              id="ai-user"
              rows={5}
              value={data.userPrompt}
              onChange={(event) => onChange({ userPrompt: event.target.value })}
              placeholder="Write about {{input}}"
            />
            <VariableChips
              onInsert={(token) => onChange({ userPrompt: `${data.userPrompt}${token}` })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Model</Label>
            <Select
              value={data.model ?? "default"}
              onValueChange={(model) => onChange({ model: model === "default" ? undefined : model })}
            >
              <SelectTrigger aria-label="AI model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  Use workspace default (set in Admin → AI Settings)
                </SelectItem>
                {ALL_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Temperature: {data.temperature.toFixed(1)}</Label>
            <Slider
              value={[data.temperature]}
              min={0}
              max={1}
              step={0.1}
              onValueChange={([temperature]) => onChange({ temperature })}
              aria-label="Temperature"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ai-max-tokens">Max tokens</Label>
            <Input
              id="ai-max-tokens"
              type="number"
              min={64}
              max={8192}
              value={data.maxTokens}
              onChange={(event) => onChange({ maxTokens: Number(event.target.value) || 2048 })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="ai-memory">Use brand memory</Label>
            <Switch
              id="ai-memory"
              checked={data.useMemory ?? false}
              onCheckedChange={(useMemory) => onChange({ useMemory })}
            />
          </div>
        </>
      );
    }
    case BlockType.Transform: {
      const data = block.data as TransformBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label>Transform type</Label>
            <Select value={data.subtype} onValueChange={(subtype) => onChange({ subtype })}>
              <SelectTrigger aria-label="Transform type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["summarize", "rewrite", "translate", "extract", "merge", "split", "format", "convert"].map(
                  (subtype) => (
                    <SelectItem key={subtype} value={subtype} className="capitalize">
                      {subtype}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          {data.subtype === "translate" ? (
            <div className="space-y-1.5">
              <Label htmlFor="transform-language">Target language</Label>
              <Input
                id="transform-language"
                value={data.targetLanguage ?? ""}
                onChange={(event) => onChange({ targetLanguage: event.target.value })}
                placeholder="Spanish"
              />
            </div>
          ) : null}
          {data.subtype === "format" ? (
            <div className="space-y-1.5">
              <Label htmlFor="transform-format">Target format</Label>
              <Input
                id="transform-format"
                value={data.format ?? ""}
                onChange={(event) => onChange({ format: event.target.value })}
                placeholder="JSON / CSV / Table"
              />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="transform-instruction">Extra instructions</Label>
            <Textarea
              id="transform-instruction"
              rows={3}
              value={data.instruction ?? ""}
              onChange={(event) => onChange({ instruction: event.target.value })}
              placeholder="Condense to 300 words…"
            />
          </div>
        </>
      );
    }
    case BlockType.Condition: {
      const data = block.data as ConditionBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label>Condition</Label>
            <Select
              value={data.conditionType}
              onValueChange={(conditionType) => onChange({ conditionType })}
            >
              <SelectTrigger aria-label="Condition type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains keyword</SelectItem>
                <SelectItem value="length">Longer than N words</SelectItem>
                <SelectItem value="variable_equals">Variable equals value</SelectItem>
                <SelectItem value="expression">Custom expression</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {data.conditionType === "contains" ? (
            <div className="space-y-1.5">
              <Label htmlFor="condition-keyword">Keyword</Label>
              <Input
                id="condition-keyword"
                value={data.keyword ?? ""}
                onChange={(event) => onChange({ keyword: event.target.value })}
              />
            </div>
          ) : null}
          {data.conditionType === "length" ? (
            <div className="space-y-1.5">
              <Label htmlFor="condition-words">Minimum words</Label>
              <Input
                id="condition-words"
                type="number"
                min={0}
                value={data.minWords ?? 0}
                onChange={(event) => onChange({ minWords: Number(event.target.value) || 0 })}
              />
            </div>
          ) : null}
          {data.conditionType === "variable_equals" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="condition-variable">Variable key</Label>
                <Input
                  id="condition-variable"
                  value={data.variableKey ?? ""}
                  onChange={(event) => onChange({ variableKey: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condition-expected">Expected value</Label>
                <Input
                  id="condition-expected"
                  value={data.expected ?? ""}
                  onChange={(event) => onChange({ expected: event.target.value })}
                />
              </div>
            </>
          ) : null}
          {data.conditionType === "expression" ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="condition-expression">Expression (with variables)</Label>
                <Input
                  id="condition-expression"
                  value={data.expression ?? ""}
                  onChange={(event) => onChange({ expression: event.target.value })}
                  placeholder="{{tone}}"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condition-expr-expected">Equals</Label>
                <Input
                  id="condition-expr-expected"
                  value={data.expected ?? ""}
                  onChange={(event) => onChange({ expected: event.target.value })}
                  placeholder="casual"
                />
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between">
            <Label htmlFor="condition-stop">Stop when false</Label>
            <Switch
              id="condition-stop"
              checked={data.stopOnFalse ?? false}
              onCheckedChange={(stopOnFalse) => onChange({ stopOnFalse })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Green port = true branch · Red port = false branch
          </p>
        </>
      );
    }
    case BlockType.Memory: {
      const data = block.data as MemoryBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label>Mode</Label>
            <Select value={data.mode} onValueChange={(mode) => onChange({ mode })}>
              <SelectTrigger aria-label="Memory mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read from memory</SelectItem>
                <SelectItem value="write">Write output to memory</SelectItem>
                <SelectItem value="update">Update memory entry</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="memory-key">Memory key</Label>
            <Input
              id="memory-key"
              value={data.key}
              onChange={(event) => onChange({ key: event.target.value })}
              placeholder="brand_name"
            />
          </div>
        </>
      );
    }
    case BlockType.Review: {
      const data = block.data as ReviewBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="review-instructions">Reviewer instructions</Label>
            <Textarea
              id="review-instructions"
              rows={3}
              value={data.instructions ?? ""}
              onChange={(event) => onChange({ instructions: event.target.value })}
              placeholder="Check tone and accuracy before approving"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The run pauses here until someone approves, edits, or rejects the output.
          </p>
        </>
      );
    }
    case BlockType.Export: {
      const data = block.data as ExportBlockData;
      return (
        <>
          <div className="space-y-1.5">
            <Label>Format</Label>
            <Select value={data.subtype} onValueChange={(subtype) => onChange({ subtype })}>
              <SelectTrigger aria-label="Export format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="markdown">Markdown (.md)</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="docx">Word (.docx)</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="clipboard">Copy to clipboard</SelectItem>
                <SelectItem value="asset">Save as asset</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="export-filename">Filename</Label>
            <Input
              id="export-filename"
              value={data.filename}
              onChange={(event) => onChange({ filename: event.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Supports {"{{workflow_name}}"} and {"{{current_date}}"}
            </p>
          </div>
        </>
      );
    }
    default:
      return null;
  }
}
