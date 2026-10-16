import type { StructuredField } from "@/lib/wiki-types";

export const airframeStatuses = ["active", "stored", "scrapped", "on_order"] as const;
export type AirframeStatus = (typeof airframeStatuses)[number];

/** Aircraft articles that are one airframe and should move to /airframes/<registration>. */
export const legacyAircraftAirframeSlugs = ["g-boac", "n747na"] as const;

const statusLabels: Record<AirframeStatus, string> = {
  active: "Active",
  stored: "Stored",
  scrapped: "Scrapped",
  on_order: "On order",
};

export function airframeStatusLabel(status: AirframeStatus) {
  return statusLabels[status];
}

export function airframeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function airframePath(registrationOrSlug: string) {
  return `/airframes/${airframeSlug(registrationOrSlug)}`;
}

export function graphAirframePath(airframe: {
  publicId: string;
  currentRegistration?: { registration: string } | null;
}) {
  const registration = airframe.currentRegistration?.registration;
  return registration ? airframePath(registration) : `/airframes/${airframe.publicId}`;
}

export function compactRegistration(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function parseAirframeStatus(value: string): AirframeStatus | null {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, " ");
  if (/^(active|in service|valid|operational)$/.test(normalized)) return "active";
  if (/^(stored|storage|parked|preserved|withdrawn|withdrawn from use)$/.test(normalized)) return "stored";
  if (/^(scrapped|scrap|broken up|destroyed|written off)$/.test(normalized)) return "scrapped";
  if (/^(on order|ordered|not yet delivered)$/.test(normalized)) return "on_order";
  return null;
}

export function parseIsoDate(value: string): string | null {
  const trimmed = value.trim();
  const separated = /^(\d{4})[/-](\d{2})[/-](\d{2})$/.exec(trimmed);
  if (separated) return `${separated[1]}-${separated[2]}-${separated[3]}`;
  const compact = /^(\d{4})(\d{2})(\d{2})$/.exec(trimmed);
  if (compact) {
    const [, year, month, day] = compact;
    if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null;
    return `${year}-${month}-${day}`;
  }
  return null;
}

export type OperatorSpan = {
  operator: string;
  slug: string;
  from: string | null;
  to: string | null;
};

export type RegistrationSpan = {
  registration: string;
  slug: string;
  from: string | null;
  to: string | null;
};

export type AirframeRecord = {
  articleId: string;
  title: string;
  registration: string;
  slug: string;
  href: string;
  msn: string | null;
  aircraftType: string;
  variant: string;
  status: AirframeStatus;
  deliveryDate: string | null;
  manufactureYear: number | null;
  ageYears: number | null;
  fate: string | null;
  currentOperatorName: string | null;
  currentOperatorSlug: string | null;
  typeSlug: string | null;
  operatorHistory: OperatorSpan[];
  registrationHistory: RegistrationSpan[];
};

export type FleetTypeGroup = {
  type: string;
  typeSlug: string | null;
  typeHref: string | null;
  count: number;
  averageAgeYears: number | null;
  tails: AirframeRecord[];
};

export type OperatorFleetSummary = {
  operatorName: string;
  operatorSlug: string;
  operatorHref: string | null;
  inService: FleetTypeGroup[];
  stored: FleetTypeGroup[];
  onOrder: FleetTypeGroup[];
  historical: FleetTypeGroup[];
  inServiceCount: number;
  storedCount: number;
  onOrderCount: number;
  historicalCount: number;
  averageAgeYears: number | null;
};

function fieldValues(fields: StructuredField[], ...keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  return fields
    .filter((field) => wanted.has(field.key.trim().toLowerCase()))
    .map((field) => field.value.trim())
    .filter(Boolean);
}

function fieldValue(fields: StructuredField[], ...keys: string[]) {
  return fieldValues(fields, ...keys)[0] ?? "";
}

function parseSpanEnd(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /^(present|current|now)$/i.test(trimmed)) return null;
  return parseIsoDate(trimmed);
}

export function parseOperatorSpan(value: string): OperatorSpan | null {
  const parts = value.split("|").map((part) => part.trim());
  if (!parts[0]) return null;
  return {
    operator: parts[0],
    slug: airframeSlug(parts[0]),
    from: parts[1] ? parseIsoDate(parts[1]) : null,
    to: parts[2] ? parseSpanEnd(parts[2]) : null,
  };
}

export function parseRegistrationSpan(value: string): RegistrationSpan | null {
  const parts = value.split("|").map((part) => part.trim());
  if (!parts[0]) return null;
  return {
    registration: parts[0].toUpperCase(),
    slug: airframeSlug(parts[0]),
    from: parts[1] ? parseIsoDate(parts[1]) : null,
    to: parts[2] ? parseSpanEnd(parts[2]) : null,
  };
}

export function formatOperatorSpan(span: OperatorSpan) {
  return `${span.operator} | ${span.from ?? ""} | ${span.to ?? "present"}`;
}

export function formatRegistrationSpan(span: RegistrationSpan) {
  return `${span.registration} | ${span.from ?? ""} | ${span.to ?? "present"}`;
}

export function ageYearsAt(
  deliveryDate: string | null,
  manufactureYear: number | null,
  asOf = new Date(),
) {
  const start = deliveryDate
    ? Date.parse(`${deliveryDate}T00:00:00Z`)
    : manufactureYear
      ? Date.parse(`${manufactureYear}-01-01T00:00:00Z`)
      : Number.NaN;
  if (!Number.isFinite(start)) return null;
  const years = (asOf.getTime() - start) / (365.25 * 24 * 60 * 60 * 1000);
  if (years < 0) return null;
  return Math.round(years * 10) / 10;
}

export function averageAge(values: Array<number | null>) {
  const known = values.filter((value): value is number => value !== null);
  if (!known.length) return null;
  return Math.round((known.reduce((sum, value) => sum + value, 0) / known.length) * 10) / 10;
}

export function airframeRecordFromFields(input: {
  articleId: string;
  title: string;
  slug: string;
  fields: StructuredField[];
  asOf?: Date;
}): AirframeRecord {
  const fields = input.fields;
  const registration = (
    fieldValue(fields, "Registration", "UK registration", "Current registration") || input.title
  ).toUpperCase();
  const msn =
    fieldValue(
      fields,
      "Manufacturer serial number",
      "MSN",
      "Serial number",
      "CAA serial number",
      "Production number",
    ) || null;
  const aircraftType = fieldValue(fields, "Aircraft type", "Type") || "Unknown type";
  const variant = fieldValue(fields, "Variant");
  const status = parseAirframeStatus(fieldValue(fields, "Status")) ?? "active";
  const deliveryDate = parseIsoDate(fieldValue(fields, "Delivery date"));
  const yearText = fieldValue(fields, "Year of manufacture", "Year manufactured");
  const manufactureYear = /^(19|20)\d{2}$/.test(yearText) ? Number(yearText) : null;
  const fateValue = fieldValue(fields, "Fate");
  const fate = fateValue && !/^not recorded$/i.test(fateValue) ? fateValue : null;
  const currentOperatorName = fieldValue(fields, "Current operator", "Operator") || null;
  const operatorHistory = fieldValues(fields, "Operator history")
    .map(parseOperatorSpan)
    .filter((span): span is OperatorSpan => !!span);
  const registrationHistory = fieldValues(fields, "Registration history")
    .map(parseRegistrationSpan)
    .filter((span): span is RegistrationSpan => !!span);
  const slug = airframeSlug(input.slug || registration);
  if (!registrationHistory.some((span) => span.slug === slug)) {
    registrationHistory.unshift({
      registration,
      slug,
      from: deliveryDate,
      to: null,
    });
  }
  return {
    articleId: input.articleId,
    title: input.title || registration,
    registration,
    slug,
    href: `/airframes/${slug}`,
    msn,
    aircraftType,
    variant,
    status,
    deliveryDate,
    manufactureYear,
    ageYears: status === "on_order" ? null : ageYearsAt(deliveryDate, manufactureYear, input.asOf),
    fate,
    currentOperatorName,
    currentOperatorSlug: currentOperatorName ? airframeSlug(currentOperatorName) : null,
    typeSlug: airframeSlug(aircraftType),
    operatorHistory,
    registrationHistory,
  };
}

function groupByType(records: AirframeRecord[], typeHrefs: Map<string, string>): FleetTypeGroup[] {
  const groups = new Map<string, AirframeRecord[]>();
  for (const record of records) {
    const key = record.variant
      ? `${record.aircraftType} ${record.variant}`.trim()
      : record.aircraftType;
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return [...groups.entries()]
    .map(([type, tails]) => {
      const sorted = tails.toSorted((first, second) =>
        first.registration.localeCompare(second.registration),
      );
      const typeSlug = sorted[0]?.typeSlug ?? null;
      return {
        type,
        typeSlug,
        typeHref: typeSlug ? (typeHrefs.get(typeSlug) ?? null) : null,
        count: sorted.length,
        averageAgeYears: averageAge(sorted.map((tail) => tail.ageYears)),
        tails: sorted,
      };
    })
    .toSorted((first, second) => second.count - first.count || first.type.localeCompare(second.type));
}

export function recordInvolvesOperator(record: AirframeRecord, operatorSlug: string) {
  return (
    record.currentOperatorSlug === operatorSlug ||
    record.operatorHistory.some((span) => span.slug === operatorSlug)
  );
}

export function buildOperatorFleet(
  records: AirframeRecord[],
  operator: { slug: string; name: string; href?: string | null; aliases?: string[] },
  typeHrefs: Map<string, string> = new Map(),
): OperatorFleetSummary {
  const aliases = [...new Set(operator.aliases ?? [operator.slug])];
  const related = records.filter((record) => aliases.some((alias) => recordInvolvesOperator(record, alias)));
  const current = related.filter(
    (record) =>
      record.status !== "scrapped" &&
      !!record.currentOperatorSlug &&
      aliases.includes(record.currentOperatorSlug),
  );
  const inService = current.filter((record) => record.status === "active");
  const stored = current.filter((record) => record.status === "stored");
  const onOrder = current.filter((record) => record.status === "on_order");
  const historical = related.filter((record) => !current.includes(record));
  return {
    operatorName: operator.name,
    operatorSlug: operator.slug,
    operatorHref: operator.href ?? null,
    inService: groupByType(inService, typeHrefs),
    stored: groupByType(stored, typeHrefs),
    onOrder: groupByType(onOrder, typeHrefs),
    historical: groupByType(historical, typeHrefs),
    inServiceCount: inService.length,
    storedCount: stored.length,
    onOrderCount: onOrder.length,
    historicalCount: historical.length,
    averageAgeYears: averageAge(inService.map((tail) => tail.ageYears)),
  };
}

export function fleetHasTails(summary: OperatorFleetSummary) {
  return (
    summary.inServiceCount + summary.storedCount + summary.onOrderCount + summary.historicalCount > 0
  );
}

export function buildOperatorFleets(
  records: AirframeRecord[],
  operators: Array<{ slug: string; name: string; href?: string | null }> = [],
  typeHrefs: Map<string, string> = new Map(),
) {
  const known = new Map(operators.map((operator) => [operator.slug, operator]));
  for (const record of records) {
    if (record.currentOperatorSlug && record.currentOperatorName && !known.has(record.currentOperatorSlug)) {
      known.set(record.currentOperatorSlug, {
        slug: record.currentOperatorSlug,
        name: record.currentOperatorName,
        href: `/commercial/${record.currentOperatorSlug}`,
      });
    }
    for (const span of record.operatorHistory) {
      if (!known.has(span.slug)) {
        known.set(span.slug, { slug: span.slug, name: span.operator, href: `/commercial/${span.slug}` });
      }
    }
  }
  return [...known.values()]
    .map((operator) => buildOperatorFleet(records, operator, typeHrefs))
    .filter(fleetHasTails)
    .toSorted(
      (first, second) =>
        second.inServiceCount - first.inServiceCount || first.operatorName.localeCompare(second.operatorName),
    );
}

export function isStrictRegistrationSlug(slug: string) {
  const value = slug.toLowerCase();
  return /^g-[a-z]{4}$/.test(value) || /^n[1-9]\d{0,4}[a-z]{0,2}$/.test(value);
}

export function hasSerialField(fields: StructuredField[]) {
  return fields.some(
    (field) => /serial|msn|production number/i.test(field.key) && field.value.trim().length > 0,
  );
}

export type AirframeMigrationDecision = "migrate" | "review" | "skip";

export function airframeMigrationDecision(input: {
  slug: string;
  contentType: string;
  fields: StructuredField[];
}): AirframeMigrationDecision {
  if (input.contentType !== "aircraft") return "skip";
  if ((legacyAircraftAirframeSlugs as readonly string[]).includes(input.slug)) return "migrate";
  if (isStrictRegistrationSlug(input.slug) && hasSerialField(input.fields)) return "migrate";
  if (isStrictRegistrationSlug(input.slug)) return "review";
  return "skip";
}

export function recordsForType(
  records: AirframeRecord[],
  article: { slug: string; title: string },
) {
  const slug = airframeSlug(article.slug);
  const titleSlug = airframeSlug(article.title);
  return records
    .filter((record) => record.typeSlug === slug || record.typeSlug === titleSlug)
    .toSorted((first, second) => first.registration.localeCompare(second.registration));
}
