"use client";

import { ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useCancelRun, useReviewRun, useRun } from "@/hooks/use-runs";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDuration } from "@/lib/utils/format";
import { useState } from "react";
import { RunProgress } from "./run-progress";

interface RunPanelProps {
  runId: string;
  onClose: () => void;
}

export function RunPanel({ runId, onClose }: RunPanelProps): JSX.Element {
  const { data: run } = useRun(runId);
  const cancelRun = useCancelRun();
  const reviewRun = useReviewRun();
  const [editedOutput, setEditedOutput] = useState<string | null>(null);

  const steps = run?.steps ?? [];
  const completed = steps.filter((step) => step.status === "completed" || step.status === "skipped").length;
  const progress = steps.length > 0 ? (completed / steps.length) * 100 : 0;
  const isActive = run?.status === "pending" || run?.status === "running";
  const reviewStep = run?.status === "awaiting_review"
    ? steps.find((step) => step.blockId === run.review_block_id)
    : null;

  return (
    <section
      className="flex max-h-[45%] flex-col border-t bg-background"
      aria-label="Run progress panel"
    >
      <div className="flex items-center gap-3 border-b px-4 py-2">
        <span className="text-sm font-semibold">Run</span>
        {run ? <StatusBadge status={run.status} /> : null}
        <span className="font-mono text-xs text-muted-foreground">
          {run?.duration_ms != null ? formatDuration(run.duration_ms) : ""}
        </span>
        <Progress value={progress} className="h-1.5 max-w-48 flex-1" aria-label="Run progress" />
        <div className="flex-1" />
        {isActive ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => cancelRun.mutate(runId)}
            disabled={cancelRun.isPending}
          >
            Cancel Run
          </Button>
        ) : null}
        {run?.status === "completed" ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/runs/${runId}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Export Results
            </Link>
          </Button>
        ) : null}
        <Button variant="ghost" size="icon" aria-label="Close run panel" onClick={onClose}>
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {reviewStep ? (
          <div className="space-y-2 rounded-md border border-warning/50 bg-warning/5 p-3">
            <p className="text-sm font-medium">Review required: {reviewStep.label}</p>
            <Textarea
              rows={5}
              value={editedOutput ?? reviewStep.input ?? ""}
              onChange={(event) => setEditedOutput(event.target.value)}
              aria-label="Output under review"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() =>
                  reviewRun.mutate({
                    id: runId,
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
                onClick={() => reviewRun.mutate({ id: runId, decision: "reject" })}
                disabled={reviewRun.isPending}
              >
                Reject
              </Button>
            </div>
          </div>
        ) : null}
        {run?.error_message ? (
          <p className="rounded-md border border-error/40 bg-error/5 p-3 text-sm text-error" role="alert">
            {run.error_message}
          </p>
        ) : null}
        <RunProgress steps={steps} />
      </div>
    </section>
  );
}
