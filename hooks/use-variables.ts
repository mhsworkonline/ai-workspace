"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteVariable,
  listVariables,
  saveVariable,
  updateVariable,
  type SaveVariableInput,
} from "@/lib/api/variables";
import type { Variable } from "@/types/database";

export function useVariables(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["variables", workspaceId],
    queryFn: () => listVariables(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useSaveVariable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveVariableInput) => saveVariable(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["variables"] });
    },
  });
}

export function useUpdateVariable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Variable> }) =>
      updateVariable(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["variables"] });
    },
  });
}

export function useDeleteVariable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVariable(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["variables"] });
    },
  });
}
