"use client";

import { create } from "zustand";

export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ThemeConfig {
  DAY_START_HOUR: number;
  DAY_START_MINUTE: number;
  NIGHT_START_HOUR: number;
  NIGHT_START_MINUTE: number;
  DAY_START: string;
  NIGHT_START: string;
  STORAGE_KEY: string;
}

/**
 * Centralized day/night boundary configuration.
 * Day Mode: 06:00 (inclusive) to 18:00 (exclusive)
 * Night Mode: 18:00 to 06:00
 */
export const THEME_CONFIG: ThemeConfig = {
  DAY_START_HOUR: 6,
  DAY_START_MINUTE: 0,
  NIGHT_START_HOUR: 18,
  NIGHT_START_MINUTE: 0,
  DAY_START: "06:00",
  NIGHT_START: "18:00",
  STORAGE_KEY: "themeMode",
};

/**
 * Calculates Light or Dark theme based on the user's local browser/device time.
 * Day: 6:00 AM -> 6:00 PM (06:00 to 17:59:59)
 * Night: 6:00 PM -> 6:00 AM (18:00 to 05:59:59)
 */
export function getThemeFromTime(date: Date = new Date()): ResolvedTheme {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const dayStartMinutes = THEME_CONFIG.DAY_START_HOUR * 60 + THEME_CONFIG.DAY_START_MINUTE;
  const nightStartMinutes = THEME_CONFIG.NIGHT_START_HOUR * 60 + THEME_CONFIG.NIGHT_START_MINUTE;

  if (currentMinutes >= dayStartMinutes && currentMinutes < nightStartMinutes) {
    return "light";
  }
  return "dark";
}

/**
 * Applies the given theme to the document root element by toggling the 'dark' class.
 */
export function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

interface ThemeState {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isMounted: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: "auto",
  resolvedTheme: "light",
  isMounted: false,

  setThemeMode: (mode: ThemeMode) => {
    let resolved: ResolvedTheme;
    if (mode === "auto") {
      resolved = getThemeFromTime();
    } else {
      resolved = mode;
    }

    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(THEME_CONFIG.STORAGE_KEY, mode);
      } catch {
        // Ignore quota/private browsing errors
      }
    }

    applyTheme(resolved);
    set({ mode, resolvedTheme: resolved });
  },

  toggleTheme: () => {
    const current = get().resolvedTheme;
    const next: ThemeMode = current === "dark" ? "light" : "dark";
    get().setThemeMode(next);
  },

  initTheme: () => {
    if (typeof window === "undefined") {
      return () => {};
    }

    // Read stored manual preference or default to "auto"
    let storedMode: ThemeMode = "auto";
    try {
      const saved = localStorage.getItem(THEME_CONFIG.STORAGE_KEY);
      if (saved === "light" || saved === "dark" || saved === "auto") {
        storedMode = saved;
      }
    } catch {
      // Default to "auto"
    }

    let initialResolved: ResolvedTheme;
    if (storedMode === "auto") {
      initialResolved = getThemeFromTime();
    } else {
      initialResolved = storedMode;
    }

    applyTheme(initialResolved);
    set({ mode: storedMode, resolvedTheme: initialResolved, isMounted: true });

    // Monitor local time boundary changes while the app is open
    const interval = setInterval(() => {
      const state = get();
      if (state.mode === "auto") {
        const calculated = getThemeFromTime();
        if (calculated !== state.resolvedTheme) {
          applyTheme(calculated);
          set({ resolvedTheme: calculated });
        }
      }
    }, 15000); // 15s interval ensures near-instant response at boundary (e.g. 17:59 -> 18:00)

    return () => {
      clearInterval(interval);
    };
  },
}));
