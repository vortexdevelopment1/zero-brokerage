"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

/**
 * Protects /admin/* routes. Hydrates the mock session from localStorage and
 * redirects to /admin/login when there is none. When the real
 * POST /api/admin/auth/login flow is wired up, this hook's shape stays the
 * same — only the session source changes.
 */
export function useAuthGuard() {
  const router = useRouter();
  const { session, isHydrated, hydrate } = useAuthStore();

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isHydrated && !session) {
      router.replace("/admin/login");
    }
  }, [isHydrated, session, router]);

  return { session, isReady: isHydrated && !!session };
}
