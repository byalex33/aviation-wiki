import type { SearchDocument } from "@/lib/search-types";

export function pickRandomAircraft(
  documents: SearchDocument[],
  random = Math.random,
) {
  const aircraft = documents.filter(
    (document) => document.contentType === "aircraft",
  );
  if (!aircraft.length) return null;

  const index = Math.min(
    aircraft.length - 1,
    Math.floor(Math.max(0, random()) * aircraft.length),
  );
  return aircraft[index];
}
