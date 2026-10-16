import { parseArticleMarkdown } from "@/lib/article-markdown";
import {
  airframeRecordFromFields,
  airframeSlug,
  airframeStatusLabel,
  type AirframeRecord,
  type AirframeStatus,
} from "@/lib/airframe-record";
import type { SourceLink, StructuredField } from "@/lib/wiki-types";

export type AirframeSeed = {
  registration: string;
  msn?: string | null;
  aircraftType: string;
  variant?: string;
  status: AirframeStatus;
  deliveryDate?: string | null;
  manufactureYear?: number | null;
  fate?: string | null;
  currentOperator?: string | null;
  operatorHistory?: string[];
  registrationHistory?: string[];
  notes?: string;
  sources?: SourceLink[];
};

export const FAA_SOURCE: SourceLink = {
  identifier: "faa",
  title: "Releasable Aircraft Database",
  publisher: "Federal Aviation Administration",
  url: "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download",
};

export function airframeSeedFields(seed: AirframeSeed): StructuredField[] {
  const fields: StructuredField[] = [
    { key: "Registration", value: seed.registration.toUpperCase() },
    { key: "Aircraft type", value: seed.aircraftType },
    { key: "Status", value: airframeStatusLabel(seed.status) },
  ];
  if (seed.msn) fields.push({ key: "Manufacturer serial number", value: seed.msn });
  if (seed.variant) fields.push({ key: "Variant", value: seed.variant });
  if (seed.deliveryDate) fields.push({ key: "Delivery date", value: seed.deliveryDate });
  if (seed.manufactureYear) fields.push({ key: "Year of manufacture", value: String(seed.manufactureYear) });
  if (seed.fate) fields.push({ key: "Fate", value: seed.fate });
  if (seed.currentOperator) fields.push({ key: "Current operator", value: seed.currentOperator });
  for (const span of seed.operatorHistory ?? []) fields.push({ key: "Operator history", value: span });
  for (const span of seed.registrationHistory ?? []) fields.push({ key: "Registration history", value: span });
  return fields;
}

function sidebarLine(key: string, value: string | null | undefined) {
  return value ? `${key}: ${value}` : "";
}

export function airframeSeedMarkdown(seed: AirframeSeed) {
  const registration = seed.registration.toUpperCase();
  const type = [seed.aircraftType, seed.variant].filter(Boolean).join(" ");
  const lead = seed.notes?.trim()
    || `${registration} is ${seed.status === "on_order" ? "on order as" : "an individual"} ${type}${seed.msn ? `, manufacturer serial number ${seed.msn}` : ""}.`;
  const sidebar = [
    sidebarLine("Registration", registration),
    sidebarLine("Manufacturer serial number", seed.msn),
    sidebarLine("Aircraft type", seed.aircraftType),
    sidebarLine("Variant", seed.variant),
    sidebarLine("Status", airframeStatusLabel(seed.status)),
    sidebarLine("Delivery date", seed.deliveryDate),
    sidebarLine("Year of manufacture", seed.manufactureYear ? String(seed.manufactureYear) : null),
    sidebarLine("Current operator", seed.currentOperator),
    sidebarLine("Fate", seed.fate),
  ].filter(Boolean);
  const history = (seed.operatorHistory ?? []).length
    ? `\n\n## Operator history\n\n${(seed.operatorHistory ?? []).map((span) => `- ${span.replaceAll("|", "·")}`).join("\n")}`
    : "";
  const registrations = (seed.registrationHistory ?? []).length
    ? `\n\n## Registration history\n\n${(seed.registrationHistory ?? []).map((span) => `- ${span.replaceAll("|", "·")}`).join("\n")}`
    : "";
  const sources = seed.sources ?? [];
  const citation = sources[0]?.identifier ? ` [^${sources[0].identifier}]` : "";
  const definitions = sources
    .filter((source) => source.identifier && source.url)
    .map((source) => `[^${source.identifier}]: ${source.url}`)
    .join("\n");
  return `<Sidebar>\n${sidebar.join("\n")}\n</Sidebar>\n\n${lead}${citation}${history}${registrations}\n\n${definitions}\n`;
}

export function airframeSeedRecord(seed: AirframeSeed, articleId = airframeSlug(seed.registration), asOf?: Date): AirframeRecord {
  return airframeRecordFromFields({
    articleId,
    title: seed.registration.toUpperCase(),
    slug: airframeSlug(seed.registration),
    fields: airframeSeedFields(seed),
    asOf,
  });
}

export function airframeFieldsFromRevision(fields: StructuredField[], markdown: string) {
  const parsed = parseArticleMarkdown(markdown);
  const sidebar = parsed.sidebarFields ?? [];
  const merged = [...fields];
  for (const field of sidebar) {
    if (!merged.some((item) => item.key.toLowerCase() === field.key.toLowerCase())) merged.push(field);
  }
  return merged;
}

export function assertAirframeMarkdown(markdown: string) {
  const parsed = parseArticleMarkdown(markdown);
  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((error) => error.message).join("; "));
  }
  return parsed;
}
