import { isSafeCitationUrl, type Citation } from "@/lib/article-markdown";
import type { SourceLink } from "@/lib/wiki-types";

export function sourceTitle(source: SourceLink) {
  return source.title || source.label || source.url;
}

export function sourceForCitation(citation: Citation, sources: SourceLink[]) {
  return sources.find((source) => source.identifier?.toLowerCase() === citation.identifier) ||
    sources.find((source) => source.url === citation.url) ||
    { identifier: citation.identifier, url: citation.url };
}

export function citedSources(citations: Citation[], sources: SourceLink[]) {
  return citations.map((citation) => ({ citation, source: sourceForCitation(citation, sources) }));
}

export function normalizeSourceMetadata(source: SourceLink): SourceLink {
  const clean = (value: unknown, limit: number) => String(value || "").trim().slice(0, limit);
  const url = clean(source.url, 2000);
  const archiveUrl = clean(source.archiveUrl, 2000);
  return {
    identifier: clean(source.identifier, 80).toLowerCase() || undefined,
    title: clean(source.title || source.label, 300) || undefined,
    publisher: clean(source.publisher, 200) || undefined,
    url,
    accessedAt: /^\d{4}-\d{2}-\d{2}$/.test(clean(source.accessedAt, 10)) ? clean(source.accessedAt, 10) : undefined,
    archiveUrl: archiveUrl && isSafeCitationUrl(archiveUrl) ? archiveUrl : undefined,
  };
}

export function reconcileCitationSources(citations: Citation[], submitted: SourceLink[]) {
  const normalized = submitted.map(normalizeSourceMetadata).filter((source) => source.url && isSafeCitationUrl(source.url));
  const cited = citations.map((citation) => {
    const metadata = normalized.find((source) => source.identifier === citation.identifier) ||
      normalized.find((source) => source.url === citation.url);
    return { ...metadata, identifier: citation.identifier, url: citation.url };
  });
  const unused = normalized.filter((source) => !citations.some((citation) => citation.identifier === source.identifier || citation.url === source.url));
  return [...cited, ...unused].slice(0, 80);
}
