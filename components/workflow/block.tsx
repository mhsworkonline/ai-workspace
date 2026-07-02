"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowBlock } from "@/types/workflow";
import { BlockType } from "@/types/workflow";
import { getBlockDefinition } from "./block-defs";

export const BLOCK_WIDTH = 224;
export const BLOCK_HEIGHT = 72;

interface CanvasBlockProps {
  block: WorkflowBlock;
  selected: boolean;
  connecting: boolean;
  onPointerDown: (event: React.PointerEvent, blockId: string) => void;
  onSelect: (blockId: string, additive: boolean) => void;
  onStartConnection: (blockId: string, handle: "true" | "false" | null) => void;
  onCompleteConnection: (blockId: string) => void;
}

function PortButton({
  side,
  label,
  onClick,
  className,
}: {
  side: "input" | "output";
  label: string;
  onClick: (event: React.MouseEvent) => void;
  className?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className={cn(
        "absolute z-10 h-3.5 w-3.5 rounded-full border-2 border-primary bg-background transition-transform hover:scale-125",
        side === "input" ? "-left-2" : "-right-2",
        className
      )}
    />
  );
}

export const CanvasBlock = memo(function CanvasBlock({
  block,
  selected,
  connecting,
  onPointerDown,
  onSelect,
  onStartConnection,
  onCompleteConnection,
}: CanvasBlockProps): JSX.Element {
  const definition = getBlockDefinition(block.type);
  const Icon = definition.icon;
  const isCondition = block.type === BlockType.Condition;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${definition.label} block: ${block.data.label}`}
      onPointerDown={(event) => onPointerDown(event, block.id)}
      onClick={(event) => {
        event.stopPropagation();
        if (connecting) {
          onCompleteConnection(block.id);
        } else {
          onSelect(block.id, event.shiftKey);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          onSelect(block.id, false);
        }
      }}
      className={cn(
        "absolute flex cursor-grab select-none items-center gap-3 rounded-lg border border-l-4 bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing",
        selected ? "border-l-primary ring-2 ring-primary/40" : "border-l-transparent",
        connecting && "ring-2 ring-info/50"
      )}
      style={{
        left: block.position.x,
        top: block.position.y,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
      }}
    >
      <PortButton
        side="input"
        label={`Connect into ${block.data.label}`}
        onClick={() => onCompleteConnection(block.id)}
        className="top-1/2 -translate-y-1/2"
      />
      <Icon className={cn("h-5 w-5 shrink-0", definition.colorClass)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{block.data.label}</p>
        <p className="truncate text-xs text-muted-foreground">{definition.label}</p>
      </div>
      {isCondition ? (
        <>
          <PortButton
            side="output"
            label="Connect true branch"
            onClick={() => onStartConnection(block.id, "true")}
            className="top-1/4 -translate-y-1/2 border-success"
          />
          <PortButton
            side="output"
            label="Connect false branch"
            onClick={() => onStartConnection(block.id, "false")}
            className="top-3/4 -translate-y-1/2 border-error"
          />
        </>
      ) : (
        <PortButton
          side="output"
          label={`Connect from ${block.data.label}`}
          onClick={() => onStartConnection(block.id, null)}
          className="top-1/2 -translate-y-1/2"
        />
      )}
    </div>
  );
});
