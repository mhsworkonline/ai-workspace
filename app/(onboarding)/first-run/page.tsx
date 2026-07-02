"use client";

import { Loader2, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { RunProgress } from "@/components/workflow/run-progress";
import { useRun } from "@/hooks/use-runs";
import { useWorkflow } from "@/hooks/use-workflows";
import { runWorkflow } from "@/lib/api/workflows";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function FirstRunPage(): JSX.Element {
  const router = useRouter();
  const { workflowId, runId, setRunId } = useOnboardingStore();
  const { data: workflow } = useWorkflow(workflowId ?? undefined);
  const { data: run } = useRun(runId ?? undefined);
  const [input, setInput] = useState("");
  const [starting, setStarting] = useState(false);

  async function start(): Promise<void> {
    if (!workflowId) {
      router.push("/template");
      return;
    }
    if (!input.trim()) {
      toast.error("Enter something to run the workflow with");
      return;
    }
    setStarting(true);
    try {
      const { runId: newRunId } = await runWorkflow(workflowId, { text: input });
      setRunId(newRunId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start run");
    } finally {
      setStarting(false);
    }
  }

  const isDone = run?.status === "completed";
  const isFailed = run?.status === "failed";
  const isActive = run && (run.status === "pending" || run.status === "running");

  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Run your first workflow</h1>
        <p className="text-muted-foreground">
          {workflow ? `“${workflow.name}” is ready.` : "Loading your workflow…"} Give it an input
          and watch it work.
        </p>
      </div>
      <Card className="text-left">
        <CardContent className="space-y-4 p-5">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="e.g. AI productivity tools for freelancers"
            rows={3}
            aria-label="Workflow input"
            disabled={Boolean(isActive)}
          />
          <Button
            onClick={() => void start()}
            disabled={starting || Boolean(isActive)}
            className="w-full"
          >
            {starting || isActive ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Play className="mr-2 h-4 w-4" aria-hidden />
            )}
            {isActive ? "Running…" : "Run Workflow"}
          </Button>
          {run && run.steps.length > 0 ? <RunProgress steps={run.steps} /> : null}
          {isFailed ? (
            <p className="text-sm text-error" role="alert">
              {run?.error_message ??
                "The run failed. You can continue and configure your AI provider later."}
            </p>
          ) : null}
        </CardContent>
      </Card>
      <div className="flex justify-center gap-3">
        {isDone ? (
          <Button size="lg" onClick={() => router.push("/success")}>
            Continue →
          </Button>
        ) : (
          <Button variant="ghost" onClick={() => router.push("/success")}>
            Skip this step
          </Button>
        )}
      </div>
    </div>
  );
}
