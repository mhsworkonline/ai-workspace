"use client";

import { UserPlus, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSession } from "@/hooks/use-session";
import {
  useInviteMembers,
  useMembers,
  useRemoveMember,
  useUpdateMemberRole,
} from "@/hooks/use-team";
import { ApiError } from "@/lib/api/http";
import { formatDate } from "@/lib/utils/format";

function TeamPageInner(): JSX.Element {
  const searchParams = useSearchParams();
  const { session } = useSession();
  const workspace = session?.workspace;
  const isWorkspaceAdmin = session?.role === "owner" || session?.role === "admin";
  const { data: members, isLoading } = useMembers(workspace?.id);
  const inviteMembers = useInviteMembers();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(searchParams.get("invite") === "1");
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("editor");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string>();

  async function invite(): Promise<void> {
    if (!workspace) {
      return;
    }
    const list = emails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean);
    if (list.length === 0) {
      toast.error("Enter at least one email address");
      return;
    }
    try {
      const { invited } = await inviteMembers.mutateAsync({
        workspaceId: workspace.id,
        emails: list,
        role,
      });
      toast.success(`Invited ${invited} member${invited === 1 ? "" : "s"}`);
      setInviteOpen(false);
      setEmails("");
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeMessage(error.message);
        setUpgradeOpen(true);
        setInviteOpen(false);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not send invites");
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Manage who can access this workspace."
        actions={
          isWorkspaceAdmin ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" aria-hidden /> Invite Member
            </Button>
          ) : undefined
        }
      />
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                {isWorkspaceAdmin ? <TableHead className="text-right">Actions</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {(session?.profile.full_name || session?.profile.email || "?")[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {session?.profile.full_name || session?.profile.email}
                        {session?.role === "owner" ? (
                          <Badge variant="secondary" className="ml-2">Owner</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">{session?.profile.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="capitalize">{session?.role}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <StatusBadge status="active" />
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                  {formatDate(workspace?.created_at)}
                </TableCell>
                {isWorkspaceAdmin ? (
                  <TableCell className="text-right text-xs text-muted-foreground">You</TableCell>
                ) : null}
              </TableRow>
              {(members ?? []).map((member) => {
                const initials = (member.profile?.full_name || member.profile?.email || member.email || "?")[0]?.toUpperCase();
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profile?.avatar_url ?? undefined} alt="" />
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {member.profile?.full_name || member.profile?.email || member.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.profile?.email ?? member.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isWorkspaceAdmin ? (
                        <Select
                          value={member.role}
                          onValueChange={(value) =>
                            updateRole.mutate(
                              { memberId: member.id, role: value },
                              { onError: (error) => toast.error(error.message) }
                            )
                          }
                        >
                          <SelectTrigger className="h-8 w-28" aria-label="Member role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="capitalize">{member.role}</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <StatusBadge status={member.status === "active" ? "active" : "pending"} />
                    </TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                      {member.joined_at ? formatDate(member.joined_at) : "Invited"}
                    </TableCell>
                    {isWorkspaceAdmin ? (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:text-error"
                          onClick={() => setRemoveId(member.id)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {(members ?? []).length === 0 ? (
            <div className="border-t p-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">Just you here</p>
                <p className="text-xs text-muted-foreground">
                  Invite team members to collaborate.
                </p>
                {isWorkspaceAdmin ? (
                  <Button size="sm" className="mt-2" onClick={() => setInviteOpen(true)}>
                    + Invite Member
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite team members</DialogTitle>
            <DialogDescription>
              Admins manage everything, editors build and run workflows, viewers can only look.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-emails">Email addresses (comma separated)</Label>
              <Input
                id="invite-emails"
                value={emails}
                onChange={(event) => setEmails(event.target.value)}
                placeholder="jane@acme.com, sam@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger aria-label="Role for invitees">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void invite()} disabled={inviteMembers.isPending}>
              Send invites
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removeId)}
        onOpenChange={(open) => !open && setRemoveId(null)}
        title="Remove member?"
        description="They will immediately lose access to this workspace."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (removeId) {
            removeMember.mutate(removeId, { onError: (error) => toast.error(error.message) });
            setRemoveId(null);
          }
        }}
      />
      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}

export default function TeamPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" />}>
      <TeamPageInner />
    </Suspense>
  );
}
