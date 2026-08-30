import type { Metadata } from "next";
import { Database, GitBranch, Plane } from "lucide-react";
import Link from "next/link";

import { AirframeCards, CompletenessPanel } from "@/components/aviation-data";
import { Badge } from "@/components/ui/badge";
import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";
import {
  loadAirframeProjections,
  loadAviationGraphCompleteness,
} from "@/lib/aviation-data-public";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Individual aircraft and airframe histories",
  description:
    "Explore aircraft identities, registrations, operator histories, configurations, sources, and unresolved evidence conflicts.",
  alternates: { canonical: "/airframes" },
};

export default async function AirframesPage() {
  ensureAviationDataEnabled();
  const [airframes, completeness] = await Promise.all([
    loadAirframeProjections(),
    loadAviationGraphCompleteness(),
  ]);
  const dataset = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "aviation.wiki airframe graph",
    description:
      "Individual aircraft records with temporal registrations, fleet events, configurations, provenance, and reconciliation state.",
    url: absoluteUrl("/airframes"),
    dateModified: completeness.lastReconciledAt ?? undefined,
    size: airframes.length,
    variableMeasured: [
      "manufacturer serial number",
      "registration history",
      "operator history",
      "delivery date",
      "cabin configuration",
      "source confidence",
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dataset) }} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground">
          <Link href="/" className="article-link">Main</Link> / Airframes
        </nav>
        <header className="grid items-end gap-7 lg:grid-cols-[1fr_auto]">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="rounded-full text-primary"><GitBranch /> Aviation data graph</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Individual aircraft, over time</h1>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              One stable record per airframe. Registrations, operators, events, configurations, and sources remain temporal facts instead of being flattened into a single row.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/registrations/g" className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-card px-4 font-medium hover:bg-muted"><Database className="size-4" /> UK registrations</Link>
            <Link href="/production-lists/a350-1000" className="inline-flex min-h-10 items-center gap-2 rounded-lg border bg-card px-4 font-medium hover:bg-muted"><Plane className="size-4" /> A350 production list</Link>
          </div>
        </header>
        <div className="mt-9"><CompletenessPanel data={completeness} /></div>
        <section className="mt-10" aria-labelledby="airframe-records">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">First vertical slice</p><h2 id="airframe-records" className="mt-1 text-2xl font-semibold">British Airways A350-1000 fleet</h2></div>
            <span className="text-sm text-muted-foreground">{airframes.length} records</span>
          </div>
          <AirframeCards airframes={airframes} />
        </section>
      </main>
    </>
  );
}
