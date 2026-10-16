// Loaded by next.config through legacy-redirects. Keep this module free of
// imports: that compiler does not resolve the app's `@/` paths.

type ContentType = "airline" | "alliance" | "aircraft" | "airport" | "manufacturer" | "engine" | "event";

const contentTypePaths: Record<ContentType, string> = {
  airline: "commercial",
  alliance: "alliances",
  aircraft: "aircraft",
  airport: "airports",
  manufacturer: "manufacturers",
  engine: "engines",
  event: "aviation-news",
};

function articlePath(contentType: ContentType, slug: string) {
  return `/${contentTypePaths[contentType]}/${slug}`;
}

/**
 * Public URLs that permanently redirect to another live article.
 * `next.config` emits these as 308s, so the destination must already exist.
 * History URLs are redirected alongside the article in `legacyRedirects`.
 */
export const ARTICLE_PATH_ALIASES: Record<string, string> = {
  "/commercial/klm": "/commercial/klm-royal-dutch-airlines",
  "/commercial/virgin-atlantic": "/commercial/virgin-atlantic-airways",
  "/commercial/swiss": "/commercial/swiss-international-air-lines",
  // Iberia Airlines is the sourced article (~1,300 words). `/commercial/iberia`
  // is the short OpenFlights stub and matches the existing short-to-legal alias pattern.
  "/commercial/iberia": "/commercial/iberia-airlines",
  // Air India is the researched article (~4,700 words). The legal-name URL is
  // only the directory stub, so content quality keeps the trading-name slug.
  "/commercial/air-india-limited": "/commercial/air-india",
  // The 737 family record uses primary sources and the same `-family` slug as
  // the A320 family, which is also what the comparison pages read.
  "/aircraft/boeing-737": "/aircraft/boeing-737-family",
  // The A330neo article already covers the A330-900, including its first flight,
  // certification and TAP entry into service, at several times the length.
  "/aircraft/airbus-a330-900": "/aircraft/airbus-a330neo",
};

/**
 * Manufacturer-model slugs, matching `lockheed-martin-f-22-raptor` and
 * `general-dynamics-f-16-fighting-falcon`. These are not edge redirects: the
 * destination does not exist until `scripts/canonicalize-duplicate-articles.ts`
 * renames the row. Linking code rewrites them only once that page is published,
 * so the current URL keeps working until then.
 */
export const F15_LEGACY_SLUG = "f-15-eagle";
export const F15_CANONICAL_SLUG = "mcdonnell-douglas-f-15-eagle";
export const F35_LEGACY_SLUG = "f35-lightning-ii";
export const F35_CANONICAL_SLUG = "lockheed-martin-f-35-lightning-ii";

/** Duplicate pairs this release folds together. Destinations are the values in `ARTICLE_PATH_ALIASES`. */
export const CANONICAL_DUPLICATE_SOURCES = [
  "/commercial/iberia",
  "/commercial/air-india-limited",
  "/aircraft/boeing-737",
  "/aircraft/airbus-a330-900",
] as const;

export const ARTICLE_SLUG_RENAMES: Record<string, string> = {
  [`/aircraft/${F35_LEGACY_SLUG}`]: `/aircraft/${F35_CANONICAL_SLUG}`,
  [`/aircraft/${F15_LEGACY_SLUG}`]: `/aircraft/${F15_CANONICAL_SLUG}`,
};

const prefixToContentType = Object.fromEntries(
  Object.entries(contentTypePaths).map(([contentType, prefix]) => [prefix, contentType]),
) as Record<string, ContentType>;

export function parseArticlePath(path: string) {
  const match = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(path);
  if (!match) return null;
  const contentType = prefixToContentType[match[1]];
  if (!contentType) return null;
  return { contentType, slug: match[2] };
}

/** Href for readers. Alias sources point at the canonical article; renames do not, until that slug is published. */
export function publicArticlePath(contentType: ContentType, slug: string) {
  const path = articlePath(contentType, slug);
  return ARTICLE_PATH_ALIASES[path] ?? path;
}

export function publicArticleHistoryPath(contentType: ContentType, slug: string) {
  return `${publicArticlePath(contentType, slug)}/history`;
}

export function preferredArticlePath(path: string, availablePaths?: Iterable<string>) {
  const available = availablePaths
    ? availablePaths instanceof Set
      ? availablePaths
      : new Set(availablePaths)
    : null;
  const alias = ARTICLE_PATH_ALIASES[path];
  if (alias && (!available || available.has(alias))) return alias;
  const rename = ARTICLE_SLUG_RENAMES[path];
  if (rename && available?.has(rename)) return rename;
  return null;
}

type IndexedDocument = {
  href: string;
  terms: Array<{ value: string; kind: string; label?: string }>;
};

/** Drop retired duplicate URLs from the public index and keep their names searchable on the canonical page. */
export function canonicalizeSearchDocuments<T extends IndexedDocument>(documents: T[]): T[] {
  const retired = new Set(Object.keys(ARTICLE_PATH_ALIASES));
  const aliasesByDestination = new Map<string, string[]>();
  for (const [source, destination] of Object.entries(ARTICLE_PATH_ALIASES)) {
    const label = source.split("/").at(-1)?.replaceAll("-", " ");
    if (!label) continue;
    aliasesByDestination.set(destination, [...(aliasesByDestination.get(destination) ?? []), label]);
  }
  return documents.flatMap((document) => {
    if (retired.has(document.href)) return [];
    const extra = aliasesByDestination.get(document.href) ?? [];
    if (!extra.length) return [document];
    const terms = [...document.terms];
    for (const value of extra) {
      if (terms.some((term) => term.value.toLowerCase() === value.toLowerCase())) continue;
      terms.push({ value, kind: "alias", label: "Previous title or slug" });
    }
    return [{ ...document, terms }];
  });
}
