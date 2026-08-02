import type { ContentType } from "@/lib/wiki-types";

export type SearchTermKind = "title" | "code" | "alias" | "field";

export type SearchDocument = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  href: string;
  description: string;
  imageUrl?: string;
  updatedAt?: string;
  countries: string[];
  terms: Array<{ value: string; kind: SearchTermKind; label?: string }>;
};

export type SearchHit = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  href: string;
  description: string;
  imageUrl?: string;
  countries: string[];
  matchedTerm: string;
  matchedLabel?: string;
  score: number;
  exact: boolean;
};

export type SearchRequest = {
  query: string;
  contentType?: ContentType;
  country?: string;
  page?: number;
  pageSize?: number;
};

export type SearchResponse = {
  query: string;
  hits: SearchHit[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  directHit: SearchHit | null;
  countries: string[];
};

export interface SearchProvider {
  search(request: SearchRequest): SearchResponse;
}
