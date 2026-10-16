import type { ContentType } from "@/lib/wiki-types";

export const contentTypePaths: Record<ContentType, string> = {
  airline: "commercial",
  alliance: "alliances",
  aircraft: "aircraft",
  airport: "airports",
  spotting_guide: "spotting",
  manufacturer: "manufacturers",
  engine: "engines",
  event: "aviation-news",
};

export function articlePath(contentType: ContentType, slug: string) {
  if (contentType === "spotting_guide") return `/airports/${slug}/spotting`;
  return `/${contentTypePaths[contentType]}/${slug}`;
}

export function articleHistoryPath(contentType: ContentType, slug: string) {
  return `${articlePath(contentType, slug)}/history`;
}

const prefixToContentType = Object.fromEntries(
  Object.entries(contentTypePaths).map(([contentType, prefix]) => [prefix, contentType]),
) as Record<string, ContentType>;

/** Inverse of `/${contentTypePaths[type]}/${slug}`. */
export function parseArticlePath(path: string) {
  const match = /^\/([a-z0-9-]+)\/([a-z0-9-]+)$/.exec(path);
  if (!match) return null;
  const contentType = prefixToContentType[match[1]];
  if (!contentType) return null;
  return { contentType, slug: match[2] };
}
