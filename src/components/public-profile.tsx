"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowUpRight, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

import { articlePath } from "@/lib/article-routes";
import type { PublicContribution } from "@/lib/public-profile-types";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/lib/wiki-types";

/**
 * Renders `children` only for the signed-in owner of the profile. Ownership is
 * resolved in the browser so the public page stays free of per-request auth.
 */
export function OwnProfileOnly({
  profileId,
  children,
  fallback = null,
}: {
  profileId: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isLoaded, user } = useUser();
  return isLoaded && user?.id === profileId ? children : fallback;
}

export function ShareProfileButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      toast.error("Couldn't copy the profile link");
      return;
    }
    toast.success("Profile link copied");
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2200);
  }

  const Icon = copied ? Check : Link2;
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-10 items-center gap-1.5 rounded-lg border bg-background px-3.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon
        className={cn("size-4", copied && "text-emerald-600 dark:text-emerald-400")}
        aria-hidden="true"
      />
      {copied ? "Copied" : "Share profile"}
    </button>
  );
}

const contentTypeLabels: Record<ContentType, string> = {
  airline: "Airlines",
  alliance: "Alliances",
  aircraft: "Aircraft",
  airport: "Airports",
  manufacturer: "Manufacturers",
  engine: "Engines",
  event: "Aviation news",
};

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortMonthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  timeZone: "UTC",
});

export function ContributionHistory({
  contributions,
}: {
  contributions: PublicContribution[];
}) {
  const [filter, setFilter] = useState<ContentType | "all">("all");

  const counts = new Map<ContentType, number>();
  for (const contribution of contributions) {
    counts.set(contribution.contentType, (counts.get(contribution.contentType) ?? 0) + 1);
  }
  const active = filter !== "all" && counts.has(filter) ? filter : "all";
  const filters: Array<{ value: ContentType | "all"; label: string; count: number }> = [
    { value: "all", label: "All", count: contributions.length },
    ...[...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, label: contentTypeLabels[value], count })),
  ];

  const months: Array<{ label: string; items: PublicContribution[] }> = [];
  for (const contribution of contributions) {
    if (active !== "all" && contribution.contentType !== active) continue;
    const label = monthFormatter.format(new Date(contribution.contributedAt));
    const month = months.at(-1);
    if (month?.label === label) month.items.push(contribution);
    else months.push({ label, items: [contribution] });
  }

  return (
    <>
      {filters.length > 2 && (
        <div className="mt-5 flex flex-wrap gap-1.5" role="group" aria-label="Filter by category">
          {filters.map((item) => {
            const selected = item.value === active;
            return (
              <button
                key={item.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(item.value)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "bg-card text-foreground/80 hover:border-foreground/30",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "font-mono text-[11px]",
                    selected ? "text-background/60" : "text-muted-foreground",
                  )}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex flex-col gap-7">
        {months.map((month) => (
          <div key={month.label}>
            <div className="flex items-baseline justify-between gap-3 border-b border-foreground pb-2.5">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em]">
                {month.label}
              </h3>
              <span className="font-mono text-[11px] text-muted-foreground">
                {month.items.length} {month.items.length === 1 ? "edit" : "edits"}
              </span>
            </div>
            <ol>
              {month.items.map((contribution) => {
                const date = new Date(contribution.contributedAt);
                return (
                  <li key={contribution.id} className="border-b">
                    <Link
                      href={articlePath(contribution.contentType, contribution.articleSlug)}
                      className="group grid grid-cols-[40px_minmax(0,1fr)] items-center gap-4 px-2 py-4 outline-none transition-colors hover:bg-card focus-visible:bg-card sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-5"
                    >
                      <time dateTime={contribution.contributedAt} className="text-center font-mono">
                        <span className="block text-xl font-semibold leading-none tracking-[-0.02em]">
                          {String(date.getUTCDate()).padStart(2, "0")}
                        </span>
                        <span className="mt-1 block text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                          {shortMonthFormatter.format(date)}
                        </span>
                      </time>
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold tracking-[-0.02em] transition-colors group-hover:text-primary">
                          {contribution.title}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] leading-5 text-muted-foreground">
                          {contribution.editSummary || "Approved revision"}
                        </p>
                      </div>
                      <div className="hidden items-center gap-3.5 sm:flex">
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {contentTypeLabels[contribution.contentType]}
                        </span>
                        <ArrowUpRight
                          className="size-4 text-muted-foreground/70 transition-colors group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}
