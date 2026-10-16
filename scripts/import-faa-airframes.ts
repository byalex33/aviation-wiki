import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { FAA_SOURCE } from "../src/lib/airframe-content";
import { upsertImportedAirframe } from "../src/lib/airframe-db";
import { FAA_REGISTRY_DOWNLOAD, FAA_REGISTRY_LICENCE, FAA_REGISTRY_PAGE, parseFaaRegistry, type FaaAirframeRow } from "../src/lib/faa-registry";
import { sql } from "../src/lib/postgres";

function databaseHost() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. This importer never runs during the Vercel build.");
  return new URL(url).host;
}

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readZipOrDirectory(path: string, fileName: string) {
  if (path.toLowerCase().endsWith(".zip")) {
    try {
      return execFileSync("unzip", ["-p", path, fileName], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
    } catch {
      return "";
    }
  }
  try {
    return readFileSync(join(path, fileName), "utf8");
  } catch {
    return "";
  }
}

async function sourcePath() {
  const file = argument("--file");
  if (file) return file;
  if (!process.argv.includes("--download")) {
    throw new Error("Pass --file <ReleasableAircraft.zip or directory> or --download. The download is about 60MB and is never fetched by the build.");
  }
  const destination = join("/tmp", "aviation-wiki-faa");
  mkdirSync(destination, { recursive: true });
  const zipPath = join(destination, "ReleasableAircraft.zip");
  const response = await fetch(FAA_REGISTRY_DOWNLOAD);
  if (!response.ok) throw new Error(`FAA download failed: ${response.status}`);
  writeFileSync(zipPath, Buffer.from(await response.arrayBuffer()));
  return zipPath;
}

function toSeed(row: FaaAirframeRow, accessedAt: string) {
  const aircraftType = [row.manufacturer, row.model].filter(Boolean).join(" ") || row.typeAircraft || "Unknown type";
  return {
    registration: row.registration,
    msn: row.msn,
    aircraftType,
    variant: row.model ?? "",
    status: row.status,
    manufactureYear: row.year,
    fate: row.fate,
    notes: [
      `${row.registration} is an individual aircraft from the FAA Releasable Aircraft Database${row.manufacturer ? `, a ${aircraftType}` : ""}.`,
      row.year ? `The file records ${row.year} as the year of manufacture.` : "",
      row.airworthinessDate ? `The FAA airworthiness date is ${row.airworthinessDate}. That is not treated as an airline delivery date.` : "",
      "Registrant names and addresses from the download are intentionally omitted.",
    ].filter(Boolean).join(" "),
    sources: [{ ...FAA_SOURCE, accessedAt }],
  };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const limit = Number(argument("--limit") ?? "0");
  const only = new Set((argument("--n-numbers") ?? "").split(",").map((value) => value.trim().toUpperCase()).filter(Boolean));
  console.log(`FAA registry import`);
  if (apply) console.log(`Database host: ${databaseHost()}`);
  console.log(FAA_REGISTRY_LICENCE);
  console.log(`Terms and layout: ${FAA_REGISTRY_PAGE}`);
  const path = await sourcePath();
  const parsed = parseFaaRegistry({
    master: readZipOrDirectory(path, "MASTER.txt"),
    acftref: readZipOrDirectory(path, "ACFTREF.txt"),
    dereg: readZipOrDirectory(path, "DEREG.txt"),
  });
  if (!parsed.summary.masterRows) throw new Error(`No MASTER.txt rows found in ${path}.`);
  let rows = parsed.airframes;
  if (only.size) rows = rows.filter((row) => only.has(row.registration));
  if (limit > 0) rows = rows.slice(0, limit);
  console.log(JSON.stringify({ ...parsed.summary, selected: rows.length, apply }, null, 2));
  if (!apply) {
    console.log("Dry run only. Re-run with --apply to write airframe articles. Identical re-imports are no-ops, and articles edited by contributors are left unchanged.");
    console.log("Sample:", rows.slice(0, 5).map((row) => `${row.registration} ${row.msn} ${row.status}`).join(", ") || "(none)");
    return;
  }
  const accessedAt = new Date().toISOString().slice(0, 10);
  const counts = { inserted: 0, updated: 0, unchanged: 0, kept: 0 };
  for (const row of rows) {
    const result = await upsertImportedAirframe({
      provider: "faa-registry",
      sourceIdentifier: row.registration,
      contributorId: "faa-registry",
      contributorName: "FAA registry import",
      seed: toSeed(row, accessedAt),
      editSummary: `FAA registry snapshot ${accessedAt}`,
    });
    counts[result] += 1;
    if ((counts.inserted + counts.updated + counts.unchanged + counts.kept) % 500 === 0) console.log(counts);
  }
  console.log(counts);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 5 }));
