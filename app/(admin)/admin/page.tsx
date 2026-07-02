"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CreditCard, IndianRupee, Users } from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PageHeader } from "@/components/layout/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/http";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  runsToday: number;
  revenueThisMonth: string;
  groqConfigured: boolean;
}

export default function AdminDashboardPage(): JSX.Element {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api<AdminStats>("/api/admin/stats"),
  });

  if (isLoading || !stats) {
    return <LoadingSkeleton variant="cards" count={4} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Platform health at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total Users" value={String(stats.totalUsers)} icon={Users} />
        <StatsCard
          label="Active Subscriptions"
          value={String(stats.activeSubscriptions)}
          icon={CreditCard}
        />
        <StatsCard label="Runs Today" value={String(stats.runsToday)} icon={Activity} />
        <StatsCard
          label="Revenue This Month"
          value={`₹${stats.revenueThisMonth}`}
          icon={IndianRupee}
          hint="manually tracked"
        />
      </div>
      <Card>
        <CardContent className="flex items-center gap-3 p-5">
          <span
            className={`h-2.5 w-2.5 rounded-full ${stats.groqConfigured ? "bg-success" : "bg-error"}`}
            aria-hidden
          />
          <p className="text-sm">
            System status:{" "}
            {stats.groqConfigured
              ? "Groq API key configured — platform AI is available."
              : "No GROQ_API_KEY set — platform AI runs will fail until a provider is configured."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
