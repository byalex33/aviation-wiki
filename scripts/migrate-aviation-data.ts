import { sql } from "../src/lib/postgres";
import { migrateAviationDataSchema } from "../src/lib/aviation-data-db";
import { AVIATION_DATA_MIGRATION_ID } from "../src/lib/aviation-data-schema";

async function main() {
  const apply = process.argv.includes("--apply");

  if (!apply) {
    console.log(
      `Migration ${AVIATION_DATA_MIGRATION_ID} is ready. Re-run with --apply to modify the configured PostgreSQL database.`,
    );
    return;
  }

  await migrateAviationDataSchema();
  console.log(`Applied aviation data migration ${AVIATION_DATA_MIGRATION_ID}.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
