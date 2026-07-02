"use client";

import { ChevronDown, Copy, Download, RotateCcw, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useDeleteRun, useRerun, useReviewRun, useRun } from "@/hooks/use-runs";
import {
  copyToClipboard,
  exportDocx,
  exportJson,
  exportMarkdown,
  exportPdf,
} from "@/lib/utils/export";
import { formatDateTime, formatDuration } from "@/lib/utils/format";
import { getBlockDefinition } from "@/components/workflow/block-defs";
import type { RunStep } from "@/types/workflow";

function StepCard({ step }: { step: RunStep }): JSX.Element {
  const definition = getBlockDefinition(step.type);
  const [open, setOpen] = useState(step.status === "failed");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 p-4 text-left"
            aria-expanded={open}
          >
            <definition.icon className={`h-4 w-4 shrink-0 ${definition.colorClass}`} aria-hidden />
            <span className="flex-1 truncate text-sm font-medium">{step.label}</span>
            <StatusBadge status={step.status === "completed" ? "completed" : step.status} />
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {formatDuration(step.durationMs)}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 border-t pt-4">
            {step.error ? (
              <p className="rounded-md bg-error/5 p-3 text-sm text-error" role="alert">
                {step.error}
              </p>
            ) : null}
            {step.input ? (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Input
                </p>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs">
                  {step.input}
                </pre>
              </div>
            ) : null}
            {step.output ? (
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Output
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      void copyToClipboard(step.output ?? "").then(() => toast.success("Copied"));
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" aria-hidden /> Copy
                  </Button>
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-surface-2 p-3 font-mono text-xs">
                  {step.output}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function RunDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: run, isLoading } = useRun(params.id);
  const rerun = useRerun();
  const deleteRun = useDeleteRun();
  const reviewRun = useReviewRun();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editedOutput, setEditedOutput] = useState<string | null>(null);

  if (isLoading || !run) {
    return <LoadingSkeleton variant="list" count={5} />;
  }

  const fullOutput =
    run.output?.text ??
    run.steps
      .filter((step) => step.output && step.type !== "condition")
      .map((step) => `## ${step.label}\n\n${step.output}`)
      .join("\n\n");
  const filename = `${(run.workflow?.name ?? "run").replace(/[^a-zA-Z0-9-_ ]/g, "")}-${run.id.slice(0, 8)}`;
  const reviewStep =
    run.status === "awaiting_review"
      ? run.steps.find((step) => step.blockId === run.review_block_id)
      : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title={run.workflow?.name ?? "Run"}
        description={`${formatDateTime(run.created_at)} · ${formatDuration(run.duration_ms)} · ${
          run.ai_provider ? `${run.ai_provider} / ${run.ai_model}` : "no AI used"
        } · ${run.tokens_used} tokens`}
        actions={
          <>
            <StatusBadge status={run.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="mr-1.5 h-4 w-4" aria-hidden /> Export All
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportMarkdown(fullOutput, filename)}>
                  Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportPdf(fullOutput, filename)}>
                  PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void exportDocx(fullOutput, filename)}>
                  Word (.docx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportJson({ run: run.id, output: run.output }, filename)}
                >
                  JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              onClick={() =>
                rerun.mutate(run.id, {
                  onSuccess: ({ runId }) => router.push(`/runs/${runId}`),
                  onError: (error) => toast.error(error.message),
                })
              }
              disabled={rerun.isPending}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden /> Rerun
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-error"
              aria-label="Delete run"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          </>
        }
      />

      {run.error_message ? (
        <p className="rounded-md border border-error/40 bg-error/5 p-3 text-sm text-error" role="alert">
          {run.error_message}
        </p>
      ) : null}

      {reviewStep ? (
        <Card className="border-warning/50">
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Review required: {reviewStep.label}</p>
            <Textarea
              rows={6}
              value={editedOutput ?? reviewStep.input ?? ""}
              onChange={(event) => setEditedOutput(event.target.value)}
              aria-label="Output under review"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  reviewRun.mutate({
                    id: run.id,
                    decision: "approve",
                    editedOutput: editedOutput ?? undefined,
                  })
                }
                disabled={reviewRun.isPending}
              >
                Approve &amp; continue
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => reviewRun.mutate({ id: run.id, decision: "reject" })}
                disabled={reviewRun.isPending}
              >
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-2">
        {run.steps.map((step) => (
          <StepCard key={step.blockId} step={step} />
        ))}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this run?"
        description="The run and its outputs will be permanently deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteRun.mutate(run.id, {
            onSuccess: () => router.push("/runs"),
            onError: (error) => toast.error(error.message),
          });
        }}
      />
    </div>
  );
}
