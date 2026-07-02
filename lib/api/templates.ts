import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Template } from "@/types/database";

export async function listTemplates(): Promise<Template[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.TEMPLATES)
    .select("*")
    .eq("is_active", true)
    .order("use_count", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getTemplate(id: string): Promise<Template> {
  const supabase = createClient();
  const { data, error } = await supabase.from(TABLES.TEMPLATES).select("*").eq("id", id).single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
