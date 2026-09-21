"use client";

import { create } from "zustand";

interface AdminSession {
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  session: AdminSession | null;
  isHydrated: boolean;
  hydrate: () => void;
  login: (email: string) => void;
  logout: () => void;
}

const STORAGE_KEY = "vc_admin_session";
const TOKEN_KEY = "vc_admin_token";

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isHydrated: false,
  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      set({ session: raw ? (JSON.parse(raw) as AdminSession) : null, isHydrated: true });
    } catch {
      set({ session: null, isHydrated: true });
    }
  },
  login: (email: string) => {
    const session: AdminSession = { name: email.split("@")[0] || "Admin", email, role: "Super Admin" };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      // Mock JWT — a real token will arrive from POST /api/admin/auth/login.
      window.localStorage.setItem(TOKEN_KEY, `mock.${btoa(email)}.token`);
    }
    set({ session, isHydrated: true });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(TOKEN_KEY);
    }
    set({ session: null, isHydrated: true });
  },
}));
