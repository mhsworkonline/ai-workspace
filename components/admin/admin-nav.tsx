"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/users", label: "Users", exact: false },
  { href: "/admin/settings/ai", label: "AI Settings", exact: false },
  { href: "/admin/templates", label: "Templates", exact: false },
  { href: "/admin/logs", label: "Audit Logs", exact: false },
] as const;

export function AdminNav(): JSX.Element {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-background px-4" aria-label="Admin sections">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary font-medium text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
