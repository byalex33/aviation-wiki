import { sql } from "../src/lib/postgres";
import { NOTIFICATION_DIGEST_SCHEMA_SQL } from "../src/lib/notification-digest-schema";

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log("Creates the additive notification_digest_batches, notification_digest_items, and notification_immediate_deliveries tables and indexes. Re-run with --apply against the intended PostgreSQL database.");
    return;
  }
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(1337, 20260910)`;
    await transaction.unsafe(NOTIFICATION_DIGEST_SCHEMA_SQL);
  });
  console.log("Notification digest schema is ready.");
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Digest migration failed.");
  process.exitCode = 1;
}).finally(() => sql.end());
