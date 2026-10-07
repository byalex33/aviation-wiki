export const SITE_NAME = "aviation.wiki";
export const SITE_URL = "https://www.aviation.wiki";
export const SITE_DESCRIPTION =
  "The free encyclopedia of aircraft, airlines, engines, airports, and aviation history.";

// The site-wide card from src/app/opengraph-image.tsx, for pages without a
// lead image of their own.
export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "aviation.wiki — the free encyclopedia of everything that flies",
};

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, SITE_URL).toString();
}
