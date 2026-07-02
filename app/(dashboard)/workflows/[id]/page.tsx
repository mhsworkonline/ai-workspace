"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { BlockPicker } from "@/components/workflow/block-picker";
import { BlockSettings } from "@/components/workflow/block-settings";
import { WorkflowCanvas } from "@/components/workflow/canvas";
import { RunPanel } from "@/components/workflow/run-panel";
import { BuilderToolbar } from "@/components/workflow/toolbar";
import { useRunWorkflow, useUpdateWorkflow, useWorkflow } from "@/hooks/use-workflows";
import { ApiError } from "@/lib/api/http";
import { useCanvasStore } from "@/stores/canvas.store";
import type { FormField, InputBlockData } from "@/types/workflow";
import { BlockType } from "@/types/workflow";

const AUTOSAVE_DELAY_MS = 2000;

export default function WorkflowBuilderPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const workflowId = params.id;
  const { data: workflow, isLoading } = useWorkflow(workflowId);
  const updateWorkflow = useUpdateWorkflow(workflowId);
  const runWorkflow = useRunWorkflow();
  const store = useCanvasStore();
  const loadedRef = useRef<string | null>(null);

  const [runDialogOpen, setRunDialogOpen] = useState(false);
  const [runText, setRunText] = useState("");
  const [runFields, setRunFields] = useState<Record<string, string>>({});
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | undefined>();

  useEffect(() => {
    if (workflow && loadedRef.current !== workflow.id) {
      loadedRef.current = workflow.id;
      store.load(
        workflow.blocks ?? [],
        workflow.connections ?? [],
        workflow.canvas_state?.zoom ?? 1,
        workflow.canvas_state?.offsetX ?? 0,
        workflow.canvas_state?.offsetY ?? 0
      );
    }
    // store methods are stable; loading only depends on the fetched workflow.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  const save = useCallback(async (): Promise<void> => {
    const state = useCanvasStore.getState();
    if (!state.dirty) {
      return;
    }
    try {
      await updateWorkflow.mutateAsync({
        blocks: state.blocks,
        connections: state.connections,
        canvasState: { zoom: state.zoom, offsetX: state.offsetX, offsetY: state.offsetY },
      });
      state.markSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save workflow");
    }
  }, [updateWorkflow]);

  useEffect(() => {
    if (!store.dirty) {
      return;
    }
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [store.dirty, store.blocks, store.connections, save]);

  const runtimeInputBlocks = store.blocks.filter((block): block is typeof block & { data: InputBlockData } => {
    if (block.type !== BlockType.Input) {
      return false;
    }
    const data = block.data as InputBlockData;
    return data.subtype === "form" || (data.subtype === "text" && !data.value?.trim());
  });
  const formFields: FormField[] = runtimeInputBlocks.flatMap((block) =>
    (block.data as InputBlockData).subtype === "form"
      ? ((block.data as InputBlockData).fields ?? [])
      : []
  );
  const needsText = runtimeInputBlocks.some(
    (block) => (block.data as InputBlockData).subtype === "text"
  );

  async function startRun(): Promise<void> {
    await save();
    try {
      const { runId } = await runWorkflow.mutateAsync({
        id: workflowId,
        input: { text: runText, fields: runFields },
      });
      setActiveRunId(runId);
      setRunDialogOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeMessage(error.message);
        setUpgradeOpen(true);
        setRunDialogOpen(false);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not start run");
      }
    }
  }

  function onRunClick(): void {
    if (store.blocks.length === 0) {
      toast.error("Add at least one block to run this workflow");
      return;
    }
    if (needsText || formFields.length > 0) {
      setRunDialogOpen(true);
    } else {
      void startRun();
    }
  }

  if (isLoading || !workflow) {
    return (
      <div className="p-6">
        <LoadingSkeleton variant="list" count={4} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-background">
      <BuilderToolbar
        name={workflow.name}
        saving={updateWorkflow.isPending}
        onRename={(name) => void updateWorkflow.mutateAsync({ name }).catch(() => toast.error("Rename failed"))}
        onRun={onRunClick}
        runDisabled={runWorkflow.isPending}
      />
      <div className="flex min-h-0 flex-1">
        <BlockPicker />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            <WorkflowCanvas />
          </div>
          {activeRunId ? (
            <RunPanel runId={activeRunId} onClose={() => setActiveRunId(null)} />
          ) : null}
        </div>
        <BlockSettings />
      </div>

      <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run “{workflow.name}”</DialogTitle>
            <DialogDescription>Provide the inputs for this run.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {needsText ? (
              <div className="space-y-1.5">
                <Label htmlFor="run-input">Input</Label>
                <Textarea
                  id="run-input"
                  rows={4}
                  value={runText}
                  onChange={(event) => setRunText(event.target.value)}
                  placeholder="What should this workflow work on?"
                />
              </div>
            ) : null}
            {formFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <Label htmlFor={`field-${field.id}`}>{field.label}</Label>
                <Input
                  id={`field-${field.id}`}
                  value={runFields[field.id] ?? ""}
                  onChange={(event) =>
                    setRunFields((previous) => ({ ...previous, [field.id]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRunDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void startRun()} disabled={runWorkflow.isPending}>
              Run Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}
