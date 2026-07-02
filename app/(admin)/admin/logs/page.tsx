"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { api } from "@/lib/api/http";
import { formatDateTime } from "@/lib/utils/format";
import type { ActivityLogEntry } from "@/types/database";

interface LogsResponse {
  entries: (ActivityLogEntry & { profile: { email: string } | null })[];
  total: number;
  pageSize: number;
}

const ACTION_FILTERS = [
  { value: "all", label: "All actions" },
  { value: "workflow", label: "Workflows" },
  { value: "run", label: "Runs" },
  { value: "team", label: "Team" },
] as const;

export default function AdminLogsPage(): JSX.Element {
  const [page, setPage] = useState(0);
  const [action, setAction] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-logs", page, action],
    queryFn: () =>
      api<LogsResponse>(
        `/api/admin/logs?page=${page}${action === "all" ? "" : `&action=${action}`}`
      ),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        description="Everything that happens across all workspaces."
        actions={
          <Select
            value={action}
            onValueChange={(value) => {
              setAction(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-36" aria-label="Filter by action">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Details</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.entries ?? []).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {entry.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{entry.profile?.email ?? "system"}</TableCell>
                    <TableCell className="hidden max-w-md truncate font-mono text-xs text-muted-foreground sm:table-cell">
                      {JSON.stringify(entry.details)}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatDateTime(entry.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(data?.entries ?? []).length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No log entries.</p>
            ) : null}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages} · {data?.total ?? 0} entries
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
