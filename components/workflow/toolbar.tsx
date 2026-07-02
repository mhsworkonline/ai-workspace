"use client";

import { ArrowLeft, Loader2, Play, Redo2, Undo2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "@/stores/canvas.store";

interface BuilderToolbarProps {
  name: string;
  saving: boolean;
  onRename: (name: string) => void;
  onRun: () => void;
  runDisabled: boolean;
}

export function BuilderToolbar({
  name,
  saving,
  onRename,
  onRun,
  runDisabled,
}: BuilderToolbarProps): JSX.Element {
  const { dirty, undo, redo, historyIndex, history } = useCanvasStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const saveStatus = saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved";

  return (
    <div className="flex h-12 items-center gap-2 border-b bg-background px-3">
      <Button variant="ghost" size="icon" asChild aria-label="Back to workflows">
        <Link href="/workflows">
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </Link>
      </Button>
      {editing ? (
        <Input
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            setEditing(false);
            if (draft.trim() && draft !== name) {
              onRename(draft.trim());
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.currentTarget.blur();
            }
          }}
          className="h-8 max-w-64"
          aria-label="Workflow name"
        />
      ) : (
        <button
          type="button"
          className="max-w-64 truncate rounded px-2 py-1 text-sm font-semibold hover:bg-surface-2"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          aria-label="Rename workflow"
        >
          {name}
        </button>
      )}
      <span className="text-xs text-muted-foreground" aria-live="polite">
        {saveStatus}
      </span>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="icon"
        aria-label="Undo"
        onClick={undo}
        disabled={historyIndex <= 0}
      >
        <Undo2 className="h-4 w-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Redo"
        onClick={redo}
        disabled={historyIndex >= history.length - 1}
      >
        <Redo2 className="h-4 w-4" aria-hidden />
      </Button>
      <Button onClick={onRun} disabled={runDisabled} aria-label="Run workflow">
        {runDisabled ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Play className="mr-2 h-4 w-4" aria-hidden />
        )}
        Run
      </Button>
    </div>
  );
}
