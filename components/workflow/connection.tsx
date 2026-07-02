"use client";

import { memo } from "react";
import type { BlockConnection, WorkflowBlock } from "@/types/workflow";
import { BlockType } from "@/types/workflow";
import { BLOCK_HEIGHT, BLOCK_WIDTH } from "./block";

interface ConnectionLineProps {
  connection: BlockConnection;
  blocks: WorkflowBlock[];
  onRemove: (id: string) => void;
}

export function connectionEndpoints(
  connection: BlockConnection,
  blocks: WorkflowBlock[]
): { x1: number; y1: number; x2: number; y2: number } | null {
  const source = blocks.find((block) => block.id === connection.source);
  const target = blocks.find((block) => block.id === connection.target);
  if (!source || !target) {
    return null;
  }
  let sourceY = source.position.y + BLOCK_HEIGHT / 2;
  if (source.type === BlockType.Condition) {
    sourceY =
      connection.sourceHandle === "false"
        ? source.position.y + (BLOCK_HEIGHT * 3) / 4
        : source.position.y + BLOCK_HEIGHT / 4;
  }
  return {
    x1: source.position.x + BLOCK_WIDTH,
    y1: sourceY,
    x2: target.position.x,
    y2: target.position.y + BLOCK_HEIGHT / 2,
  };
}

export function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const bend = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

export const ConnectionLine = memo(function ConnectionLine({
  connection,
  blocks,
  onRemove,
}: ConnectionLineProps): JSX.Element | null {
  const points = connectionEndpoints(connection, blocks);
  if (!points) {
    return null;
  }
  const path = bezierPath(points.x1, points.y1, points.x2, points.y2);
  const stroke =
    connection.sourceHandle === "true"
      ? "hsl(var(--success))"
      : connection.sourceHandle === "false"
        ? "hsl(var(--error))"
        : "hsl(var(--primary))";

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="cursor-pointer"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(connection.id);
        }}
      >
        <title>Click to remove connection</title>
      </path>
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        className="connection-animated pointer-events-none"
      />
    </g>
  );
});
