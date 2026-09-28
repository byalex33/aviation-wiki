"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitCompareArrows, Search, UserRoundX } from "lucide-react";

import { moderationHref, type ModerationFilterValues } from "@/lib/admin-display";
import { cn } from "@/lib/utils";

function Toggle({ on, onClick, icon: Icon, children }: { on: boolean; onClick: () => void; icon: typeof Search; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors",
        on ? "border-primary bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {children}
    </button>
  );
}

export function ModerationFilters({
  values,
  contentTypes,
  resultLabel,
}: {
  values: ModerationFilterValues;
  contentTypes: { value: string; label: string }[];
  resultLabel: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(values.q);

  const apply = (next: Partial<ModerationFilterValues>) =>
    startTransition(() => router.replace(moderationHref({ ...values, ...next }), { scroll: false }));
  const applyQuery = useEffectEvent((q: string) => {
    if (q !== values.q) apply({ q });
  });

  useEffect(() => {
    const timer = setTimeout(() => applyQuery(query.trim()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const hasFilters = Boolean(values.q) || values.contentType !== "all" || values.conflicting || values.unassigned;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2" aria-busy={pending}>
      <div className="relative max-w-[320px] flex-[1_1_200px]">
        <Search className="pointer-events-none absolute left-[11px] top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search title or contributor"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search title or contributor"
          className="h-9 w-full rounded-lg border bg-card pl-8 pr-3 text-[13px] outline-none transition-shadow placeholder:text-muted-foreground focus:border-ring focus:ring-[3px] focus:ring-ring/15"
        />
      </div>
      <select
        aria-label="Content type"
        value={values.contentType}
        onChange={(event) => apply({ contentType: event.target.value })}
        className="h-9 rounded-lg border bg-card px-2.5 text-[13px] outline-none focus:border-ring"
      >
        <option value="all">All content types</option>
        {contentTypes.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <Toggle on={values.conflicting} onClick={() => apply({ conflicting: !values.conflicting })} icon={GitCompareArrows}>
        Conflicts only
      </Toggle>
      <Toggle on={values.unassigned} onClick={() => apply({ unassigned: !values.unassigned })} icon={UserRoundX}>
        Unassigned
      </Toggle>
      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            apply({ q: "", contentType: "all", conflicting: false, unassigned: false });
          }}
          className="h-9 px-2 text-[13px] text-muted-foreground underline underline-offset-[3px] hover:text-foreground"
        >
          Clear
        </button>
      )}
      <span className="ml-auto whitespace-nowrap font-mono text-[11px] text-muted-foreground" aria-live="polite">
        {resultLabel}
      </span>
    </div>
  );
}
