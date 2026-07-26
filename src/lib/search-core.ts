import type { SearchDocument, SearchHit, SearchProvider, SearchRequest, SearchResponse, SearchTermKind } from "@/lib/search-types";

export function normalizeSearchText(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function compact(value: string) {
  return normalizeSearchText(value).replaceAll(" ", "");
}

function distance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

const weights: Record<SearchTermKind, number> = { title: 500, code: 480, alias: 420, field: 300 };

function scoreTerm(query: string, rawTerm: string, kind: SearchTermKind) {
  const term = normalizeSearchText(rawTerm);
  if (!term) return 0;
  const queryCompact = compact(query);
  const termCompact = compact(term);
  if (queryCompact === termCompact) return weights[kind] + 500;
  if (term.startsWith(query)) return weights[kind] + 260 - Math.min(80, term.length - query.length);
  const wordIndex = term.split(" ").findIndex((word) => word.startsWith(query));
  if (wordIndex >= 0) return weights[kind] + 190 - wordIndex * 5;
  if (term.includes(query)) return weights[kind] + 120;
  if (query.length >= 4) {
    const allowed = query.length <= 5 ? 1 : 2;
    const candidates = [term, ...term.split(" ")].filter((candidate) => Math.abs(candidate.length - query.length) <= allowed);
    const closest = Math.min(...candidates.map((candidate) => distance(query, candidate)));
    if (closest <= allowed) return weights[kind] + 70 - closest * 15;
  }
  return 0;
}

function hitFor(document: SearchDocument, query: string): SearchHit | null {
  if (query === "*") return { id: document.id, title: document.title, slug: document.slug, contentType: document.contentType, href: document.href, description: document.description, imageUrl: document.imageUrl, countries: document.countries, matchedTerm: document.title, score: 1, exact: false };
  let best: SearchDocument["terms"][number] | null = null;
  let score = 0;
  for (const term of document.terms) {
    const candidate = scoreTerm(query, term.value, term.kind);
    if (candidate > score) {
      best = term;
      score = candidate;
    }
  }
  if (!best || !score) return null;
  const exact = compact(best.value) === compact(query);
  return { id: document.id, title: document.title, slug: document.slug, contentType: document.contentType, href: document.href, description: document.description, imageUrl: document.imageUrl, countries: document.countries, matchedTerm: best.value, matchedLabel: best.label, score, exact };
}

export class InMemorySearchProvider implements SearchProvider {
  constructor(private readonly documents: SearchDocument[]) {}

  search(request: SearchRequest): SearchResponse {
    const query = normalizeSearchText(request.query).slice(0, 120);
    const pageSize = Math.min(50, Math.max(1, request.pageSize || 12));
    const page = Math.max(1, request.page || 1);
    const countries = [...new Set(this.documents.flatMap((document) => document.countries))].sort((a, b) => a.localeCompare(b));
    if (!query) return { query, hits: [], total: 0, page: 1, pageSize, totalPages: 0, directHit: null, countries };
    const matches = this.documents
      .filter((document) => !request.contentType || document.contentType === request.contentType)
      .filter((document) => !request.country || document.countries.some((country) => normalizeSearchText(country) === normalizeSearchText(request.country!)))
      .map((document) => hitFor(document, query))
      .filter((hit): hit is SearchHit => Boolean(hit))
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    const direct = matches.filter((hit) => hit.exact && hit.matchedLabel && /iata|icao|registration|callsign|code/i.test(hit.matchedLabel));
    const directHit = direct.length === 1 ? direct[0] : null;
    const totalPages = Math.ceil(matches.length / pageSize);
    const safePage = totalPages ? Math.min(page, totalPages) : 1;
    return { query, hits: matches.slice((safePage - 1) * pageSize, safePage * pageSize), total: matches.length, page: safePage, pageSize, totalPages, directHit, countries };
  }
}
