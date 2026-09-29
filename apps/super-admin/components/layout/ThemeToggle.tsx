"use client";

import { useState, useRef, useEffect } from "react";
import { Sun, Moon, SunMoon, Check, ChevronDown } from "lucide-react";
import { useThemeStore, ThemeMode } from "@/store/themeStore";
import { cn } from "@/lib/utils/cn";

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "auto", label: "Auto", icon: SunMoon },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const mode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setThemeMode);
  const isMounted = useThemeStore((s) => s.isMounted);

  // During SSR or before hydration mount, fallback gracefully to "auto"
  const currentMode = isMounted ? mode : "auto";
  const activeOption = THEME_OPTIONS.find((o) => o.value === currentMode) ?? THEME_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Keyboard navigation: Escape closes dropdown and returns focus
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleSelect(newMode: ThemeMode) {
    setThemeMode(newMode);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
          "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-900",
          "dark:border-ink-800 dark:bg-ink-900 dark:text-ink-200 dark:hover:border-ink-700 dark:hover:bg-ink-800 dark:hover:text-white",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/30",
          open && "border-brand-300 ring-2 ring-brand-100 dark:border-brand-700 dark:ring-brand-900/40"
        )}
        aria-label="Theme settings"
        title="Theme settings"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ActiveIcon className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
        <span className="font-medium">{activeOption.label}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-ink-400 transition-transform duration-150 dark:text-ink-500",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 z-50 mt-1.5 w-36 animate-fade-in rounded-xl border border-ink-200 bg-white p-1 shadow-popover dark:border-ink-800 dark:bg-ink-900"
        >
          {THEME_OPTIONS.map((option) => {
            const isSelected = option.value === currentMode;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
                  isSelected
                    ? "bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950/60 dark:text-brand-300"
                    : "text-ink-700 hover:bg-ink-50 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isSelected
                        ? "text-brand-600 dark:text-brand-400"
                        : "text-ink-400 dark:text-ink-400"
                    )}
                  />
                  <span>{option.label}</span>
                </span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
