import type { Metadata } from "next";
import { GitCompareArrows, Plane } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { TrackedSubmitButton } from "@/components/tracked-actions";
import { buttonVariants } from "@/components/ui/button";
import type { FleetRecord } from "@/lib/fleet-data";
import { loadFleetRecords } from "@/lib/public-fleet";

export const metadata: Metadata = {
  title: "Compare aircraft",
  description:
    "Compare approved aircraft specifications, variants, engines, operators, range, and service status.",
  alternates: { canonical: "/fleet/compare" },
  robots: { index: false, follow: true },
};

function valuesOf(value: string | string[] | undefined) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

const comparisonRows: Array<{
  label: string;
  value: (record: FleetRecord) => string;
}> = [
  { label: "Manufacturer", value: (record) => record.manufacturer },
  { label: "Type", value: (record) => record.type },
  { label: "Category", value: (record) => record.category },
  { label: "Family", value: (record) => record.family },
  { label: "Variants", value: (record) => record.variants },
  { label: "Engines", value: (record) => record.engines },
  {
    label: "Entry into service",
    value: (record) => record.entryIntoService,
  },
  { label: "Production", value: (record) => record.production },
  { label: "Status", value: (record) => record.status },
  { label: "Range", value: (record) => record.range },
  { label: "Seating", value: (record) => record.seating },
  {
    label: "Current operators",
    value: (record) =>
      record.currentOperators.map((operator) => operator.name).join("; ") ||
      "Not recorded",
  },
  {
    label: "Historic operators",
    value: (record) =>
      record.historicOperators.map((operator) => operator.name).join("; ") ||
      "Not recorded",
  },
];

export default async function CompareAircraftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requested = [...new Set(valuesOf(query.aircraft))];
  const records = await loadFleetRecords();
  const selected = requested
    .map((slug) => records.find((record) => record.slug === slug))
    .filter((record): record is FleetRecord => Boolean(record))
    .slice(0, 4);
  const selectedSlugs = new Set(selected.map((record) => record.slug));

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / </span>
        <Link href="/fleet" className="article-link">
          Fleet database
        </Link>
        <span> / Compare</span>
      </nav>

      <section className="max-w-3xl">
        <Badge variant="secondary" className="rounded-full text-primary">
          Shareable comparison
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          Compare aircraft
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Compare up to four approved aircraft records side by side. The URL
          preserves your selection for sharing.
        </p>
      </section>

      {selected.length > 0 && (
        <div className="mt-9 w-full max-w-full overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b bg-muted/45">
              <tr>
                <th className="w-44 px-4 py-4 text-muted-foreground">
                  Attribute
                </th>
                {selected.map((record) => (
                  <th key={record.id} className="min-w-56 px-4 py-4">
                    <Link href={record.href} className="article-link text-base">
                      {record.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {comparisonRows.map((row) => (
                <tr key={row.label} className="align-top">
                  <th className="bg-muted/20 px-4 py-4 font-medium">
                    {row.label}
                  </th>
                  {selected.map((record) => (
                    <td
                      key={`${row.label}-${record.id}`}
                      className="px-4 py-4 leading-6 text-muted-foreground"
                    >
                      {row.value(record)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requested.length > 4 && (
        <p className="mt-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm">
          Comparisons are limited to four aircraft. The first four valid
          selections are shown.
        </p>
      )}

      <form action="/fleet/compare" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">
              {selected.length ? "Change selection" : "Choose aircraft"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select between two and four aircraft for the clearest comparison.
            </p>
          </div>
          <TrackedSubmitButton
            eventName="fleet_compare_submit"
            eventProperties={{ surface: "compare_picker" }}
            className={buttonVariants({ size: "lg" })}
          >
            <GitCompareArrows />
            Update comparison
          </TrackedSubmitButton>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {records.map((record) => (
            <label
              key={record.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/35 has-checked:border-primary has-checked:bg-primary/5"
            >
              <input
                type="checkbox"
                name="aircraft"
                value={record.slug}
                defaultChecked={selectedSlugs.has(record.slug)}
                className="mt-1 size-4 accent-primary"
              />
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <Plane className="size-4 text-primary" />
                  {record.title}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {record.manufacturer} · {record.category}
                </span>
              </span>
            </label>
          ))}
        </div>
      </form>

      <div className="mt-8">
        <Link href="/fleet" className={buttonVariants({ variant: "outline" })}>
          Back to fleet filters
        </Link>
      </div>
    </main>
  );
}
