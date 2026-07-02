"use client";

import { LayoutTemplate, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { SearchInput } from "@/components/shared/search-input";
import { TemplateIcon } from "@/components/shared/template-icon";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import { useTemplates } from "@/hooks/use-templates";
import { useCreateWorkflow } from "@/hooks/use-workflows";
import { ApiError } from "@/lib/api/http";
import { TEMPLATE_CATEGORY_LABELS, TemplateCategory } from "@/lib/constants";
import { getBlockDefinition } from "@/components/workflow/block-defs";
import type { Template } from "@/types/database";
import type { BlockType } from "@/types/workflow";

export default function TemplatesPage(): JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data: templates, isLoading } = useTemplates();
  const createWorkflow = useCreateWorkflow();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [preview, setPreview] = useState<Template | null>(null);
  const [usingId, setUsingId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string>();

  const filtered = (templates ?? []).filter(
    (template) =>
      (category === "all" || template.category === category) &&
      (template.name.toLowerCase().includes(query.toLowerCase()) ||
        (template.description ?? "").toLowerCase().includes(query.toLowerCase()))
  );

  async function applyTemplate(template: Template): Promise<void> {
    if (!session?.workspace) {
      return;
    }
    setUsingId(template.id);
    try {
      const workflow = await createWorkflow.mutateAsync({
        workspaceId: session.workspace.id,
        name: template.name,
        templateId: template.id,
      });
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeMessage(error.message);
        setUpgradeOpen(true);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not use template");
      }
    } finally {
      setUsingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Proven workflows, ready to use."
        actions={<SearchInput placeholder="Search templates…" onSearch={setQuery} />}
      />
      <Tabs value={category} onValueChange={setCategory} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.values(TemplateCategory).map((value) => (
            <TabsTrigger key={value} value={value}>
              {TEMPLATE_CATEGORY_LABELS[value]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isLoading ? (
        <LoadingSkeleton variant="cards" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title="No templates found"
          description="Try a different search or category."
          actionLabel="Clear Search"
          onAction={() => {
            setQuery("");
            setCategory("all");
          }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <Card key={template.id} className="flex flex-col transition-shadow hover:shadow-md">
              <CardContent className="flex flex-1 flex-col p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
                    <TemplateIcon icon={template.icon} className="h-5 w-5 text-accent-foreground" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold">{template.name}</p>
                    <Badge variant="secondary" className="mt-1 capitalize">
                      {template.category}
                    </Badge>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-sm text-muted-foreground">{template.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {template.blocks.length} blocks · used {template.use_count}×
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreview(template)}>
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => void applyTemplate(template)}
                      disabled={usingId === template.id}
                    >
                      {usingId === template.id ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                      ) : null}
                      Use Template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.name}</DialogTitle>
            <DialogDescription>{preview?.description}</DialogDescription>
          </DialogHeader>
          <ol className="space-y-1.5" aria-label="Template blocks">
            {(preview?.blocks ?? []).map((block, index) => {
              const definition = getBlockDefinition(block.type as BlockType);
              return (
                <li key={block.id} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <definition.icon className={`h-4 w-4 ${definition.colorClass}`} aria-hidden />
                  <span className="font-medium">{(block.data as { label?: string }).label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{definition.label}</span>
                </li>
              );
            })}
          </ol>
          <DialogFooter>
            <Button
              onClick={() => {
                if (preview) {
                  void applyTemplate(preview);
                  setPreview(null);
                }
              }}
            >
              Use Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}
