"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { inviteMembers, listMembers, removeMember, updateMemberRole } from "@/lib/api/team";

export function useMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["members", workspaceId],
    queryFn: () => listMembers(workspaceId as string),
    enabled: Boolean(workspaceId),
  });
}

export function useInviteMembers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      workspaceId,
      emails,
      role,
    }: {
      workspaceId: string;
      emails: string[];
      role: string;
    }) => inviteMembers(workspaceId, emails, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(memberId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["members"] });
    },
  });
}
