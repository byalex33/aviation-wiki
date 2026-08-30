import type { SearchDocument } from "@/lib/search-types";

export type SeoLandingId = "aircraft-airbus" | "aircraft-boeing" | "airlines-united-kingdom" | "airports-united-kingdom" | "engines-rolls-royce";

export type SeoLandingDefinition = {
  id: SeoLandingId;
  href: string;
  badge: string;
  title: string;
  description: string;
  entityLabel: string;
  contentType: Extract<SearchDocument["contentType"], "aircraft" | "airline" | "airport" | "engine">;
  subject: string;
  match: (document: SearchDocument) => boolean;
  contributeHref: string;
};

const normalized = (value: string) => value.toLocaleLowerCase("en").replace(/[–—]/g, "-").trim();
const termMatches = (document: SearchDocument, labels: RegExp, value: RegExp) =>
  document.terms.some((term) => labels.test(term.label || "") && value.test(term.value));
const titleStarts = (document: SearchDocument, name: string) =>
  normalized(document.title).startsWith(`${normalized(name)} `) || normalized(document.title) === normalized(name);
const countryMatches = (document: SearchDocument, aliases: string[]) => {
  const wanted = new Set(aliases.map(normalized));
  return document.countries.some((country) => wanted.has(normalized(country))) ||
    termMatches(document, /country|national origin/i, new RegExp(`^(?:${aliases.join("|")})$`, "i"));
};

export const seoLandingDefinitions: SeoLandingDefinition[] = [
  {
    id: "aircraft-airbus",
    href: "/aircraft/airbus",
    badge: "Aircraft by manufacturer",
    title: "Airbus aircraft",
    description: "Explore approved Airbus aircraft families and variants, with specifications, production history, operators, engines, and citations.",
    entityLabel: "Airbus aircraft",
    contentType: "aircraft",
    subject: "Airbus",
    match: (document) => titleStarts(document, "Airbus") || termMatches(document, /manufacturer/i, /\bAirbus\b/i),
    contributeHref: "/contribute?title=Airbus+aircraft&contentType=aircraft",
  },
  {
    id: "aircraft-boeing",
    href: "/aircraft/boeing",
    badge: "Aircraft by manufacturer",
    title: "Boeing aircraft",
    description: "Explore approved Boeing aircraft families and variants, from commercial airliners to military types, with cited specifications and history.",
    entityLabel: "Boeing aircraft",
    contentType: "aircraft",
    subject: "Boeing",
    match: (document) => titleStarts(document, "Boeing") || termMatches(document, /manufacturer/i, /\bBoeing\b/i),
    contributeHref: "/contribute?title=Boeing+aircraft&contentType=aircraft",
  },
  {
    id: "airlines-united-kingdom",
    href: "/airlines/united-kingdom",
    badge: "Airlines by country",
    title: "Airlines of the United Kingdom",
    description: "Browse approved British airline profiles, including active and historic passenger and cargo operators, fleets, hubs, codes, and cited history.",
    entityLabel: "UK airlines",
    contentType: "airline",
    subject: "United Kingdom",
    match: (document) => countryMatches(document, ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland"]),
    contributeHref: "/contribute?title=British+airline&contentType=airline",
  },
  {
    id: "airports-united-kingdom",
    href: "/airports/united-kingdom",
    badge: "Airports by country",
    title: "Airports in the United Kingdom",
    description: "Browse approved UK airport and airfield guides with codes, locations, airlines, facilities, and sourced aviation history.",
    entityLabel: "UK airports",
    contentType: "airport",
    subject: "United Kingdom",
    match: (document) => countryMatches(document, ["United Kingdom", "UK", "England", "Scotland", "Wales", "Northern Ireland"]),
    contributeHref: "/contribute?title=United+Kingdom+airport&contentType=airport",
  },
  {
    id: "engines-rolls-royce",
    href: "/engines/rolls-royce",
    badge: "Engines by manufacturer",
    title: "Rolls-Royce aircraft engines",
    description: "Explore approved Rolls-Royce piston, turboprop, turbojet, and turbofan engine articles with applications, variants, specifications, and citations.",
    entityLabel: "Rolls-Royce engines",
    contentType: "engine",
    subject: "Rolls-Royce",
    match: (document) => titleStarts(document, "Rolls-Royce") || termMatches(document, /manufacturer/i, /Rolls[- ]Royce/i),
    contributeHref: "/contribute?title=Rolls-Royce+aircraft+engine&contentType=engine",
  },
];

export function seoLandingDefinition(id: SeoLandingId) {
  return seoLandingDefinitions.find((definition) => definition.id === id)!;
}

export function documentsForSeoLanding(definition: SeoLandingDefinition, documents: SearchDocument[]) {
  return documents
    .filter((document) => document.contentType === definition.contentType && definition.match(document))
    .toSorted((first, second) => first.title.localeCompare(second.title));
}
