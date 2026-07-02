"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { RunsTable } from "@/components/runs/runs-table";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { useRuns } from "@/hooks/use-runs";
import { useSession } from "@/hooks/use-session";
import { useWorkflow } from "@/hooks/use-workflows";

export default function WorkflowRunsPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const { session } = useSession();
  const { data: workflow } = useWorkflow(params.id);
  const { data: runs, isLoading } = useRuns(session?.workspace?.id, {
    workflowId: params.id,
    limit: 100,
  });

  return (
    <div>
      <PageHeader
        title={workflow ? `Runs — ${workflow.name}` : "Runs"}
        description="Execution history for this workflow."
        actions={
          <Button variant="outline" asChild>
            <Link href={`/workflows/${params.id}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to builder
            </Link>
          </Button>
        }
      />
      {isLoading ? <LoadingSkeleton variant="table" /> : <RunsTable runs={runs ?? []} />}
    </div>
  );
}
