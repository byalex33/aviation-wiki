import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const dynamic = "force-dynamic";

const staticRoutes = [
  "/",
  "/categories",
  "/commercial",
  "/alliances",
  "/aircraft",
  "/commercial-aircraft",
  "/general-aviation",
  "/aviation-news",
  "/military",
  "/cargo",
  "/airports",
  "/manufacturers",
  "/engines",
  "/fleet",
  "/compare",
  "/compare/airbus-a320-vs-boeing-737",
  "/compare/boeing-787-vs-airbus-a350",
  "/compare/airbus-a380-vs-boeing-747",
  "/compare/f-16-vs-mig-29",
  "/compare/star-alliance-vs-oneworld-vs-skyteam",
  "/pro",
  "/privacy",
  "/contact",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const documents = await listPublicSearchDocuments();
  const generatedAt = new Date();
  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map(
    (pathname, index) => ({
      url: new URL(pathname, SITE_URL).toString(),
      lastModified: generatedAt,
      changeFrequency: pathname === "/" ? "daily" : "weekly",
      priority: pathname === "/" ? 1 : index < 13 ? 0.8 : 0.5,
    }),
  );
  const articleEntries: MetadataRoute.Sitemap = documents.map((document) => ({
    url: new URL(document.href, SITE_URL).toString(),
    lastModified: document.updatedAt || generatedAt,
    changeFrequency: "monthly",
    priority: 0.7,
    images: document.imageUrl ? [document.imageUrl] : undefined,
  }));

  return [...staticEntries, ...articleEntries];
}
