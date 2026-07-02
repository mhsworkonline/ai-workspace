"use client";

import { History } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import type { RunWithWorkflow } from "@/lib/api/runs";
import { formatDuration, timeAgo } from "@/lib/utils/format";

interface RecentRunsProps {
  runs: RunWithWorkflow[];
}

export function RecentRuns({ runs }: RecentRunsProps): JSX.Element {
  const router = useRouter();
  const recent = runs.slice(0, 10);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Recent runs</CardTitle>
        <Link href="/runs" className="text-xs font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState
            icon={History}
            title="No runs yet"
            description="Run a workflow to see results here."
            actionLabel="Browse Workflows"
            onAction={() => router.push("/workflows")}
          />
        ) : (
          <ul className="divide-y">
            {recent.map((run) => (
              <li key={run.id}>
                <Link
                  href={`/runs/${run.id}`}
                  className="flex items-center gap-3 py-2.5 transition-colors hover:bg-surface-2 -mx-2 px-2 rounded-md"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {run.workflow?.name ?? "Workflow"}
                  </span>
                  <StatusBadge status={run.status} />
                  <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
                    {formatDuration(run.duration_ms)}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {timeAgo(run.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
