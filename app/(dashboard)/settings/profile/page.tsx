"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/hooks/use-session";
import { updateProfile } from "@/lib/api/workspace";
import { BUCKETS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { api } from "@/lib/api/http";

export default function ProfileSettingsPage(): JSX.Element {
  const router = useRouter();
  const { session, refresh } = useSession();
  const profile = session?.profile;
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
  }, [profile?.full_name]);

  async function saveName(): Promise<void> {
    if (!profile) {
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile.id, { full_name: fullName });
      await refresh();
      toast.success("Profile updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File): Promise<void> {
    if (!profile) {
      return;
    }
    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${profile.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from(BUCKETS.AVATARS).upload(path, file);
      if (error) {
        throw new Error(error.message);
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKETS.AVATARS).getPublicUrl(path);
      await updateProfile(profile.id, { avatar_url: publicUrl });
      await refresh();
      toast.success("Avatar updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not upload avatar");
    } finally {
      setUploading(false);
    }
  }

  async function changePassword(): Promise<void> {
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw new Error(error.message);
      }
      setPassword("");
      toast.success("Password changed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not change password");
    } finally {
      setChangingPassword(false);
    }
  }

  async function deleteAccount(): Promise<void> {
    try {
      await api<{ ok: boolean }>("/api/user/delete", { method: "POST" });
      router.push("/signup");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete account");
    }
  }

  const initials = (profile?.full_name || profile?.email || "?")[0]?.toUpperCase();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your name and avatar are visible to your team.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="mr-2 h-4 w-4" aria-hidden />
              )}
              Upload avatar
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadAvatar(file);
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile?.email ?? ""} readOnly disabled />
          </div>
          <Button onClick={() => void saveName()} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Save changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => void changePassword()}
            disabled={changingPassword || !password}
          >
            {changingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Update password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-error/40">
        <CardHeader>
          <CardTitle className="text-base text-error">Danger zone</CardTitle>
          <CardDescription>
            Deleting your account removes your workspaces, workflows, and runs permanently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete your account?"
        description="This permanently deletes your account and all data. This cannot be undone."
        confirmLabel="Delete forever"
        destructive
        onConfirm={() => void deleteAccount()}
      />
    </div>
  );
}
