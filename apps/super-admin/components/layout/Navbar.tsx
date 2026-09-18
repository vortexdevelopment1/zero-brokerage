"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Search, LogOut, User, ChevronDown } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";

export function Navbar() {
  const { setMobileSidebarOpen } = useUiStore();
  const { session, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/admin/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 border-b border-ink-200 bg-white/90 px-4 backdrop-blur sm:px-6">
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="rounded-md p-1.5 text-ink-500 hover:bg-ink-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden max-w-md flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
        <input
          placeholder="Search users, brokers, properties…"
          className="w-full rounded-lg border border-ink-200 bg-ink-50/60 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="relative rounded-lg p-2 text-ink-500 transition-colors hover:bg-ink-100" aria-label="Notifications">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-accent-500 ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-ink-100"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
              {(session?.name ?? "A").charAt(0).toUpperCase()}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-medium leading-tight text-ink-800">{session?.name ?? "Admin"}</p>
              <p className="text-[11px] leading-tight text-ink-500">{session?.role ?? "Super Admin"}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-ink-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 animate-fade-in rounded-xl border border-ink-200 bg-white p-1.5 shadow-popover">
                <a
                  href="/admin/settings"
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <User className="h-4 w-4 text-ink-400" /> Profile settings
                </a>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-100/50"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
