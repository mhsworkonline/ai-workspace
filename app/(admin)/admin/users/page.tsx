"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api/http";
import { formatBytes, formatDate } from "@/lib/utils/format";

interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  isAdmin: boolean;
  isSuspended: boolean;
  createdAt: string;
  tier: string;
  runsUsed: number;
  storageUsed: number;
}

interface UserPatch {
  userId: string;
  isAdmin?: boolean;
  isSuspended?: boolean;
  tier?: string;
}

export default function AdminUsersPage(): JSX.Element {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search],
    queryFn: () => api<AdminUser[]>(`/api/admin/users?q=${encodeURIComponent(search)}`),
  });

  const patchUser = useMutation({
    mutationFn: (patch: UserPatch) =>
      api<{ ok: boolean }>("/api/admin/users", { method: "PATCH", body: JSON.stringify(patch) }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
    onError: (error) => toast.error(error.message),
  });

  const filtered = (users ?? []).filter(
    (user) => planFilter === "all" || user.tier === planFilter
  );

  return (
    <div>
      <PageHeader
        title="Users"
        description="Every account on the platform."
        actions={
          <>
            <SearchInput placeholder="Search by email…" onSearch={setSearch} />
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32" aria-label="Filter by plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden sm:table-cell">Runs</TableHead>
                <TableHead className="hidden md:table-cell">Storage</TableHead>
                <TableHead className="hidden lg:table-cell">Joined</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{user.fullName || "—"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.tier}
                      onValueChange={(tier) => patchUser.mutate({ userId: user.id, tier })}
                    >
                      <SelectTrigger className="h-8 w-28" aria-label="User plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                        <SelectItem value="business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {user.runsUsed}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {formatBytes(user.storageUsed)}
                  </TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                    {formatDate(user.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={user.isAdmin}
                      onCheckedChange={(isAdmin) => patchUser.mutate({ userId: user.id, isAdmin })}
                      aria-label={`Toggle admin for ${user.email}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {user.isSuspended ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => patchUser.mutate({ userId: user.id, isSuspended: false })}
                      >
                        Unsuspend
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-error hover:text-error"
                        onClick={() => patchUser.mutate({ userId: user.id, isSuspended: true })}
                      >
                        Suspend
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No users found.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
