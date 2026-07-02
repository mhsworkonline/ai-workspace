"use client";

import {
  Download,
  File as FileIcon,
  FileText,
  Film,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Music,
  Table2,
  Trash2,
  Upload,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { SearchInput } from "@/components/shared/search-input";
import { UpgradePrompt } from "@/components/shared/upgrade-prompt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets, useDeleteAsset, useUploadAsset } from "@/hooks/use-assets";
import { useSession } from "@/hooks/use-session";
import { ApiError } from "@/lib/api/http";
import { PLAN_LIMITS, PlanTier } from "@/lib/constants";
import { formatBytes, timeAgo } from "@/lib/utils/format";
import type { Asset } from "@/types/database";
import type { LucideIcon } from "lucide-react";

const TYPE_ICONS: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  document: FileText,
  spreadsheet: Table2,
  other: FileIcon,
};

function AssetsPageInner(): JSX.Element {
  const searchParams = useSearchParams();
  const { session } = useSession();
  const workspace = session?.workspace;
  const { data: assets, isLoading } = useAssets(workspace?.id);
  const uploadAsset = useUploadAsset();
  const deleteAsset = useDeleteAsset();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string>();
  const [dragActive, setDragActive] = useState(false);
  const autoOpenRef = useRef(searchParams.get("upload") === "1");

  if (autoOpenRef.current && fileInputRef.current) {
    autoOpenRef.current = false;
    fileInputRef.current.click();
  }

  const tier = (workspace?.subscription_tier as PlanTier) ?? PlanTier.Free;
  const storageLimit = PLAN_LIMITS[tier].storageBytes;
  const storageUsed = workspace?.storage_used_bytes ?? 0;
  const storagePct = Math.min(100, (storageUsed / storageLimit) * 100);

  const filtered = (assets ?? []).filter(
    (asset) =>
      (typeFilter === "all" || asset.file_type === typeFilter) &&
      (asset.name.toLowerCase().includes(query.toLowerCase()) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase())))
  );

  async function handleFiles(files: FileList | null): Promise<void> {
    if (!files || !workspace) {
      return;
    }
    for (const file of Array.from(files)) {
      try {
        await uploadAsset.mutateAsync({ workspaceId: workspace.id, file });
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        if (error instanceof ApiError && error.upgrade) {
          setUpgradeMessage(error.message);
          setUpgradeOpen(true);
        } else {
          toast.error(error instanceof Error ? error.message : `Could not upload ${file.name}`);
        }
      }
    }
  }

  function AssetActions({ asset }: { asset: Asset }): JSX.Element {
    return (
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <a href={asset.file_url} download aria-label={`Download ${asset.name}`}>
            <Download className="h-3.5 w-3.5" aria-hidden />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-error"
          aria-label={`Delete ${asset.name}`}
          onClick={() => setDeleteId(asset.id)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragActive(false);
        void handleFiles(event.dataTransfer.files);
      }}
    >
      <PageHeader
        title="Assets"
        description="Files you can use across workflows."
        actions={
          <>
            <SearchInput placeholder="Search assets…" onSearch={setQuery} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36" aria-label="Filter by type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="spreadsheet">Spreadsheets</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              aria-label={view === "grid" ? "Switch to list view" : "Switch to grid view"}
              onClick={() => setView(view === "grid" ? "list" : "grid")}
            >
              {view === "grid" ? (
                <List className="h-4 w-4" aria-hidden />
              ) : (
                <LayoutGrid className="h-4 w-4" aria-hidden />
              )}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} disabled={uploadAsset.isPending}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden />
              {uploadAsset.isPending ? "Uploading…" : "Upload Asset"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              aria-hidden
              onChange={(event) => void handleFiles(event.target.files)}
            />
          </>
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border bg-card p-3">
        <Progress value={storagePct} className="h-2 flex-1" aria-label="Storage used" />
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatBytes(storageUsed)} / {formatBytes(storageLimit)} used
        </span>
      </div>
      {storagePct > 80 ? (
        <p className="mb-4 rounded-md border border-warning/40 bg-warning/5 p-3 text-sm">
          You&apos;re running low on storage.{" "}
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() => setUpgradeOpen(true)}
          >
            Upgrade for more space →
          </button>
        </p>
      ) : null}

      {dragActive ? (
        <div className="mb-4 rounded-lg border-2 border-dashed border-primary bg-accent/40 p-8 text-center text-sm text-accent-foreground">
          Drop files to upload
        </div>
      ) : null}

      {isLoading ? (
        <LoadingSkeleton variant={view === "grid" ? "cards" : "list"} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No assets yet"
          description="Upload files to use in your workflows. Drag and drop works too."
          actionLabel="+ Upload Asset"
          onAction={() => fileInputRef.current?.click()}
        />
      ) : view === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((asset) => {
            const Icon = TYPE_ICONS[asset.file_type] ?? FileIcon;
            return (
              <Card key={asset.id}>
                <CardContent className="p-4">
                  <div className="mb-3 flex h-24 items-center justify-center rounded-md bg-surface-2">
                    {asset.file_type === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        className="h-24 w-full rounded-md object-cover"
                      />
                    ) : (
                      <Icon className="h-8 w-8 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={asset.name}>
                        {asset.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(asset.file_size_bytes)} · {timeAgo(asset.created_at)}
                      </p>
                    </div>
                    <AssetActions asset={asset} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((asset) => {
            const Icon = TYPE_ICONS[asset.file_type] ?? FileIcon;
            return (
              <div key={asset.id} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{asset.name}</span>
                <span className="hidden text-xs capitalize text-muted-foreground sm:inline">
                  {asset.file_type}
                </span>
                <span className="w-20 text-right font-mono text-xs text-muted-foreground">
                  {formatBytes(asset.file_size_bytes)}
                </span>
                <span className="hidden w-28 text-right text-xs text-muted-foreground md:inline">
                  {timeAgo(asset.created_at)}
                </span>
                <AssetActions asset={asset} />
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteId)}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete asset?"
        description="The file will be removed from your workspace."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteId) {
            deleteAsset.mutate(deleteId, { onError: (error) => toast.error(error.message) });
            setDeleteId(null);
          }
        }}
      />
      <UpgradePrompt open={upgradeOpen} onOpenChange={setUpgradeOpen} message={upgradeMessage} />
    </div>
  );
}

export default function AssetsPage(): JSX.Element {
  return (
    <Suspense fallback={<LoadingSkeleton variant="cards" />}>
      <AssetsPageInner />
    </Suspense>
  );
}
