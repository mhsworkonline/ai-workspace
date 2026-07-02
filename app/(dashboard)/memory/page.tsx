"use client";

import { Brain, Check, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteMemory, useMemoryEntries, useUpsertMemory } from "@/hooks/use-memory";
import { useSession } from "@/hooks/use-session";
import type { MemoryEntry } from "@/types/database";

interface MemoryField {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
}

const SECTIONS: { id: string; title: string; description: string; fields: MemoryField[] }[] = [
  {
    id: "brand",
    title: "Brand Identity",
    description: "Injected into AI blocks when memory is enabled.",
    fields: [
      { key: "brand_name", label: "Brand Name" },
      { key: "tagline", label: "Tagline" },
      { key: "website", label: "Website" },
      { key: "industry", label: "Industry" },
    ],
  },
  {
    id: "audience",
    title: "Audience",
    description: "Who your content is for.",
    fields: [
      { key: "audience", label: "Target Audience", multiline: true },
      { key: "demographics", label: "Demographics", multiline: true },
      { key: "pain_points", label: "Pain Points", multiline: true },
    ],
  },
  {
    id: "voice",
    title: "Voice & Tone",
    description: "How your brand should sound.",
    fields: [
      { key: "tone", label: "Writing Style", placeholder: "Casual / Professional / Friendly / Technical" },
      { key: "language", label: "Language", placeholder: "English" },
      { key: "dos", label: "Do's — always include", multiline: true },
      { key: "donts", label: "Don'ts — never say", multiline: true },
    ],
  },
  {
    id: "products",
    title: "Products",
    description: "What you sell.",
    fields: [
      { key: "product", label: "Product Name" },
      { key: "product_description", label: "Description", multiline: true },
      { key: "features", label: "Key Features", multiline: true },
      { key: "pricing", label: "Pricing" },
    ],
  },
];

function MemoryFieldRow({
  field,
  section,
  entry,
  workspaceId,
}: {
  field: MemoryField;
  section: string;
  entry: MemoryEntry | undefined;
  workspaceId: string;
}): JSX.Element {
  const upsert = useUpsertMemory();
  const [value, setValue] = useState(entry?.value ?? "");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setValue(entry?.value ?? "");
  }, [entry?.value]);

  async function saveField(): Promise<void> {
    if (value === (entry?.value ?? "")) {
      return;
    }
    try {
      await upsert.mutateAsync({ workspaceId, key: field.key, value, section });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    }
  }

  const inputId = `memory-${field.key}`;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={inputId} className="flex items-center gap-2">
        {field.label}
        <Badge variant="outline" className="font-mono text-[10px]">{`{{${field.key}}}`}</Badge>
        {saved ? <Check className="h-3 w-3 text-success" aria-label="Saved" /> : null}
        {upsert.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
      </Label>
      {field.multiline ? (
        <Textarea
          id={inputId}
          rows={2}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void saveField()}
        />
      ) : (
        <Input
          id={inputId}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => void saveField()}
        />
      )}
    </div>
  );
}

export default function MemoryPage(): JSX.Element {
  const { session } = useSession();
  const workspaceId = session?.workspace?.id;
  const { data: entries, isLoading } = useMemoryEntries(workspaceId);
  const upsert = useUpsertMemory();
  const deleteMemory = useDeleteMemory();
  const [addOpen, setAddOpen] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customValue, setCustomValue] = useState("");

  if (isLoading || !workspaceId) {
    return <LoadingSkeleton variant="cards" count={4} />;
  }

  const byKey = new Map((entries ?? []).map((entry) => [entry.key, entry]));
  const knownKeys = new Set(SECTIONS.flatMap((section) => section.fields.map((f) => f.key)));
  const customEntries = (entries ?? []).filter(
    (entry) => !knownKeys.has(entry.key) && entry.section !== "outputs"
  );
  const savedOutputs = (entries ?? []).filter((entry) => entry.section === "outputs");
  const isEmpty = (entries ?? []).length === 0;

  return (
    <div>
      <PageHeader
        title="Memory"
        description="Brand context that keeps every AI output consistent."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add Memory
          </Button>
        }
      />
      {isEmpty ? (
        <div className="mb-6">
          <EmptyState
            icon={Brain}
            title="Memory is empty"
            description="Add your brand details to make AI outputs consistent."
            actionLabel="+ Add Memory"
            onAction={() => setAddOpen(true)}
          />
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields.map((field) => (
                <MemoryFieldRow
                  key={field.key}
                  field={field}
                  section={section.id}
                  entry={byKey.get(field.key)}
                  workspaceId={workspaceId}
                />
              ))}
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Custom Entries</CardTitle>
            <CardDescription>Reusable snippets and extra variables.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {customEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No custom entries yet.</p>
            ) : (
              customEntries.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 rounded-md border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-primary">{`{{${entry.key}}}`}</p>
                    <p className="truncate text-sm">{entry.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error"
                    aria-label={`Delete ${entry.key}`}
                    onClick={() => deleteMemory.mutate(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Saved Outputs</CardTitle>
            <CardDescription>Outputs saved by Memory blocks in your workflows.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {savedOutputs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Use a Memory block with “write” mode to save outputs here.
              </p>
            ) : (
              savedOutputs.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 rounded-md border p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-primary">{entry.key}</p>
                    <p className="line-clamp-2 text-sm">{entry.value}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-error"
                    aria-label={`Delete ${entry.key}`}
                    onClick={() => deleteMemory.mutate(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add memory entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="custom-key">Key (used as {"{{variable}}"})</Label>
              <Input
                id="custom-key"
                value={customKey}
                onChange={(event) =>
                  setCustomKey(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))
                }
                placeholder="signature_cta"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custom-value">Value</Label>
              <Textarea
                id="custom-value"
                rows={3}
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!customKey || upsert.isPending}
              onClick={() => {
                upsert.mutate(
                  { workspaceId, key: customKey, value: customValue, section: "custom" },
                  {
                    onSuccess: () => {
                      setAddOpen(false);
                      setCustomKey("");
                      setCustomValue("");
                    },
                    onError: (error) => toast.error(error.message),
                  }
                );
              }}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
