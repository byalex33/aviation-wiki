import { SPOTTING_GUIDE_MIGRATION_ID, spottingGuideContentTypeSql } from "../src/lib/spotting-guide-schema";

async function main() {
  const statement = spottingGuideContentTypeSql();
  const apply = process.argv.includes("--apply");
  if (!apply) {
    console.log(`Migration ${SPOTTING_GUIDE_MIGRATION_ID} is ready. It allows spotting_guide articles and revisions. No database connection was opened.`);
    console.log(statement);
    console.log("Re-run with --apply to modify the configured PostgreSQL database. Run it before deploying this application. It does not insert spotting guides.");
    return;
  }

  const { sql } = await import("../src/lib/postgres");
  try {
    await sql.begin(async (transaction) => {
      await transaction.unsafe(statement);
    });
    console.log(`Applied spotting guide migration ${SPOTTING_GUIDE_MIGRATION_ID}.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
