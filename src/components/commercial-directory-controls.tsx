"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { AirlineCountryFilter } from "@/components/airline-country-filter";

const statuses = [
  ["all", "All airlines"],
  ["active", "Active"],
  ["historic", "Ceased"],
] as const;

const sorts = [
  ["asc", "A to Z"],
  ["desc", "Z to A"],
] as const;

function hrefFor(current: URLSearchParams, updates: Record<string, string>) {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === "all" || (key === "sort" && value === "asc") || (key === "status" && value === "all")) {
      if (key === "country" || (key === "status" && value === "all")) params.delete(key);
      else params.set(key, value);
    } else params.set(key, value);
  }
  if ((params.get("status") ?? "all") === "all") params.delete("status");
  if ((params.get("sort") ?? "asc") === "asc") params.delete("sort");
  const query = params.toString();
  return query ? `/commercial?${query}` : "/commercial";
}

export function CommercialDirectoryControls({ countries, total }: { countries: string[]; total: number }) {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") === "active" || searchParams.get("status") === "historic"
    ? searchParams.get("status")!
    : "all";
  const sort = searchParams.get("sort") === "desc" ? "desc" : "asc";
  const country = searchParams.get("country") && countries.includes(searchParams.get("country")!)
    ? searchParams.get("country")!
    : "all";

  useEffect(() => {
    const root = document.getElementById("airline-directory");
    if (!root) return;
    const direction = sort === "desc" ? -1 : 1;
    const sectionsHost = root.querySelector<HTMLElement>("[data-airline-sections]");
    const sections = [...root.querySelectorAll<HTMLElement>("[data-letter]")];
    sections.sort((left, right) => (left.dataset.letter ?? "").localeCompare(right.dataset.letter ?? "") * direction);
    if (sectionsHost) for (const section of sections) sectionsHost.appendChild(section);
    let visibleCount = 0;
    for (const section of sections) {
      const grid = section.querySelector<HTMLElement>("[data-airline-grid]");
      if (!grid) continue;
      const cards = [...grid.querySelectorAll<HTMLElement>("[data-airline]")];
      cards.sort((left, right) => (left.dataset.name ?? "").localeCompare(right.dataset.name ?? "") * direction);
      for (const card of cards) grid.appendChild(card);
      let sectionCount = 0;
      for (const card of cards) {
        const matchesStatus = status === "all" || card.dataset.status === status;
        const matchesCountry = country === "all" || card.dataset.country === country;
        const visible = matchesStatus && matchesCountry;
        card.hidden = !visible;
        if (visible) sectionCount += 1;
      }
      section.hidden = sectionCount === 0;
      const count = section.querySelector("[data-letter-count]");
      if (count) count.textContent = `${sectionCount} ${sectionCount === 1 ? "airline" : "airlines"}`;
      visibleCount += sectionCount;
      const letter = section.dataset.letter;
      const indexLink = letter ? root.querySelector<HTMLElement>(`[data-letter-index="${letter}"]`) : null;
      if (indexLink) indexLink.hidden = sectionCount === 0;
    }
    const total = document.getElementById("airline-result-count");
    if (total) total.textContent = String(visibleCount);
  }, [status, sort, country]);

  const linkClass = (active: boolean) =>
    `flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

  return (
    <aside className="rounded-lg border bg-card p-4 shadow-xs lg:sticky lg:top-6" aria-label="Sort and filter commercial airlines">
      <div className="flex items-baseline justify-between border-b pb-3">
        <h2 className="font-semibold">Commercial airlines</h2>
        <span id="airline-result-count" className="font-mono text-xs text-muted-foreground">{total}</span>
      </div>
      <div className="mt-4">
        <h3 className="field-label">Show</h3>
        <nav className="mt-2 grid gap-1" aria-label="Filter airlines by status">
          {statuses.map(([value, label]) => (
            <Link key={value} href={hrefFor(searchParams, { status: value })} aria-current={status === value ? "page" : undefined} className={linkClass(status === value)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="field-label">Country</h3>
        <AirlineCountryFilter countries={countries} value={country} />
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="field-label">Sort by name</h3>
        <nav className="mt-2 grid gap-1" aria-label="Sort airlines alphabetically">
          {sorts.map(([value, label]) => (
            <Link key={value} href={hrefFor(searchParams, { sort: value })} aria-current={sort === value ? "page" : undefined} className={linkClass(sort === value)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
