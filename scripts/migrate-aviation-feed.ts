import { sql } from "../src/lib/postgres";
import { AVIATION_FEED_SCHEMA_SQL } from "../src/lib/aviation-feed-data";

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log("Creates storage for This Day in Aviation RSS entries. Re-run with --apply against the intended PostgreSQL database.");
    return;
  }
  await sql.unsafe(AVIATION_FEED_SCHEMA_SQL);
  console.log("Aviation feed schema is ready.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.end());
