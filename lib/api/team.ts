import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Profile, WorkspaceMember } from "@/types/database";
import { api } from "./http";

export interface MemberWithProfile extends WorkspaceMember {
  profile: Pick<Profile, "id" | "email" | "full_name" | "avatar_url"> | null;
}

export async function listMembers(workspaceId: string): Promise<MemberWithProfile[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.WORKSPACE_MEMBERS)
    .select(`*, profile:${TABLES.PROFILES}!aiw_workspace_members_user_id_fkey(id, email, full_name, avatar_url)`)
    .eq("workspace_id", workspaceId)
    .neq("status", "removed")
    .order("invited_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as unknown as MemberWithProfile[];
}

export async function inviteMembers(
  workspaceId: string,
  emails: string[],
  role: string
): Promise<{ invited: number }> {
  return api<{ invited: number }>("/api/team", {
    method: "POST",
    body: JSON.stringify({ workspaceId, emails, role }),
  });
}

export async function updateMemberRole(memberId: string, role: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLES.WORKSPACE_MEMBERS)
    .update({ role: role as WorkspaceMember["role"] })
    .eq("id", memberId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function removeMember(memberId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLES.WORKSPACE_MEMBERS)
    .update({ status: "removed" })
    .eq("id", memberId);
  if (error) {
    throw new Error(error.message);
  }
}
