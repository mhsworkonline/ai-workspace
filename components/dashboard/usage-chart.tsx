"use client";

import { format, startOfDay, subDays } from "date-fns";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RunWithWorkflow } from "@/lib/api/runs";

interface UsageChartProps {
  runs: RunWithWorkflow[];
}

const DAYS = 7;

export function UsageChart({ runs }: UsageChartProps): JSX.Element {
  const days = Array.from({ length: DAYS }, (_, index) => {
    const day = startOfDay(subDays(new Date(), DAYS - 1 - index));
    return {
      label: format(day, "EEE"),
      count: runs.filter((run) => startOfDay(new Date(run.created_at)).getTime() === day.getTime())
        .length,
    };
  });

  const mostUsed = new Map<string, number>();
  for (const run of runs) {
    const name = run.workflow?.name ?? "Unknown";
    mostUsed.set(name, (mostUsed.get(name) ?? 0) + 1);
  }
  const top = Array.from(mostUsed.entries()).sort((a, b) => b[1] - a[1])[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Runs — last 7 days</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} width={24} />
              <Tooltip
                cursor={{ fill: "hsl(var(--surface-2))" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {top ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Most used: <span className="font-medium text-foreground">{top[0]}</span> ({top[1]} runs)
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
