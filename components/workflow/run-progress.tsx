"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2, MinusCircle } from "lucide-react";
import type { RunStep } from "@/types/workflow";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format";

interface RunProgressProps {
  steps: RunStep[];
  compact?: boolean;
}

function StepIcon({ status }: { status: RunStep["status"] }): JSX.Element {
  switch (status) {
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Running" />;
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-success" aria-label="Completed" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-error" aria-label="Failed" />;
    case "skipped":
      return <MinusCircle className="h-4 w-4 text-muted-foreground" aria-label="Skipped" />;
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" aria-label="Pending" />;
  }
}

export function RunProgress({ steps, compact = false }: RunProgressProps): JSX.Element {
  return (
    <ol className="space-y-2" aria-label="Run steps">
      {steps.map((step) => (
        <li
          key={step.blockId}
          className={cn(
            "rounded-md border bg-card px-3 py-2",
            step.status === "running" && "border-primary",
            step.status === "failed" && "border-error"
          )}
        >
          <div className="flex items-center gap-2">
            <StepIcon status={step.status} />
            <span className="flex-1 truncate text-sm font-medium">{step.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {step.durationMs != null ? formatDuration(step.durationMs) : ""}
            </span>
          </div>
          {step.error ? <p className="mt-1 pl-6 text-xs text-error">{step.error}</p> : null}
          {!compact && step.output && step.status === "completed" ? (
            <p className="mt-1 max-h-24 overflow-hidden whitespace-pre-wrap pl-6 text-xs text-muted-foreground">
              {step.output.slice(0, 400)}
              {step.output.length > 400 ? "…" : ""}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
