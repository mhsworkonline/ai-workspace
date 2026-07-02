"use client";

import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/hooks/use-session";
import { updateProfile } from "@/lib/api/workspace";
import type { NotificationPrefs } from "@/types/database";

const OPTIONS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  {
    key: "runComplete",
    label: "Run completed",
    description: "Email me when a workflow run finishes successfully.",
  },
  {
    key: "runFailed",
    label: "Run failed",
    description: "Email me when a workflow run fails.",
  },
  {
    key: "weeklySummary",
    label: "Weekly summary",
    description: "A weekly digest of runs, usage, and team activity.",
  },
];

export default function NotificationsSettingsPage(): JSX.Element {
  const { session, refresh } = useSession();
  const prefs = session?.profile.notification_prefs ?? {};

  async function toggle(key: keyof NotificationPrefs, value: boolean): Promise<void> {
    if (!session) {
      return;
    }
    try {
      await updateProfile(session.profile.id, {
        notification_prefs: { ...prefs, [key]: value },
      });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save preference");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Email notifications</CardTitle>
        <CardDescription>Choose what lands in your inbox.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {OPTIONS.map((option) => (
          <div key={option.key} className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={`pref-${option.key}`}>{option.label}</Label>
              <p className="text-xs text-muted-foreground">{option.description}</p>
            </div>
            <Switch
              id={`pref-${option.key}`}
              checked={prefs[option.key] ?? false}
              onCheckedChange={(value) => void toggle(option.key, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
