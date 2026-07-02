import { format, formatDistanceToNow } from "date-fns";

export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms == null) {
    return "—";
  }
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) {
    return "—";
  }
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {
    return "—";
  }
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) {
    return "—";
  }
  return format(new Date(date), "MMM d, yyyy h:mm a");
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) {
    return "Unlimited";
  }
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(text: string): string {
  return `${text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length)}…` : text;
}
