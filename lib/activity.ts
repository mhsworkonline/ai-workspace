import { TABLES } from "@/lib/constants";
import type { Database, Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  entry: {
    workspaceId: string;
    userId: string | null;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, Json>;
  }
): Promise<void> {
  await supabase.from(TABLES.ACTIVITY_LOG).insert({
    workspace_id: entry.workspaceId,
    user_id: entry.userId,
    action: entry.action,
    resource_type: entry.resourceType ?? null,
    resource_id: entry.resourceId ?? null,
    details: entry.details ?? {},
  });
}
