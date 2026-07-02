"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAssets, softDeleteAsset, updateAsset, uploadAsset } from "@/lib/api/assets";
import type { Asset } from "@/types/database";

export function useAssets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["assets", workspaceId],
    queryFn: () => listAssets(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, file }: { workspaceId: string; file: File }) =>
      uploadAsset(workspaceId, file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
      void queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Asset> }) => updateAsset(id, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => softDeleteAsset(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}
