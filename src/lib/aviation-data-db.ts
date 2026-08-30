import "server-only";

import {
  AVIATION_DATA_MIGRATION_ID,
  AVIATION_DATA_SCHEMA_SQL,
} from "@/lib/aviation-data-schema";
import { sql } from "@/lib/postgres";

export async function migrateAviationDataSchema() {
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(1337, 20260830)`;
    await transaction.unsafe(AVIATION_DATA_SCHEMA_SQL);
    await transaction`
      INSERT INTO aviation_data_migrations (id, applied_at)
      VALUES (${AVIATION_DATA_MIGRATION_ID}, NOW())
      ON CONFLICT (id) DO NOTHING
    `;
  });
}

