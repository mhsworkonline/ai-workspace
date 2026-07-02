"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelRun,
  deleteRun,
  getRun,
  listRuns,
  rerunWorkflow,
  reviewRun,
} from "@/lib/api/runs";
import { RUN_POLL_INTERVAL_MS } from "@/lib/constants";

const ACTIVE_STATUSES = new Set(["pending", "running", "awaiting_review"]);

export function useRuns(
  workspaceId: string | undefined,
  options: { workflowId?: string; limit?: number } = {}
) {
  return useQuery({
    queryKey: ["runs", workspaceId, options.workflowId ?? "all", options.limit ?? 50],
    queryFn: () => listRuns(workspaceId as string, options),
    enabled: Boolean(workspaceId),
    refetchInterval: (query) =>
      query.state.data?.some((run) => ACTIVE_STATUSES.has(run.status))
        ? RUN_POLL_INTERVAL_MS
        : false,
  });
}

export function useRun(id: string | undefined) {
  return useQuery({
    queryKey: ["run", id],
    queryFn: () => getRun(id as string),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data && ACTIVE_STATUSES.has(query.state.data.status)
        ? RUN_POLL_INTERVAL_MS
        : false,
  });
}

export function useCancelRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelRun(id),
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["run", id] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useReviewRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      decision,
      editedOutput,
    }: {
      id: string;
      decision: "approve" | "reject";
      editedOutput?: string;
    }) => reviewRun(id, decision, editedOutput),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["run", id] });
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useRerun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rerunWorkflow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

export function useDeleteRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRun(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
