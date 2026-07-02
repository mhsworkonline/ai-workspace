"use client";

import { Plus, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProject } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { useWorkflows } from "@/hooks/use-workflows";
import { timeAgo } from "@/lib/utils/format";

export default function ProjectDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { session } = useSession();
  const { data: project, isLoading } = useProject(params.id);
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(
    session?.workspace?.id,
    params.id
  );

  if (isLoading || !project) {
    return <LoadingSkeleton variant="cards" />;
  }

  return (
    <div>
      <PageHeader
        title={project.name}
        description={project.description ?? "Workflows in this project"}
        actions={
          <Button onClick={() => router.push("/workflows?new=1")}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> New Workflow
          </Button>
        }
      />
      {workflowsLoading ? (
        <LoadingSkeleton variant="cards" />
      ) : (workflows ?? []).length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows in this project"
          description="Create a workflow and assign it to this project."
          actionLabel="+ Create Workflow"
          onAction={() => router.push("/workflows?new=1")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(workflows ?? []).map((workflow) => (
            <Card key={workflow.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <Link href={`/workflows/${workflow.id}`}>
                  <p className="truncate font-semibold hover:text-primary">{workflow.name}</p>
                </Link>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  {workflow.last_run_status ? (
                    <StatusBadge status={workflow.last_run_status} />
                  ) : null}
                  <span>{workflow.runs_count} runs</span>
                  <span aria-hidden>·</span>
                  <span>Updated {timeAgo(workflow.updated_at)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
