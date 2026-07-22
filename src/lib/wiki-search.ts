import "server-only";

import { InMemorySearchProvider } from "@/lib/search-core";
import type { SearchRequest } from "@/lib/search-types";
import { listPublicSearchDocuments } from "@/lib/wiki-db";

/** SQLite-backed adapter. Replace this factory to move search to PostgreSQL or a search service. */
export function searchPublicArticles(request: SearchRequest) {
  return new InMemorySearchProvider(listPublicSearchDocuments()).search(request);
}
