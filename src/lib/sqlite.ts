import "server-only";

import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

declare global {
  var aviationWikiSqlite:
    | {
        path: string;
        database: Database.Database;
      }
    | undefined;
}

export function getSqliteDatabasePath() {
  if (process.env.AVIATION_WIKI_DB_PATH) {
    return process.env.AVIATION_WIKI_DB_PATH;
  }

  // Vercel functions can only write to /tmp. This fallback keeps legacy
  // SQLite-backed routes available while they are migrated to Postgres.
  if (process.env.VERCEL) {
    return path.join(tmpdir(), "aviation-wiki.db");
  }

  return path.join(process.cwd(), ".data", "aviation-wiki.db");
}

const databasePath = getSqliteDatabasePath();
const existing = globalThis.aviationWikiSqlite;

if (existing && existing.path !== databasePath) {
  throw new Error(
    "AVIATION_WIKI_DB_PATH changed after the SQLite database was opened.",
  );
}

function openDatabase() {
  mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath, { timeout: 5_000 });
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  return { path: databasePath, database };
}

const sqlite = existing ?? openDatabase();
globalThis.aviationWikiSqlite = sqlite;

export const db = sqlite.database;
