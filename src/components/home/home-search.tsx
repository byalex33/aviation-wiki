"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

import { SpringSearchButton } from "@/components/ui/home-motion";

const examples = [
  ["A350", "type"],
  ["G-XWBA", "registration"],
  ["LHR", "airport code"],
  ["BA", "airline code"],
] as const;

export function HomeSearch() {
  const input = useRef<HTMLInputElement>(null);
  return (
    <form action="/search" role="search" className="mt-7 max-w-[560px]">
      <div className="flex items-center gap-2 rounded-[14px] border bg-card p-1.5 shadow-[0_12px_32px_-20px_rgba(0,0,0,.3)] transition-colors focus-within:border-primary">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <input
            ref={input}
            type="search"
            name="q"
            aria-label="Search aviation.wiki"
            placeholder="Names, codes, registrations…"
            className="h-12 w-full border-0 bg-transparent pl-10 pr-2 text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
        <SpringSearchButton className="h-12 rounded-[10px] bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85" />
      </div>
      <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Try</span>
        {examples.map(([query, hint]) => (
          <button
            key={query}
            type="button"
            onClick={() => {
              if (!input.current) return;
              input.current.value = query;
              input.current.focus();
            }}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs transition-colors hover:border-muted-foreground/60"
          >
            <span className="font-mono font-semibold">{query}</span>
            <span className="text-muted-foreground">{hint}</span>
          </button>
        ))}
      </div>
    </form>
  );
}
