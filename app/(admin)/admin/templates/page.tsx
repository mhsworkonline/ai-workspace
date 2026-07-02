"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { TemplateIcon } from "@/components/shared/template-icon";
import { Badge } from "@/components/ui/badge";
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
import type { Template } from "@/types/database";

export default function AdminTemplatesPage(): JSX.Element {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({
    queryKey: ["admin-templates"],
    queryFn: () => api<Template[]>("/api/admin/templates"),
  });

  const patchTemplate = useMutation({
    mutationFn: (patch: { id: string; isActive: boolean }) =>
      api<{ ok: boolean }>("/api/admin/templates", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-templates"] });
      void queryClient.invalidateQueries({ queryKey: ["templates"] });
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Platform-level starter workflows available to all users."
      />
      {isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="hidden sm:table-cell">Blocks</TableHead>
                <TableHead className="hidden md:table-cell">Uses</TableHead>
                <TableHead className="text-right">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(templates ?? []).map((template) => (
                <TableRow key={template.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <TemplateIcon icon={template.icon} className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="max-w-md truncate text-xs text-muted-foreground">
                          {template.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">
                      {template.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs sm:table-cell">
                    {template.blocks.length}
                  </TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">
                    {template.use_count}
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(isActive) =>
                        patchTemplate.mutate({ id: template.id, isActive })
                      }
                      aria-label={`Toggle ${template.name}`}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
