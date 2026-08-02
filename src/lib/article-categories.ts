import type { SearchDocument } from "@/lib/search-types";

export const aviationCategories = [
  {
    id: "commercial",
    name: "Commercial airlines",
    label: "Passenger transport",
    description:
      "Flag carriers, regional airlines, low-cost operators, and historic passenger services.",
    href: "/commercial",
  },
  {
    id: "cargo",
    name: "Cargo & logistics",
    label: "Freight aviation",
    description:
      "Cargo airlines, parcel fleets, freight carriers, and operators such as DHL.",
    href: "/cargo",
  },
  {
    id: "alliances",
    name: "Airline alliances",
    label: "Global networks",
    description:
      "The partnerships connecting carriers, routes, lounges, and frequent flyers.",
    href: "/alliances",
  },
  {
    id: "military",
    name: "Military aircraft",
    label: "Defence aviation",
    description:
      "Fighters, bombers, transports, trainers, reconnaissance platforms, and UAVs.",
    href: "/military",
  },
  {
    id: "commercialAircraft",
    name: "Commercial aircraft",
    label: "Air transport",
    description:
      "Passenger airliners, regional aircraft, and commercial freighters.",
    href: "/commercial-aircraft",
  },
  {
    id: "general",
    name: "General aviation",
    label: "Civil aircraft",
    description:
      "Light aircraft, business jets, helicopters, and specialist civil types.",
    href: "/general-aviation",
  },
  {
    id: "airports",
    name: "Airports",
    label: "Places",
    description:
      "Airports, airfields, hubs, terminals, and the places aviation connects.",
    href: "/airports",
  },
  {
    id: "manufacturers",
    name: "Manufacturers",
    label: "Industry",
    description:
      "Aircraft and engine manufacturers, design bureaux, and aerospace companies.",
    href: "/manufacturers",
  },
  {
    id: "engines",
    name: "Engines",
    label: "Propulsion",
    description:
      "Piston, turboprop, turbojet, and turbofan engines from aviation history.",
    href: "/engines",
  },
] as const;

export type AviationCategoryId = (typeof aviationCategories)[number]["id"];

export const featuredAviationCategoryIds = [
  "commercial",
  "alliances",
  "military",
  "general",
] as const satisfies readonly AviationCategoryId[];

export type FeaturedAviationCategoryId =
  (typeof featuredAviationCategoryIds)[number];

const militaryPattern =
  /\b(?:air force|air superiority|attack aircraft|bomber|combat|fighter|military|reconnaissance|trainer|uav|unmanned|warplane)\b/i;

const commercialAircraftPattern =
  /\b(?:airliners?|cargo aircraft|cargo plane|commercial aircraft|freighter aircraft|jetliner|narrow-body|passenger aircraft|passenger jet|regional aircraft|regional jet|wide-body)\b/i;

const cargoAirlinePattern =
  /\b(?:air cargo|cargo airline|cargo carrier|freight airline|freight carrier|air freight|logistics|parcel|express carrier|dhl|fedex|ups airlines|cargolux|atlas air|kalitta|polar air cargo)\b/i;

export function isMilitaryAircraft(
  document: Pick<SearchDocument, "contentType" | "title" | "description">,
) {
  return (
    document.contentType === "aircraft" &&
    militaryPattern.test(`${document.title} ${document.description}`)
  );
}

export function isCargoAirline(
  document: Pick<SearchDocument, "contentType" | "title" | "description">,
) {
  return (
    document.contentType === "airline" &&
    cargoAirlinePattern.test(`${document.title} ${document.description}`)
  );
}

export function isCommercialAircraft(
  document: Pick<SearchDocument, "contentType" | "title" | "description">,
) {
  return (
    document.contentType === "aircraft" &&
    !isMilitaryAircraft(document) &&
    commercialAircraftPattern.test(`${document.title} ${document.description}`)
  );
}

export function aviationCategoryFor(document: SearchDocument): AviationCategoryId {
  if (document.contentType === "airline")
    return isCargoAirline(document) ? "cargo" : "commercial";
  if (document.contentType === "alliance") return "alliances";
  if (document.contentType === "aircraft") {
    if (isMilitaryAircraft(document)) return "military";
    return isCommercialAircraft(document) ? "commercialAircraft" : "general";
  }
  if (document.contentType === "airport") return "airports";
  if (document.contentType === "manufacturer") return "manufacturers";
  return "engines";
}

export function getAviationCategoryCounts(documents: SearchDocument[]) {
  const counts = Object.fromEntries(
    aviationCategories.map((category) => [category.id, 0]),
  ) as Record<AviationCategoryId, number>;

  for (const document of documents)
    counts[aviationCategoryFor(document)] += 1;

  return counts;
}
