import type { Metadata } from "next";
import { Clock3, Plane } from "lucide-react";
import Link from "next/link";

import { AirframeCards, aviationDate, CompletenessPanel } from "@/components/aviation-data";
import { Badge } from "@/components/ui/badge";
import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";
import {
  listOperatorFleet,
  listOperatorFleetHistory,
  loadAviationGraphCompleteness,
} from "@/lib/aviation-data-public";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "British Airways fleet history",
  description: "Current and historic British Airways airframes derived from temporal registration and fleet-event records.",
  alternates: { canonical: "/fleet/british-airways" },
};

export default async function BritishAirwaysFleetPage() {
  ensureAviationDataEnabled();
  const [current, history, completeness] = await Promise.all([
    listOperatorFleet("british-airways"),
    listOperatorFleetHistory("british-airways"),
    loadAviationGraphCompleteness(),
  ]);
  const currentIds = new Set(current.map((airframe) => airframe.id));
  const former = history.filter((airframe) => !currentIds.has(airframe.id));
  const events = history
    .flatMap((airframe) =>
      airframe.events.map((event) => ({ airframe, event })),
    )
    .toSorted((first, second) =>
      (second.event.occurredOn ?? "").localeCompare(first.event.occurredOn ?? ""),
    );
  const json = { "@context": "https://schema.org", "@type": "Dataset", name: "British Airways fleet history", url: absoluteUrl("/fleet/british-airways"), dateModified: completeness.lastReconciledAt ?? undefined, size: history.length };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / <Link href="/fleet" className="article-link">Fleet database</Link> / British Airways</nav>
        <header className="max-w-3xl"><Badge variant="secondary" className="text-primary"><Plane /> Operator history</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">British Airways fleet history</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">Current and former fleets are two views over the same registration and event history. This first slice covers the airline’s A350-1000 fleet.</p></header>
        <div className="mt-8"><CompletenessPanel data={completeness} /></div>
        <section className="mt-10" aria-labelledby="current-fleet"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Current as at 30 Aug 2026</p><h2 id="current-fleet" className="mt-1 text-2xl font-semibold">Current fleet</h2></div><span className="text-sm text-muted-foreground">{current.length} airframes</span></div><AirframeCards airframes={current} /></section>
        <section className="mt-10 rounded-2xl border bg-card p-5" aria-labelledby="former-fleet"><h2 id="former-fleet" className="text-2xl font-semibold">Former fleet in this slice</h2>{former.length ? <div className="mt-4"><AirframeCards airframes={former} /></div> : <p className="mt-3 text-sm text-muted-foreground">No A350-1000 has a closed British Airways assignment in the current dataset. This is an explicit zero, not a merged current/historic list.</p>}</section>
        <section className="mt-10" aria-labelledby="fleet-timeline"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Clock3 className="size-4" /> Events from the graph</p><h2 id="fleet-timeline" className="mt-2 text-2xl font-semibold">Fleet timeline</h2><ol className="mt-5 grid gap-3 sm:grid-cols-2">{events.map(({ airframe, event }) => <li key={event.id} className="rounded-xl border bg-card p-4"><time className="font-mono text-sm font-semibold">{aviationDate(event.occurredOn)}</time><p className="mt-2 font-medium capitalize">{event.type.replaceAll("_", " ")} · <Link href={`/airframes/${airframe.publicId}`} className="article-link">{airframe.currentRegistration?.registration}</Link></p><p className="mt-1 text-sm text-muted-foreground">{event.details}</p></li>)}</ol>{events.length < history.length && <p className="mt-4 text-sm text-muted-foreground">One aircraft has no canonical delivery event because its two sourced dates remain in reconciliation.</p>}</section>
      </main>
    </>
  );
}
