import { sql } from "../src/lib/postgres";
import { PRO_SCHEMA_SQL } from "../src/lib/pro-schema";

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log("Creates saved collections, collection articles, and per-article watch alerts. Re-run with --apply against the intended PostgreSQL database.");
    return;
  }
  await sql.begin(async transaction => {
    await transaction`SELECT pg_advisory_xact_lock(1337, 20260928)`;
    await transaction.unsafe(PRO_SCHEMA_SQL);
  });
  console.log("Pro schema is ready.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.end());
