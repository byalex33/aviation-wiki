"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Clock3, Search, X } from "lucide-react";

import { SearchHighlight } from "@/components/search-highlight";
import { Input } from "@/components/ui/input";
import type { SearchHit, SearchResponse } from "@/lib/search-types";
import { formatDisplayLabel } from "@/lib/display";

const recentKey = "aviation-wiki-recent-searches";

function readRecent() {
  try {
    const value = JSON.parse(localStorage.getItem(recentKey) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 6) : [];
  } catch { return []; }
}

function remember(query: string) {
  const value = query.trim();
  if (!value) return;
  localStorage.setItem(recentKey, JSON.stringify([value, ...readRecent().filter((item) => item.toLowerCase() !== value.toLowerCase())].slice(0, 6)));
}

export function HeaderSearch() {
  const router = useRouter();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const hits = data?.hits || [];

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&pageSize=8`, { signal: controller.signal });
      if (response.ok) { setData(await response.json() as SearchResponse); setActive(-1); }
    }, 140);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function goToSearch(value: string) {
    remember(value);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (active >= 0 && hits[active]) { remember(query); router.push(hits[active].href); setOpen(false); return; }
    remember(query);
    setOpen(false);
    router.push(data?.directHit?.href || `/search?q=${encodeURIComponent(query.trim())}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((current) => Math.min(hits.length - 1, current + 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(-1, current - 1)); }
    else if (event.key === "Escape") { setOpen(false); setActive(-1); }
  }

  const grouped = hits.reduce<Record<string, SearchHit[]>>((result, hit) => { (result[hit.contentType] ||= []).push(hit); return result; }, {});
  return <div ref={root} className="relative w-full">
    <form onSubmit={submit} role="search">
      <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input name="q" value={query} onChange={(event) => { const value = event.target.value; setQuery(value); setOpen(true); setActive(-1); if (value.trim().length < 2) setData(null); }} onFocus={() => { setRecent(readRecent()); setOpen(true); }} onKeyDown={onKeyDown} className="h-[38px] bg-card pl-9 pr-8 shadow-xs" placeholder="Search names, codes, registrations…" aria-label="Search aviation.wiki" aria-expanded={open} aria-controls={listId} aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined} autoComplete="off" />
      {query && <button type="button" onClick={() => { setQuery(""); setData(null); }} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Clear search"><X className="size-3.5" /></button>}
    </form>
    {open && <div id={listId} role="listbox" className="absolute left-0 right-0 top-[44px] max-h-[min(70vh,520px)] overflow-auto rounded-xl border bg-popover p-2 shadow-xl">
      {query.trim().length < 2 ? (recent.length ? <div><p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent searches</p>{recent.map((item) => <button key={item} type="button" onClick={() => goToSearch(item)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"><Clock3 className="size-3.5 text-muted-foreground" />{item}</button>)}</div> : <p className="px-3 py-5 text-center text-sm text-muted-foreground">Search approved aviation articles by name, code, or registration.</p>) : data && !hits.length ? <div className="px-3 py-5 text-center"><p className="text-sm font-medium">No approved articles found</p><p className="mt-1 text-xs text-muted-foreground">Check the spelling or try a broader term.</p></div> : Object.entries(grouped).map(([type, group]) => <section key={type}><p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDisplayLabel(type)}</p>{group.map((hit) => { const index = hits.indexOf(hit); return <Link id={`${listId}-${index}`} role="option" aria-selected={active === index} key={hit.id} href={hit.href} onClick={() => remember(query)} className="block rounded-lg px-2 py-2 text-sm aria-selected:bg-muted hover:bg-muted"><span className="font-medium"><SearchHighlight text={hit.title} query={query} /></span>{hit.matchedTerm !== hit.title && <span className="ml-2 text-xs text-muted-foreground">{hit.matchedLabel}: <SearchHighlight text={hit.matchedTerm} query={query} /></span>}</Link>; })}</section>)}
      {query.trim().length >= 2 && <button type="button" onClick={() => goToSearch(query)} className="mt-1 w-full border-t px-2 pb-1 pt-3 text-left text-sm font-medium text-primary">View all results for “{query.trim()}”</button>}
    </div>}
  </div>;
}
