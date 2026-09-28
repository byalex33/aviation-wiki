"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  BookCheck,
  DatabaseZap,
  FileClock,
  Gauge,
  Library,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

const icons = {
  dashboard: Gauge,
  moderation: FileClock,
  sources: BookCheck,
  articles: Library,
  import: DatabaseZap,
  users: Users,
  notifications: BellRing,
  audit: ScrollText,
};

export type AdminNavGroup = {
  label: string;
  items: { href: string; label: string; icon: keyof typeof icons; count?: number }[];
};

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({ groups, roleLabel }: { groups: AdminNavGroup[]; roleLabel: string }) {
  const pathname = usePathname();
  const items = groups.flatMap((group) => group.items);
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r bg-card lg:block">
        <div className="sticky top-[60px] flex max-h-[calc(100vh-60px)] flex-col gap-[22px] overflow-auto px-3.5 py-[22px]">
          <div className="flex items-center gap-2.5 px-1.5">
            <span className="grid size-[34px] shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold tracking-tight">Administration</p>
              <p className="mt-px font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{roleLabel}</p>
            </div>
          </div>
          <nav aria-label="Admin navigation" className="flex flex-col gap-[22px]">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="px-2.5 pb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
                  {group.label}
                </p>
                <div className="flex flex-col gap-px">
                  {group.items.map((item) => {
                    const Icon = icons[item.icon];
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                          active
                            ? "bg-accent font-semibold text-accent-foreground hover:text-accent-foreground"
                            : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true" />
                        <span className="flex-1">{item.label}</span>
                        {Boolean(item.count) && (
                          <span
                            className={cn(
                              "rounded-full px-[7px] py-px font-mono text-[11px] font-semibold tabular-nums",
                              active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>
      <nav aria-label="Admin navigation" className="flex gap-1 overflow-x-auto border-b bg-card px-4 py-2 lg:hidden">
        {items.map((item) => {
          const Icon = icons[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm",
                active ? "bg-accent font-semibold text-accent-foreground" : "font-medium text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {item.label}
              {Boolean(item.count) && (
                <span className="rounded-full bg-primary px-1.5 font-mono text-[11px] font-semibold text-primary-foreground">{item.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
