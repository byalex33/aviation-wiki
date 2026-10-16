import { britishAirwaysA350ImportPlan, summarizeAviationImportPlan } from "../src/lib/aviation-data-import";
import { importAviationData } from "../src/lib/aviation-data-import-db";
import { sql } from "../src/lib/postgres";

async function main() {
  const apply = process.argv.includes("--apply");
  const summary = summarizeAviationImportPlan(britishAirwaysA350ImportPlan);
  if (!apply) {
    console.log(JSON.stringify({ mode: "dry-run", ...summary }, null, 2));
    return;
  }
  const result = await importAviationData(britishAirwaysA350ImportPlan);
  console.log(JSON.stringify({ mode: "applied", ...result }, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());

