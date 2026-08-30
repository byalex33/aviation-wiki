import type { Metadata } from "next";
import {
  ArrowUpRight,
  Database,
  Download,
  Filter,
  GitCompareArrows,
  Search,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TrackedLink,
  TrackedSubmitButton,
} from "@/components/tracked-actions";
import {
  filterFleetRecords,
  fleetFilterOptions,
  fleetFiltersFromSearchParams,
  type FleetOperator,
} from "@/lib/fleet-data";
import { aviationDataEnabled } from "@/lib/aviation-data-flags";
import { loadFleetRecords } from "@/lib/public-fleet";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Aircraft fleet database",
  description:
    "Filter, compare, and download approved aircraft records by manufacturer, role, engine, operator, and service status.",
  alternates: { canonical: "/fleet" },
  openGraph: {
    title: "Aircraft fleet database",
    description:
      "Filter, compare, and download approved aircraft records from aviation.wiki.",
    url: "/fleet",
    type: "website",
  },
};

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function OperatorList({
  operators,
  empty,
}: {
  operators: FleetOperator[];
  empty: string;
}) {
  if (!operators.length)
    return <span className="text-muted-foreground">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-x-1 gap-y-0.5">
      {operators.map((operator, index) => (
        <span key={`${operator.name}-${operator.evidence}`}>
          {index > 0 && <span className="text-muted-foreground"> · </span>}
          {operator.href ? (
            <Link href={operator.href} className="article-link">
              {operator.name}
            </Link>
          ) : (
            operator.name
          )}
        </span>
      ))}
    </span>
  );
}

function filterQuery(filters: ReturnType<typeof fleetFiltersFromSearchParams>) {
  const params = new URLSearchParams();
  if (filters.query) params.set("q", filters.query);
  if (filters.manufacturer)
    params.set("manufacturer", filters.manufacturer);
  if (filters.category) params.set("category", filters.category);
  if (filters.status) params.set("status", filters.status);
  return params.toString();
}

export default async function FleetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["q", "manufacturer", "category", "status"] as const) {
    const value = valueOf(raw[key]);
    if (value) params.set(key, value);
  }
  const filters = fleetFiltersFromSearchParams(params);
  const records = await loadFleetRecords();
  const filtered = filterFleetRecords(records, filters);
  const options = fleetFilterOptions(records);
  const queryString = filterQuery(filters);
  const downloadSuffix = queryString ? `?${queryString}` : "";
  const modified = records
    .map((record) => new Date(record.updatedAt).getTime())
    .filter(Number.isFinite);
  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "aviation.wiki aircraft fleet database",
    description:
      "Approved aircraft records with manufacturers, aircraft types, variants, engines, service dates, status, and operators derived from cited aviation.wiki fields and relationships.",
    url: absoluteUrl("/fleet"),
    creator: { "@id": `${absoluteUrl("/")}#organization` },
    dateModified: modified.length
      ? new Date(Math.max(...modified)).toISOString()
      : undefined,
    variableMeasured: [
      "manufacturer",
      "aircraft type",
      "variants",
      "engines",
      "entry into service",
      "production status",
      "operators",
    ],
    distribution: [
      {
        "@type": "DataDownload",
        encodingFormat: "text/csv",
        contentUrl: absoluteUrl("/api/fleet.csv"),
      },
      {
        "@type": "DataDownload",
        encodingFormat: "application/json",
        contentUrl: absoluteUrl("/api/fleet.json"),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(datasetJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full min-w-0 max-w-[1280px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="article-link">
            Main
          </Link>
          <span> / Fleet database</span>
        </nav>

        <section className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="rounded-full text-primary">
              Open reference database
            </Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
              Aircraft fleet database
            </h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Filter, compare, and download approved aircraft records. Operator
              matches are derived only from approved relationships, airline
              fleet fields, and aircraft operator fields.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TrackedLink
              href="/fleet/compare"
              eventName="fleet_compare_open"
              eventProperties={{ surface: "fleet_header" }}
              className={buttonVariants({ variant: "outline" })}
            >
              <GitCompareArrows />
              Compare aircraft
            </TrackedLink>
            <TrackedLink
              href={`/api/fleet.csv${downloadSuffix}`}
              eventName="fleet_export"
              eventProperties={{ format: "csv", filtered: Boolean(queryString) }}
              className={buttonVariants({ variant: "outline" })}
            >
              <Download />
              CSV
            </TrackedLink>
            <TrackedLink
              href={`/api/fleet.json${downloadSuffix}`}
              eventName="fleet_export"
              eventProperties={{ format: "json", filtered: Boolean(queryString) }}
              className={buttonVariants({ variant: "outline" })}
            >
              <Database />
              JSON
            </TrackedLink>
          </div>
        </section>

        {aviationDataEnabled && (
          <Link
            href="/fleet/british-airways"
            className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/20 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                New individual-airframe view
              </p>
              <h2 className="mt-1 text-lg font-semibold">
                British Airways A350-1000 fleet history
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Explore 18 MSNs with temporal registrations, delivery events,
                cabin configuration, provenance, and reconciliation state.
              </p>
            </div>
            <ArrowUpRight className="size-5 text-primary" />
          </Link>
        )}

        <form
          action="/fleet"
          className="mt-9 grid gap-3 rounded-xl border bg-card p-4 shadow-sm lg:grid-cols-[minmax(220px,1fr)_220px_170px_170px_auto]"
          role="search"
        >
          <label className="relative">
            <span className="sr-only">Search aircraft records</span>
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={filters.query}
              className="h-11 pl-10"
              placeholder="Aircraft, engine, operator…"
            />
          </label>
          <label>
            <span className="sr-only">Manufacturer</span>
            <select
              name="manufacturer"
              defaultValue={filters.manufacturer}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All manufacturers</option>
              {options.manufacturers.map((manufacturer) => (
                <option key={manufacturer} value={manufacturer}>
                  {manufacturer}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Aircraft category</span>
            <select
              name="category"
              defaultValue={filters.category}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All roles</option>
              <option value="commercial">Commercial</option>
              <option value="military">Military</option>
              <option value="general">General aviation</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Service status</span>
            <select
              name="status"
              defaultValue={filters.status}
              className="h-11 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="production">In production</option>
              <option value="service">In service</option>
              <option value="retired">Retired</option>
              <option value="other">Other / unknown</option>
            </select>
          </label>
          <button className={buttonVariants({ size: "lg" })}>
            <Filter />
            Apply
          </button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{filtered.length}</strong> of{" "}
            {records.length} aircraft records
          </p>
          {queryString && (
            <Link href="/fleet" className="article-link text-sm font-medium">
              Clear filters
            </Link>
          )}
        </div>

        {filtered.length ? (
          <form action="/fleet/compare" className="mt-5 min-w-0 max-w-full">
            <div className="w-full max-w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="border-b bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="w-16 px-4 py-3">Compare</th>
                    <th className="px-4 py-3">Aircraft</th>
                    <th className="px-4 py-3">Operators</th>
                    <th className="px-4 py-3">Manufacturer / type</th>
                    <th className="px-4 py-3">Variants</th>
                    <th className="px-4 py-3">Engines</th>
                    <th className="px-4 py-3">Service / status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((record) => (
                    <tr key={record.id} className="align-top hover:bg-muted/25">
                      <td className="px-4 py-4">
                        <label className="grid min-h-10 place-items-center">
                          <span className="sr-only">
                            Compare {record.title}
                          </span>
                          <input
                            type="checkbox"
                            name="aircraft"
                            value={record.slug}
                            className="size-4 accent-primary"
                          />
                        </label>
                      </td>
                      <th className="px-4 py-4 font-semibold">
                        <Link href={record.href} className="article-link">
                          {record.title}
                        </Link>
                        <Badge variant="outline" className="mt-2 block w-fit">
                          {record.category}
                        </Badge>
                      </th>
                      <td className="max-w-64 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Current
                        </p>
                        <OperatorList
                          operators={record.currentOperators}
                          empty="Not recorded"
                        />
                        {record.historicOperators.length > 0 && (
                          <>
                            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Historic
                            </p>
                            <OperatorList
                              operators={record.historicOperators}
                              empty=""
                            />
                          </>
                        )}
                      </td>
                      <td className="max-w-56 px-4 py-4">
                        <p className="font-medium">{record.manufacturer}</p>
                        <p className="mt-1 text-muted-foreground">
                          {record.type}
                        </p>
                      </td>
                      <td className="max-w-56 px-4 py-4 text-muted-foreground">
                        {record.variants}
                      </td>
                      <td className="max-w-56 px-4 py-4 text-muted-foreground">
                        {record.engines}
                      </td>
                      <td className="max-w-56 px-4 py-4">
                        <p>{record.entryIntoService}</p>
                        <p className="mt-1 text-muted-foreground">
                          {record.status}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
              <p className="text-sm text-muted-foreground">
                Select up to four aircraft, then open a shareable comparison.
              </p>
              <TrackedSubmitButton
                eventName="fleet_compare_submit"
                eventProperties={{ surface: "fleet_table" }}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full min-w-44 sm:w-auto",
                )}
              >
                <GitCompareArrows />
                Compare selected
              </TrackedSubmitButton>
            </div>
          </form>
        ) : (
          <section className="mt-10 rounded-xl border border-dashed p-10 text-center">
            <Search className="mx-auto size-8 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">
              No aircraft match these filters
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a shorter search or clear one of the filters.
            </p>
            <Link href="/fleet" className={`${buttonVariants()} mt-5`}>
              View all records
            </Link>
          </section>
        )}

        <section className="mt-10 grid gap-4 rounded-xl border bg-muted/25 p-5 text-sm text-muted-foreground md:grid-cols-2">
          <div>
            <h2 className="font-semibold text-foreground">Evidence first</h2>
            <p className="mt-2 leading-6">
              Every value comes from a visible, moderator-approved article
              field or relationship. Missing values remain explicit.
            </p>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Improve the data</h2>
            <p className="mt-2 leading-6">
              Add explicit airline-to-aircraft relationships to replace derived
              text matches with reviewed structured evidence.
            </p>
            <Link
              href="/contribute"
              className="article-link mt-2 inline-flex items-center gap-1 font-medium"
            >
              Choose a contribution mission
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
