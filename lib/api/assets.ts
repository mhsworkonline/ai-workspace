import { createClient } from "@/lib/supabase/client";
import { TABLES } from "@/lib/constants";
import type { Asset } from "@/types/database";
import { ApiError } from "./http";

export async function listAssets(workspaceId: string): Promise<Asset[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLES.ASSETS)
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function uploadAsset(workspaceId: string, file: File): Promise<Asset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspaceId", workspaceId);
  const response = await fetch("/api/assets/upload", { method: "POST", body: formData });
  const body = (await response.json()) as { data?: Asset; error?: string; upgrade?: boolean };
  if (!response.ok || body.error || !body.data) {
    throw new ApiError(body.error ?? "Upload failed.", response.status, body.upgrade ?? false);
  }
  return body.data;
}

export async function updateAsset(id: string, patch: Partial<Asset>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from(TABLES.ASSETS).update(patch).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function softDeleteAsset(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from(TABLES.ASSETS)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}
