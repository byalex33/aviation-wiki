import type { AirframeStatus } from "@/lib/airframe-record";
import { airframeSlug, parseIsoDate } from "@/lib/airframe-record";

/**
 * FAA Releasable Aircraft Database.
 *
 * The download is a work of the United States government. It is not subject to
 * copyright under 17 U.S.C. § 105. The FAA still limits what the file means:
 * it is a daily snapshot, not a live register, and "permissible" fields may be
 * blank. Column order follows the 8 May 2025 layout in the FAA's
 * ReleasableAircraft documentation (comma-delimited, no header).
 *
 * Registrant names, streets, cities, states, and postal codes are personal
 * data. This parser never copies those columns into the returned records.
 */

export const FAA_REGISTRY_PAGE =
  "https://www.faa.gov/licenses_certificates/aircraft_certification/aircraft_registry/releasable_aircraft_download";
export const FAA_REGISTRY_DOWNLOAD = "https://registry.faa.gov/database/ReleasableAircraft.zip";
export const FAA_REGISTRY_LICENCE =
  "US government work, public domain under 17 U.S.C. § 105. No licence fee and no attribution requirement. Republish the snapshot date with the data.";

const RESERVED_STATUS = new Set(["Z", "2", "3", "4", "5", "10", "11", "12"]);
const ACTIVE_STATUS = new Set(["V", "T", "M", "A", "S", "N", "R", "1", "7", "8", "14", "15", "24", "25", "26", "28"]);
const STORED_STATUS = new Set(["D", "E", "W", "X", "6", "9", "13", "16", "17", "18", "19", "20", "21", "22", "23", "27", "29"]);

const TYPE_AIRCRAFT: Record<string, string> = {
  "1": "Glider",
  "2": "Balloon",
  "3": "Blimp/Dirigible",
  "4": "Fixed wing single engine",
  "5": "Fixed wing multi engine",
  "6": "Rotorcraft",
  "7": "Weight-shift-control",
  "8": "Powered parachute",
  "9": "Gyroplane",
  H: "Hybrid lift",
  O: "Other",
};

export type FaaReference = {
  code: string;
  manufacturer: string;
  model: string;
  typeAircraft: string;
};

export type FaaAirframeRow = {
  registration: string;
  slug: string;
  msn: string;
  manufacturerModelCode: string;
  manufacturer: string | null;
  model: string | null;
  year: number | null;
  statusCode: string;
  status: AirframeStatus;
  fate: string | null;
  airworthinessDate: string | null;
  certificateIssueDate: string | null;
  typeAircraft: string | null;
  sourceFile: "MASTER" | "DEREG";
};

export type FaaParseSummary = {
  masterRows: number;
  deregRows: number;
  airframes: number;
  skippedReserved: number;
  skippedUnrecognized: number;
  skippedInvalid: number;
};

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += character;
      continue;
    }
    if (character === '"') {
      quoted = true;
      continue;
    }
    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (character === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (character !== "\r") field += character;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((columns) => columns.some((column) => column.trim()));
}

function column(row: string[], index: number) {
  return (row[index] ?? "").trim();
}

export function normalizeNNumber(value: string) {
  const compact = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!compact || compact.length > 6) return null;
  const withPrefix = compact.startsWith("N") ? compact : `N${compact}`;
  if (!/^N[1-9][0-9]{0,4}[A-Z]{0,2}$/.test(withPrefix)) return null;
  return withPrefix;
}

export function faaStatus(code: string): AirframeStatus | "reserved" | "unknown" {
  const normalized = code.trim().toUpperCase();
  if (RESERVED_STATUS.has(normalized)) return "reserved";
  if (ACTIVE_STATUS.has(normalized)) return "active";
  if (STORED_STATUS.has(normalized)) return "stored";
  return "unknown";
}

function yearOf(value: string) {
  return /^(19|20)\d{2}$/.test(value) ? Number(value) : null;
}

function referenceMap(acftref: string) {
  const map = new Map<string, FaaReference>();
  for (const row of parseCsv(acftref)) {
    const code = column(row, 0).toUpperCase();
    const manufacturer = column(row, 1);
    const model = column(row, 2);
    if (!code || !manufacturer) continue;
    map.set(code, {
      code,
      manufacturer,
      model,
      typeAircraft: TYPE_AIRCRAFT[column(row, 3).toUpperCase()] ?? "",
    });
  }
  return map;
}

function fromMaster(row: string[], references: Map<string, FaaReference>): FaaAirframeRow | "reserved" | "unknown" | "invalid" {
  const registration = normalizeNNumber(column(row, 0));
  const msn = column(row, 1);
  const status = faaStatus(column(row, 20));
  if (!registration || !msn) return "invalid";
  if (status === "reserved") return "reserved";
  if (status === "unknown") return "unknown";
  const code = column(row, 2).toUpperCase();
  const reference = references.get(code);
  return {
    registration,
    slug: airframeSlug(registration),
    msn,
    manufacturerModelCode: code,
    manufacturer: reference?.manufacturer ?? null,
    model: reference?.model ?? null,
    year: yearOf(column(row, 4)),
    statusCode: column(row, 20).toUpperCase(),
    status,
    fate: status === "stored" ? "FAA registration expired, canceled, or revoked. The file does not record whether the aircraft was stored or scrapped." : null,
    airworthinessDate: parseIsoDate(column(row, 23)),
    certificateIssueDate: parseIsoDate(column(row, 16)),
    typeAircraft: TYPE_AIRCRAFT[column(row, 18).toUpperCase()] ?? reference?.typeAircraft ?? null,
    sourceFile: "MASTER",
  };
}

function fromDereg(row: string[], references: Map<string, FaaReference>): FaaAirframeRow | "reserved" | "unknown" | "invalid" {
  const registration = normalizeNNumber(column(row, 0));
  const msn = column(row, 1);
  const status = faaStatus(column(row, 3));
  if (!registration || !msn) return "invalid";
  if (status === "reserved") return "reserved";
  if (status === "unknown") return "unknown";
  const code = column(row, 2).toUpperCase();
  const reference = references.get(code);
  const exportCountry = column(row, 20);
  const cancelDate = parseIsoDate(column(row, 17));
  const fate = exportCountry
    ? `Deregistered by the FAA${cancelDate ? ` on ${cancelDate}` : ""} and recorded as exported to ${exportCountry}.`
    : `Deregistered by the FAA${cancelDate ? ` on ${cancelDate}` : ""}. The file does not record whether the aircraft was stored or scrapped.`;
  return {
    registration,
    slug: airframeSlug(registration),
    msn,
    manufacturerModelCode: code,
    manufacturer: reference?.manufacturer ?? null,
    model: reference?.model ?? null,
    year: yearOf(column(row, 11)),
    statusCode: column(row, 3).toUpperCase(),
    status: "stored",
    fate,
    airworthinessDate: parseIsoDate(column(row, 16)),
    certificateIssueDate: parseIsoDate(column(row, 22)),
    typeAircraft: reference?.typeAircraft || null,
    sourceFile: "DEREG",
  };
}

export function parseFaaRegistry(input: { master: string; acftref?: string; dereg?: string }) {
  const references = referenceMap(input.acftref ?? "");
  const summary: FaaParseSummary = {
    masterRows: 0,
    deregRows: 0,
    airframes: 0,
    skippedReserved: 0,
    skippedUnrecognized: 0,
    skippedInvalid: 0,
  };
  const airframes: FaaAirframeRow[] = [];
  const seen = new Set<string>();
  const count = (result: FaaAirframeRow | "reserved" | "unknown" | "invalid") => {
    if (result === "reserved") summary.skippedReserved += 1;
    else if (result === "unknown") summary.skippedUnrecognized += 1;
    else if (result === "invalid") summary.skippedInvalid += 1;
    else if (!seen.has(result.registration)) {
      seen.add(result.registration);
      airframes.push(result);
    }
  };
  for (const row of parseCsv(input.master)) {
    summary.masterRows += 1;
    count(fromMaster(row, references));
  }
  for (const row of parseCsv(input.dereg ?? "")) {
    summary.deregRows += 1;
    count(fromDereg(row, references));
  }
  summary.airframes = airframes.length;
  return { airframes, summary };
}
