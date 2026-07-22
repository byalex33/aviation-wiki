import type { ContentType } from "@/lib/wiki-types";

export type ImportProviderId = "wikidata";

export type ImportSearchResult = {
  provider: ImportProviderId;
  sourceId: string;
  title: string;
  description: string;
  sourceUrl: string;
};

export type ImportField = {
  id: string;
  key: string;
  value: string;
  verified: boolean;
  sourceUrls: string[];
  sourceLabel: string;
};

export type ImportImage = {
  id: string;
  fileName: string;
  imageUrl: string;
  thumbnailUrl: string;
  creator: string;
  license: string;
  licenseUrl: string;
  attribution: string;
  sourcePage: string;
  retrievedAt: string;
  compatible: boolean;
  incompatibilityReason?: string;
};

export type ImportPreview = {
  provider: ImportProviderId;
  sourceId: string;
  sourceUrl: string;
  title: string;
  description: string;
  contentType: ContentType;
  typeVerified: boolean;
  fields: ImportField[];
  images: ImportImage[];
  unverifiedFields: string[];
};

export interface AviationImportProvider {
  readonly id: ImportProviderId;
  readonly label: string;
  search(query: string, contentType: ContentType): Promise<ImportSearchResult[]>;
  preview(sourceId: string, contentType: ContentType): Promise<ImportPreview>;
}
