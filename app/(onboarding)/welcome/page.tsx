"use client";

import {
  Briefcase,
  FileText,
  Megaphone,
  PenLine,
  Search,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { useOnboardingStore } from "@/stores/onboarding.store";

const GOALS = [
  { id: "content", label: "Content Creation", icon: PenLine, description: "Blogs, scripts, social posts" },
  { id: "marketing", label: "Marketing", icon: Megaphone, description: "Campaigns, ads, emails" },
  { id: "research", label: "Research", icon: Search, description: "Analysis, reports, insights" },
  { id: "documentation", label: "Documentation", icon: FileText, description: "Notes, docs, summaries" },
  { id: "business", label: "Business", icon: Briefcase, description: "Plans, proposals, operations" },
  { id: "custom", label: "Custom", icon: Sparkles, description: "Something else entirely" },
] as const;

export default function WelcomePage(): JSX.Element {
  const router = useRouter();
  const setGoal = useOnboardingStore((state) => state.setGoal);

  function choose(goal: string): void {
    setGoal(goal);
    router.push("/workspace");
  }

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          What would you like to automate?
        </h1>
        <p className="text-muted-foreground">
          We&apos;ll tailor your workspace to how you work. You can change this later.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GOALS.map((goal) => (
          <Card
            key={goal.id}
            className="cursor-pointer transition-colors hover:border-primary"
            onClick={() => choose(goal.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose(goal.id);
              }
            }}
            aria-label={`Choose ${goal.label}`}
          >
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <goal.icon className="h-7 w-7 text-primary" aria-hidden />
              <span className="font-medium">{goal.label}</span>
              <span className="text-xs text-muted-foreground">{goal.description}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
