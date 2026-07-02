"use client";

import { ArrowRight, FolderOpen, History, Loader2, PartyPopper, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSession } from "@/hooks/use-session";
import { TABLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import { useOnboardingStore } from "@/stores/onboarding.store";

export default function SuccessPage(): JSX.Element {
  const router = useRouter();
  const { session, refresh } = useSession();
  const reset = useOnboardingStore((state) => state.reset);
  const [finishing, setFinishing] = useState(false);

  async function finish(): Promise<void> {
    setFinishing(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from(TABLES.PROFILES)
          .update({ onboarding_completed: true })
          .eq("id", user.id);
      }
      reset();
      await refresh();
      router.push("/dashboard");
    } catch {
      toast.error("Something went wrong. Please try again.");
      setFinishing(false);
    }
  }

  const isFree = session?.workspace?.subscription_tier === "free";

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <PartyPopper className="mx-auto h-14 w-14 animate-bounce text-primary" aria-hidden />
        <h1 className="text-3xl font-bold tracking-tight">Your first workflow completed! 🎉</h1>
        <p className="text-muted-foreground">
          You just automated something that used to take hours of back-and-forth with AI.
        </p>
      </div>
      <div className="grid gap-3 text-left sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <History className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Outputs are saved in Runs</p>
              <p className="text-xs text-muted-foreground">
                Every run keeps its inputs, outputs, and each step — exportable anytime.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <FolderOpen className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <div>
              <p className="font-medium">Explore more templates</p>
              <p className="text-xs text-muted-foreground">
                Blog Generator, Launch Kit, Research Assistant, and more are ready to use.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {isFree ? (
        <Card className="border-primary/40 bg-accent/50">
          <CardContent className="flex items-center justify-between gap-4 p-5 text-left">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <p className="font-medium">Get unlimited runs with Pro</p>
                <p className="text-xs text-muted-foreground">
                  1,000 runs/month, 10 GB storage, brand memory, and your own API keys.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/settings/billing")}>
              Upgrade
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <Button size="lg" onClick={() => void finish()} disabled={finishing}>
        {finishing ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <ArrowRight className="mr-2 h-4 w-4" aria-hidden />
        )}
        Go to Dashboard
      </Button>
    </div>
  );
}
