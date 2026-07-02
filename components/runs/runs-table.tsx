"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { RunWithWorkflow } from "@/lib/api/runs";
import { formatDuration, timeAgo } from "@/lib/utils/format";

interface RunsTableProps {
  runs: RunWithWorkflow[];
}

export function RunsTable({ runs }: RunsTableProps): JSX.Element {
  const router = useRouter();

  if (runs.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No runs yet"
        description="Run a workflow to see results here."
        actionLabel="Browse Workflows"
        onAction={() => router.push("/workflows")}
      />
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Duration</TableHead>
            <TableHead className="hidden md:table-cell">Tokens</TableHead>
            <TableHead className="text-right">When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow
              key={run.id}
              className="cursor-pointer"
              onClick={() => router.push(`/runs/${run.id}`)}
            >
              <TableCell className="font-medium">
                <Link href={`/runs/${run.id}`} className="hover:text-primary">
                  {run.workflow?.name ?? "Workflow"}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status} />
              </TableCell>
              <TableCell className="hidden font-mono text-xs sm:table-cell">
                {formatDuration(run.duration_ms)}
              </TableCell>
              <TableCell className="hidden font-mono text-xs md:table-cell">
                {run.tokens_used || "—"}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">
                {timeAgo(run.created_at)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
