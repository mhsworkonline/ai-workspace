import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function DashboardLoading(): JSX.Element {
  return <LoadingSkeleton variant="cards" count={4} />;
}
