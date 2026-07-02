"use client";

import { Loader2, Workflow } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { TABLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

const STEPS = [
  "/welcome",
  "/workspace",
  "/project",
  "/template",
  "/connect-ai",
  "/first-run",
  "/success",
] as const;

interface OnboardingShellProps {
  children: React.ReactNode;
}

export function OnboardingShell({ children }: OnboardingShellProps): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const { session, refresh } = useSession();
  const [skipping, setSkipping] = useState(false);
  const currentIndex = STEPS.findIndex((step) => pathname.startsWith(step));

  async function skip(): Promise<void> {
    setSkipping(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (!session?.workspace) {
        const { error } = await supabase.from(TABLES.WORKSPACES).insert({
          owner_id: user.id,
          name: "My Workspace",
          slug: slugify("my-workspace"),
        });
        if (error) {
          toast.error(error.message);
          return;
        }
      }
      await supabase
        .from(TABLES.PROFILES)
        .update({ onboarding_completed: true })
        .eq("id", user.id);
      await refresh();
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSkipping(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Workflow className="h-4 w-4 text-primary-foreground" aria-hidden />
          </span>
          <span className="font-semibold">AI Workspace</span>
        </div>
        <div className="flex items-center gap-4">
          <nav aria-label="Onboarding progress" className="hidden items-center gap-1.5 sm:flex">
            {STEPS.map((step, index) => (
              <span
                key={step}
                aria-hidden
                className={cn(
                  "h-1.5 w-6 rounded-full transition-colors",
                  index <= currentIndex ? "bg-primary" : "bg-border"
                )}
              />
            ))}
          </nav>
          {currentIndex < STEPS.length - 1 ? (
            <Button variant="ghost" size="sm" onClick={() => void skip()} disabled={skipping}>
              {skipping ? <Loader2 className="mr-2 h-3 w-3 animate-spin" aria-hidden /> : null}
              Skip setup
            </Button>
          ) : null}
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  );
}
