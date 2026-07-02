"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "@/hooks/use-session";
import { updateWorkspace } from "@/lib/api/workspace";
import { TABLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Dubai",
  "Australia/Sydney",
] as const;

export default function WorkspaceSettingsPage(): JSX.Element {
  const router = useRouter();
  const { session, refresh } = useSession();
  const workspace = session?.workspace;
  const isOwner = session?.role === "owner";
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setTimezone(workspace.timezone);
    }
  }, [workspace]);

  async function save(): Promise<void> {
    if (!workspace) {
      return;
    }
    setSaving(true);
    try {
      await updateWorkspace(workspace.id, { name, timezone });
      await refresh();
      toast.success("Workspace updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save workspace");
    } finally {
      setSaving(false);
    }
  }

  async function deleteWorkspace(): Promise<void> {
    if (!workspace) {
      return;
    }
    try {
      const supabase = createClient();
      const { error } = await supabase.from(TABLES.WORKSPACES).delete().eq("id", workspace.id);
      if (error) {
        throw new Error(error.message);
      }
      await refresh();
      router.push("/welcome");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete workspace");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
          <CardDescription>Shared settings for everyone in this workspace.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!isOwner && session?.role !== "admin"}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workspace-slug">Slug (read-only)</Label>
            <Input id="workspace-slug" value={workspace?.slug ?? ""} readOnly disabled className="font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger aria-label="Timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save changes
          </Button>
        </CardContent>
      </Card>

      {isOwner ? (
        <Card className="border-error/40">
          <CardHeader>
            <CardTitle className="text-base text-error">Danger zone</CardTitle>
            <CardDescription>
              Deleting the workspace removes all projects, workflows, runs, and assets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Delete workspace
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${workspace?.name}”?`}
        description="All workspace data will be permanently deleted. This cannot be undone."
        confirmLabel="Delete workspace"
        destructive
        onConfirm={() => void deleteWorkspace()}
      />
    </div>
  );
}
