import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// The core schema and versioned migrations must exist before admin extensions.
import "@/lib/wiki-db";
import type { ContentType, SourceLink } from "@/lib/wiki-types";
import type { ImportPreview } from "@/lib/import-types";

const databasePath =
  process.env.AVIATION_WIKI_DB_PATH ||
  path.join(process.cwd(), ".data", "aviation-wiki.db");
mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath, { timeout: 5_000 });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS contributor_profiles (
    user_id TEXT PRIMARY KEY,
    moderator_notes TEXT NOT NULL DEFAULT '',
    restriction TEXT NOT NULL DEFAULT 'none',
    trusted INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS revision_private_notes (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES revisions(id),
    moderator_id TEXT NOT NULL,
    moderator_name TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS source_checks (
    url TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    strength TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    checked_by TEXT NOT NULL,
    checked_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS admin_audit_log (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    article_id TEXT,
    revision_id TEXT,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS admin_audit_created_idx ON admin_audit_log(created_at DESC);
  CREATE INDEX IF NOT EXISTS admin_audit_revision_idx ON admin_audit_log(revision_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS private_notes_revision_idx ON revision_private_notes(revision_id, created_at DESC);
`);

export type AdminTotals = {
  articles: number;
  published: number;
  archived: number;
  pending: number;
  contributors: number;
  sources: number;
  protectedPages: number;
  auditEvents: number;
};
export type QueueFilters = {
  status?: string;
  contentType?: string;
  contributor?: string;
  submittedFrom?: string;
  verification?: string;
  conflicting?: boolean;
};

export function getAdminTotals(): AdminTotals {
  const scalar = (sql: string) =>
    Number((db.prepare(sql).get() as { count: number }).count);
  return {
    articles: scalar("SELECT COUNT(*) count FROM articles"),
    published: scalar(
      "SELECT COUNT(*) count FROM articles WHERE live_revision_id IS NOT NULL AND archived_at IS NULL",
    ),
    archived: scalar(
      "SELECT COUNT(*) count FROM articles WHERE archived_at IS NOT NULL",
    ),
    pending: scalar(
      "SELECT COUNT(*) count FROM revisions WHERE status IN ('verifying','pending_review')",
    ),
    contributors: scalar(
      "SELECT COUNT(DISTINCT contributor_id) count FROM revisions WHERE contributor_id != 'system'",
    ),
    sources: scalar(
      "SELECT COUNT(DISTINCT json_extract(value, '$.url')) count FROM revisions, json_each(revisions.sources_json) WHERE json_extract(value, '$.url') IS NOT NULL",
    ),
    protectedPages: scalar(
      "SELECT COUNT(*) count FROM articles WHERE protection_level != 'open' OR is_locked = 1",
    ),
    auditEvents: scalar("SELECT COUNT(*) count FROM admin_audit_log"),
  };
}

export function listAdminQueue(filters: QueueFilters = {}) {
  const conditions = [
    "r.status IN ('verifying','pending_review','changes_requested','rejected','approved')",
  ];
  const values: unknown[] = [];
  if (filters.status && filters.status !== "all") {
    conditions.push("r.status = ?");
    values.push(filters.status);
  }
  if (filters.contentType && filters.contentType !== "all") {
    conditions.push("r.content_type = ?");
    values.push(filters.contentType);
  }
  if (filters.contributor) {
    conditions.push("(r.contributor_name LIKE ? OR r.contributor_id LIKE ?)");
    values.push(`%${filters.contributor}%`, `%${filters.contributor}%`);
  }
  if (filters.submittedFrom) {
    conditions.push("r.submitted_at >= ?");
    values.push(`${filters.submittedFrom}T00:00:00.000Z`);
  }
  if (filters.verification && filters.verification !== "all") {
    if (filters.verification === "missing")
      conditions.push("r.verification_json IS NULL");
    else {
      conditions.push("json_extract(r.verification_json, '$.status') = ?");
      values.push(filters.verification);
    }
  }
  if (filters.conflicting)
    conditions.push(
      "(SELECT COUNT(*) FROM revisions other WHERE other.article_id = r.article_id AND other.status IN ('verifying','pending_review')) > 1",
    );
  return db
    .prepare(
      `SELECT r.*, a.slug article_slug, a.live_revision_id,
    (SELECT COUNT(*) FROM revisions other WHERE other.article_id = r.article_id AND other.status IN ('verifying','pending_review')) conflict_count
    FROM revisions r JOIN articles a ON a.id = r.article_id WHERE ${conditions.join(" AND ")} ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC LIMIT 250`,
    )
    .all(...values) as Array<Record<string, unknown>>;
}

export function listAdminArticles(search = "") {
  const query = `%${search}%`;
  return db
    .prepare(
      `SELECT a.*, r.status live_status, r.verification_json,
    (SELECT COUNT(*) FROM revisions x WHERE x.article_id=a.id) revision_count,
    (SELECT COUNT(*) FROM revisions x WHERE x.article_id=a.id AND x.status IN ('verifying','pending_review')) pending_count
    FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id
    WHERE a.title LIKE ? OR a.slug LIKE ? ORDER BY a.updated_at DESC LIMIT 250`,
    )
    .all(query, query) as Array<Record<string, unknown>>;
}

export function findDuplicateArticles() {
  return db
    .prepare(
      `SELECT lower(trim(title)) normalized_title, COUNT(*) count, group_concat(slug, ', ') slugs FROM articles WHERE archived_at IS NULL GROUP BY lower(trim(title)) HAVING COUNT(*) > 1 ORDER BY count DESC`,
    )
    .all() as Array<{ normalized_title: string; count: number; slugs: string }>;
}

export function getContributorStats() {
  return db
    .prepare(
      `SELECT contributor_id,
    MAX(contributor_name) contributor_name,
    SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved_count,
    SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected_count,
    SUM(CASE WHEN status IN ('verifying','pending_review') THEN 1 ELSE 0 END) pending_count
    FROM revisions WHERE contributor_id != 'system' GROUP BY contributor_id`,
    )
    .all() as Array<Record<string, unknown>>;
}

export function getContributorProfiles() {
  return db.prepare("SELECT * FROM contributor_profiles").all() as Array<
    Record<string, unknown>
  >;
}

export function upsertContributorProfile(input: {
  userId: string;
  notes: string;
  restriction: string;
  trusted: boolean;
}) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO contributor_profiles (user_id, moderator_notes, restriction, trusted, updated_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET moderator_notes=excluded.moderator_notes, restriction=excluded.restriction, trusted=excluded.trusted, updated_at=excluded.updated_at`,
  ).run(
    input.userId,
    input.notes,
    input.restriction,
    input.trusted ? 1 : 0,
    now,
  );
}

export function getAdminRevision(id: string) {
  return db
    .prepare(
      `SELECT r.*, a.slug article_slug, a.live_revision_id, a.title article_title FROM revisions r JOIN articles a ON a.id=r.article_id WHERE r.id=?`,
    )
    .get(id) as Record<string, unknown> | undefined;
}

export function getLiveRevisionForArticle(articleId: string) {
  return db
    .prepare(
      "SELECT r.* FROM revisions r JOIN articles a ON a.live_revision_id=r.id WHERE a.id=?",
    )
    .get(articleId) as Record<string, unknown> | undefined;
}

export function assignRevision(revisionId: string, moderatorId: string | null) {
  db.prepare(
    "UPDATE revisions SET assigned_moderator_id=?, updated_at=? WHERE id=?",
  ).run(moderatorId, new Date().toISOString(), revisionId);
}

export function addPrivateRevisionNote(input: {
  revisionId: string;
  moderatorId: string;
  moderatorName: string;
  note: string;
}) {
  db.prepare(
    "INSERT INTO revision_private_notes (id,revision_id,moderator_id,moderator_name,note,created_at) VALUES (?,?,?,?,?,?)",
  ).run(
    randomUUID(),
    input.revisionId,
    input.moderatorId,
    input.moderatorName,
    input.note,
    new Date().toISOString(),
  );
}

export function listPrivateRevisionNotes(revisionId: string) {
  return db
    .prepare(
      "SELECT * FROM revision_private_notes WHERE revision_id=? ORDER BY created_at DESC",
    )
    .all(revisionId) as Array<Record<string, unknown>>;
}

export function updateArticleAdmin(input: {
  articleId: string;
  protectionLevel: string;
  locked: boolean;
  archived: boolean;
  redirectToSlug: string | null;
  slug?: string;
}) {
  const article = db
    .prepare("SELECT * FROM articles WHERE id=?")
    .get(input.articleId) as Record<string, unknown> | undefined;
  if (!article) throw new Error("Article not found.");
  const slug = input.slug || String(article.slug);
  const contentType = String(article.content_type) as ContentType;
  const now = new Date().toISOString();
  const update = db.transaction(() => {
    const current = db.prepare("SELECT updated_at FROM articles WHERE id=?").get(input.articleId) as { updated_at: string } | undefined;
    if (!current || current.updated_at !== article.updated_at) throw new Error("This article changed while you were editing it. Reload before saving controls.");
    const collision = db.prepare("SELECT id FROM articles WHERE content_type=? AND slug=? AND id!=?").get(contentType, slug, input.articleId) as { id: string } | undefined;
    if (collision) throw new Error("That slug is already used by another article of this type.");
    const aliasCollision = db.prepare("SELECT article_id FROM article_slug_redirects WHERE content_type=? AND old_slug=? AND article_id!=?").get(contentType, slug, input.articleId) as { article_id: string } | undefined;
    if (aliasCollision) throw new Error("That slug is reserved by another article redirect.");
    if (input.archived) {
      const incoming = db.prepare("SELECT COUNT(*) count FROM article_relationships WHERE target_article_id=?").get(input.articleId) as { count: number };
      if (incoming.count > 0) throw new Error("This entity is referenced by approved relationships. Remove those links through reviewed revisions before archiving it.");
    }
    if (input.redirectToSlug) {
      const target = db.prepare("SELECT id,redirect_to_slug FROM articles WHERE content_type=? AND slug=?").get(contentType, input.redirectToSlug) as { id: string; redirect_to_slug: string | null } | undefined;
      if (!target) throw new Error("The redirect target must be an existing article of the same type.");
      const visited = new Set([input.articleId]);
      let cursor: { id: string; redirect_to_slug: string | null } | undefined = target;
      while (cursor) {
        if (visited.has(cursor.id)) throw new Error("That redirect would create a loop.");
        visited.add(cursor.id);
        if (!cursor.redirect_to_slug) break;
        cursor = db.prepare("SELECT id,redirect_to_slug FROM articles WHERE content_type=? AND slug=?").get(contentType, cursor.redirect_to_slug) as typeof cursor;
      }
    }
    if (slug !== article.slug) {
      db.prepare("INSERT INTO article_slug_redirects (content_type,old_slug,article_id,created_at) VALUES (?,?,?,?) ON CONFLICT(content_type,old_slug) DO UPDATE SET article_id=excluded.article_id,created_at=excluded.created_at WHERE article_slug_redirects.article_id=excluded.article_id").run(article.content_type, article.slug, input.articleId, now);
    }
    db.prepare(
      "UPDATE articles SET slug=?, protection_level=?, is_locked=?, archived_at=?, redirect_to_slug=?, updated_at=? WHERE id=?",
    ).run(slug, input.protectionLevel, input.locked ? 1 : 0, input.archived ? now : null, input.redirectToSlug, now, input.articleId);
    if (slug !== article.slug) {
      db.prepare("UPDATE revisions SET proposed_slug=? WHERE article_id=? AND status IN ('draft','verifying','pending_review','changes_requested') AND proposed_slug=?").run(slug, input.articleId, article.slug);
    }
  });
  update.immediate();
}

export function listSourceReview() {
  const rows = db
    .prepare(
      `SELECT json_extract(j.value,'$.url') url, MAX(COALESCE(json_extract(j.value,'$.title'),json_extract(j.value,'$.label'))) label, COUNT(*) usage_count,
    sc.status, sc.strength, sc.note, sc.checked_at,
    CASE WHEN sc.checked_at IS NULL OR sc.checked_at < datetime('now','-180 days') THEN 1 ELSE 0 END stale
    FROM revisions r, json_each(r.sources_json) j LEFT JOIN source_checks sc ON sc.url=json_extract(j.value,'$.url')
    WHERE json_extract(j.value,'$.url') IS NOT NULL GROUP BY url ORDER BY usage_count DESC, url`,
    )
    .all() as Array<Record<string, unknown>>;
  const missing = db
    .prepare(
      "SELECT id,title,status FROM revisions WHERE json_array_length(sources_json)=0 ORDER BY updated_at DESC LIMIT 100",
    )
    .all() as Array<Record<string, unknown>>;
  return { sources: rows, missing };
}

export function getSourceHealth(sources: SourceLink[]) {
  const urls = [...new Set(sources.map((source) => source.url).filter(Boolean))];
  if (!urls.length) return { citedCount: 0, lastReviewedAt: null, broken: 0, stale: 0 };
  const placeholders = urls.map(() => "?").join(",");
  const rows = db.prepare(`SELECT url,status,checked_at FROM source_checks WHERE url IN (${placeholders})`).all(...urls) as Array<{ url: string; status: string; checked_at: string }>;
  const byUrl = new Map(rows.map((row) => [row.url, row]));
  const staleBefore = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const dates = rows.map((row) => Date.parse(row.checked_at)).filter(Number.isFinite);
  return {
    citedCount: urls.length,
    lastReviewedAt: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    broken: urls.filter((url) => byUrl.get(url)?.status === "broken").length,
    stale: urls.filter((url) => {
      const checked = byUrl.get(url)?.checked_at;
      return !checked || Date.parse(checked) < staleBefore;
    }).length,
  };
}

export function updateSourceCheck(input: {
  url: string;
  status: string;
  strength: string;
  note: string;
  checkedBy: string;
}) {
  db.prepare(
    `INSERT INTO source_checks (url,status,strength,note,checked_by,checked_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(url) DO UPDATE SET status=excluded.status,strength=excluded.strength,note=excluded.note,checked_by=excluded.checked_by,checked_at=excluded.checked_at`,
  ).run(
    input.url,
    input.status,
    input.strength,
    input.note,
    input.checkedBy,
    new Date().toISOString(),
  );
}

export function recordAdminAudit(input: {
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  articleId?: string | null;
  revisionId?: string | null;
  before?: unknown;
  after?: unknown;
}) {
  db.prepare(
    "INSERT INTO admin_audit_log (id,actor_id,actor_name,action,entity_type,entity_id,article_id,revision_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    randomUUID(),
    input.actorId,
    input.actorName,
    input.action,
    input.entityType,
    input.entityId,
    input.articleId ?? null,
    input.revisionId ?? null,
    input.before === undefined ? null : JSON.stringify(input.before),
    input.after === undefined ? null : JSON.stringify(input.after),
    new Date().toISOString(),
  );
}

export function listAuditLog() {
  return db
    .prepare("SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT 500")
    .all() as Array<Record<string, unknown>>;
}

export function getRevisionCountsByContributor() {
  return getContributorStats();
}
export function getAllRevisionHistory(articleId: string) {
  return db
    .prepare(
      "SELECT * FROM revisions WHERE article_id=? ORDER BY created_at DESC",
    )
    .all(articleId) as Array<Record<string, unknown>>;
}
export function getArticleAdminById(id: string) {
  return db.prepare("SELECT * FROM articles WHERE id=?").get(id) as
    | Record<string, unknown>
    | undefined;
}
export function getArticlePublicationControls(contentType: ContentType, slug: string) {
  return db
    .prepare(
      "SELECT id,archived_at,redirect_to_slug,protection_level,is_locked FROM articles WHERE content_type=? AND slug=?",
    )
    .get(contentType, slug) as
    | {
        id: string;
        archived_at: string | null;
        redirect_to_slug: string | null;
        protection_level: string;
        is_locked: number;
      }
    | undefined;
}

export function assertArticleEditable(
  articleId: string,
  role: import("@/lib/wiki-auth").WikiRole,
  restriction = "none",
) {
  const article = getArticleAdminById(articleId);
  if (!article) throw new Error("Article not found.");
  if (restriction === "suspended" || restriction === "read_only")
    throw new Error("This account is not allowed to submit edits.");
  if (article.archived_at)
    throw new Error("Archived articles cannot be edited.");
  if (article.is_locked && role !== "admin")
    throw new Error("This article is locked.");
  const ranks: Record<string, number> = {
    contributor: 0,
    trusted_contributor: 1,
    moderator: 2,
    admin: 3,
  };
  const required: Record<string, number> = {
    open: 0,
    trusted: 1,
    moderator: 2,
    admin: 3,
  };
  if ((ranks[role] ?? 0) < (required[String(article.protection_level)] ?? 0))
    throw new Error("Your role cannot edit this protected article.");
}

export function getContributorRestriction(userId: string) {
  const row = db
    .prepare("SELECT restriction FROM contributor_profiles WHERE user_id=?")
    .get(userId) as { restriction: string } | undefined;
  return row?.restriction ?? "none";
}

export function assessImportPreview(preview: ImportPreview) {
  const titleMatches = db.prepare(`SELECT a.id,a.title,a.slug,a.content_type,a.archived_at,a.redirect_to_slug,a.protection_level,a.is_locked,r.status
    FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id
    WHERE lower(a.title)=lower(?) OR lower(a.slug)=lower(?)
    ORDER BY a.updated_at DESC LIMIT 20`).all(preview.title, preview.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) as Array<Record<string, unknown>>;
  const aliasMatches = db.prepare(`SELECT a.id,a.title,a.slug,a.content_type,a.archived_at,x.old_slug FROM article_slug_redirects x JOIN articles a ON a.id=x.article_id WHERE lower(x.old_slug)=lower(?)`).all(preview.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) as Array<Record<string, unknown>>;
  const externalMapping = db.prepare(`SELECT x.article_id,a.title,a.slug,a.content_type,a.archived_at FROM article_external_identifiers x JOIN articles a ON a.id=x.article_id WHERE x.provider=? AND x.source_identifier=?`).get(preview.provider, preview.sourceId) as Record<string, unknown> | undefined;
  const identifierFields = preview.fields.filter((field) => /code|registration|callsign|designation|iso 3166/i.test(field.key));
  const identifierCollisions: Array<Record<string, unknown>> = [];
  for (const field of identifierFields) {
    identifierCollisions.push(...db.prepare(`SELECT DISTINCT a.id,a.title,a.slug,a.content_type,a.archived_at,? field_key,? field_value
      FROM revisions r JOIN articles a ON a.id=r.article_id,json_each(r.fields_json) f
      WHERE r.status NOT IN ('rejected') AND lower(json_extract(f.value,'$.key'))=lower(?) AND lower(json_extract(f.value,'$.value'))=lower(?)
      ORDER BY a.updated_at DESC LIMIT 20`).all(field.key, field.value, field.key, field.value) as Array<Record<string, unknown>>);
  }
  return { titleMatches, aliasMatches, externalMapping: externalMapping || null, identifierCollisions };
}

export function listImportHistory() {
  return db.prepare(`SELECT h.*,a.title article_title,a.slug article_slug,a.content_type,r.status revision_status
    FROM import_history h JOIN articles a ON a.id=h.article_id JOIN revisions r ON r.id=h.revision_id
    ORDER BY h.created_at DESC LIMIT 500`).all() as Array<Record<string, unknown>>;
}
