"use client";

import { create } from "zustand";
import { CANVAS_GRID_SIZE } from "@/lib/constants";
import type { BlockConnection, BlockData, BlockPosition, WorkflowBlock } from "@/types/workflow";
import { BlockType } from "@/types/workflow";

const MAX_HISTORY = 50;

interface Snapshot {
  blocks: WorkflowBlock[];
  connections: BlockConnection[];
}

interface CanvasState {
  blocks: WorkflowBlock[];
  connections: BlockConnection[];
  selectedIds: string[];
  zoom: number;
  offsetX: number;
  offsetY: number;
  connectingFrom: { blockId: string; handle: "true" | "false" | null } | null;
  dirty: boolean;
  history: Snapshot[];
  historyIndex: number;
  load: (blocks: WorkflowBlock[], connections: BlockConnection[], zoom?: number, offsetX?: number, offsetY?: number) => void;
  addBlock: (type: BlockType, data: BlockData, position: BlockPosition) => void;
  updateBlockData: (id: string, data: Partial<BlockData>) => void;
  moveBlock: (id: string, position: BlockPosition) => void;
  commitMove: () => void;
  deleteSelected: () => void;
  select: (id: string, additive?: boolean) => void;
  clearSelection: () => void;
  startConnection: (blockId: string, handle: "true" | "false" | null) => void;
  completeConnection: (targetId: string) => void;
  cancelConnection: () => void;
  removeConnection: (id: string) => void;
  setViewport: (zoom: number, offsetX: number, offsetY: number) => void;
  autoLayout: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

function snap(value: number): number {
  return Math.round(value / CANVAS_GRID_SIZE) * CANVAS_GRID_SIZE;
}

function snapshot(state: Pick<CanvasState, "blocks" | "connections">): Snapshot {
  return {
    blocks: JSON.parse(JSON.stringify(state.blocks)) as WorkflowBlock[],
    connections: JSON.parse(JSON.stringify(state.connections)) as BlockConnection[],
  };
}

function pushHistory(state: CanvasState): Pick<CanvasState, "history" | "historyIndex"> {
  const history = [...state.history.slice(0, state.historyIndex + 1), snapshot(state)].slice(
    -MAX_HISTORY
  );
  return { history, historyIndex: history.length - 1 };
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  blocks: [],
  connections: [],
  selectedIds: [],
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  connectingFrom: null,
  dirty: false,
  history: [],
  historyIndex: -1,

  load: (blocks, connections, zoom = 1, offsetX = 0, offsetY = 0) =>
    set({
      blocks,
      connections,
      zoom,
      offsetX,
      offsetY,
      selectedIds: [],
      connectingFrom: null,
      dirty: false,
      history: [snapshot({ blocks, connections })],
      historyIndex: 0,
    }),

  addBlock: (type, data, position) =>
    set((state) => {
      const block: WorkflowBlock = {
        id: crypto.randomUUID(),
        type,
        position: { x: snap(position.x), y: snap(position.y) },
        data,
      };
      const next = { ...state, blocks: [...state.blocks, block] };
      return { ...next, ...pushHistory(next as CanvasState), dirty: true, selectedIds: [block.id] };
    }),

  updateBlockData: (id, data) =>
    set((state) => {
      const blocks = state.blocks.map((block) =>
        block.id === id ? { ...block, data: { ...block.data, ...data } as BlockData } : block
      );
      const next = { ...state, blocks };
      return { ...next, ...pushHistory(next as CanvasState), dirty: true };
    }),

  moveBlock: (id, position) =>
    set((state) => ({
      blocks: state.blocks.map((block) =>
        block.id === id
          ? { ...block, position: { x: snap(position.x), y: snap(position.y) } }
          : block
      ),
      dirty: true,
    })),

  commitMove: () => set((state) => ({ ...pushHistory(state) })),

  deleteSelected: () =>
    set((state) => {
      if (state.selectedIds.length === 0) {
        return state;
      }
      const selected = new Set(state.selectedIds);
      const blocks = state.blocks.filter((block) => !selected.has(block.id));
      const connections = state.connections.filter(
        (edge) => !selected.has(edge.source) && !selected.has(edge.target)
      );
      const next = { ...state, blocks, connections };
      return { ...next, ...pushHistory(next as CanvasState), selectedIds: [], dirty: true };
    }),

  select: (id, additive = false) =>
    set((state) => ({
      selectedIds: additive
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((existing) => existing !== id)
          : [...state.selectedIds, id]
        : [id],
    })),

  clearSelection: () => set({ selectedIds: [], connectingFrom: null }),

  startConnection: (blockId, handle) => set({ connectingFrom: { blockId, handle } }),

  completeConnection: (targetId) =>
    set((state) => {
      const from = state.connectingFrom;
      if (!from || from.blockId === targetId) {
        return { connectingFrom: null };
      }
      const exists = state.connections.some(
        (edge) =>
          edge.source === from.blockId &&
          edge.target === targetId &&
          (edge.sourceHandle ?? null) === from.handle
      );
      if (exists) {
        return { connectingFrom: null };
      }
      const connection: BlockConnection = {
        id: crypto.randomUUID(),
        source: from.blockId,
        target: targetId,
        sourceHandle: from.handle,
      };
      const next = { ...state, connections: [...state.connections, connection] };
      return {
        ...next,
        ...pushHistory(next as CanvasState),
        connectingFrom: null,
        dirty: true,
      };
    }),

  cancelConnection: () => set({ connectingFrom: null }),

  removeConnection: (id) =>
    set((state) => {
      const next = { ...state, connections: state.connections.filter((edge) => edge.id !== id) };
      return { ...next, ...pushHistory(next as CanvasState), dirty: true };
    }),

  setViewport: (zoom, offsetX, offsetY) => set({ zoom, offsetX, offsetY }),

  autoLayout: () =>
    set((state) => {
      const incoming = new Map<string, number>(state.blocks.map((block) => [block.id, 0]));
      for (const edge of state.connections) {
        incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
      }
      const depth = new Map<string, number>();
      const queue = state.blocks.filter((block) => (incoming.get(block.id) ?? 0) === 0);
      for (const block of queue) {
        depth.set(block.id, 0);
      }
      while (queue.length > 0) {
        const block = queue.shift() as WorkflowBlock;
        const currentDepth = depth.get(block.id) ?? 0;
        for (const edge of state.connections.filter((e) => e.source === block.id)) {
          const target = state.blocks.find((b) => b.id === edge.target);
          if (target && (depth.get(target.id) ?? -1) < currentDepth + 1) {
            depth.set(target.id, currentDepth + 1);
            queue.push(target);
          }
        }
      }
      const lanes = new Map<number, number>();
      const blocks = state.blocks.map((block) => {
        const column = depth.get(block.id) ?? 0;
        const row = lanes.get(column) ?? 0;
        lanes.set(column, row + 1);
        return { ...block, position: { x: 80 + column * 288, y: 80 + row * 176 } };
      });
      const next = { ...state, blocks };
      return { ...next, ...pushHistory(next as CanvasState), dirty: true };
    }),

  undo: () => {
    const state = get();
    if (state.historyIndex <= 0) {
      return;
    }
    const previous = state.history[state.historyIndex - 1];
    set({
      blocks: JSON.parse(JSON.stringify(previous.blocks)) as WorkflowBlock[],
      connections: JSON.parse(JSON.stringify(previous.connections)) as BlockConnection[],
      historyIndex: state.historyIndex - 1,
      dirty: true,
    });
  },

  redo: () => {
    const state = get();
    if (state.historyIndex >= state.history.length - 1) {
      return;
    }
    const next = state.history[state.historyIndex + 1];
    set({
      blocks: JSON.parse(JSON.stringify(next.blocks)) as WorkflowBlock[],
      connections: JSON.parse(JSON.stringify(next.connections)) as BlockConnection[],
      historyIndex: state.historyIndex + 1,
      dirty: true,
    });
  },

  markSaved: () => set({ dirty: false }),
}));
