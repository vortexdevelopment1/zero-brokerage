"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, UserCheck, Building2, Home, Briefcase, Trees, Sofa,
  CalendarCheck, Wallet, ShieldAlert, BarChart3, Activity, Settings, ChevronLeft,
  ChevronDown, Boxes, X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils/cn";
import { useUiStore } from "@/store/uiStore";

interface NavLeaf {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}
interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  children?: NavLeaf[];
}

const NAV: NavGroup[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Brokers", icon: UserCheck, href: "/admin/brokers" },
  { label: "Agencies", icon: Building2, href: "/admin/agencies" },
  {
    label: "Properties",
    icon: Boxes,
    children: [
      { label: "Residential", href: "/admin/properties/residential", icon: Home },
      { label: "Commercial & Offices", href: "/admin/properties/commercial", icon: Briefcase },
      { label: "Land & Plots", href: "/admin/properties/land", icon: Trees },
      { label: "Furniture", href: "/admin/properties/furniture", icon: Sofa },
    ],
  },
  { label: "Visits", icon: CalendarCheck, href: "/admin/visits" },
  {
    label: "Revenue",
    icon: Wallet,
    children: [
      { label: "Overview", href: "/admin/revenue" },
      { label: "Subscriptions", href: "/admin/revenue/subscriptions" },
      { label: "Commission", href: "/admin/revenue/commission" },
      { label: "Micro Transactions", href: "/admin/revenue/micro-transactions" },
      { label: "Transactions", href: "/admin/revenue/transactions" },
    ],
  },
  { label: "Urgent Requirements", icon: ShieldAlert, href: "/admin/urgent-requirements" },
  { label: "Reports & Analytics", icon: BarChart3, href: "/admin/reports" },
  { label: "System Monitoring", icon: Activity, href: "/admin/monitoring" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

function isActive(pathname: string, href?: string, children?: NavLeaf[]) {
  if (href) return pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
  if (children) return children.some((c) => pathname === c.href || pathname.startsWith(c.href));
  return false;
}

function NavItem({ group, collapsed, pathname, onNavigate }: {
  group: NavGroup; collapsed: boolean; pathname: string; onNavigate: () => void;
}) {
  const active = isActive(pathname, group.href, group.children);
  const [open, setOpen] = useState(active);
  const Icon = group.icon;

  if (group.href) {
    return (
      <Link
        href={group.href}
        onClick={onNavigate}
        className={cn(
          "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "bg-brand-600 text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
        )}
        title={collapsed ? group.label : undefined}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-white" : "text-ink-400 group-hover:text-white")} />
        {!collapsed && <span className="truncate">{group.label}</span>}
      </Link>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active ? "text-white" : "text-ink-300 hover:bg-white/5 hover:text-white"
        )}
        title={collapsed ? group.label : undefined}
      >
        <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand-300" : "text-ink-400 group-hover:text-white")} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{group.label}</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>
      {!collapsed && open && group.children && (
        <div className="ml-[13px] mt-1 space-y-0.5 border-l border-white/10 pl-4">
          {group.children.map((child) => {
            const childActive = pathname === child.href || pathname.startsWith(child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-2.5 py-2 text-[13px] transition-colors",
                  childActive ? "bg-brand-600/90 text-white font-medium" : "text-ink-400 hover:bg-white/5 hover:text-white"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useUiStore();

  const content = (
    <div className="flex h-full flex-col bg-ink-950">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            VC
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">VortexCubes</p>
              <p className="truncate text-[10px] uppercase tracking-wide text-ink-400">Super Admin</p>
            </div>
          )}
        </Link>
        <button
          onClick={() => setMobileSidebarOpen(false)}
          className="rounded-md p-1 text-ink-400 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {NAV.map((group) => (
          <NavItem key={group.label} group={group} collapsed={sidebarCollapsed} pathname={pathname} onNavigate={() => setMobileSidebarOpen(false)} />
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <button
          onClick={toggleSidebar}
          className="hidden w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium text-ink-400 transition-colors hover:bg-white/5 hover:text-white lg:flex"
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", sidebarCollapsed && "rotate-180")} />
          {!sidebarCollapsed && "Collapse"}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 transition-all duration-200 lg:block",
          sidebarCollapsed ? "w-[72px]" : "w-64"
        )}
      >
        {content}
      </aside>

      {/* Mobile */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/60" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative h-full w-72 animate-slide-in-left">{content}</aside>
        </div>
      )}
    </>
  );
}
