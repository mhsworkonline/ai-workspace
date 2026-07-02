"use client";

import { MoreHorizontal, Plus, Workflow as WorkflowIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { useProjects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { useCreateWorkflow, useDeleteWorkflow, useWorkflows } from "@/hooks/use-workflows";
import { ApiError } from "@/lib/api/http";
import { timeAgo } from "@/lib/utils/format";

function WorkflowsPageInner(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session } = useSession();
  const workspaceId = session?.workspace?.id;
  const { data: workflows, isLoading } = useWorkflows(workspaceId);
  const { data: projects } = useProjects(workspaceId);
  const createWorkflow = useCreateWorkflow();
  const deleteWorkflow = useDeleteWorkflow();

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "1");
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string>();

  const filtered = (workflows ?? []).filter((workflow) =>
    workflow.name.toLowerCase().includes(query.toLowerCase())
  );

  async function create(): Promise<void> {
    if (!workspaceId || !name.trim()) {
      return;
    }
    try {
      const workflow = await createWorkflow.mutateAsync({
        workspaceId,
        name: name.trim(),
        projectId: projectId === "none" ? null : projectId,
      });
      setCreateOpen(false);
      router.push(`/workflows/${workflow.id}`);
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeMessage(error.message);
        setUpgradeOpen(true);
        setCreateOpen(false);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create workflow");
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Workflows"
        description="Build once, run forever."
        actions={
          <>
            <SearchInput placeholder="Search workflows…" onSearch={setQuery} />
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Create Workflow
            </Button>
          </>
        }
      />
      {isLoading ? (
        <LoadingSkeleton variant="cards" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title="No workflows yet"
          description="Build your first AI workflow to start automating work."
          actionLabel="+ Create Workflow"
          onAction={() => setCreateOpen(true)}
          secondaryLabel="Browse Templates"
          onSecondary={() => router.push("/templates")}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((workflow) => (
            <Card key={workflow.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/workflows/${workflow.id}`} className="min-w-0 flex-1">
                    <p className="truncate font-semibold hover:text-primary">{workflow.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {workflow.description || `${workflow.blocks.length} blocks`}
                    </p>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Workflow actions">
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}`)}>
                        Open builder
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/workflows/${workflow.id}/runs`)}>
                        Run history
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-error focus:text-error"
                        onClick={() => setDeleteId(workflow.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="workflow-name">Name</Label>
              <Input
                id="workflow-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Blog Generator"
                onKeyDown={(event) => event.key === "Enter" && void create()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Project (optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger aria-label="Project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {(projects ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={createWorkflow.isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete workflow?"
        description="The workflow will be moved to trash. Its run history is kept."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) {
            deleteWorkflow.mutate(deleteId, {
              onError: (error) => toast.error(error.message),
            });
            setDeleteId(null);
          }
        }}
      />
      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}

export default function WorkflowsPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingSkeleton variant="cards" />}>
      <WorkflowsPageInner />
    </Suspense>
  );
}
