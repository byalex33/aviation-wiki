import type { Metadata } from "next";
import { AlertTriangle, Factory } from "lucide-react";
import Link from "next/link";

import { aviationDate, CompletenessPanel } from "@/components/aviation-data";
import { Badge } from "@/components/ui/badge";
import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";
import {
  listProductionAirframes,
  loadAviationGraphCompleteness,
} from "@/lib/aviation-data-public";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Airbus A350-1000 production list",
  description: "MSNs, registrations, delivery dates, operators, and evidence health for A350-1041 airframes.",
  alternates: { canonical: "/production-lists/a350-1000" },
};

export default async function A350ProductionListPage() {
  ensureAviationDataEnabled();
  const [airframes, completeness] = await Promise.all([
    listProductionAirframes("A350-1041"),
    loadAviationGraphCompleteness(),
  ]);
  const json = { "@context": "https://schema.org", "@type": "Dataset", name: "Airbus A350-1000 production list", url: absoluteUrl("/production-lists/a350-1000"), dateModified: completeness.lastReconciledAt ?? undefined, size: airframes.length };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(json) }} />
      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-7 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link> / <Link href="/production-lists" className="article-link">Production lists</Link> / A350-1000</nav>
        <header className="max-w-3xl"><Badge variant="secondary" className="text-primary"><Factory /> Production query</Badge><h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Airbus A350-1000 production list</h1><p className="mt-4 text-lg leading-8 text-muted-foreground">The first validated slice covers British Airways A350-1041s. Every row links to the underlying airframe graph and its sources.</p></header>
        <div className="mt-8"><CompletenessPanel data={completeness} /></div>
        <div className="mt-8 grid gap-3 md:hidden">{airframes.map((airframe) => { const delivery = airframe.events.find((event) => event.type === "delivered"); return <article key={airframe.id} className="rounded-xl border bg-card p-4"><div className="flex items-start justify-between"><Link href={`/airframes/${airframe.publicId}`} className="article-link text-lg font-semibold">{airframe.currentRegistration?.registration}</Link>{airframe.conflicts.length > 0 && <Badge variant="destructive"><AlertTriangle /> Conflict</Badge>}</div><dl className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-muted-foreground">MSN</dt><dd className="font-mono font-semibold">{airframe.msn}</dd></div><div><dt className="text-muted-foreground">Delivered</dt><dd>{aviationDate(delivery?.occurredOn)}</dd></div><div><dt className="text-muted-foreground">Operator</dt><dd>{airframe.currentOperator?.name}</dd></div><div><dt className="text-muted-foreground">Status</dt><dd className="capitalize">{airframe.status.replaceAll("_", " ")}</dd></div></dl></article>; })}</div>
        <div className="mt-8 hidden overflow-x-auto rounded-2xl border bg-card shadow-xs md:block"><table className="w-full min-w-[800px] text-left text-sm"><thead className="border-b bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">MSN</th><th className="px-4 py-3">Registration</th><th className="px-4 py-3">Variant</th><th className="px-4 py-3">Delivered</th><th className="px-4 py-3">Operator</th><th className="px-4 py-3">Data state</th></tr></thead><tbody className="divide-y">{airframes.map((airframe) => { const delivery = airframe.events.find((event) => event.type === "delivered"); return <tr key={airframe.id} className="hover:bg-muted/25"><td className="px-4 py-4 font-mono font-semibold">{airframe.msn}</td><td className="px-4 py-4"><Link href={`/airframes/${airframe.publicId}`} className="article-link font-semibold">{airframe.currentRegistration?.registration}</Link></td><td className="px-4 py-4">{airframe.model?.designation}</td><td className="px-4 py-4">{aviationDate(delivery?.occurredOn)}</td><td className="px-4 py-4">{airframe.currentOperator?.name}</td><td className="px-4 py-4">{airframe.conflicts.length ? <Badge variant="destructive"><AlertTriangle /> Conflict</Badge> : <Badge variant="secondary">Canonical</Badge>}</td></tr>; })}</tbody></table></div>
      </main>
    </>
  );
}
