import type { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TABLES } from "@/lib/constants";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { getAdminContext, jsonData, jsonError } from "@/lib/server/auth";

const patchSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from(TABLES.TEMPLATES)
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData(data);
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAdminContext();
  if (!ctx) {
    return jsonError("Admin access required.", 403);
  }
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid template update.");
  }
  const { id, name, description, category, isActive } = parsed.data;
  const admin = createAdminSupabase();
  const { error } = await admin
    .from(TABLES.TEMPLATES)
    .update({
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(category !== undefined && { category }),
      ...(isActive !== undefined && { is_active: isActive }),
    })
    .eq("id", id);
  if (error) {
    return jsonError(error.message, 500);
  }
  return jsonData({ ok: true });
}
