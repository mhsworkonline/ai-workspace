"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCanvasStore } from "@/stores/canvas.store";
import { cn } from "@/lib/utils";
import { BLOCK_DEFINITIONS } from "./block-defs";

export function BlockPicker(): JSX.Element {
  const addBlock = useCanvasStore((state) => state.addBlock);
  const { offsetX, offsetY, zoom } = useCanvasStore();
  const [query, setQuery] = useState("");

  const filtered = BLOCK_DEFINITIONS.filter(
    (definition) =>
      definition.label.toLowerCase().includes(query.toLowerCase()) ||
      definition.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-background" aria-label="Block picker">
      <div className="border-b p-3">
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search blocks…"
          aria-label="Search blocks"
          className="h-8"
        />
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto p-3">
        {filtered.map((definition) => (
          <div
            key={definition.type}
            role="button"
            tabIndex={0}
            aria-label={`Add ${definition.label} block`}
            draggable={!definition.comingSoon}
            onDragStart={(event) =>
              event.dataTransfer.setData("application/aiw-block", definition.type)
            }
            onClick={() => {
              if (definition.comingSoon) {
                toast.info(
                  "Integrations (Email, Slack, Notion, Google Docs, Webhooks) are coming soon."
                );
                return;
              }
              // Drop new blocks near the visible center of the canvas.
              addBlock(definition.type, definition.defaultData(), {
                x: (400 - offsetX) / zoom,
                y: (240 - offsetY) / zoom,
              });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !definition.comingSoon) {
                addBlock(definition.type, definition.defaultData(), {
                  x: (400 - offsetX) / zoom,
                  y: (240 - offsetY) / zoom,
                });
              }
            }}
            className={cn(
              "flex cursor-grab items-start gap-2.5 rounded-md border bg-card p-2.5 transition-colors hover:border-primary",
              definition.comingSoon && "cursor-not-allowed opacity-60"
            )}
          >
            <definition.icon
              className={cn("mt-0.5 h-4 w-4 shrink-0", definition.colorClass)}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                {definition.label}
                {definition.comingSoon ? (
                  <Badge variant="outline" className="px-1 py-0 text-[10px]">
                    Soon
                  </Badge>
                ) : null}
              </p>
              <p className="text-xs text-muted-foreground">{definition.description}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="border-t p-3 text-[11px] text-muted-foreground">
        Drag onto the canvas or click to add
      </p>
    </aside>
  );
}
