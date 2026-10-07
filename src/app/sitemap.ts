import type { MetadataRoute } from "next";

import { aviationDataEnabled } from "@/lib/aviation-data-flags";
import { aviationRoutes } from "@/lib/route-data";
import { SITE_URL } from "@/lib/site";
import { sitemapImageUrl } from "@/lib/sitemap-images";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

// Rendered on demand, but listPublicSearchDocuments is cached for 24h so this
// touches Postgres at most once per day. Kept dynamic (not prerendered) so a
// build without database env — e.g. a preview deploy — does not need to reach it.
export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/categories",
  "/commercial",
  "/alliances",
  "/aircraft",
  "/aircraft/airbus",
  "/aircraft/boeing",
  "/airlines",
  "/airlines/united-kingdom",
  "/commercial-aircraft",
  "/general-aviation",
  "/aviation-news",
  "/military",
  "/cargo",
  "/airports",
  "/airports/united-kingdom",
  "/manufacturers",
  "/engines",
  "/engines/rolls-royce",
  "/fleet",
  "/compare",
  "/compare/airbus-a320-vs-boeing-737",
  "/compare/boeing-787-vs-airbus-a350",
  "/compare/airbus-a380-vs-boeing-747",
  "/compare/f-16-vs-mig-29",
  "/compare/star-alliance-vs-oneworld-vs-skyteam",
  "/routes",
  "/pro",
  "/privacy",
  "/terms",
  "/contact",
] as const;

// Included only once the aviation data graph is live in this environment
// (AVIATION_DATA_ENABLED). Until then these routes render the 404 page.
const aviationDataRoutes = [
  "/airframes",
  "/registrations",
  "/registrations/g",
  "/production-lists",
  "/production-lists/a350-1000",
  "/fleet/british-airways",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const documents = await listPublicSearchDocuments();
  // Static and data routes carry no lastmod: stamping them with the request
  // time makes every lastmod in the file untrustworthy to crawlers.
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    (pathname, index) => ({
      url: new URL(pathname, SITE_URL).toString(),
      changeFrequency: pathname === "/" ? "daily" : "weekly",
      priority: pathname === "/" ? 1 : index < 13 ? 0.8 : 0.5,
    }),
  );
  const articleEntries: MetadataRoute.Sitemap = documents.map((document) => {
    const imageUrl = document.imageUrl
      ? sitemapImageUrl(document.imageUrl)
      : undefined;

    return {
      url: new URL(document.href, SITE_URL).toString(),
      lastModified: document.updatedAt || undefined,
      changeFrequency: "monthly",
      priority: 0.7,
      images: imageUrl ? [imageUrl] : undefined,
    };
  });

  const routeEntries: MetadataRoute.Sitemap = aviationRoutes.map((route) => ({
    url: new URL(`/routes/${route.slug}`, SITE_URL).toString(),
    lastModified: route.checkedAt ? new Date(route.checkedAt) : undefined,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const aviationDataEntries: MetadataRoute.Sitemap = aviationDataEnabled
    ? aviationDataRoutes.map((pathname) => ({
        url: new URL(pathname, SITE_URL).toString(),
        changeFrequency: "weekly",
        priority: 0.5,
      }))
    : [];

  return [
    ...staticEntries,
    ...aviationDataEntries,
    ...routeEntries,
    ...articleEntries,
  ];
}
