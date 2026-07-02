import "server-only";
import { NextResponse } from "next/server";
import { TABLES } from "@/lib/constants";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Database, Profile, Workspace } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthedContext {
  supabase: SupabaseClient<Database>;
  userId: string;
  profile: Profile;
}

export async function getAuthedContext(): Promise<AuthedContext | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.is_suspended) {
    return null;
  }
  return { supabase, userId: user.id, profile };
}

export async function getWorkspaceForUser(
  ctx: AuthedContext,
  workspaceId: string
): Promise<Workspace | null> {
  const { data } = await ctx.supabase
    .from(TABLES.WORKSPACES)
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();
  return data ?? null;
}

export function jsonError(message: string, status = 400, upgrade = false): NextResponse {
  return NextResponse.json({ error: message, upgrade }, { status });
}

export function jsonData<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function unauthorized(): NextResponse {
  return jsonError("You must be signed in to do this.", 401);
}
