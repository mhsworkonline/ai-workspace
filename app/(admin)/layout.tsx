import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TABLES } from "@/lib/constants";
import { createServerSupabase } from "@/lib/supabase/server";
import { AdminNav } from "@/components/admin/admin-nav";
import { ErrorBoundary } from "@/components/shared/error-boundary";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default async function AdminLayout({ children }: AdminLayoutProps): Promise<JSX.Element> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const { data: profile } = await supabase
    .from(TABLES.PROFILES)
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-14 items-center gap-4 border-b bg-sidebar px-4 text-sidebar-foreground">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-sidebar-muted hover:text-sidebar-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to app
        </Link>
        <span className="flex items-center gap-2 font-semibold">
          <ShieldCheck className="h-4 w-4 text-sidebar-primary" aria-hidden /> Admin Panel
        </span>
      </header>
      <AdminNav />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
