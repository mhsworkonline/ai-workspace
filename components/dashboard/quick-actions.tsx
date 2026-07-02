"use client";

import { LayoutTemplate, Plus, Upload, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickActions(): JSX.Element {
  const router = useRouter();
  const actions = [
    { label: "New Workflow", icon: Plus, href: "/workflows?new=1" },
    { label: "Browse Templates", icon: LayoutTemplate, href: "/templates" },
    { label: "Upload Asset", icon: Upload, href: "/assets?upload=1" },
    { label: "Invite Team Member", icon: UserPlus, href: "/team?invite=1" },
  ] as const;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => router.push(action.href)}
          >
            <action.icon className="h-5 w-5 text-primary" aria-hidden />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
