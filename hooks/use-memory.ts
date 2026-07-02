"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteMemory, listMemory, upsertMemory, type UpsertMemoryInput } from "@/lib/api/memory";

export function useMemoryEntries(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["memory", workspaceId],
    queryFn: () => listMemory(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useUpsertMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertMemoryInput) => upsertMemory(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMemory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });
}
