import type { Metadata } from "next";
import Link from "next/link";
import { Factory, Filter, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { filterProductionListRecords, productionListManufacturers } from "@/lib/production-list-data";
import { loadProductionListRecords } from "@/lib/public-production-lists";

export const metadata: Metadata = {
  title: "Aircraft production lists",
  description: "Compare approved aircraft production periods, build totals, deliveries, variants, and programme status.",
  alternates: { canonical: "/production-lists" },
};

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ProductionListsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const query = valueOf(raw.q).slice(0, 100);
  const manufacturer = valueOf(raw.manufacturer).slice(0, 100);
  const status = ["ongoing", "ended", "unknown"].includes(valueOf(raw.status)) ? valueOf(raw.status) : "";
  const records = await loadProductionListRecords();
  const filtered = filterProductionListRecords(records, { query, manufacturer, status });
  const manufacturers = productionListManufacturers(records);

  return (
    <main className="mx-auto w-full min-w-0 max-w-[1280px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground"><Link href="/" className="article-link">Main</Link><span> / </span><Link href="/fleet" className="article-link">Fleet database</Link><span> / Production lists</span></nav>
      <section className="max-w-3xl">
        <Badge variant="secondary" className="rounded-full text-primary"><Factory />Approved programme data</Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Aircraft production lists</h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">Compare production periods, build totals, deliveries, variants, and programme status from approved aircraft articles. Missing totals remain explicit because live programmes and source conventions differ.</p>
      </section>

      <form className="mt-8 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_210px_170px_auto]" action="/production-lists">
        <label className="relative"><span className="sr-only">Search aircraft production lists</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query} className="h-11 pl-10" placeholder="Aircraft, manufacturer, variant…" /></label>
        <label><span className="sr-only">Manufacturer</span><select name="manufacturer" defaultValue={manufacturer} className="h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">All manufacturers</option>{manufacturers.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span className="sr-only">Programme status</span><select name="status" defaultValue={status} className="h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">All programmes</option><option value="ongoing">Ongoing</option><option value="ended">Ended</option><option value="unknown">Not recorded</option></select></label>
        <button className={buttonVariants({ size: "lg" })}><Filter />Filter</button>
      </form>

      <div className="mt-8 flex items-center justify-between gap-4 text-sm text-muted-foreground"><p><strong className="text-foreground">{filtered.length}</strong> aircraft programmes</p>{(query || manufacturer || status) && <Link href="/production-lists" className="article-link">Clear filters</Link>}</div>
      {filtered.length ? (
        <div className="mt-4 overflow-x-auto rounded-xl border bg-card shadow-xs">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Aircraft</th><th className="px-4 py-3">Manufacturer</th><th className="px-4 py-3">Production</th><th className="px-4 py-3">Built</th><th className="px-4 py-3">Deliveries</th><th className="px-4 py-3">Variants</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody className="divide-y">{filtered.map((record) => <tr key={record.id} className="align-top hover:bg-muted/25"><th className="px-4 py-4"><Link href={record.href} className="article-link font-semibold">{record.title}</Link></th><td className="px-4 py-4">{record.manufacturer}</td><td className="px-4 py-4">{record.production}</td><td className="px-4 py-4">{record.numberBuilt}</td><td className="px-4 py-4">{record.deliveries}</td><td className="max-w-72 px-4 py-4 text-muted-foreground">{record.variants}</td><td className="px-4 py-4"><Badge variant={record.status === "ongoing" ? "secondary" : "outline"}>{record.status === "ongoing" ? "Ongoing" : record.status === "ended" ? "Ended" : "Unknown"}</Badge></td></tr>)}</tbody>
          </table>
        </div>
      ) : (
        <section className="mt-4 rounded-xl border border-dashed p-10 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-3 font-semibold">No production records match</h2><p className="mt-1 text-sm text-muted-foreground">Try a broader search or clear a filter.</p></section>
      )}
      <section className="mt-10 rounded-xl border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground"><h2 className="font-semibold text-foreground">How to read this table</h2><p className="mt-2">Build totals and deliveries are not interchangeable: prototypes, cancellations, and reporting dates can change the figures. Open an aircraft article to inspect its citations and context.</p></section>
    </main>
  );
}
