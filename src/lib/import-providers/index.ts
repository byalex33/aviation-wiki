import "server-only";

import type { ImportProviderId } from "@/lib/import-types";
import { WikidataImportProvider } from "@/lib/import-providers/wikidata";

const providers = { wikidata: new WikidataImportProvider() } as const;

export function getImportProvider(id: string) {
  const provider = providers[id as ImportProviderId];
  if (!provider) throw new Error("Unsupported import provider.");
  return provider;
}

export const importProviders = Object.values(providers);
