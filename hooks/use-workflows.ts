"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  runWorkflow,
  updateWorkflow,
  type CreateWorkflowInput,
  type UpdateWorkflowInput,
} from "@/lib/api/workflows";
import type { RunInput } from "@/types/workflow";

export function useWorkflows(workspaceId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ["workflows", workspaceId, projectId ?? "all"],
    queryFn: () => listWorkflows(workspaceId as string, projectId),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: ["workflow", id],
    queryFn: () => getWorkflow(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowInput) => createWorkflow(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useUpdateWorkflow(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateWorkflowInput) => updateWorkflow(id, patch),
    onSuccess: (workflow) => {
      queryClient.setQueryData(["workflow", id], workflow);
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteWorkflow(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["workflows"] });
    },
  });
}

export function useRunWorkflow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: RunInput }) => runWorkflow(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["runs"] });
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
