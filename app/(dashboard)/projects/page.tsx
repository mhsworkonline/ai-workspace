"use client";

import { FolderKanban, MoreHorizontal, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
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
import { Textarea } from "@/components/ui/textarea";
import { useCreateProject, useDeleteProject, useProjects } from "@/hooks/use-projects";
import { useSession } from "@/hooks/use-session";
import { useWorkflows } from "@/hooks/use-workflows";
import { ApiError } from "@/lib/api/http";
import { timeAgo } from "@/lib/utils/format";

const PROJECT_COLORS = ["#0D9488", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#10B981"];

export default function ProjectsPage(): JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const workspace = session?.workspace;
  const { data: projects, isLoading } = useProjects(workspace?.id);
  const { data: workflows } = useWorkflows(workspace?.id);
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string>();

  function workflowCount(projectId: string): number {
    return (workflows ?? []).filter((workflow) => workflow.project_id === projectId).length;
  }

  async function create(): Promise<void> {
    if (!workspace || !name.trim()) {
      return;
    }
    try {
      await createProject.mutateAsync({ workspace, name: name.trim(), description, color });
      setCreateOpen(false);
      setName("");
      setDescription("");
      toast.success("Project created");
    } catch (error) {
      if (error instanceof ApiError && error.upgrade) {
        setUpgradeMessage(error.message);
        setUpgradeOpen(true);
        setCreateOpen(false);
      } else {
        toast.error(error instanceof Error ? error.message : "Could not create project");
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Organize workflows by client, product, or team."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Create Project
          </Button>
        }
      />
      {isLoading ? (
        <LoadingSkeleton variant="cards" />
      ) : (projects ?? []).length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to organize your workflows."
          actionLabel="+ Create Project"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects ?? []).map((project) => (
            <Card key={project.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/projects/${project.id}`} className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className="mt-0.5 h-8 w-8 shrink-0 rounded-lg"
                      style={{ backgroundColor: project.color }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold hover:text-primary">{project.name}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {project.description || "No description"}
                      </p>
                    </div>
                  </Link>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Project actions">
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                        Open
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-error focus:text-error"
                        onClick={() => setDeleteId(project.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  {workflowCount(project.id)} workflows · created {timeAgo(project.created_at)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="project-name">Name</Label>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Marketing"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project-description">Description (optional)</Label>
              <Textarea
                id="project-description"
                rows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2" role="radiogroup" aria-label="Project color">
                {PROJECT_COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="radio"
                    aria-checked={color === option}
                    aria-label={`Color ${option}`}
                    className={`h-7 w-7 rounded-full transition-transform ${color === option ? "scale-110 ring-2 ring-ring ring-offset-2" : ""}`}
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()} disabled={createProject.isPending || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete project?"
        description="Workflows inside this project are kept but unassigned."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) {
            deleteProject.mutate(deleteId, { onError: (error) => toast.error(error.message) });
            setDeleteId(null);
          }
        }}
      />
      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}
