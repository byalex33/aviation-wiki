import "server-only";

import { aviationRoute } from "@/lib/route-data";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export async function loadAviationRoute(slug: string) {
  const definition = aviationRoute(slug);
  if (!definition) return null;
  const documents = await listPublicSearchDocuments();
  const byTitle = new Map(documents.map((document) => [document.title.toLocaleLowerCase("en"), document]));
  const byCode = new Map(documents.flatMap((document) => document.terms.filter((term) => term.kind === "code").map((term) => [term.value.toUpperCase(), document] as const)));
  const linkForTitle = (title: string) => byTitle.get(title.toLocaleLowerCase("en"))?.href;
  return {
    ...definition,
    originHref: byCode.get(definition.origin.iata)?.href,
    destinationHref: byCode.get(definition.destination.iata)?.href,
    currentAirlines: definition.currentAirlines.map((airline) => ({ ...airline, href: linkForTitle(airline.name) })),
    aircraft: definition.aircraft.map((aircraft) => ({ ...aircraft, href: linkForTitle(aircraft.name) })),
  };
}
