import path from "node:path";
import Database from "better-sqlite3";

const databasePath =
  process.argv[2] ||
  process.env.AVIATION_WIKI_DB_PATH ||
  path.join(process.cwd(), ".data", "aviation-wiki.db");
const db = new Database(databasePath, { readonly: true, fileMustExist: true });

function scalar(sql) {
  return Object.values(db.prepare(sql).get())[0];
}

const requiredTables = [
  "articles",
  "revisions",
  "revision_events",
  "article_slug_redirects",
  "article_relationships",
  "admin_audit_log",
  "schema_migrations",
  "article_external_identifiers",
  "import_history",
  "revision_import_field_sources",
  "revision_import_images",
  "notifications",
  "notification_preferences",
  "article_watches",
  "notification_email_deliveries",
];
const tables = new Set(
  db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all()
    .map((row) => row.name),
);
for (const table of requiredTables) {
  if (!tables.has(table)) throw new Error(`Missing required table: ${table}`);
}

const articleColumns = new Set(
  db
    .prepare("PRAGMA table_info(articles)")
    .all()
    .map((row) => row.name),
);
for (const column of [
  "protection_level",
  "is_locked",
  "archived_at",
  "redirect_to_slug",
]) {
  if (!articleColumns.has(column))
    throw new Error(`Missing articles.${column}`);
}
const revisionColumns = new Set(
  db
    .prepare("PRAGMA table_info(revisions)")
    .all()
    .map((row) => row.name),
);
for (const column of [
  "markdown",
  "proposed_slug",
  "assigned_moderator_id",
  "relationships_json",
]) {
  if (!revisionColumns.has(column))
    throw new Error(`Missing revisions.${column}`);
}

const articleSql = String(
  db
    .prepare(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'",
    )
    .get().sql,
).replaceAll(/\s+/g, "");
if (!articleSql.includes("UNIQUE(content_type,slug)"))
  throw new Error(
    "Articles do not enforce content-type-scoped slug uniqueness.",
  );

const checks = [
  ["foreign key violations", "SELECT COUNT(*) FROM pragma_foreign_key_check"],
  [
    "invalid article types",
    "SELECT COUNT(*) FROM articles WHERE content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')",
  ],
  [
    "invalid revision types",
    "SELECT COUNT(*) FROM revisions WHERE content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')",
  ],
  [
    "invalid revision statuses",
    "SELECT COUNT(*) FROM revisions WHERE status NOT IN ('draft','verifying','pending_review','changes_requested','approved','rejected')",
  ],
  [
    "non-approved live revisions",
    "SELECT COUNT(*) FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE r.status!='approved'",
  ],
  [
    "duplicate typed slugs",
    "SELECT COUNT(*) FROM (SELECT content_type,slug FROM articles GROUP BY content_type,slug HAVING COUNT(*)>1)",
  ],
  [
    "aliases shadowing another live article",
    "SELECT COUNT(*) FROM article_slug_redirects x JOIN articles a ON a.content_type=x.content_type AND a.slug=x.old_slug WHERE a.id!=x.article_id",
  ],
  [
    "orphaned relationships",
    "SELECT COUNT(*) FROM article_relationships ar LEFT JOIN articles s ON s.id=ar.source_article_id LEFT JOIN articles t ON t.id=ar.target_article_id LEFT JOIN revisions r ON r.id=ar.approved_revision_id WHERE s.id IS NULL OR t.id IS NULL OR r.id IS NULL",
  ],
  [
    "self relationships",
    "SELECT COUNT(*) FROM article_relationships WHERE source_article_id=target_article_id",
  ],
  [
    "relationships from non-live revisions",
    "SELECT COUNT(*) FROM article_relationships ar JOIN articles a ON a.id=ar.source_article_id WHERE a.live_revision_id!=ar.approved_revision_id",
  ],
  [
    "relationships to unapproved or archived entities",
    "SELECT COUNT(*) FROM article_relationships ar JOIN articles t ON t.id=ar.target_article_id LEFT JOIN revisions r ON r.id=t.live_revision_id WHERE r.status!='approved' OR t.archived_at IS NOT NULL",
  ],
  [
    "public articles backed by non-approved revisions",
    "SELECT COUNT(*) FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE a.archived_at IS NULL AND r.status!='approved'",
  ],
  [
    "orphaned external identifiers",
    "SELECT COUNT(*) FROM article_external_identifiers x LEFT JOIN articles a ON a.id=x.article_id WHERE a.id IS NULL",
  ],
  [
    "orphaned import history",
    "SELECT COUNT(*) FROM import_history h LEFT JOIN articles a ON a.id=h.article_id LEFT JOIN revisions r ON r.id=h.revision_id WHERE a.id IS NULL OR r.id IS NULL OR r.article_id!=h.article_id",
  ],
  [
    "imported images without reuse metadata",
    "SELECT COUNT(*) FROM revision_import_images WHERE creator='' OR license='' OR license_url='' OR attribution='' OR source_page='' OR retrieved_at=''",
  ],
  [
    "invalid relationship combinations",
    `SELECT COUNT(*) FROM article_relationships ar JOIN articles s ON s.id=ar.source_article_id JOIN articles t ON t.id=ar.target_article_id WHERE NOT (
    (ar.relationship_type='operates_aircraft' AND s.content_type='airline' AND t.content_type='aircraft') OR
    (ar.relationship_type='hub_at_airport' AND s.content_type='airline' AND t.content_type='airport') OR
    (ar.relationship_type='manufactured_by' AND s.content_type='aircraft' AND t.content_type='manufacturer') OR
    (ar.relationship_type='uses_engine' AND s.content_type='aircraft' AND t.content_type='engine') OR
    (ar.relationship_type='variant_of' AND s.content_type='aircraft' AND t.content_type='aircraft') OR
    (ar.relationship_type='produces_aircraft' AND s.content_type='manufacturer' AND t.content_type='aircraft') OR
    (ar.relationship_type='produces_engine' AND s.content_type='manufacturer' AND t.content_type='engine'))`,
  ],
  [
    "orphaned notifications",
    "SELECT COUNT(*) FROM notification_email_deliveries d LEFT JOIN notifications n ON n.id=d.notification_id WHERE n.id IS NULL",
  ],
  [
    "invalid notification email states",
    "SELECT COUNT(*) FROM notification_email_deliveries WHERE status NOT IN ('pending','sent','failed') OR retry_count<0",
  ],
  [
    "invalid notification preferences",
    "SELECT COUNT(*) FROM notification_preferences WHERE email_frequency NOT IN ('immediate','daily','in_app')",
  ],
];
for (const [label, sql] of checks) {
  const count = Number(scalar(sql));
  if (count) throw new Error(`${label}: ${count}`);
}

for (const row of db.prepare("SELECT id,sources_json FROM revisions").all()) {
  let sources;
  try {
    sources = JSON.parse(row.sources_json);
  } catch {
    throw new Error(`Revision ${row.id} has invalid sources JSON.`);
  }
  if (!Array.isArray(sources))
    throw new Error(`Revision ${row.id} sources must be an array.`);
  for (const source of sources) {
    for (const key of ["url", "archiveUrl"]) {
      if (!source?.[key]) continue;
      let parsed;
      try {
        parsed = new URL(source[key]);
      } catch {
        throw new Error(`Revision ${row.id} has an invalid ${key}.`);
      }
      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        parsed.username ||
        parsed.password
      )
        throw new Error(`Revision ${row.id} has an unsafe ${key}.`);
    }
  }
}

for (const row of db
  .prepare("SELECT id,relationships_json FROM revisions")
  .all()) {
  let relationships;
  try {
    relationships = JSON.parse(row.relationships_json);
  } catch {
    throw new Error(`Revision ${row.id} has invalid relationships JSON.`);
  }
  if (!Array.isArray(relationships))
    throw new Error(`Revision ${row.id} relationships must be an array.`);
  const keys = relationships.map(
    (relationship) => `${relationship?.type}:${relationship?.targetArticleId}`,
  );
  if (new Set(keys).size !== keys.length)
    throw new Error(`Revision ${row.id} contains duplicate relationships.`);
}

const integrity = String(scalar("PRAGMA integrity_check"));
if (integrity !== "ok")
  throw new Error(`SQLite integrity check failed: ${integrity}`);

console.log(`Database checks passed: ${databasePath}`);
