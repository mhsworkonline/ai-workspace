import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  variant?: "cards" | "table" | "list";
  count?: number;
}

export function LoadingSkeleton({
  variant = "cards",
  count = 6,
}: LoadingSkeletonProps): JSX.Element {
  if (variant === "table") {
    return (
      <div className="space-y-2" aria-busy aria-label="Loading">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (variant === "list") {
    return (
      <div className="space-y-2" aria-busy aria-label="Loading">
        {Array.from({ length: count }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy aria-label="Loading">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-36 w-full" />
      ))}
    </div>
  );
}
