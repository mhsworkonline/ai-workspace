import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { TABLES } from "@/lib/constants";
import { createServerSupabase } from "@/lib/supabase/server";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps): Promise<JSX.Element> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select("onboarding_completed, is_suspended")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Pre-existing auth account (shared Supabase project) with no profile row
    // yet — create it, then send them through onboarding.
    await supabase.from(TABLES.PROFILES).insert({
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
    });
    redirect("/welcome");
  }

  if (profile.is_suspended) {
    redirect("/login?error=suspended");
  }
  if (!profile.onboarding_completed) {
    redirect("/welcome");
  }

  // Onboarding done but no workspace (skipped creation, or it was deleted):
  // send them to the workspace step instead of a dead dashboard.
  const { count: ownedCount } = await supabase
    .from(TABLES.WORKSPACES)
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);
  if ((ownedCount ?? 0) === 0) {
    const { count: memberCount } = await supabase
      .from(TABLES.WORKSPACE_MEMBERS)
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "active");
    if ((memberCount ?? 0) === 0) {
      redirect("/workspace");
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto bg-surface">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
