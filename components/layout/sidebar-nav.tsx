"use client";

import {
  Brain,
  FolderKanban,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LayoutTemplate,
  Settings,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/runs", label: "Runs", icon: History },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

interface SidebarNavProps {
  isAdmin?: boolean;
  onNavigate?: () => void;
}

export function SidebarNav({ isAdmin = false, onNavigate }: SidebarNavProps): JSX.Element {
  const pathname = usePathname();

  const items = isAdmin
    ? [...NAV_ITEMS, { href: "/admin", label: "Admin", icon: ShieldCheck } as const]
    : NAV_ITEMS;

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Main navigation">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md border-l-[3px] border-transparent px-3 py-2 text-sm text-sidebar-muted transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active &&
                "border-sidebar-primary bg-sidebar-accent font-medium text-sidebar-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
