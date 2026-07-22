import type { ContentType } from "@/lib/wiki-types";

export const contentTypePaths: Record<ContentType, string> = {
  airline: "commercial",
  aircraft: "aircraft",
  airport: "airports",
  manufacturer: "manufacturers",
  engine: "engines",
  country: "countries",
};

export function articlePath(contentType: ContentType, slug: string) {
  return `/${contentTypePaths[contentType]}/${slug}`;
}

export function articleHistoryPath(contentType: ContentType, slug: string) {
  return `${articlePath(contentType, slug)}/history`;
}
