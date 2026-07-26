import "server-only";

import { randomUUID } from "node:crypto";

import { f15Article } from "@/lib/builtin-articles";
import { parseArticleMarkdown } from "@/lib/article-markdown";
import { validateRelationshipShape, relationshipKey } from "@/lib/relationship-rules";
import { UserFacingError } from "@/lib/user-facing-error";
import type { ArticleRecord, ArticleWithLiveRevision, ContentType, EntityOption, EntityRelationship, RevisionContent, RevisionRecord, RevisionStatus, VerificationResult } from "@/lib/wiki-types";
import type { SearchDocument, SearchTermKind } from "@/lib/search-types";
import { articlePath } from "@/lib/article-routes";
import type { ImportField, ImportImage, ImportProviderId } from "@/lib/import-types";
import type { PublicContributorActivity, PublicContribution } from "@/lib/public-profile-types";
import { db } from "@/lib/sqlite";
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    live_revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(content_type, slug)
  );
  CREATE TABLE IF NOT EXISTS revisions (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL REFERENCES articles(id),
    status TEXT NOT NULL,
    contributor_id TEXT NOT NULL,
    contributor_name TEXT NOT NULL,
    edit_summary TEXT NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL,
    fields_json TEXT NOT NULL,
    sections_json TEXT NOT NULL,
    sources_json TEXT NOT NULL,
    verification_json TEXT,
    moderator_id TEXT,
    moderator_note TEXT,
    parent_revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    submitted_at TEXT,
    reviewed_at TEXT
  );
  CREATE TABLE IF NOT EXISTS revision_events (
    id TEXT PRIMARY KEY,
    revision_id TEXT NOT NULL REFERENCES revisions(id),
    actor_id TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS revisions_article_idx ON revisions(article_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS revisions_status_idx ON revisions(status, updated_at DESC);
  CREATE INDEX IF NOT EXISTS revisions_contributor_idx ON revisions(contributor_id, updated_at DESC);
  CREATE TABLE IF NOT EXISTS article_slug_redirects (
    content_type TEXT NOT NULL,
    old_slug TEXT NOT NULL,
    article_id TEXT NOT NULL REFERENCES articles(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (content_type, old_slug)
  );
  CREATE TABLE IF NOT EXISTS article_relationships (
    source_article_id TEXT NOT NULL REFERENCES articles(id),
    target_article_id TEXT NOT NULL REFERENCES articles(id),
    relationship_type TEXT NOT NULL,
    approved_revision_id TEXT NOT NULL REFERENCES revisions(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (source_article_id, relationship_type, target_article_id),
    CHECK (source_article_id != target_article_id)
  );
  CREATE INDEX IF NOT EXISTS article_relationships_target_idx ON article_relationships(target_article_id, relationship_type);
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS article_external_identifiers (
    provider TEXT NOT NULL,
    source_identifier TEXT NOT NULL,
    article_id TEXT NOT NULL REFERENCES articles(id),
    created_at TEXT NOT NULL,
    PRIMARY KEY (provider, source_identifier)
  );
  CREATE INDEX IF NOT EXISTS article_external_identifiers_article_idx ON article_external_identifiers(article_id);
  CREATE TABLE IF NOT EXISTS import_history (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    source_identifiers_json TEXT NOT NULL,
    article_id TEXT NOT NULL REFERENCES articles(id),
    revision_id TEXT NOT NULL REFERENCES revisions(id),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS import_history_created_idx ON import_history(created_at DESC);
  CREATE TABLE IF NOT EXISTS revision_import_field_sources (
    revision_id TEXT NOT NULL REFERENCES revisions(id),
    field_key TEXT NOT NULL,
    field_value TEXT NOT NULL,
    provider TEXT NOT NULL,
    source_identifier TEXT NOT NULL,
    source_urls_json TEXT NOT NULL,
    PRIMARY KEY (revision_id, field_key)
  );
  CREATE TABLE IF NOT EXISTS revision_import_images (
    revision_id TEXT NOT NULL REFERENCES revisions(id),
    file_name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT NOT NULL,
    creator TEXT NOT NULL,
    license TEXT NOT NULL,
    license_url TEXT NOT NULL,
    attribution TEXT NOT NULL,
    source_page TEXT NOT NULL,
    retrieved_at TEXT NOT NULL,
    PRIMARY KEY (revision_id, source_page)
  );
`);

function tableColumns(table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
}

function ensureColumn(table: string, name: string, definition: string) {
  if (!tableColumns(table).some((column) => column.name === name)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
  }
}

ensureColumn("articles", "protection_level", "TEXT NOT NULL DEFAULT 'open'");
ensureColumn("articles", "is_locked", "INTEGER NOT NULL DEFAULT 0");
ensureColumn("articles", "archived_at", "TEXT");
ensureColumn("articles", "redirect_to_slug", "TEXT");
ensureColumn("revisions", "assigned_moderator_id", "TEXT");

const articlesSql = String((db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='articles'").get() as { sql: string }).sql);
if (!articlesSql.includes("UNIQUE(content_type, slug)")) {
  db.pragma("foreign_keys = OFF");
  db.exec(`
    BEGIN IMMEDIATE;
    CREATE TABLE articles_typed_slugs (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL,
      live_revision_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      protection_level TEXT NOT NULL DEFAULT 'open',
      is_locked INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      redirect_to_slug TEXT,
      UNIQUE(content_type, slug)
    );
    INSERT INTO articles_typed_slugs SELECT id,slug,title,content_type,live_revision_id,created_at,updated_at,protection_level,is_locked,archived_at,redirect_to_slug FROM articles;
    DROP TABLE articles;
    ALTER TABLE articles_typed_slugs RENAME TO articles;
    INSERT OR IGNORE INTO schema_migrations (id, applied_at) VALUES ('20260722_typed_article_slugs', datetime('now'));
    COMMIT;
  `);
  db.pragma("foreign_keys = ON");
}

db.exec(`
  DROP TRIGGER IF EXISTS articles_content_type_insert;
  DROP TRIGGER IF EXISTS articles_content_type_update;
  DROP TRIGGER IF EXISTS revisions_content_type_insert;
  DROP TRIGGER IF EXISTS revisions_content_type_update;
  CREATE TRIGGER articles_content_type_insert
  BEFORE INSERT ON articles WHEN NEW.content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')
  BEGIN SELECT RAISE(ABORT, 'invalid article content type'); END;
  CREATE TRIGGER articles_content_type_update
  BEFORE UPDATE OF content_type ON articles WHEN NEW.content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')
  BEGIN SELECT RAISE(ABORT, 'invalid article content type'); END;
  CREATE TRIGGER revisions_content_type_insert
  BEFORE INSERT ON revisions WHEN NEW.content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')
  BEGIN SELECT RAISE(ABORT, 'invalid revision content type'); END;
  CREATE TRIGGER revisions_content_type_update
  BEFORE UPDATE OF content_type ON revisions WHEN NEW.content_type NOT IN ('airline','alliance','aircraft','airport','manufacturer','engine')
  BEGIN SELECT RAISE(ABORT, 'invalid revision content type'); END;
  CREATE TRIGGER IF NOT EXISTS revisions_status_insert
  BEFORE INSERT ON revisions WHEN NEW.status NOT IN ('draft','verifying','pending_review','changes_requested','approved','rejected')
  BEGIN SELECT RAISE(ABORT, 'invalid revision status'); END;
  CREATE TRIGGER IF NOT EXISTS revisions_status_update
  BEFORE UPDATE OF status ON revisions WHEN NEW.status NOT IN ('draft','verifying','pending_review','changes_requested','approved','rejected')
  BEGIN SELECT RAISE(ABORT, 'invalid revision status'); END;
  DROP TRIGGER IF EXISTS relationships_insert_guard;
  CREATE TRIGGER relationships_insert_guard
  BEFORE INSERT ON article_relationships
  WHEN NEW.source_article_id = NEW.target_article_id
    OR NEW.relationship_type NOT IN ('operates_aircraft','hub_at_airport','manufactured_by','uses_engine','variant_of','produces_aircraft','produces_engine')
    OR NOT EXISTS (SELECT 1 FROM articles s JOIN articles t ON t.id=NEW.target_article_id JOIN revisions tr ON tr.id=t.live_revision_id JOIN revisions rr ON rr.id=NEW.approved_revision_id
      WHERE s.id=NEW.source_article_id AND tr.status='approved' AND t.archived_at IS NULL AND rr.article_id=s.id AND rr.status='approved' AND (
        (NEW.relationship_type='operates_aircraft' AND s.content_type='airline' AND t.content_type='aircraft') OR
        (NEW.relationship_type='hub_at_airport' AND s.content_type='airline' AND t.content_type='airport') OR
        (NEW.relationship_type='manufactured_by' AND s.content_type='aircraft' AND t.content_type='manufacturer') OR
        (NEW.relationship_type='uses_engine' AND s.content_type='aircraft' AND t.content_type='engine') OR
        (NEW.relationship_type='variant_of' AND s.content_type='aircraft' AND t.content_type='aircraft') OR
        (NEW.relationship_type='produces_aircraft' AND s.content_type='manufacturer' AND t.content_type='aircraft') OR
        (NEW.relationship_type='produces_engine' AND s.content_type='manufacturer' AND t.content_type='engine')
      ))
  BEGIN SELECT RAISE(ABORT, 'invalid or unverified relationship'); END;
  CREATE TRIGGER IF NOT EXISTS relationships_update_guard
  BEFORE UPDATE ON article_relationships
  BEGIN SELECT RAISE(ABORT, 'published relationships are immutable; replace them through an approved revision'); END;
`);

const revisionColumns = tableColumns("revisions");
if (!revisionColumns.some((column) => column.name === "markdown")) {
  db.exec("ALTER TABLE revisions ADD COLUMN markdown TEXT NOT NULL DEFAULT ''");
  const rows = db.prepare("SELECT id, sections_json FROM revisions WHERE markdown = ''").all() as Array<{ id: string; sections_json: string }>;
  const update = db.prepare("UPDATE revisions SET markdown = ? WHERE id = ?");
  const migrate = db.transaction(() => {
    for (const row of rows) {
      const sections = JSON.parse(row.sections_json) as Array<{ heading: string; body: string }>;
      update.run(sections.map((section) => `## ${section.heading}\n\n${section.body}`).join("\n\n"), row.id);
    }
  });
  migrate();
}
if (!revisionColumns.some((column) => column.name === "proposed_slug")) {
  db.exec("ALTER TABLE revisions ADD COLUMN proposed_slug TEXT NOT NULL DEFAULT ''");
  db.exec("UPDATE revisions SET proposed_slug = (SELECT slug FROM articles WHERE articles.id = revisions.article_id) WHERE proposed_slug = ''");
}
ensureColumn("revisions", "relationships_json", "TEXT NOT NULL DEFAULT '[]'");

type ArticleRow = { id: string; slug: string; title: string; content_type: ContentType; live_revision_id: string | null; created_at: string; updated_at: string };
type RevisionRow = { id: string; article_id: string; article_slug: string; proposed_slug: string; status: RevisionStatus; contributor_id: string; contributor_name: string; edit_summary: string; title: string; content_type: ContentType; markdown: string; fields_json: string; sections_json: string; sources_json: string; relationships_json: string; verification_json: string | null; moderator_id: string | null; moderator_note: string | null; parent_revision_id: string | null; created_at: string; updated_at: string; submitted_at: string | null; reviewed_at: string | null };

function mapArticle(row: ArticleRow): ArticleRecord {
  return { id: row.id, slug: row.slug, title: row.title, contentType: row.content_type, liveRevisionId: row.live_revision_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapRevision(row: RevisionRow): RevisionRecord {
  return {
    id: row.id, articleId: row.article_id, articleSlug: row.article_slug, proposedSlug: row.proposed_slug || row.article_slug, status: row.status,
    contributorId: row.contributor_id, contributorName: row.contributor_name, editSummary: row.edit_summary,
    title: row.title, contentType: row.content_type, markdown: row.markdown, fields: JSON.parse(row.fields_json), sections: JSON.parse(row.sections_json), sources: JSON.parse(row.sources_json), relationships: JSON.parse(row.relationships_json || "[]"),
    verification: row.verification_json ? JSON.parse(row.verification_json) : null,
    moderatorId: row.moderator_id, moderatorNote: row.moderator_note, parentRevisionId: row.parent_revision_id,
    createdAt: row.created_at, updatedAt: row.updated_at, submittedAt: row.submitted_at, reviewedAt: row.reviewed_at,
  };
}

const revisionSelect = `SELECT r.*, a.slug AS article_slug FROM revisions r JOIN articles a ON a.id = r.article_id`;

function seedBuiltinArticle() {
  if (db.prepare("SELECT 1 FROM articles WHERE slug = ? AND content_type = ?").get(f15Article.slug, f15Article.contentType)) return;
  const articleId = randomUUID();
  const revisionId = randomUUID();
  const now = new Date().toISOString();
  const transaction = db.transaction(() => {
    db.prepare("INSERT INTO articles (id, slug, title, content_type, live_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(articleId, f15Article.slug, f15Article.title, f15Article.contentType, revisionId, now, now);
    db.prepare(`INSERT INTO revisions (id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type, markdown, fields_json, sections_json, sources_json, proposed_slug, parent_revision_id, created_at, updated_at, submitted_at, reviewed_at, moderator_id, moderator_note) VALUES (?, ?, 'approved', 'system', 'aviation.wiki', 'Initial import of the existing article', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'system', 'Imported from the existing live article')`).run(revisionId, articleId, f15Article.title, f15Article.contentType, f15Article.markdown, JSON.stringify(f15Article.fields), JSON.stringify(f15Article.sections), JSON.stringify(f15Article.sources), f15Article.slug, now, now, now, now);
  });
  transaction();
}

seedBuiltinArticle();

export function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export function getArticleBySlug(slug: string, contentType?: ContentType): ArticleWithLiveRevision | null {
  const row = (contentType
    ? db.prepare("SELECT * FROM articles WHERE slug = ? AND content_type = ?").get(slug, contentType)
    : db.prepare("SELECT * FROM articles WHERE slug = ? ORDER BY updated_at DESC LIMIT 1").get(slug)) as ArticleRow | undefined;
  if (!row) return null;
  const article = mapArticle(row);
  return { ...article, liveRevision: article.liveRevisionId ? getRevision(article.liveRevisionId) : null };
}

export function getArticleById(id: string): ArticleWithLiveRevision | null {
  const row = db.prepare("SELECT * FROM articles WHERE id = ?").get(id) as ArticleRow | undefined;
  if (!row) return null;
  const article = mapArticle(row);
  return { ...article, liveRevision: article.liveRevisionId ? getRevision(article.liveRevisionId) : null };
}

export function listApprovedEntityOptions(): EntityOption[] {
  return (db.prepare(`SELECT a.id,a.title,a.slug,a.content_type FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL ORDER BY a.content_type,a.title`).all() as Array<{ id: string; title: string; slug: string; content_type: ContentType }>).map((row) => ({ id: row.id, title: row.title, slug: row.slug, contentType: row.content_type }));
}

const searchableFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign|country|country of origin|manufacturer|engine|alias|aliases|abbreviation|abbreviations|acronym)(\b|$)/i;
const codeFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign)(\b|$)/i;

/** Returns only material attached to the currently-live approved revision. */
export function listPublicSearchDocuments(): SearchDocument[] {
  const rows = db.prepare(`SELECT a.id,a.slug,a.content_type,r.title,r.fields_json,r.markdown
    FROM articles a JOIN revisions r ON r.id=a.live_revision_id
    WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL
    ORDER BY r.title`).all() as Array<{ id: string; slug: string; content_type: ContentType; title: string; fields_json: string; markdown: string }>;
  const redirects = db.prepare(`SELECT x.article_id,x.old_slug FROM article_slug_redirects x
    JOIN articles a ON a.id=x.article_id JOIN revisions r ON r.id=a.live_revision_id
    WHERE r.status='approved' AND a.archived_at IS NULL`).all() as Array<{ article_id: string; old_slug: string }>;
  const previousTitles = db.prepare(`SELECT r.article_id,r.title FROM revisions r JOIN articles a ON a.id=r.article_id
    JOIN revisions live ON live.id=a.live_revision_id WHERE r.status='approved' AND live.status='approved' AND a.archived_at IS NULL`).all() as Array<{ article_id: string; title: string }>;
  const aliases = new Map<string, string[]>();
  const titles = new Map<string, string[]>();
  for (const row of redirects) aliases.set(row.article_id, [...(aliases.get(row.article_id) || []), row.old_slug.replaceAll("-", " ")]);
  for (const row of previousTitles) titles.set(row.article_id, [...(titles.get(row.article_id) || []), row.title]);
  return rows.map((row) => {
    const fields = JSON.parse(row.fields_json) as Array<{ key?: string; value?: string }>;
    const searchableFields = fields.filter((field) => field.key && field.value && searchableFieldPattern.test(field.key));
    const countries = [...new Set(searchableFields.filter((field) => /country/i.test(field.key!)).flatMap((field) => field.value!.split(/[,;/]/).map((value) => value.trim()).filter(Boolean)))];
    const terms: SearchDocument["terms"] = [{ value: row.title, kind: "title" }];
    for (const value of titles.get(row.id) || []) if (value !== row.title) terms.push({ value, kind: "alias", label: "Previous title" });
    for (const value of aliases.get(row.id) || []) terms.push({ value, kind: "alias", label: "Previous title or slug" });
    for (const field of searchableFields) {
      const kind: SearchTermKind = codeFieldPattern.test(field.key!) ? "code" : /alias|abbreviation|acronym/i.test(field.key!) ? "alias" : "field";
      for (const value of field.value!.split(/[,;/]|\s+\|\s+/).map((part) => part.trim()).filter(Boolean)) terms.push({ value, kind, label: field.key });
    }
    const description = row.markdown.replace(/\[\^[^\]]+\]/g, "").replace(/[#*_>`\[\]()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
    return { id: row.id, title: row.title, slug: row.slug, contentType: row.content_type, href: articlePath(row.content_type, row.slug), description, countries, terms };
  });
}

export function listEntityOptions(): EntityOption[] {
  return (db.prepare("SELECT id,title,slug,content_type FROM articles ORDER BY content_type,title").all() as Array<{ id: string; title: string; slug: string; content_type: ContentType }>).map((row) => ({ id: row.id, title: row.title, slug: row.slug, contentType: row.content_type }));
}

export function validateRelationships(articleId: string, sourceType: ContentType, relationships: EntityRelationship[], citationIdentifiers: Set<string>) {
  const seen = new Set<string>();
  for (const relationship of relationships) {
    const key = relationshipKey(relationship);
    if (seen.has(key)) throw new UserFacingError("Duplicate relationships are not allowed.");
    seen.add(key);
    const target = db.prepare(`SELECT a.content_type,a.archived_at,r.status FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id WHERE a.id=?`).get(relationship.targetArticleId) as { content_type: ContentType; archived_at: string | null; status: RevisionStatus | null } | undefined;
    if (!target || target.status !== "approved" || target.archived_at) throw new UserFacingError("Relationships may only target existing approved entities.");
    validateRelationshipShape(articleId, sourceType, relationship, target.content_type);
    for (const identifier of relationship.citationIdentifiers) {
      if (!citationIdentifiers.has(identifier.toLowerCase())) throw new UserFacingError(`Relationship citation [^${identifier}] is not defined in the article.`);
    }
  }
}

export type PublicRelationship = EntityRelationship & { source: EntityOption; target: EntityOption };
export function getApprovedRelationships(articleId: string): PublicRelationship[] {
  const rows = db.prepare(`SELECT ar.relationship_type,ar.source_article_id,ar.target_article_id,s.title source_title,s.slug source_slug,s.content_type source_type,t.title target_title,t.slug target_slug,t.content_type target_type
    FROM article_relationships ar JOIN articles s ON s.id=ar.source_article_id JOIN articles t ON t.id=ar.target_article_id
    JOIN revisions sr ON sr.id=s.live_revision_id JOIN revisions tr ON tr.id=t.live_revision_id
    WHERE (ar.source_article_id=? OR ar.target_article_id=?) AND sr.status='approved' AND tr.status='approved' AND s.archived_at IS NULL AND t.archived_at IS NULL
    ORDER BY ar.relationship_type,target_title,source_title`).all(articleId, articleId) as Array<Record<string, string>>;
  return rows.map((row) => ({ type: row.relationship_type as EntityRelationship["type"], targetArticleId: row.target_article_id, citationIdentifiers: [], source: { id: row.source_article_id, title: row.source_title, slug: row.source_slug, contentType: row.source_type as ContentType }, target: { id: row.target_article_id, title: row.target_title, slug: row.target_slug, contentType: row.target_type as ContentType } }));
}

export type DiscoverySection = { title: string; entities: EntityOption[] };
export function getPublicDiscoverySections(articleId: string): DiscoverySection[] {
  const article = getArticleById(articleId);
  if (!article?.liveRevision || article.liveRevision.status !== "approved") return [];
  const relationships = getApprovedRelationships(articleId);
  const outgoing = (type: EntityRelationship["type"]) => relationships.filter((item) => item.source.id === articleId && item.type === type).map((item) => item.target);
  const incoming = (type: EntityRelationship["type"]) => relationships.filter((item) => item.target.id === articleId && item.type === type).map((item) => item.source);
  const unique = (entities: EntityOption[]) => [...new Map(entities.filter((entity) => entity.id !== articleId).map((entity) => [entity.id, entity])).values()].slice(0, 12);
  const sections: DiscoverySection[] = [];
  if (article.contentType === "airline") sections.push({ title: "Aircraft operated by this airline", entities: outgoing("operates_aircraft") });
  if (article.contentType === "aircraft") {
    sections.push({ title: "Related airlines", entities: incoming("operates_aircraft") });
    const manufacturers = outgoing("manufactured_by").map((entity) => entity.id);
    const sameManufacturer = manufacturers.length ? db.prepare(`SELECT DISTINCT a.id,a.title,a.slug,a.content_type FROM article_relationships ar
      JOIN articles a ON a.id=ar.source_article_id JOIN revisions r ON r.id=a.live_revision_id
      WHERE ar.relationship_type='manufactured_by' AND ar.target_article_id IN (${manufacturers.map(() => "?").join(",")}) AND r.status='approved' AND a.archived_at IS NULL AND a.id!=? ORDER BY a.title LIMIT 12`).all(...manufacturers, articleId) as Array<{ id: string; title: string; slug: string; content_type: ContentType }> : [];
    sections.push({ title: "Similar aircraft", entities: unique([...outgoing("variant_of"), ...incoming("variant_of"), ...sameManufacturer.map((row) => ({ id: row.id, title: row.title, slug: row.slug, contentType: row.content_type }))]) });
  }
  if (article.contentType === "airport") sections.push({ title: "Airlines using this airport", entities: incoming("hub_at_airport") });
  if (article.contentType === "manufacturer") sections.push({ title: "Other products from this manufacturer", entities: unique([...outgoing("produces_aircraft"), ...incoming("manufactured_by"), ...outgoing("produces_engine")]) });
  const documents = listPublicSearchDocuments();
  const currentDocument = documents.find((document) => document.id === articleId);
  const countries = currentDocument?.countries || [];
  if (countries.length) sections.push({ title: `Explore more from ${countries[0]}`, entities: unique(documents.filter((document) => document.id !== articleId && document.countries.some((country) => countries.includes(country))).map((document) => ({ id: document.id, title: document.title, slug: document.slug, contentType: document.contentType }))) });
  return sections.map((section) => ({ ...section, entities: unique(section.entities) })).filter((section) => section.entities.length);
}

export function getRevision(id: string): RevisionRecord | null {
  const row = db.prepare(`${revisionSelect} WHERE r.id = ?`).get(id) as RevisionRow | undefined;
  return row ? mapRevision(row) : null;
}

export function getEditableRevision(articleId: string, contributorId: string) {
  const row = db.prepare(`${revisionSelect} WHERE r.article_id = ? AND r.contributor_id = ? AND r.status IN ('draft', 'changes_requested') ORDER BY r.updated_at DESC LIMIT 1`).get(articleId, contributorId) as RevisionRow | undefined;
  return row ? mapRevision(row) : null;
}

export function listContributorRevisions(contributorId: string) {
  return (db.prepare(`${revisionSelect} WHERE r.contributor_id = ? ORDER BY r.updated_at DESC`).all(contributorId) as RevisionRow[]).map(mapRevision);
}

export function getPublicContributorActivity(
  contributorId: string,
): PublicContributorActivity {
  const summary = db.prepare(
    `SELECT
      COUNT(*) approved_count,
      COUNT(DISTINCT r.article_id) article_count,
      MIN(COALESCE(r.reviewed_at,r.created_at)) first_contribution_at
    FROM revisions r
    JOIN articles a ON a.id=r.article_id
    WHERE r.contributor_id=? AND r.status='approved' AND a.archived_at IS NULL`,
  ).get(contributorId) as {
    approved_count: number;
    article_count: number;
    first_contribution_at: string | null;
  };
  const activity = db.prepare(
    `SELECT
      r.id,
      a.slug article_slug,
      r.title,
      r.content_type,
      r.edit_summary,
      COALESCE(r.reviewed_at,r.created_at) contributed_at
    FROM revisions r
    JOIN articles a ON a.id=r.article_id
    WHERE r.contributor_id=? AND r.status='approved' AND a.archived_at IS NULL
    ORDER BY COALESCE(r.reviewed_at,r.created_at) DESC
    LIMIT 12`,
  ).all(contributorId) as Array<{
    id: string;
    article_slug: string;
    title: string;
    content_type: ContentType;
    edit_summary: string;
    contributed_at: string;
  }>;

  const contributions: PublicContribution[] = activity.map((item) => ({
    id: item.id,
    articleSlug: item.article_slug,
    title: item.title,
    contentType: item.content_type,
    editSummary: item.edit_summary,
    contributedAt: item.contributed_at,
  }));

  return {
    approvedCount: Number(summary.approved_count),
    articleCount: Number(summary.article_count),
    firstContributionAt: summary.first_contribution_at,
    contributions,
  };
}

export function listReviewQueue() {
  return (db.prepare(`${revisionSelect} WHERE r.status IN ('verifying', 'pending_review') ORDER BY r.submitted_at ASC`).all() as RevisionRow[]).map(mapRevision);
}

export function listArticleHistory(articleId: string) {
  return (db.prepare(`${revisionSelect} WHERE r.article_id = ? AND r.status = 'approved' ORDER BY r.reviewed_at DESC, r.created_at DESC`).all(articleId) as RevisionRow[]).map(mapRevision);
}

export function createOrGetArticle(slug: string, title: string, contentType: ContentType) {
  const existing = getArticleBySlug(slug, contentType);
  if (existing) return existing;
  const id = randomUUID();
  const now = new Date().toISOString();
  const create = db.transaction(() => {
    if (getArticleBySlug(slug, contentType)) return;
    if (getSlugRedirect(contentType, slug)) throw new UserFacingError("That slug is reserved by an existing article redirect.");
    db.prepare("INSERT INTO articles (id, slug, title, content_type, live_revision_id, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)").run(id, slug, title, contentType, now, now);
  });
  create.immediate();
  return getArticleBySlug(slug, contentType)!;
}

export function saveDraft(input: { revisionId?: string; articleId: string; proposedSlug: string; contributorId: string; contributorName: string; editSummary: string; content: RevisionContent; parentRevisionId: string | null }) {
  const now = new Date().toISOString();
  if (input.revisionId) {
    const existing = getRevision(input.revisionId);
    if (!existing || existing.contributorId !== input.contributorId || !["draft", "changes_requested"].includes(existing.status)) throw new UserFacingError("This revision cannot be edited.");
    db.transaction(() => {
      db.prepare(`UPDATE revisions SET status = 'draft', contributor_name = ?, edit_summary = ?, title = ?, content_type = ?, markdown = ?, fields_json = ?, sections_json = ?, sources_json = ?, relationships_json = ?, proposed_slug = ?, verification_json = NULL, moderator_note = NULL, updated_at = ? WHERE id = ?`).run(input.contributorName, input.editSummary, input.content.title, input.content.contentType, input.content.markdown, JSON.stringify(input.content.fields), JSON.stringify(input.content.sections), JSON.stringify(input.content.sources), JSON.stringify(input.content.relationships), input.proposedSlug, now, input.revisionId);
      db.prepare(`DELETE FROM revision_import_field_sources WHERE revision_id=? AND NOT EXISTS (
        SELECT 1 FROM json_each(?) f WHERE json_extract(f.value,'$.key')=revision_import_field_sources.field_key AND json_extract(f.value,'$.value')=revision_import_field_sources.field_value
      )`).run(input.revisionId, JSON.stringify(input.content.fields));
      if (existing.status === "changes_requested") db.prepare("INSERT INTO revision_events (id, revision_id, actor_id, from_status, to_status, note, created_at) VALUES (?, ?, ?, ?, 'draft', ?, ?)").run(randomUUID(), input.revisionId, input.contributorId, existing.status, "Contributor resumed the requested changes.", now);
    })();
    return getRevision(input.revisionId)!;
  }
  const id = randomUUID();
  db.prepare(`INSERT INTO revisions (id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type, markdown, fields_json, sections_json, sources_json, relationships_json, proposed_slug, parent_revision_id, created_at, updated_at) VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, input.articleId, input.contributorId, input.contributorName, input.editSummary, input.content.title, input.content.contentType, input.content.markdown, JSON.stringify(input.content.fields), JSON.stringify(input.content.sections), JSON.stringify(input.content.sources), JSON.stringify(input.content.relationships), input.proposedSlug, input.parentRevisionId, now, now);
  return getRevision(id)!;
}

export function transitionRevision(id: string, actorId: string, toStatus: RevisionStatus, options: { note?: string | null; verification?: VerificationResult | null; moderator?: boolean } = {}) {
  const allowedTransitions: Record<RevisionStatus, RevisionStatus[]> = {
    draft: ["verifying", "pending_review"],
    verifying: ["pending_review", "changes_requested", "approved", "rejected"],
    pending_review: ["changes_requested", "approved", "rejected"],
    changes_requested: ["draft"],
    approved: [],
    rejected: [],
  };
  const change = db.transaction(() => {
    const revision = getRevision(id);
    if (!revision) throw new UserFacingError("Revision not found.");
    if (!allowedTransitions[revision.status].includes(toStatus)) throw new UserFacingError(`Revision cannot move from ${revision.status} to ${toStatus}.`);
    const now = new Date().toISOString();
    const result = db.prepare(`UPDATE revisions SET status = ?, verification_json = COALESCE(?, verification_json), moderator_id = CASE WHEN ? THEN ? ELSE moderator_id END, moderator_note = COALESCE(?, moderator_note), submitted_at = CASE WHEN ? IN ('verifying', 'pending_review') THEN COALESCE(submitted_at, ?) ELSE submitted_at END, reviewed_at = CASE WHEN ? IN ('approved', 'rejected', 'changes_requested') THEN ? ELSE reviewed_at END, updated_at = ? WHERE id = ? AND status = ?`).run(toStatus, options.verification ? JSON.stringify(options.verification) : null, options.moderator ? 1 : 0, actorId, options.note ?? null, toStatus, now, toStatus, now, now, id, revision.status);
    if (result.changes !== 1) throw new UserFacingError("The revision changed concurrently. Reload it before taking action.");
    db.prepare("INSERT INTO revision_events (id, revision_id, actor_id, from_status, to_status, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), id, actorId, revision.status, toStatus, options.note ?? null, now);
  });
  change.immediate();
  return getRevision(id)!;
}

export function publishRevision(id: string, moderatorId: string, note?: string | null) {
  const transaction = db.transaction(() => {
    const revision = getRevision(id);
    if (!revision || !["pending_review", "verifying"].includes(revision.status)) throw new UserFacingError("This revision is no longer awaiting review.");
    const article = getArticleById(revision.articleId);
    if (!article) throw new UserFacingError("Article not found.");
    const controls = db.prepare("SELECT archived_at FROM articles WHERE id=?").get(revision.articleId) as { archived_at: string | null };
    if (controls.archived_at) throw new UserFacingError("Archived articles cannot be published.");
    if (article.liveRevisionId !== revision.parentRevisionId) throw new UserFacingError("The live article changed after this revision was created. Rebase and review it again before approval.");
    if (revision.contentType !== article.contentType) throw new UserFacingError("An existing article cannot change content type through a revision.");
    const parsedMarkdown = parseArticleMarkdown(revision.markdown);
    if (parsedMarkdown.errors.length) throw new UserFacingError("This revision contains invalid or unsafe Markdown and cannot be approved.");
    validateRelationships(revision.articleId, revision.contentType, revision.relationships, new Set(parsedMarkdown.citations.map((citation) => citation.identifier)));
    const conflicting = getArticleBySlug(revision.proposedSlug, revision.contentType);
    if (conflicting && conflicting.id !== revision.articleId) throw new UserFacingError("That slug is already used by another article of this type.");
    const aliasedArticleId = getSlugRedirectArticleId(revision.contentType, revision.proposedSlug);
    if (aliasedArticleId && aliasedArticleId !== revision.articleId) throw new UserFacingError("That slug is reserved by another article redirect.");
    transitionRevision(id, moderatorId, "approved", { note, moderator: true });
    const now = new Date().toISOString();
    if (revision.proposedSlug !== revision.articleSlug) {
      db.prepare("INSERT INTO article_slug_redirects (content_type, old_slug, article_id, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(content_type, old_slug) DO UPDATE SET article_id=excluded.article_id, created_at=excluded.created_at WHERE article_slug_redirects.article_id=excluded.article_id").run(revision.contentType, revision.articleSlug, revision.articleId, now);
    }
    db.prepare("UPDATE articles SET slug = ?, title = ?, content_type = ?, live_revision_id = ?, updated_at = ? WHERE id = ?").run(revision.proposedSlug, revision.title, revision.contentType, id, now, revision.articleId);
    db.prepare("DELETE FROM article_relationships WHERE source_article_id=?").run(revision.articleId);
    const insertRelationship = db.prepare("INSERT INTO article_relationships (source_article_id,target_article_id,relationship_type,approved_revision_id,created_at) VALUES (?,?,?,?,?)");
    for (const relationship of revision.relationships) insertRelationship.run(revision.articleId, relationship.targetArticleId, relationship.type, id, now);
  });
  transaction.immediate();
  const published = getRevision(id)!;
  return getArticleById(published.articleId)!;
}

export function moderatorEditRevision(id: string, content: RevisionContent, proposedSlug: string, editSummary: string, moderatorId: string) {
  const revision = getRevision(id);
  if (!revision || !["pending_review", "verifying"].includes(revision.status)) throw new UserFacingError("Revision is not awaiting review.");
  const now = new Date().toISOString();
  db.prepare("UPDATE revisions SET title = ?, content_type = ?, markdown = ?, fields_json = ?, sections_json = ?, sources_json = ?, relationships_json = ?, proposed_slug = ?, edit_summary = ?, moderator_id = ?, updated_at = ? WHERE id = ?").run(content.title, content.contentType, content.markdown, JSON.stringify(content.fields), JSON.stringify(content.sections), JSON.stringify(content.sources), JSON.stringify(content.relationships), proposedSlug || revision.proposedSlug, editSummary, moderatorId, now, id);
  db.prepare(`DELETE FROM revision_import_field_sources WHERE revision_id=? AND NOT EXISTS (
    SELECT 1 FROM json_each(?) f WHERE json_extract(f.value,'$.key')=revision_import_field_sources.field_key AND json_extract(f.value,'$.value')=revision_import_field_sources.field_value
  )`).run(id, JSON.stringify(content.fields));
  return getRevision(id)!;
}

export function restoreRevision(sourceRevisionId: string, moderatorId: string, moderatorName: string) {
  const source = getRevision(sourceRevisionId);
  if (!source || source.status !== "approved") throw new UserFacingError("Only approved revisions can be restored.");
  const article = getArticleById(source.articleId)!;
  const restored = saveDraft({ articleId: source.articleId, proposedSlug: article.slug, contributorId: moderatorId, contributorName: moderatorName, editSummary: `Restore revision ${source.id.slice(0, 8)}`, content: source, parentRevisionId: article.liveRevisionId });
  db.prepare(`INSERT INTO revision_import_field_sources SELECT ?,field_key,field_value,provider,source_identifier,source_urls_json FROM revision_import_field_sources WHERE revision_id=?`).run(restored.id, sourceRevisionId);
  db.prepare(`INSERT INTO revision_import_images SELECT ?,file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at FROM revision_import_images WHERE revision_id=?`).run(restored.id, sourceRevisionId);
  return transitionRevision(restored.id, moderatorId, "pending_review", { note: "Proposed restoration of an earlier approved revision.", moderator: true });
}

export function createImportedDraft(input: { provider: ImportProviderId; sourceIdentifier: string; title: string; contentType: ContentType; targetArticleId?: string; fields: ImportField[]; images: ImportImage[]; actorId: string; actorName: string }) {
  const slug = normalizeSlug(input.title);
  if (!slug) throw new UserFacingError("The imported title cannot produce a valid slug.");
  const existingMapping = db.prepare("SELECT article_id FROM article_external_identifiers WHERE provider=? AND source_identifier=?").get(input.provider, input.sourceIdentifier) as { article_id: string } | undefined;
  if (existingMapping && (!input.targetArticleId || existingMapping.article_id !== input.targetArticleId)) throw new UserFacingError("This provider entity is already linked to another aviation.wiki article.");
  if (input.fields.some((field) => !field.verified || !field.sourceUrls.length)) throw new UserFacingError("Every imported field must be verified and retain at least one source.");
  if (input.images.some((image) => !image.compatible || !image.creator || !image.license || !image.licenseUrl || !image.attribution || !image.sourcePage || !image.retrievedAt)) throw new UserFacingError("Every imported image must have complete compatible reuse metadata.");
  const slugMatch = getArticleBySlug(slug, input.contentType);
  if (!input.targetArticleId && slugMatch) throw new UserFacingError("A matching article already exists and must be selected explicitly.");
  for (const field of input.fields.filter((item) => /code|registration|callsign|designation|iso 3166/i.test(item.key))) {
    const collision = db.prepare(`SELECT DISTINCT a.id,a.title FROM revisions r JOIN articles a ON a.id=r.article_id,json_each(r.fields_json) f
      WHERE r.status!='rejected' AND lower(json_extract(f.value,'$.key'))=lower(?) AND lower(json_extract(f.value,'$.value'))=lower(?) AND a.id!=? LIMIT 1`).get(field.key, field.value, input.targetArticleId || "") as { id: string; title: string } | undefined;
    if (collision) throw new UserFacingError(`Imported identifier “${field.key}: ${field.value}” already belongs to ${collision.title}.`);
  }
  let article = input.targetArticleId ? getArticleById(input.targetArticleId) : null;
  if (input.targetArticleId && !article) throw new UserFacingError("Selected target article not found.");
  if (article && article.contentType !== input.contentType) throw new UserFacingError("The target article has a different content type.");
  if (!article) article = createOrGetArticle(slug, input.title, input.contentType);
  const controls = db.prepare("SELECT archived_at,redirect_to_slug FROM articles WHERE id=?").get(article.id) as { archived_at: string | null; redirect_to_slug: string | null };
  if (controls.archived_at) throw new UserFacingError("Archived articles cannot receive imports.");
  if (controls.redirect_to_slug) throw new UserFacingError("Redirect articles cannot receive imports.");
  const currentFields = article.liveRevision?.fields || [];
  const currentByKey = new Map(currentFields.map((field) => [field.key.toLowerCase(), field.value]));
  for (const field of input.fields) {
    const current = currentByKey.get(field.key.toLowerCase());
    if (current && current !== field.value) throw new UserFacingError(`Imported field “${field.key}” conflicts with approved information and cannot overwrite it.`);
    if (/code|registration|callsign|designation|iso 3166/i.test(field.key)) {
      const collision = db.prepare(`SELECT DISTINCT a.id,a.title FROM revisions r JOIN articles a ON a.id=r.article_id,json_each(r.fields_json) f
        WHERE r.status!='rejected' AND lower(json_extract(f.value,'$.key'))=lower(?) AND lower(json_extract(f.value,'$.value'))=lower(?) AND a.id!=? LIMIT 1`).get(field.key, field.value, article.id) as { id: string; title: string } | undefined;
      if (collision) throw new UserFacingError(`Imported identifier “${field.key}: ${field.value}” already belongs to ${collision.title}.`);
    }
  }
  const addedFields = input.fields.filter((field) => !currentByKey.has(field.key.toLowerCase())).map(({ key, value }) => ({ key, value }));
  const sources = [...new Map(input.fields.flatMap((field) => field.sourceUrls.map((url) => [url, { title: field.sourceLabel, publisher: input.provider === "wikidata" ? "Wikidata" : input.provider, url, accessedAt: new Date().toISOString().slice(0, 10) }] as const))).values()];
  const content: RevisionContent = { title: input.title, contentType: input.contentType, markdown: article.liveRevision?.markdown || "", fields: [...currentFields, ...addedFields], sections: article.liveRevision?.sections || [], sources: [...(article.liveRevision?.sources || []), ...sources.filter((source) => !(article.liveRevision?.sources || []).some((current) => current.url === source.url))], relationships: article.liveRevision?.relationships || [] };
  const revision = saveDraft({ articleId: article.id, proposedSlug: article.slug, contributorId: input.actorId, contributorName: input.actorName, editSummary: `Imported selected structured data from ${input.provider} ${input.sourceIdentifier}`, content, parentRevisionId: article.liveRevisionId });
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("INSERT INTO article_external_identifiers (provider,source_identifier,article_id,created_at) VALUES (?,?,?,?) ON CONFLICT(provider,source_identifier) DO NOTHING").run(input.provider, input.sourceIdentifier, article.id, now);
    const mapping = db.prepare("SELECT article_id FROM article_external_identifiers WHERE provider=? AND source_identifier=?").get(input.provider, input.sourceIdentifier) as { article_id: string };
    if (mapping.article_id !== article.id) throw new UserFacingError("This provider entity was linked concurrently to another article.");
    const insertField = db.prepare("INSERT INTO revision_import_field_sources (revision_id,field_key,field_value,provider,source_identifier,source_urls_json) VALUES (?,?,?,?,?,?)");
    for (const field of input.fields) insertField.run(revision.id, field.key, field.value, input.provider, input.sourceIdentifier, JSON.stringify(field.sourceUrls));
    const insertImage = db.prepare("INSERT INTO revision_import_images (revision_id,file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at) VALUES (?,?,?,?,?,?,?,?,?,?)");
    for (const image of input.images) insertImage.run(revision.id, image.fileName, image.imageUrl, image.thumbnailUrl, image.creator, image.license, image.licenseUrl, image.attribution, image.sourcePage, image.retrievedAt);
    db.prepare("INSERT INTO import_history (id,actor_id,actor_name,provider,source_identifiers_json,article_id,revision_id,created_at) VALUES (?,?,?,?,?,?,?,?)").run(randomUUID(), input.actorId, input.actorName, input.provider, JSON.stringify([input.sourceIdentifier, ...input.images.map((image) => image.fileName)]), article.id, revision.id, now);
  }).immediate();
  return revision;
}

export function getRevisionImportImages(revisionId: string) {
  return db.prepare("SELECT * FROM revision_import_images WHERE revision_id=? ORDER BY file_name").all(revisionId) as Array<{ file_name: string; image_url: string; thumbnail_url: string; creator: string; license: string; license_url: string; attribution: string; source_page: string; retrieved_at: string }>;
}

export function getRevisionImportFieldSources(revisionId: string) {
  return db.prepare("SELECT * FROM revision_import_field_sources WHERE revision_id=? ORDER BY field_key").all(revisionId) as Array<{ field_key: string; field_value: string; provider: string; source_identifier: string; source_urls_json: string }>;
}

export function getSlugRedirect(contentType: ContentType, slug: string) {
  const row = db.prepare("SELECT a.slug FROM article_slug_redirects r JOIN articles a ON a.id = r.article_id WHERE r.content_type = ? AND r.old_slug = ?").get(contentType, slug) as { slug: string } | undefined;
  return row?.slug || null;
}

export function getSlugRedirectArticleId(contentType: ContentType, slug: string) {
  const row = db.prepare("SELECT article_id FROM article_slug_redirects WHERE content_type = ? AND old_slug = ?").get(contentType, slug) as { article_id: string } | undefined;
  return row?.article_id || null;
}

export function getApprovedRevision(articleId: string, revisionId: string) {
  const revision = getRevision(revisionId);
  return revision?.articleId === articleId && revision.status === "approved" ? revision : null;
}
