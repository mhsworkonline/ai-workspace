"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", label: "Profile" },
  { href: "/settings/workspace", label: "Workspace" },
  { href: "/settings/ai", label: "AI Provider" },
  { href: "/settings/billing", label: "Billing" },
  { href: "/settings/notifications", label: "Notifications" },
] as const;

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps): JSX.Element {
  const pathname = usePathname();
  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, workspace, and plan." />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b" aria-label="Settings sections">
        {TABS.map((tab) => {
          const active = pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                active && "border-primary font-medium text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="max-w-2xl">{children}</div>
    </div>
  );
}
