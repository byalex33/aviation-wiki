"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export type TocHeading = { id: string; text: string; depth: number };

function useActiveHeading(headings: TocHeading[]) {
  const [active, setActive] = useState(headings[0]?.id);

  useEffect(() => {
    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;

    const onScroll = () => {
      let current = headings[0]?.id;
      for (const el of elements) {
        if (el.getBoundingClientRect().top < 140) current = el.id;
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [headings]);

  return active;
}

export function ArticleTocDesktop({ headings }: { headings: TocHeading[] }) {
  const active = useActiveHeading(headings);
  if (!headings.length) return null;
  return (
    <nav aria-label="On this page">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        On this page
      </p>
      <ul className="mt-3 flex flex-col">
        {headings.map((heading) => {
          const isActive = heading.id === active;
          return (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={cn(
                  "block border-l-2 py-1.5 text-[13px] leading-tight transition-colors",
                  heading.depth === 3 ? "pl-6" : "pl-3",
                  isActive
                    ? "border-primary font-semibold text-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {heading.text}
              </a>
            </li>
          );
        })}
      </ul>
      <a
        href="#top"
        className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowUp className="size-3.5" />
        Back to top
      </a>
    </nav>
  );
}

export function ArticleTocMobile({ headings }: { headings: TocHeading[] }) {
  const active = useActiveHeading(headings);
  const [open, setOpen] = useState(false);
  if (!headings.length) return null;
  const activeHeading = headings.find((heading) => heading.id === active) ?? headings[0];

  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-12 w-full items-center justify-between px-4 text-left text-sm font-semibold"
      >
        <span>
          Contents <span className="font-normal text-muted-foreground">· {activeHeading?.text}</span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="border-t p-2">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-2.5 py-2 text-sm",
                  heading.depth === 3 ? "pl-7" : "pl-2.5",
                  heading.id === active ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
