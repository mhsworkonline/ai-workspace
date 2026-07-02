import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { MemoryEntry, MemoryType } from "@/types/database";

export async function listMemory(workspaceId: string): Promise<MemoryEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.MEMORY)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("section", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export interface UpsertMemoryInput {
  workspaceId: string;
  key: string;
  value: string;
  section?: string;
  type?: MemoryType;
  tags?: string[];
}

export async function upsertMemory(input: UpsertMemoryInput): Promise<MemoryEntry> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = await supabase
    .from(TABLES.MEMORY)
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("key", input.key)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from(TABLES.MEMORY)
      .update({
        value: input.value,
        section: input.section,
        tags: input.tags,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  const { data, error } = await supabase
    .from(TABLES.MEMORY)
    .insert({
      workspace_id: input.workspaceId,
      created_by: user?.id ?? null,
      key: input.key,
      value: input.value,
      section: input.section ?? "general",
      type: input.type ?? "text",
      tags: input.tags ?? [],
    })
    .select()
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function deleteMemory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.MEMORY).delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
