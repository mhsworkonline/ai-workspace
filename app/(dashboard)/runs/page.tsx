"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { RunsTable } from "@/components/runs/runs-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRuns } from "@/hooks/use-runs";
import { useSession } from "@/hooks/use-session";

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "running", label: "Running" },
  { value: "awaiting_review", label: "Needs review" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default function RunsPage(): JSX.Element {
  const { session } = useSession();
  const { data: runs, isLoading } = useRuns(session?.workspace?.id, { limit: 100 });
  const [status, setStatus] = useState("all");

  const filtered = (runs ?? []).filter((run) => status === "all" || run.status === status);

  return (
    <div>
      <PageHeader
        title="Runs"
        description="Every workflow execution, with full inputs and outputs."
        actions={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {isLoading ? <LoadingSkeleton variant="table" /> : <RunsTable runs={filtered} />}
    </div>
  );
}
