import { randomUUID } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { BUCKETS, MAX_UPLOAD_BYTES, TABLES } from "@/lib/constants";
import { checkStorageLimit, limitMessage } from "@/lib/limits";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";

export const maxDuration = 120;

function fileCategory(mime: string): string {
  if (mime.startsWith("image/")) {
    return "image";
  }
  if (mime.startsWith("video/")) {
    return "video";
  }
  if (mime.startsWith("audio/")) {
    return "audio";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("document") ||
    mime.startsWith("text/")
  ) {
    return "document";
  }
  if (mime.includes("sheet") || mime.includes("csv") || mime.includes("excel")) {
    return "spreadsheet";
  }
  return "other";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const workspaceId = formData?.get("workspaceId");
  if (!(file instanceof File) || typeof workspaceId !== "string") {
    return jsonError("A file and workspaceId are required.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("Files must be 50MB or smaller.");
  }

  const workspace = await getWorkspaceForUser(ctx, workspaceId);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }
  const limit = checkStorageLimit(workspace, file.size);
  if (!limit.allowed) {
    return jsonError(limitMessage(limit), 403, true);
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const path = `${workspaceId}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await ctx.supabase.storage
    .from(BUCKETS.ASSETS)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (uploadError) {
    return jsonError(`Upload failed: ${uploadError.message}`, 500);
  }

  const {
    data: { publicUrl },
  } = ctx.supabase.storage.from(BUCKETS.ASSETS).getPublicUrl(path);

  const { data: asset, error } = await ctx.supabase
    .from(TABLES.ASSETS)
    .insert({
      workspace_id: workspaceId,
      uploaded_by: ctx.userId,
      name: file.name,
      file_url: publicUrl,
      file_type: fileCategory(file.type),
      file_size_bytes: file.size,
      mime_type: file.type || null,
    })
    .select()
    .single();
  if (error || !asset) {
    return jsonError(error?.message ?? "Could not save asset.", 500);
  }

  await ctx.supabase
    .from(TABLES.WORKSPACES)
    .update({ storage_used_bytes: workspace.storage_used_bytes + file.size })
    .eq("id", workspaceId);

  return jsonData(asset, 201);
}
