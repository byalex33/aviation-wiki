"use client";

import { MotionSelect } from "@/components/ui/motion-select";

import { useSyncExternalStore } from "react";
import { useUser } from "@clerk/nextjs";

const storageKey = "aviation-theme";
type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function serverTheme(): Theme {
  return "light";
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener("aviation-theme-change", onChange);
  return () => window.removeEventListener("aviation-theme-change", onChange);
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  delete document.documentElement.dataset.theme;
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // Keep switching available when the browser blocks storage.
  }
  window.dispatchEvent(new Event("aviation-theme-change"));
}

export function ThemeSelector() {
  const { isLoaded, user } = useUser();
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, serverTheme);
  const role = String(user?.publicMetadata.role || "");
  const canChooseTheme =
    user?.publicMetadata.pro === true ||
    role === "moderator" ||
    role === "admin";

  return (
    <div className="max-w-64">
      <label
        htmlFor="theme-selector"
        className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-background/40"
      >
        Theme
        <span className="border border-background/20 px-1.5 py-0.5 text-[9px] tracking-[0.1em] text-background/60">
          Pro
        </span>
      </label>
      <MotionSelect
        id="theme-selector"
        value={theme}
        disabled={!isLoaded || !canChooseTheme}
        onValueChange={(value) => {
          if (value === "light" || value === "dark") applyTheme(value);
        }}
        className="mt-4 h-10 w-full rounded-lg border border-background/20 bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </MotionSelect>
      {canChooseTheme && (
        <p className="mt-2 text-xs text-background/40">Saved on this device.</p>
      )}
    </div>
  );
}
