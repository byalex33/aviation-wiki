import type { ContentType } from "@/lib/wiki-types";

export const contentTypePaths: Record<ContentType, string> = {
  airline: "commercial",
  alliance: "alliances",
  aircraft: "aircraft",
  airport: "airports",
  manufacturer: "manufacturers",
  engine: "engines",
};

export function articlePath(contentType: ContentType, slug: string) {
  return `/${contentTypePaths[contentType]}/${slug}`;
}

export function articleHistoryPath(contentType: ContentType, slug: string) {
  return `${articlePath(contentType, slug)}/history`;
}
