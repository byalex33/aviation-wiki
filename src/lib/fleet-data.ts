import type { StructuredField } from "@/lib/wiki-types";

export type FleetSourceArticle = {
  id: string;
  title: string;
  slug: string;
  contentType: "aircraft" | "airline";
  fields: StructuredField[];
  updatedAt: string;
};

export type FleetSourceRelationship = {
  type: string;
  sourceArticleId: string;
  targetArticleId: string;
};

export type FleetOperator = {
  name: string;
  href?: string;
  evidence: "relationship" | "approved fleet field" | "approved aircraft field";
};

export type FleetRecord = {
  id: string;
  title: string;
  slug: string;
  href: string;
  manufacturer: string;
  type: string;
  category: "commercial" | "military" | "general";
  family: string;
  variants: string;
  engines: string;
  entryIntoService: string;
  production: string;
  status: string;
  statusGroup: "production" | "service" | "retired" | "other";
  range: string;
  seating: string;
  currentOperators: FleetOperator[];
  historicOperators: FleetOperator[];
  updatedAt: string;
};

export type FleetFilters = {
  query?: string;
  manufacturer?: string;
  category?: FleetRecord["category"] | "";
  status?: FleetRecord["statusGroup"] | "";
};

function fieldValue(fields: StructuredField[], ...keys: string[]) {
  const expected = new Set(keys.map((key) => key.toLowerCase()));
  return (
    fields.find((field) => expected.has(field.key.trim().toLowerCase()))
      ?.value || ""
  ).trim();
}

function plainText(value: string) {
  return value
    .replace(/f!\[[^\]]+]\s*/gi, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(value: string) {
  return plainText(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function statusGroup(value: string): FleetRecord["statusGroup"] {
  if (/\b(?:retired|ceased|withdrawn|out of service)\b/i.test(value))
    return "retired";
  if (/\b(?:in production|production ongoing|under production)\b/i.test(value))
    return "production";
  if (/\b(?:service|active|operational)\b/i.test(value)) return "service";
  return "other";
}

function aircraftStatus(status: string, production: string) {
  if (status) return status;
  if (/\b(?:present|ongoing|current)\b/i.test(production))
    return "In production";
  if (production) return "Production ended";
  return "Not recorded";
}

function aircraftCategory(type: string, title: string): FleetRecord["category"] {
  const value = `${type} ${title}`;
  if (
    /\b(?:fighter|bomber|military|attack|strike|combat|reconnaissance|trainer|uav|unmanned)\b/i.test(
      value,
    )
  )
    return "military";
  if (
    /\b(?:airliner|passenger|narrow-body|wide-body|regional|cargo|freighter|commercial transport)\b/i.test(
      value,
    )
  )
    return "commercial";
  return "general";
}

function modelIdentifiers(title: string) {
  const value = normalized(title);
  const withoutFamily = value.replace(/\s+family$/, "");
  const tokens = value
    .split(" ")
    .filter((token) => /\d/.test(token) && token.length >= 3);
  return [...new Set([value, withoutFamily, ...tokens])].filter(
    (identifier) => identifier.length >= 3,
  );
}

function fleetFieldReferencesAircraft(fleet: string, aircraftTitle: string) {
  const haystack = ` ${normalized(fleet)} `;
  return modelIdentifiers(aircraftTitle).some((identifier) => {
    if (identifier.includes(" "))
      return haystack.includes(` ${identifier} `) || haystack.includes(` ${identifier}`);
    const pattern = new RegExp(`(?:^|\\s)${identifier}[a-z0-9-]*(?:\\s|$)`, "i");
    return pattern.test(haystack);
  });
}

function splitOperators(value: string) {
  return plainText(value)
    .split(/\s*;\s*|\s+\|\s+/)
    .map((operator) => operator.trim())
    .filter(Boolean);
}

function uniqueOperators(operators: FleetOperator[]) {
  return [
    ...new Map(
      operators.map((operator) => [normalized(operator.name), operator]),
    ).values(),
  ].toSorted((first, second) => first.name.localeCompare(second.name));
}

export function buildFleetRecords({
  articles,
  relationships,
}: {
  articles: FleetSourceArticle[];
  relationships: FleetSourceRelationship[];
}) {
  const aircraft = articles.filter(
    (article) => article.contentType === "aircraft",
  );
  const airlines = articles.filter(
    (article) => article.contentType === "airline",
  );
  const byId = new Map(articles.map((article) => [article.id, article]));

  return aircraft
    .map<FleetRecord>((article) => {
      const type = plainText(fieldValue(article.fields, "Type", "Role"));
      const explicitStatus = plainText(
        fieldValue(article.fields, "Status", "Retired"),
      );
      const produced = plainText(fieldValue(article.fields, "Production"));
      const status = aircraftStatus(explicitStatus, produced);
      const relationshipOperators = relationships
        .filter(
          (relationship) =>
            relationship.type === "operates_aircraft" &&
            relationship.targetArticleId === article.id,
        )
        .map((relationship) => byId.get(relationship.sourceArticleId))
        .filter(
          (operator): operator is FleetSourceArticle =>
            Boolean(operator && operator.contentType === "airline"),
        );
      const fieldOperators = airlines.filter((airline) =>
        fleetFieldReferencesAircraft(
          fieldValue(airline.fields, "Fleet", "Future fleet"),
          article.title,
        ),
      );
      const operators = new Map(
        [...relationshipOperators, ...fieldOperators].map((operator) => [
          operator.id,
          operator,
        ]),
      );
      const currentOperators: FleetOperator[] = [];
      const historicOperators: FleetOperator[] = [];

      for (const operator of operators.values()) {
        const airlineStatus = fieldValue(operator.fields, "Status");
        const item: FleetOperator = {
          name: operator.title,
          href: `/commercial/${operator.slug}`,
          evidence: relationshipOperators.some(
            (related) => related.id === operator.id,
          )
            ? "relationship"
            : "approved fleet field",
        };
        if (/\b(?:ceased|historic|defunct|inactive)\b/i.test(airlineStatus))
          historicOperators.push(item);
        else currentOperators.push(item);
      }

      const primaryUsers = splitOperators(
        fieldValue(article.fields, "Primary users", "Operators"),
      ).map<FleetOperator>((name) => ({
        name,
        evidence: "approved aircraft field",
      }));
      if (statusGroup(status) === "retired")
        historicOperators.push(...primaryUsers);
      else currentOperators.push(...primaryUsers);

      const introduced = plainText(
        fieldValue(
          article.fields,
          "Entry into service",
          "Introduced",
          "Introduction",
          "First flight",
        ),
      );

      return {
        id: article.id,
        title: article.title,
        slug: article.slug,
        href: `/aircraft/${article.slug}`,
        manufacturer:
          plainText(
            fieldValue(article.fields, "Manufacturer", "Manufacturers"),
          ) || "Not recorded",
        type: type || "Not recorded",
        category: aircraftCategory(type, article.title),
        family: plainText(fieldValue(article.fields, "Family")) || "Not recorded",
        variants:
          plainText(fieldValue(article.fields, "Variants")) || "Not recorded",
        engines:
          plainText(fieldValue(article.fields, "Engines", "Engine")) ||
          "Not recorded",
        entryIntoService: introduced || "Not recorded",
        production: produced || "Not recorded",
        status,
        statusGroup: statusGroup(status),
        range:
          plainText(
            fieldValue(
              article.fields,
              "Range",
              "MAX range",
              "747-8I range",
              "ATR 72-600 range",
            ),
          ) || "Not recorded",
        seating:
          plainText(
            fieldValue(
              article.fields,
              "Typical seating",
              "Seating",
              "Capacity",
              "747-8I typical seating",
            ),
          ) || "Not recorded",
        currentOperators: uniqueOperators(currentOperators),
        historicOperators: uniqueOperators(historicOperators),
        updatedAt: article.updatedAt,
      };
    })
    .toSorted((first, second) => first.title.localeCompare(second.title));
}

export function filterFleetRecords(
  records: FleetRecord[],
  filters: FleetFilters,
) {
  const query = normalized(filters.query || "");
  return records.filter((record) => {
    if (
      filters.manufacturer &&
      record.manufacturer !== filters.manufacturer
    )
      return false;
    if (filters.category && record.category !== filters.category) return false;
    if (filters.status && record.statusGroup !== filters.status) return false;
    if (!query) return true;
    return normalized(
      [
        record.title,
        record.manufacturer,
        record.type,
        record.family,
        record.variants,
        record.engines,
        record.currentOperators.map((operator) => operator.name).join(" "),
        record.historicOperators.map((operator) => operator.name).join(" "),
      ].join(" "),
    ).includes(query);
  });
}

export function fleetFilterOptions(records: FleetRecord[]) {
  return {
    manufacturers: [
      ...new Set(
        records
          .map((record) => record.manufacturer)
          .filter((value) => value !== "Not recorded"),
      ),
    ].toSorted((first, second) => first.localeCompare(second)),
  };
}

export function fleetFiltersFromSearchParams(
  params: URLSearchParams,
): FleetFilters {
  const category = params.get("category") || "";
  const status = params.get("status") || "";
  return {
    query: (params.get("q") || "").slice(0, 120),
    manufacturer: (params.get("manufacturer") || "").slice(0, 120),
    category: ["commercial", "military", "general"].includes(category)
      ? (category as FleetRecord["category"])
      : "",
    status: ["production", "service", "retired", "other"].includes(status)
      ? (status as FleetRecord["statusGroup"])
      : "",
  };
}
