"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { AirlineCountryFilter } from "@/components/airline-country-filter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  commercialFilterFromParams,
  commercialFilterHref,
  defaultCommercialFilter,
  groupCommercialAirlines,
  sameCommercialFilter,
  type CommercialAirlineCard,
  type CommercialFilter,
} from "@/lib/commercial-filters";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const statuses = [
  ["all", "All airlines"],
  ["active", "Active"],
  ["historic", "Ceased"],
] as const;

const sorts = [
  ["asc", "A to Z"],
  ["desc", "Z to A"],
] as const;

export const filterLinkClass = (active: boolean) =>
  `flex min-h-11 items-center rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;

type AirlineGroup = { letter: string; airlines: CommercialAirlineCard[] };

type DirectoryContextValue = {
  countries: string[];
  filters: CommercialFilter;
  setFilters: (filters: CommercialFilter) => void;
  groups: AirlineGroup[];
  visibleCount: number;
};

const DirectoryContext = createContext<DirectoryContextValue | null>(null);

function useDirectory() {
  const value = useContext(DirectoryContext);
  if (!value) throw new Error("Commercial directory controls must render inside CommercialDirectory.");
  return value;
}

export function CommercialDirectory({
  airlines,
  countries,
  children,
}: {
  airlines: CommercialAirlineCard[];
  countries: string[];
  children: ReactNode;
}) {
  const [filters, setFilterState] = useState(defaultCommercialFilter);
  const setFilters = useCallback((next: CommercialFilter) => {
    setFilterState((current) => (sameCommercialFilter(current, next) ? current : next));
  }, []);
  const groups = useMemo(() => groupCommercialAirlines(airlines, filters), [airlines, filters]);
  const visibleCount = groups.reduce((count, group) => count + group.airlines.length, 0);
  const value = useMemo<DirectoryContextValue>(
    () => ({ countries, filters, setFilters, groups, visibleCount }),
    [countries, filters, groups, setFilters, visibleCount],
  );

  return (
    <DirectoryContext.Provider value={value}>
      <div className="mt-9 grid items-start gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        {children}
        <CommercialAirlineList />
      </div>
    </DirectoryContext.Provider>
  );
}

export function CommercialDirectoryFallback({ total }: { total: number }) {
  return (
    <aside className="rounded-lg border bg-card p-4 shadow-xs lg:sticky lg:top-6" aria-label="Sort and filter commercial airlines">
      <div className="flex items-baseline justify-between border-b pb-3">
        <h2 className="font-semibold">Commercial airlines</h2>
        <span className="font-mono text-xs text-muted-foreground">{total}</span>
      </div>
      <div className="mt-4">
        <h3 className="field-label">Show</h3>
        <nav className="mt-2 grid gap-1" aria-label="Filter airlines by status">
          <Link href="/commercial" aria-current="page" className={filterLinkClass(true)}>All airlines</Link>
          <Link href="/commercial?status=active" className={filterLinkClass(false)}>Active</Link>
          <Link href="/commercial?status=historic" className={filterLinkClass(false)}>Ceased</Link>
        </nav>
      </div>
    </aside>
  );
}

export function CommercialDirectoryControls() {
  const searchParams = useSearchParams();
  const { countries, filters, setFilters, visibleCount } = useDirectory();

  useEffect(() => {
    setFilters(commercialFilterFromParams(searchParams, countries));
  }, [countries, searchParams, setFilters]);

  const linkClass = (active: boolean) => filterLinkClass(active);

  return (
    <aside className="rounded-lg border bg-card p-4 shadow-xs lg:sticky lg:top-6" aria-label="Sort and filter commercial airlines">
      <div className="flex items-baseline justify-between border-b pb-3">
        <h2 className="font-semibold">Commercial airlines</h2>
        <span className="font-mono text-xs text-muted-foreground">{visibleCount}</span>
      </div>
      <div className="mt-4">
        <h3 className="field-label">Show</h3>
        <nav className="mt-2 grid gap-1" aria-label="Filter airlines by status">
          {statuses.map(([value, label]) => (
            <Link key={value} href={commercialFilterHref(searchParams, { status: value })} aria-current={filters.status === value ? "page" : undefined} className={linkClass(filters.status === value)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="field-label">Country</h3>
        <AirlineCountryFilter countries={countries} value={filters.country} />
      </div>
      <div className="mt-5 border-t pt-4">
        <h3 className="field-label">Sort by name</h3>
        <nav className="mt-2 grid gap-1" aria-label="Sort airlines alphabetically">
          {sorts.map(([value, label]) => (
            <Link key={value} href={commercialFilterHref(searchParams, { sort: value })} aria-current={filters.sort === value ? "page" : undefined} className={linkClass(filters.sort === value)}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function CommercialAirlineList() {
  const { groups, visibleCount } = useDirectory();
  const activeLetters = new Set(groups.map((group) => group.letter));

  return (
    <div>
      <nav className="mb-9 flex flex-wrap gap-1.5 border-y py-4" aria-label="Airline alphabet index">
        {alphabet.map((letter) => activeLetters.has(letter) ? (
          <a key={letter} href={`#letter-${letter}`} className="grid size-10 place-items-center rounded-md bg-foreground font-mono text-xs font-semibold text-background transition-colors hover:bg-primary">{letter}</a>
        ) : (
          <span key={letter} className="grid size-10 place-items-center rounded-md font-mono text-xs text-muted-foreground/35">{letter}</span>
        ))}
      </nav>
      {visibleCount === 0 ? (
        <p className="text-sm text-muted-foreground">No airlines match these filters.</p>
      ) : (
        <div className="space-y-12">
          {groups.map((group) => (
            <section id={`letter-${group.letter}`} key={group.letter} className="scroll-mt-24">
              <div className="mb-4 flex items-end gap-4 border-b pb-3">
                <h2 className="font-mono text-4xl font-semibold text-primary">{group.letter}</h2>
                <span className="mb-1 text-sm text-muted-foreground">{group.airlines.length} {group.airlines.length === 1 ? "airline" : "airlines"}</span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.airlines.map((airline) => (
                  <Link key={airline.href} href={airline.href} className="group block" aria-label={`View ${airline.name}`}>
                    <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-lg">
                      <div className="flex h-28 items-center justify-center border-b bg-white p-5">
                        {airline.showLogo ? <Image src={`https://images.kiwi.com/airlines/64/${airline.iata}.png`} alt={`${airline.name} logo`} width={64} height={64} unoptimized className="max-h-16 w-auto object-contain transition-transform group-hover:scale-105" /> : <span className="text-sm text-muted-foreground">{airline.name}</span>}
                      </div>
                      <CardContent className="p-5">
                        <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">{airline.name}</h3>
                        <Badge variant="secondary" className="mt-3 rounded-full font-normal">
                          {airline.countryCode && <Image src={`https://flagcdn.com/w40/${airline.countryCode}.png`} alt="" width={20} height={15} unoptimized className="h-3.5 w-5 rounded-[2px] object-cover shadow-[0_0_0_1px_rgb(0_0_0/0.08)]" />}
                          {airline.country}
                        </Badge>
                        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-t pt-4 text-sm">
                          <div><dt className="field-label">IATA / ICAO</dt><dd className="mt-1 font-mono font-medium">{airline.iata || "Unknown"} / {airline.icao}</dd></div>
                          <div><dt className="field-label">Status</dt><dd className="mt-1"><Badge variant="outline" className={airline.operatingStatus === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-zinc-300 bg-zinc-100 text-zinc-600"}>{airline.status}</Badge></dd></div>
                          <div><dt className="field-label">Callsign</dt><dd className="mt-1 font-mono text-xs font-medium">{airline.callsign}</dd></div>
                          <div><dt className="field-label">{airline.detailLabel}</dt><dd className="mt-1 font-medium leading-5">{airline.detailValue}</dd></div>
                        </dl>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
