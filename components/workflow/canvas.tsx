"use client";

import { Map as MapIcon, Minus, Plus, Wand2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCanvasStore } from "@/stores/canvas.store";
import { BlockType } from "@/types/workflow";
import { BLOCK_HEIGHT, BLOCK_WIDTH, CanvasBlock } from "./block";
import { BLOCK_DEFINITIONS } from "./block-defs";
import { bezierPath, ConnectionLine, connectionEndpoints } from "./connection";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2;

export function WorkflowCanvas(): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    blocks,
    connections,
    selectedIds,
    zoom,
    offsetX,
    offsetY,
    connectingFrom,
    select,
    clearSelection,
    moveBlock,
    commitMove,
    deleteSelected,
    startConnection,
    completeConnection,
    cancelConnection,
    removeConnection,
    setViewport,
    addBlock,
    autoLayout,
    undo,
    redo,
  } = useCanvasStore();

  const [dragging, setDragging] = useState<{ blockId: string; dx: number; dy: number } | null>(
    null
  );
  const [panning, setPanning] = useState<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [showMiniMap, setShowMiniMap] = useState(true);

  const toCanvasPoint = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) {
        return { x: 0, y: 0 };
      }
      return {
        x: (clientX - rect.left - offsetX) / zoom,
        y: (clientY - rect.top - offsetY) / zoom,
      };
    },
    [offsetX, offsetY, zoom]
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelected();
      } else if (event.key === "Escape") {
        cancelConnection();
        clearSelection();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, cancelConnection, clearSelection, undo, redo]);

  function onWheel(event: React.WheelEvent): void {
    event.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + direction * 0.1)));
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    // Zoom around the cursor.
    const nextOffsetX = px - ((px - offsetX) / zoom) * nextZoom;
    const nextOffsetY = py - ((py - offsetY) / zoom) * nextZoom;
    setViewport(nextZoom, nextOffsetX, nextOffsetY);
  }

  function onPointerDownCanvas(event: React.PointerEvent): void {
    if (event.button === 1 || event.altKey || event.button === 2) {
      event.preventDefault();
      setPanning({ startX: event.clientX, startY: event.clientY, ox: offsetX, oy: offsetY });
    }
  }

  function onPointerMove(event: React.PointerEvent): void {
    const point = toCanvasPoint(event.clientX, event.clientY);
    setMouse(point);
    if (panning) {
      setViewport(
        zoom,
        panning.ox + (event.clientX - panning.startX),
        panning.oy + (event.clientY - panning.startY)
      );
      return;
    }
    if (dragging) {
      moveBlock(dragging.blockId, { x: point.x - dragging.dx, y: point.y - dragging.dy });
    }
  }

  function onPointerUp(): void {
    if (dragging) {
      commitMove();
      setDragging(null);
    }
    setPanning(null);
  }

  function onBlockPointerDown(event: React.PointerEvent, blockId: string): void {
    if (event.button !== 0 || event.altKey) {
      return;
    }
    event.stopPropagation();
    const block = blocks.find((b) => b.id === blockId);
    if (!block) {
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    setDragging({ blockId, dx: point.x - block.position.x, dy: point.y - block.position.y });
  }

  function onDrop(event: React.DragEvent): void {
    event.preventDefault();
    const type = event.dataTransfer.getData("application/aiw-block") as BlockType;
    const definition = BLOCK_DEFINITIONS.find((d) => d.type === type);
    if (!definition) {
      return;
    }
    if (definition.comingSoon) {
      toast.info("Integrations are coming soon. Join the waitlist from the block picker.");
      return;
    }
    const point = toCanvasPoint(event.clientX, event.clientY);
    addBlock(type, definition.defaultData(), {
      x: point.x - BLOCK_WIDTH / 2,
      y: point.y - BLOCK_HEIGHT / 2,
    });
  }

  const connectingBlock = connectingFrom
    ? blocks.find((block) => block.id === connectingFrom.blockId)
    : null;

  return (
    <div
      ref={containerRef}
      className="canvas-grid relative h-full w-full overflow-hidden"
      onWheel={onWheel}
      onPointerDown={onPointerDownCanvas}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={() => {
        cancelConnection();
        clearSelection();
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
      onContextMenu={(event) => event.preventDefault()}
      role="application"
      aria-label="Workflow canvas"
    >
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})` }}
      >
        <svg className="pointer-events-auto absolute -z-0 overflow-visible" width={1} height={1} aria-hidden>
          {connections.map((connection) => (
            <ConnectionLine
              key={connection.id}
              connection={connection}
              blocks={blocks}
              onRemove={removeConnection}
            />
          ))}
          {connectingBlock ? (
            <path
              d={bezierPath(
                connectingBlock.position.x + BLOCK_WIDTH,
                connectingBlock.position.y + BLOCK_HEIGHT / 2,
                mouse.x,
                mouse.y
              )}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              strokeDasharray="6 4"
              className="pointer-events-none"
            />
          ) : null}
        </svg>
        {blocks.map((block) => (
          <CanvasBlock
            key={block.id}
            block={block}
            selected={selectedIds.includes(block.id)}
            connecting={Boolean(connectingFrom)}
            onPointerDown={onBlockPointerDown}
            onSelect={select}
            onStartConnection={startConnection}
            onCompleteConnection={completeConnection}
          />
        ))}
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        {showMiniMap && blocks.length > 0 ? <MiniMap /> : null}
        <div className="flex items-center gap-1 rounded-md border bg-card p-1 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Zoom out"
            onClick={(event) => {
              event.stopPropagation();
              setViewport(Math.max(MIN_ZOOM, zoom - 0.1), offsetX, offsetY);
            }}
          >
            <Minus className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <span className="w-10 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Zoom in"
            onClick={(event) => {
              event.stopPropagation();
              setViewport(Math.min(MAX_ZOOM, zoom + 0.1), offsetX, offsetY);
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Auto-layout blocks"
            onClick={(event) => {
              event.stopPropagation();
              autoLayout();
            }}
          >
            <Wand2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Toggle mini-map"
            onClick={(event) => {
              event.stopPropagation();
              setShowMiniMap((value) => !value);
            }}
          >
            <MapIcon className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      </div>

      {connectingFrom ? (
        <p className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-foreground px-3 py-1 text-xs text-background">
          Click a block&apos;s input port to connect — Esc to cancel
        </p>
      ) : null}
    </div>
  );
}

function MiniMap(): JSX.Element {
  const { blocks, connections } = useCanvasStore();
  const padding = 40;
  const minX = Math.min(...blocks.map((b) => b.position.x)) - padding;
  const minY = Math.min(...blocks.map((b) => b.position.y)) - padding;
  const maxX = Math.max(...blocks.map((b) => b.position.x + BLOCK_WIDTH)) + padding;
  const maxY = Math.max(...blocks.map((b) => b.position.y + BLOCK_HEIGHT)) + padding;

  return (
    <svg
      viewBox={`${minX} ${minY} ${Math.max(1, maxX - minX)} ${Math.max(1, maxY - minY)}`}
      className="h-24 w-40 rounded-md border bg-card/90 shadow-sm"
      aria-label="Workflow mini-map"
    >
      {connections.map((connection) => {
        const points = connectionEndpoints(connection, blocks);
        if (!points) {
          return null;
        }
        return (
          <line
            key={connection.id}
            x1={points.x1}
            y1={points.y1}
            x2={points.x2}
            y2={points.y2}
            stroke="hsl(var(--border))"
            strokeWidth={6}
          />
        );
      })}
      {blocks.map((block) => (
        <rect
          key={block.id}
          x={block.position.x}
          y={block.position.y}
          width={BLOCK_WIDTH}
          height={BLOCK_HEIGHT}
          rx={12}
          fill="hsl(var(--primary))"
          opacity={0.6}
        />
      ))}
    </svg>
  );
}
