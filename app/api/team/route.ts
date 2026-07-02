import type { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { TABLES } from "@/lib/constants";
import { checkTeamLimit, limitMessage } from "@/lib/limits";
import { createAdminSupabase } from "@/lib/supabase/admin";
import {
  getAuthedContext,
  getWorkspaceForUser,
  jsonData,
  jsonError,
  unauthorized,
} from "@/lib/server/auth";

const schema = z.object({
  workspaceId: z.string().uuid(),
  emails: z.array(z.string().email()).min(1).max(20),
  role: z.enum(["admin", "editor", "viewer"]),
});

async function sendInviteEmail(email: string, workspaceName: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return;
  }
  const resend = new Resend(apiKey);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await resend.emails.send({
    from: "AI Workspace <onboarding@resend.dev>",
    to: email,
    subject: `You've been invited to ${workspaceName} on AI Workspace`,
    html: `<p>You've been invited to join <strong>${workspaceName}</strong> on AI Workspace.</p><p><a href="${appUrl}/signup">Create your account</a> with this email address to join.</p>`,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const ctx = await getAuthedContext();
  if (!ctx) {
    return unauthorized();
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Enter valid email addresses and a role.");
  }
  const { workspaceId, emails, role } = parsed.data;

  const workspace = await getWorkspaceForUser(ctx, workspaceId);
  if (!workspace) {
    return jsonError("Workspace not found.", 404);
  }

  const limit = await checkTeamLimit(ctx.supabase, workspace);
  if (!limit.allowed) {
    return jsonError(limitMessage(limit), 403, true);
  }

  const admin = createAdminSupabase();
  let invited = 0;
  for (const email of emails) {
    // Link to an existing profile when the invitee already has an account.
    const { data: profile } = await admin
      .from(TABLES.PROFILES)
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { error } = await admin.from(TABLES.WORKSPACE_MEMBERS).upsert(
      {
        workspace_id: workspaceId,
        user_id: profile?.id ?? null,
        email,
        role,
        invited_by: ctx.userId,
        status: profile ? "active" : "pending",
        joined_at: profile ? new Date().toISOString() : null,
      } as never,
      { onConflict: "workspace_id,user_id", ignoreDuplicates: true }
    );
    if (!error) {
      invited += 1;
      try {
        await sendInviteEmail(email, workspace.name);
      } catch {
        // Email delivery is best-effort; the invite row is what matters.
      }
    }
  }

  await logActivity(ctx.supabase, {
    workspaceId,
    userId: ctx.userId,
    action: "team.invited",
    details: { emails: emails.join(", "), role },
  });

  return jsonData({ invited });
}
