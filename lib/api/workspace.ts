import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Profile, Workspace } from "@/types/database";

export interface SessionData {
  userId: string;
  profile: Profile;
  workspace: Workspace | null;
  role: "owner" | "admin" | "editor" | "viewer";
}

export async function fetchSession(): Promise<SessionData | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from(TABLES.PROFILES)
    .select("*")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return null;
  }

  const { data: owned } = await supabase
    .from(TABLES.WORKSPACES)
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (owned) {
    return { userId: user.id, profile, workspace: owned, role: "owner" };
  }

  const { data: membership } = await supabase
    .from(TABLES.WORKSPACE_MEMBERS)
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (membership?.workspace_id) {
    const { data: workspace } = await supabase
      .from(TABLES.WORKSPACES)
      .select("*")
      .eq("id", membership.workspace_id)
      .single();
    if (workspace) {
      return {
        userId: user.id,
        profile,
        workspace,
        role: (membership.role ?? "viewer") as SessionData["role"],
      };
    }
  }

  return { userId: user.id, profile, workspace: null, role: "viewer" };
}

export async function updateWorkspace(id: string, patch: Partial<Workspace>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.WORKSPACES).update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.PROFILES).update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
