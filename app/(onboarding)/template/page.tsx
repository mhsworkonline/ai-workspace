"use client";

import { FilePlus2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { useTemplates } from "@/hooks/use-templates";
import { createWorkflow } from "@/lib/api/workflows";
import { useOnboardingStore } from "@/stores/onboarding.store";
import { TemplateIcon } from "@/components/shared/template-icon";

export default function TemplateStepPage(): JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { data: templates, isLoading } = useTemplates();
  const { projectId, setWorkflowId } = useOnboardingStore();
  const [creating, setCreating] = useState<string | null>(null);

  async function choose(templateId: string | null, name: string): Promise<void> {
    if (!session?.workspace) {
      router.push("/workspace");
      return;
    }
    setCreating(templateId ?? "blank");
    try {
      const workflow = await createWorkflow({
        workspaceId: session.workspace.id,
        projectId,
        name,
        templateId: templateId ?? undefined,
      });
      setWorkflowId(workflow.id);
      router.push("/connect-ai");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create workflow");
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Choose a starter template</h1>
        <p className="text-muted-foreground">
          Start with a proven workflow, or build your own from scratch.
        </p>
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(templates ?? []).map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer text-left transition-colors hover:border-primary"
              onClick={() => void choose(template.id, template.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void choose(template.id, template.name);
                }
              }}
              aria-label={`Use ${template.name} template`}
            >
              <CardContent className="flex items-start gap-3 p-5">
                {creating === template.id ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
                ) : (
                  <TemplateIcon icon={template.icon} className="h-6 w-6 text-primary" />
                )}
                <div>
                  <p className="font-medium">{template.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{template.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card
            className="cursor-pointer border-dashed text-left transition-colors hover:border-primary"
            onClick={() => void choose(null, "Untitled Workflow")}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void choose(null, "Untitled Workflow");
              }
            }}
            aria-label="Start with a blank workflow"
          >
            <CardContent className="flex items-start gap-3 p-5">
              {creating === "blank" ? (
                <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
              ) : (
                <FilePlus2 className="h-6 w-6 text-muted-foreground" aria-hidden />
              )}
              <div>
                <p className="font-medium">Blank Workflow</p>
                <p className="mt-1 text-xs text-muted-foreground">Start from scratch</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
