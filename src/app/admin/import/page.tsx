import Link from "next/link";
import { DatabaseZap, History, Search } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { getImportProvider } from "@/lib/import-providers";
import { getStaffUser } from "@/lib/wiki-auth";
import { contentTypes, type ContentType } from "@/lib/wiki-types";

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }

export default async function AdminImportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const { listImportHistory } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const params = await searchParams;
  const query = one(params.q).trim().slice(0, 120);
  const rawType = one(params.type);
  const contentType = contentTypes.includes(rawType as ContentType) ? rawType as ContentType : "airline";
  const provider = getImportProvider("wikidata");
  const results = query.length >= 2 ? await provider.search(query, contentType) : [];
  const history = await listImportHistory();
  return <main>
    <p className="text-sm text-muted-foreground">Preview external source data before creating a private draft</p>
    <h2 className="mt-1 text-3xl font-bold">Aviation data import</h2>
    <Card className="mt-7"><CardContent>
      <form className="grid gap-3 md:grid-cols-[180px_190px_1fr_auto]" action="/admin/import">
        <select name="provider" defaultValue="wikidata" className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Import provider"><option value="wikidata">Wikidata + Commons</option></select>
        <select name="type" defaultValue={contentType} className="h-10 rounded-md border bg-background px-3 text-sm" aria-label="Content type">{contentTypes.map((type) => <option key={type} value={type}>{formatDisplayLabel(type)}</option>)}</select>
        <Input name="q" defaultValue={query} placeholder="Search an airline, aircraft, airport…" aria-label="External data search" minLength={2} required />
        <button className={buttonVariants()}><Search />Search</button>
      </form>
    </CardContent></Card>
    {query && <section className="mt-8"><h3 className="text-lg font-semibold">Source results</h3><p className="mt-1 text-sm text-muted-foreground">Nothing is imported until an administrator reviews a preview and selects individual data.</p><div className="mt-4 divide-y rounded-xl border bg-card">{results.length ? results.map((result) => <div key={result.sourceId} className="flex flex-wrap items-center justify-between gap-4 p-4"><div><div className="flex items-center gap-2"><strong>{result.title}</strong><Badge variant="outline">{result.sourceId}</Badge></div>{result.description && <p className="mt-1 text-sm text-muted-foreground">{result.description}</p>}</div><Link href={`/admin/import/wikidata/${result.sourceId}?type=${contentType}`} className={buttonVariants({ variant: "outline" })}>Preview</Link></div>) : <p className="p-8 text-center text-sm text-muted-foreground">No Wikidata results. Try the source’s full official name.</p>}</div></section>}
    <section className="mt-12"><div className="flex items-center gap-2"><History className="size-5 text-primary"/><h3 className="text-xl font-semibold">Import history</h3></div><div className="mt-4 divide-y rounded-xl border bg-card">{history.length ? history.map((item) => <div key={String(item.id)} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_1fr_auto]"><div><strong>{String(item.article_title)}</strong><p className="text-xs text-muted-foreground">{String(item.actor_name)} · {new Date(String(item.created_at)).toLocaleString()}</p></div><div><span className="font-medium">{formatDisplayLabel(String(item.provider))}</span><p className="font-mono text-xs text-muted-foreground">{(JSON.parse(String(item.source_identifiers_json)) as string[]).join(", ")}</p></div><div className="text-right"><Badge variant="outline">{formatDisplayLabel(String(item.revision_status))}</Badge><p className="mt-1 font-mono text-xs">Revision {String(item.revision_id).slice(0, 8)}</p></div></div>) : <div className="p-10 text-center"><DatabaseZap className="mx-auto size-8 text-muted-foreground"/><p className="mt-3 font-medium">No imports have been created</p><p className="mt-1 text-sm text-muted-foreground">History appears only after an administrator creates a draft.</p></div>}</div></section>
  </main>;
}
