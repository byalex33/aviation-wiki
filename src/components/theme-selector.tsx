"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";

const storageKey = "aviation-theme";
const themes = [
  "default",
  "pastel-light",
  "pastel-dark",
  "twitter-light",
  "twitter-dark",
] as const;
type Theme = (typeof themes)[number];

function savedTheme(): Theme {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem(storageKey);
  return themes.includes(saved as Theme) ? (saved as Theme) : "default";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme.endsWith("-dark"));
  if (theme === "default") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(storageKey);
  } else {
    document.documentElement.dataset.theme = theme.startsWith("pastel")
      ? "pastel-dreams"
      : "twitter";
    localStorage.setItem(storageKey, theme);
  }
}

export function ThemeSelector() {
  const { isLoaded, user } = useUser();
  const [theme, setTheme] = useState(savedTheme);
  const role = String(user?.publicMetadata.role || "");
  const canChooseTheme =
    user?.publicMetadata.pro === true ||
    role === "moderator" ||
    role === "admin";

  return (
    <div className="max-w-64">
      <label
        htmlFor="theme-selector"
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-background/40"
      >
        Theme
      </label>
      <select
        id="theme-selector"
        value={theme}
        disabled={!isLoaded || !canChooseTheme}
        suppressHydrationWarning
        onChange={(event) => {
          const nextTheme = event.target.value as Theme;
          setTheme(nextTheme);
          applyTheme(nextTheme);
        }}
        className="mt-4 h-10 w-full rounded-lg border border-background/20 bg-background px-3 text-sm font-medium text-foreground outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="default">Aviation</option>
        <option value="pastel-light">Pastel Dreams (Light)</option>
        <option value="pastel-dark">Pastel Dreams (Dark)</option>
        <option value="twitter-light">Twitter (Light)</option>
        <option value="twitter-dark">Twitter (Dark)</option>
      </select>
      <p className="mt-2 text-xs text-background/40">
        {canChooseTheme ? "Saved on this device." : "Available to Pro and Staff."}
      </p>
    </div>
  );
}
