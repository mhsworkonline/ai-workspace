import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-surface-2 text-muted-foreground" },
  running: { label: "Running", className: "bg-info/10 text-info" },
  awaiting_review: { label: "Needs Review", className: "bg-warning/10 text-warning" },
  completed: { label: "Success", className: "bg-success/10 text-success" },
  failed: { label: "Failed", className: "bg-error/10 text-error" },
  cancelled: { label: "Cancelled", className: "bg-surface-2 text-muted-foreground" },
  active: { label: "Active", className: "bg-success/10 text-success" },
  free: { label: "Free", className: "bg-surface-2 text-muted-foreground" },
  pro: { label: "Pro", className: "bg-primary/10 text-primary" },
  business: { label: "Business", className: "bg-info/10 text-info" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps): JSX.Element {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    className: "bg-surface-2 text-muted-foreground",
  };
  return (
    <Badge variant="secondary" className={cn("rounded-full border-0", style.className, className)}>
      {style.label}
    </Badge>
  );
}
