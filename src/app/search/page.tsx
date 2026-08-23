import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal } from "lucide-react";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { SearchHighlight } from "@/components/search-highlight";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { contentTypes, type ContentType } from "@/lib/wiki-types";
import { searchPublicArticles } from "@/lib/wiki-search";

export const metadata: Metadata = { title: "Search", description: "Search approved public aviation.wiki articles.", robots: { index: false, follow: true } };

function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }
function pageHref(query: string, type: string, country: string, page: number) {
  const params = new URLSearchParams({ q: query });
  if (type) params.set("type", type);
  if (country) params.set("country", country);
  if (page > 1) params.set("page", String(page));
  return `/search?${params}`;
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const query = valueOf(raw.q).slice(0, 120);
  const typeValue = valueOf(raw.type);
  const type = contentTypes.includes(typeValue as ContentType) ? typeValue as ContentType : undefined;
  const country = valueOf(raw.country).slice(0, 100);
  const requestedPage = Math.max(1, Number.parseInt(valueOf(raw.page) || "1", 10) || 1);
  const results = await searchPublicArticles({ query, contentType: type, country: country || undefined, page: requestedPage, pageSize: 12 });
  const grouped = results.hits.reduce<Record<string, typeof results.hits>>((groups, hit) => { (groups[hit.contentType] ||= []).push(hit); return groups; }, {});
  return <main className="mx-auto min-h-[70vh] max-w-[1050px] px-5 pb-20 pt-10 sm:px-6">
    <h1 className="text-4xl font-bold tracking-tight">Search aviation.wiki</h1>
    <p className="mt-3 text-muted-foreground">Search approved public articles, aliases, aviation codes, registrations, and structured facts.</p>
    <form action="/search" className="mt-8 grid gap-3 rounded-xl border bg-card p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_190px_190px_auto]" role="search">
      <label className="relative"><span className="sr-only">Search query</span><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input name="q" defaultValue={query} className="h-11 pl-10" placeholder="Name, IATA, ICAO, registration…" autoFocus={!query} /></label>
      <label><span className="sr-only">Entity type</span><select name="type" defaultValue={type || ""} className="h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">All entity types</option>{contentTypes.map((item) => <option key={item} value={item}>{formatDisplayLabel(item)}</option>)}</select></label>
      <label><span className="sr-only">Country</span><select name="country" defaultValue={country} className="h-11 w-full rounded-md border bg-background px-3 text-sm"><option value="">All countries</option>{results.countries.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <button className={buttonVariants({ size: "lg" })}><SlidersHorizontal />Search</button>
    </form>
    {!query ? <section className="mt-14 rounded-xl border border-dashed p-10 text-center"><Search className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Start with an aviation name or identifier</h2><p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">Results and suggestions come only from approved public records. Draft and moderation data are never searched.</p></section> : results.total === 0 ? <section className="mt-14 rounded-xl border border-dashed p-10 text-center"><h2 className="text-xl font-semibold">No approved results for “{query}”</h2><p className="mt-2 text-sm text-muted-foreground">Check the spelling, remove a filter, or try a shorter name or code.</p>{(type || country) && <Link href={pageHref(query, "", "", 1)} className={`${buttonVariants({ variant: "outline" })} mt-5`}>Clear filters</Link>}</section> : <>
      <div className="mt-8 flex items-center justify-between"><p className="text-sm text-muted-foreground"><strong className="text-foreground">{results.total}</strong> approved {results.total === 1 ? "result" : "results"}</p><p className="text-xs text-muted-foreground">Exact names and codes rank first</p></div>
      <div className="mt-5 space-y-8">{Object.entries(grouped).map(([contentType, hits]) => <section key={contentType}><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{formatDisplayLabel(contentType)} <span className="font-normal">({hits.length} on this page)</span></h2><div className="divide-y overflow-hidden rounded-xl border bg-card">{hits.map((hit) => <article key={hit.id} className="group relative overflow-hidden p-5"><ArticleCardBackdrop imageUrl={hit.imageUrl} sizes="1050px" /><div className="relative z-10"><div className="flex flex-wrap items-center gap-2"><Link href={hit.href} className="inline-flex min-h-10 items-center text-lg font-semibold text-primary hover:underline"><SearchHighlight text={hit.title} query={query} /></Link><Badge variant="outline">{formatDisplayLabel(hit.contentType)}</Badge></div>{hit.matchedTerm !== hit.title && <p className="mt-1 text-sm text-muted-foreground">Matched {hit.matchedLabel?.toLowerCase() || "approved data"}: <SearchHighlight text={hit.matchedTerm} query={query} /></p>}{hit.description && <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{hit.description}</p>}{hit.countries.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{hit.countries.join(" · ")}</p>}</div></article>)}</div></section>)}</div>
      {results.totalPages > 1 && <nav className="mt-10 flex items-center justify-between" aria-label="Search result pages"><span>{results.page > 1 ? <Link className={buttonVariants({ variant: "outline" })} href={pageHref(query, type || "", country, results.page - 1)}>Previous</Link> : null}</span><span className="text-sm text-muted-foreground">Page {results.page} of {results.totalPages}</span><span>{results.page < results.totalPages ? <Link className={buttonVariants({ variant: "outline" })} href={pageHref(query, type || "", country, results.page + 1)}>Next</Link> : null}</span></nav>}
    </>}
  </main>;
}
