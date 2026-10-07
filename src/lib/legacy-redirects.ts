import { ARTICLE_PATH_ALIASES } from "./article-path-aliases";
import { seoLandingDefinitions } from "./seo-landing-data";

type Redirect = { source: string; destination: string; permanent: true };

// `/airlines` and `/airlines/<country>` are live landing pages. Only legacy
// airline article URLs under `/airlines/<slug>` move to `/commercial/<slug>`.
export const airlineLandingSlugs = seoLandingDefinitions
  .map((definition) => /^\/airlines\/([a-z0-9-]+)$/.exec(definition.href)?.[1])
  .filter((slug): slug is string => !!slug);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function legacyRedirects(): Redirect[] {
  const landingExclusion = airlineLandingSlugs.length
    ? `(?!(?:${airlineLandingSlugs.map(escapeRegExp).join("|")})(?:/|$))`
    : "";
  return [
    ...Object.entries(ARTICLE_PATH_ALIASES).map(([source, destination]) => ({ source, destination, permanent: true as const })),
    { source: "/airline/:path*", destination: "/commercial/:path*", permanent: true },
    { source: `/airlines/:path(${landingExclusion}.+)`, destination: "/commercial/:path", permanent: true },
    { source: "/airport/:path*", destination: "/airports/:path*", permanent: true },
  ];
}
