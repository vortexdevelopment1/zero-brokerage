"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { usePathname } from "next/navigation";
import { LoadingState } from "@/components/ui/States";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";

  if (isLoginRoute) return <>{children}</>;

  return <ProtectedShell>{children}</ProtectedShell>;
}

function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { isReady } = useAuthGuard();

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50">
        <LoadingState label="Checking your session…" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink-50">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
