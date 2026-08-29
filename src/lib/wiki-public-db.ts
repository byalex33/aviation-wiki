import "server-only";

import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";

import { articlePath } from "@/lib/article-routes";
import { aviationCategoryFor } from "@/lib/article-categories";
import { PUBLIC_SEARCH_DOCUMENTS_TAG } from "@/lib/cache-tags";
import {
  isSafeImageUrl,
  parseArticleImageShorthand,
  parseArticleMarkdown,
} from "@/lib/article-markdown";
import { f15Article } from "@/lib/builtin-articles";
import { ensureSchema, row, rows, sql } from "@/lib/postgres";
import { relationshipKey, validateRelationshipShape } from "@/lib/relationship-rules";
import { UserFacingError } from "@/lib/user-facing-error";
import { submitIndexNow } from "@/lib/indexnow";
import type { SearchDocument, SearchTermKind } from "@/lib/search-types";
import type { WikiRole } from "@/lib/wiki-auth";
import type { ArticleRecord, ArticleWithLiveRevision, ContentType, EntityOption, EntityRelationship, RevisionContent, RevisionRecord, RevisionStatus, SourceLink, VerificationResult } from "@/lib/wiki-types";
import type { OpenFlightsAirline } from "@/lib/openflights";
import type { ImportField, ImportImage, ImportPreview, ImportProviderId } from "@/lib/import-types";
import type { NotificationRecord, NotificationType } from "@/lib/notification-types";
import type { PublicContributorActivity, PublicContribution } from "@/lib/public-profile-types";
import type {
  FleetSourceArticle,
  FleetSourceRelationship,
} from "@/lib/fleet-data";

type ArticleRow = { id: string; slug: string; title: string; content_type: ContentType; live_revision_id: string | null; created_at: Date | string; updated_at: Date | string };
type RevisionRow = { id: string; article_id: string; article_slug: string; proposed_slug: string; status: RevisionStatus; contributor_id: string; contributor_name: string; edit_summary: string; title: string; content_type: ContentType; markdown: string; fields_json: unknown; sections_json: unknown; sources_json: unknown; relationships_json: unknown; verification_json: unknown; moderator_id: string | null; moderator_note: string | null; parent_revision_id: string | null; created_at: Date | string; updated_at: Date | string; submitted_at: Date | string | null; reviewed_at: Date | string | null };

const iso = (value: Date | string) => value instanceof Date ? value.toISOString() : String(value);
const optionalIso = (value: Date | string | null) => value ? iso(value) : null;
const json = <T>(value: unknown, fallback: T): T => {
  if (value == null) return fallback;
  return typeof value === "string" ? JSON.parse(value) as T : value as T;
};

function mapArticle(value: ArticleRow): ArticleRecord {
  return { id: value.id, slug: value.slug, title: value.title, contentType: value.content_type, liveRevisionId: value.live_revision_id, createdAt: iso(value.created_at), updatedAt: iso(value.updated_at) };
}

function mapRevision(value: RevisionRow): RevisionRecord {
  return {
    id: value.id, articleId: value.article_id, articleSlug: value.article_slug, proposedSlug: value.proposed_slug || value.article_slug,
    status: value.status, contributorId: value.contributor_id, contributorName: value.contributor_name, editSummary: value.edit_summary,
    title: value.title, contentType: value.content_type, markdown: value.markdown,
    fields: json(value.fields_json, []), sections: json(value.sections_json, []), sources: json(value.sources_json, []), relationships: json(value.relationships_json, []),
    verification: json(value.verification_json, null), moderatorId: value.moderator_id, moderatorNote: value.moderator_note, parentRevisionId: value.parent_revision_id,
    createdAt: iso(value.created_at), updatedAt: iso(value.updated_at), submittedAt: optionalIso(value.submitted_at), reviewedAt: optionalIso(value.reviewed_at),
  };
}

let seeded: Promise<void> | undefined;
async function ready() {
  await ensureSchema();
  seeded ??= sql.begin(async (transaction) => {
    const existing = await transaction`SELECT id FROM articles WHERE slug=${f15Article.slug} AND content_type=${f15Article.contentType} LIMIT 1`;
    if (existing.length) return;
    const articleId = randomUUID();
    const revisionId = randomUUID();
    const now = new Date();
    await transaction`INSERT INTO articles (id,slug,title,content_type,live_revision_id,created_at,updated_at) VALUES (${articleId},${f15Article.slug},${f15Article.title},${f15Article.contentType},NULL,${now},${now})`;
    await transaction`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,markdown,fields_json,sections_json,sources_json,relationships_json,proposed_slug,parent_revision_id,created_at,updated_at,submitted_at,reviewed_at,moderator_id,moderator_note) VALUES (${revisionId},${articleId},'approved','system','aviation.wiki','Initial import of the existing article',${f15Article.title},${f15Article.contentType},${f15Article.markdown},${transaction.json(f15Article.fields)},${transaction.json(f15Article.sections)},${transaction.json(f15Article.sources)},${transaction.json([])},${f15Article.slug},NULL,${now},${now},${now},${now},'system','Imported from the existing live article')`;
    await transaction`UPDATE articles SET live_revision_id=${revisionId} WHERE id=${articleId}`;
  }).then(() => undefined);
  await seeded;
}

const revisionSelect = `SELECT r.*,a.slug AS article_slug FROM revisions r JOIN articles a ON a.id=r.article_id`;

export function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

export async function getAdminDashboard() {
  await ready();
  const [totals, queue] = await Promise.all([
    row<Record<string, number>>(`SELECT
      (SELECT COUNT(*)::int FROM articles) articles,
      (SELECT COUNT(*)::int FROM articles WHERE live_revision_id IS NOT NULL AND archived_at IS NULL) published,
      (SELECT COUNT(*)::int FROM articles WHERE archived_at IS NOT NULL) archived,
      (SELECT COUNT(*)::int FROM revisions WHERE status IN ('verifying','pending_review')) pending,
      (SELECT COUNT(DISTINCT contributor_id)::int FROM revisions WHERE contributor_id != 'system') contributors,
      (SELECT COUNT(DISTINCT source->>'url')::int FROM revisions, jsonb_array_elements(sources_json) source WHERE source->>'url' IS NOT NULL) sources,
      (SELECT COUNT(*)::int FROM articles WHERE protection_level != 'open' OR is_locked) "protectedPages",
      (SELECT COUNT(*)::int FROM admin_audit_log) "auditEvents"`),
    rows<Record<string, unknown>>(`SELECT r.*,a.slug article_slug,a.live_revision_id
      FROM revisions r JOIN articles a ON a.id=r.article_id
      WHERE r.status='pending_review'
      ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC LIMIT 5`),
  ]);
  return { totals, queue };
}

export type QueueFilters = {
  status?: string;
  contentType?: string;
  contributor?: string;
  submittedFrom?: string;
  verification?: string;
  conflicting?: boolean;
};

const adminRevisionSelect = `SELECT
  r.id,r.article_id,r.status,r.contributor_id,r.contributor_name,r.edit_summary,r.title,r.content_type,r.markdown,
  r.fields_json::text fields_json,r.sections_json::text sections_json,r.sources_json::text sources_json,
  r.relationships_json::text relationships_json,r.verification_json::text verification_json,
  r.moderator_id,r.moderator_note,r.assigned_moderator_id,r.proposed_slug,r.parent_revision_id,
  r.created_at,r.updated_at,r.submitted_at,r.reviewed_at,
  a.slug article_slug,a.live_revision_id,a.title article_title,
  (SELECT COUNT(*)::int FROM revisions other WHERE other.article_id=r.article_id AND other.status IN ('verifying','pending_review')) conflict_count
  FROM revisions r JOIN articles a ON a.id=r.article_id`;

export async function listAdminQueue(filters: QueueFilters = {}) {
  await ready();
  const conditions = ["r.status IN ('verifying','pending_review','changes_requested','rejected','approved')"];
  const values: unknown[] = [];
  const add = (condition: string, value: unknown) => {
    values.push(value);
    conditions.push(condition.replace("?", `$${values.length}`));
  };
  if (filters.status && filters.status !== "all") add("r.status=?", filters.status);
  if (filters.contentType && filters.contentType !== "all") add("r.content_type=?", filters.contentType);
  if (filters.contributor) {
    values.push(`%${filters.contributor}%`);
    conditions.push(`(r.contributor_name ILIKE $${values.length} OR r.contributor_id ILIKE $${values.length})`);
  }
  if (filters.submittedFrom) add("r.submitted_at>=?", `${filters.submittedFrom}T00:00:00.000Z`);
  if (filters.verification && filters.verification !== "all") {
    if (filters.verification === "missing") conditions.push("r.verification_json IS NULL");
    else add("r.verification_json->>'status'=?", filters.verification);
  }
  if (filters.conflicting) conditions.push("(SELECT COUNT(*) FROM revisions other WHERE other.article_id=r.article_id AND other.status IN ('verifying','pending_review'))>1");
  return rows<Record<string, unknown>>(`${adminRevisionSelect} WHERE ${conditions.join(" AND ")}
    ORDER BY COALESCE(r.submitted_at,r.updated_at) ASC LIMIT 250`, values);
}

export async function listAdminArticles(search = "") {
  await ready();
  return rows<Record<string, unknown>>(`SELECT a.*,r.status live_status,r.verification_json::text verification_json,
    (SELECT COUNT(*)::int FROM revisions x WHERE x.article_id=a.id) revision_count,
    (SELECT COUNT(*)::int FROM revisions x WHERE x.article_id=a.id AND x.status IN ('verifying','pending_review')) pending_count
    FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id
    WHERE a.title ILIKE $1 OR a.slug ILIKE $1 ORDER BY a.updated_at DESC LIMIT 250`, [`%${search}%`]);
}

export async function findDuplicateArticles() {
  await ready();
  return rows<{normalized_title:string;count:number;slugs:string}>(`SELECT lower(trim(title)) normalized_title,COUNT(*)::int count,string_agg(slug,', ' ORDER BY slug) slugs
    FROM articles WHERE archived_at IS NULL GROUP BY lower(trim(title)) HAVING COUNT(*)>1 ORDER BY count DESC`);
}

export async function getContributorStats() {
  await ready();
  return rows<Record<string, unknown>>(`SELECT contributor_id,MAX(contributor_name) contributor_name,
    COUNT(*) FILTER (WHERE status='approved')::int approved_count,
    COUNT(*) FILTER (WHERE status='rejected')::int rejected_count,
    COUNT(*) FILTER (WHERE status IN ('verifying','pending_review'))::int pending_count
    FROM revisions WHERE contributor_id!='system' GROUP BY contributor_id`);
}

export const getRevisionCountsByContributor = getContributorStats;

export async function getContributorProfiles() {
  await ready();
  return rows<Record<string, unknown>>("SELECT * FROM contributor_profiles");
}

export async function getAdminRevision(id: string) {
  await ready();
  return row<Record<string, unknown>>(`${adminRevisionSelect} WHERE r.id=$1`, [id]);
}

export async function getLiveRevisionForArticle(articleId: string) {
  await ready();
  return row<Record<string, unknown>>(`${adminRevisionSelect} WHERE a.id=$1 AND r.id=a.live_revision_id`, [articleId]);
}

export async function listPrivateRevisionNotes(revisionId: string) {
  await ready();
  return rows<Record<string, unknown>>("SELECT * FROM revision_private_notes WHERE revision_id=$1 ORDER BY created_at DESC", [revisionId]);
}

export async function listSourceReview() {
  await ready();
  const [sources, missing, staleContent] = await Promise.all([
    rows<Record<string, unknown>>(`SELECT source->>'url' url,MAX(COALESCE(source->>'title',source->>'label')) label,COUNT(*)::int usage_count,
      sc.status,sc.strength,sc.note,sc.checked_at,
      CASE WHEN sc.checked_at IS NULL OR sc.checked_at<NOW()-INTERVAL '180 days' THEN 1 ELSE 0 END stale
      FROM articles a JOIN revisions r ON r.id=a.live_revision_id CROSS JOIN LATERAL jsonb_array_elements(r.sources_json) source
      LEFT JOIN source_checks sc ON sc.url=source->>'url'
      WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL AND source->>'url' IS NOT NULL
      GROUP BY source->>'url',sc.status,sc.strength,sc.note,sc.checked_at
      ORDER BY usage_count DESC,url`),
    rows<Record<string, unknown>>(`SELECT r.id,r.title,r.status FROM articles a JOIN revisions r ON r.id=a.live_revision_id
      WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL AND jsonb_array_length(r.sources_json)=0
      ORDER BY r.updated_at DESC LIMIT 100`),
    rows<Record<string, unknown>>(`SELECT a.id,a.slug,a.content_type,r.title,COALESCE(r.reviewed_at,r.updated_at) last_modified_at,
      FLOOR(EXTRACT(EPOCH FROM (NOW()-COALESCE(r.reviewed_at,r.updated_at)))/86400)::int age_days,
      jsonb_array_length(r.sources_json)::int source_count,
      COUNT(*) FILTER (WHERE sc.status='broken')::int broken_sources,
      COUNT(*) FILTER (WHERE source IS NOT NULL AND (sc.checked_at IS NULL OR sc.checked_at<NOW()-INTERVAL '180 days'))::int stale_sources
      FROM articles a JOIN revisions r ON r.id=a.live_revision_id
      LEFT JOIN LATERAL jsonb_array_elements(r.sources_json) source ON true
      LEFT JOIN source_checks sc ON sc.url=source->>'url'
      WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL
      GROUP BY a.id,a.slug,a.content_type,r.title,r.reviewed_at,r.updated_at,r.sources_json
      HAVING COALESCE(r.reviewed_at,r.updated_at)<NOW()-INTERVAL '365 days'
        OR jsonb_array_length(r.sources_json)=0 OR COUNT(*) FILTER (WHERE sc.status='broken')>0
      ORDER BY broken_sources DESC,age_days DESC,r.title LIMIT 200`),
  ]);
  return { sources, missing, staleContent };
}

export async function listAuditLog() {
  await ready();
  return rows<Record<string, unknown>>("SELECT id,actor_id,actor_name,action,entity_type,entity_id,article_id,revision_id,before_json::text before_json,after_json::text after_json,created_at FROM admin_audit_log ORDER BY created_at DESC LIMIT 500");
}

export async function getAllRevisionHistory(articleId: string) {
  await ready();
  return rows<Record<string, unknown>>("SELECT id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,created_at,updated_at,submitted_at,reviewed_at FROM revisions WHERE article_id=$1 ORDER BY created_at DESC", [articleId]);
}

export async function getArticleAdminById(id: string) {
  await ready();
  return row<Record<string, unknown>>("SELECT * FROM articles WHERE id=$1", [id]);
}

export async function assessImportPreview(preview: ImportPreview) {
  await ready();
  const slug = normalizeSlug(preview.title);
  const [titleMatches, aliasMatches, externalMapping] = await Promise.all([
    rows<Record<string, unknown>>(`SELECT a.id,a.title,a.slug,a.content_type,a.archived_at,a.redirect_to_slug,a.protection_level,a.is_locked,r.status
      FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id
      WHERE lower(a.title)=lower($1) OR lower(a.slug)=lower($2) ORDER BY a.updated_at DESC LIMIT 20`, [preview.title, slug]),
    rows<Record<string, unknown>>(`SELECT a.id,a.title,a.slug,a.content_type,a.archived_at,x.old_slug
      FROM article_slug_redirects x JOIN articles a ON a.id=x.article_id WHERE lower(x.old_slug)=lower($1)`, [slug]),
    row<Record<string, unknown>>(`SELECT x.article_id,a.title,a.slug,a.content_type,a.archived_at
      FROM article_external_identifiers x JOIN articles a ON a.id=x.article_id WHERE x.provider=$1 AND x.source_identifier=$2`, [preview.provider, preview.sourceId]),
  ]);
  const identifierCollisions: Array<Record<string, unknown>> = [];
  for (const field of preview.fields.filter((item) => /code|registration|callsign|designation|iso 3166/i.test(item.key))) {
    identifierCollisions.push(...await rows<Record<string, unknown>>(`SELECT DISTINCT a.id,a.title,a.slug,a.content_type,a.archived_at,$1 field_key,$2 field_value
      FROM revisions r JOIN articles a ON a.id=r.article_id CROSS JOIN LATERAL jsonb_array_elements(r.fields_json) field
      WHERE r.status!='rejected' AND lower(field->>'key')=lower($1) AND lower(field->>'value')=lower($2)
      ORDER BY a.updated_at DESC LIMIT 20`, [field.key, field.value]));
  }
  return { titleMatches, aliasMatches, externalMapping: externalMapping || null, identifierCollisions };
}

export async function listImportHistory() {
  await ready();
  return rows<Record<string, unknown>>(`SELECT h.id,h.actor_id,h.actor_name,h.provider,h.source_identifiers_json::text source_identifiers_json,
    h.article_id,h.revision_id,h.created_at,a.title article_title,a.slug article_slug,a.content_type,r.status revision_status
    FROM import_history h JOIN articles a ON a.id=h.article_id JOIN revisions r ON r.id=h.revision_id
    ORDER BY h.created_at DESC LIMIT 500`);
}

export async function listFailedEmailDeliveries(limit = 100) {
  await ready();
  return rows<Record<string, unknown>>(`SELECT d.id,d.notification_id,d.status,d.provider_message_id,d.failure_reason,d.retry_count,d.created_at,d.updated_at,
    n.type,n.article_id,n.revision_id FROM notification_email_deliveries d JOIN notifications n ON n.id=d.notification_id
    WHERE d.status='failed' ORDER BY d.updated_at DESC LIMIT $1`, [Math.min(500, Math.max(1, limit))]);
}

function mapNotification(value: {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  article_id: string | null;
  revision_id: string | null;
  read_at: Date | string | null;
  created_at: Date | string;
}): NotificationRecord {
  return {
    id: value.id,
    userId: value.user_id,
    type: value.type,
    title: value.title,
    message: value.message,
    href: value.href,
    articleId: value.article_id,
    revisionId: value.revision_id,
    readAt: optionalIso(value.read_at),
    createdAt: iso(value.created_at),
  };
}

export async function getUnreadCount(userId: string) {
  await ready();
  return Number((await row<{count:number}>("SELECT COUNT(*)::int count FROM notifications WHERE user_id=$1 AND read_at IS NULL", [userId]))?.count ?? 0);
}

export async function listNotifications(userId: string, page = 1, pageSize = 20) {
  await ready();
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  const [total, values] = await Promise.all([
    row<{count:number}>("SELECT COUNT(*)::int count FROM notifications WHERE user_id=$1", [userId]),
    rows<Parameters<typeof mapNotification>[0]>("SELECT id,user_id,type,title,message,href,article_id,revision_id,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3", [userId, safeSize, (safePage - 1) * safeSize]),
  ]);
  return {
    items: values.map(mapNotification),
    total: Number(total?.count ?? 0),
    page: safePage,
    pages: Math.max(1, Math.ceil(Number(total?.count ?? 0) / safeSize)),
  };
}

export async function assignRevision(revisionId: string, moderatorId: string | null) {
  await ready();
  await sql`UPDATE revisions SET assigned_moderator_id=${moderatorId},updated_at=${new Date()} WHERE id=${revisionId}`;
}

export async function addPrivateRevisionNote(input: {
  revisionId: string;
  moderatorId: string;
  moderatorName: string;
  note: string;
}) {
  await ready();
  await sql`INSERT INTO revision_private_notes (id,revision_id,moderator_id,moderator_name,note,created_at)
    VALUES (${randomUUID()},${input.revisionId},${input.moderatorId},${input.moderatorName},${input.note},${new Date()})`;
}

export async function upsertContributorProfile(input: {
  userId: string;
  notes: string;
  restriction: string;
  trusted: boolean;
}) {
  await ready();
  await sql`INSERT INTO contributor_profiles (user_id,moderator_notes,restriction,trusted,updated_at)
    VALUES (${input.userId},${input.notes},${input.restriction},${input.trusted},${new Date()})
    ON CONFLICT (user_id) DO UPDATE SET moderator_notes=EXCLUDED.moderator_notes,restriction=EXCLUDED.restriction,trusted=EXCLUDED.trusted,updated_at=EXCLUDED.updated_at`;
}

export async function updateSourceCheck(input: {
  url: string;
  status: string;
  strength: string;
  note: string;
  checkedBy: string;
}) {
  await ready();
  await sql`INSERT INTO source_checks (url,status,strength,note,checked_by,checked_at)
    VALUES (${input.url},${input.status},${input.strength},${input.note},${input.checkedBy},${new Date()})
    ON CONFLICT (url) DO UPDATE SET status=EXCLUDED.status,strength=EXCLUDED.strength,note=EXCLUDED.note,checked_by=EXCLUDED.checked_by,checked_at=EXCLUDED.checked_at`;
}

export async function recordAdminAudit(input: {
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
  await ready();
  await sql`INSERT INTO admin_audit_log (id,actor_id,actor_name,action,entity_type,entity_id,article_id,revision_id,before_json,after_json,created_at)
    VALUES (${randomUUID()},${input.actorId},${input.actorName},${input.action},${input.entityType},${input.entityId},${input.articleId ?? null},${input.revisionId ?? null},
      ${input.before === undefined ? null : sql.json(input.before as never)},${input.after === undefined ? null : sql.json(input.after as never)},${new Date()})`;
}

export async function updateArticleAdmin(input: {
  articleId: string;
  protectionLevel: string;
  locked: boolean;
  archived: boolean;
  redirectToSlug: string | null;
  slug?: string;
}) {
  await ready();
  await sql.begin(async (transaction) => {
    const [article] = await transaction`SELECT * FROM articles WHERE id=${input.articleId} FOR UPDATE`;
    if (!article) throw new UserFacingError("Article not found.");
    const slug = input.slug || String(article.slug);
    const [collision] = await transaction`SELECT id FROM articles WHERE content_type=${String(article.content_type)} AND slug=${slug} AND id!=${input.articleId}`;
    if (collision) throw new UserFacingError("That slug is already used by another article of this type.");
    const [aliasCollision] = await transaction`SELECT article_id FROM article_slug_redirects WHERE content_type=${String(article.content_type)} AND old_slug=${slug} AND article_id!=${input.articleId}`;
    if (aliasCollision) throw new UserFacingError("That slug is reserved by another article redirect.");
    if (input.archived) {
      const [incoming] = await transaction`SELECT COUNT(*)::int count FROM article_relationships WHERE target_article_id=${input.articleId}`;
      if (Number(incoming.count)) throw new UserFacingError("This entity is referenced by approved relationships. Remove those links through reviewed revisions before archiving it.");
    }
    if (input.redirectToSlug) {
      const [target] = await transaction`SELECT id,redirect_to_slug FROM articles WHERE content_type=${String(article.content_type)} AND slug=${input.redirectToSlug}`;
      if (!target) throw new UserFacingError("The redirect target must be an existing article of the same type.");
      const visited = new Set([input.articleId]);
      let cursor = target;
      while (cursor) {
        if (visited.has(String(cursor.id))) throw new UserFacingError("That redirect would create a loop.");
        visited.add(String(cursor.id));
        if (!cursor.redirect_to_slug) break;
        [cursor] = await transaction`SELECT id,redirect_to_slug FROM articles WHERE content_type=${String(article.content_type)} AND slug=${String(cursor.redirect_to_slug)}`;
      }
    }
    const now = new Date();
    if (slug !== article.slug)
      await transaction`INSERT INTO article_slug_redirects (content_type,old_slug,article_id,created_at)
        VALUES (${String(article.content_type)},${String(article.slug)},${input.articleId},${now})
        ON CONFLICT (content_type,old_slug) DO UPDATE SET article_id=EXCLUDED.article_id,created_at=EXCLUDED.created_at
        WHERE article_slug_redirects.article_id=EXCLUDED.article_id`;
    await transaction`UPDATE articles SET slug=${slug},protection_level=${input.protectionLevel},is_locked=${input.locked},
      archived_at=${input.archived ? now : null},redirect_to_slug=${input.redirectToSlug},updated_at=${now} WHERE id=${input.articleId}`;
    if (slug !== article.slug)
      await transaction`UPDATE revisions SET proposed_slug=${slug}
        WHERE article_id=${input.articleId} AND status IN ('draft','verifying','pending_review','changes_requested') AND proposed_slug=${String(article.slug)}`;
  });
}

export async function getRevision(id: string) {
  await ready();
  const value = await row<RevisionRow>(`${revisionSelect} WHERE r.id=$1`, [id]);
  return value ? mapRevision(value) : null;
}

export async function getArticleBySlug(slug: string, contentType?: ContentType): Promise<ArticleWithLiveRevision | null> {
  await ready();
  const value = contentType
    ? await row<ArticleRow>("SELECT * FROM articles WHERE slug=$1 AND content_type=$2", [slug, contentType])
    : await row<ArticleRow>("SELECT * FROM articles WHERE slug=$1 ORDER BY updated_at DESC LIMIT 1", [slug]);
  if (!value) return null;
  const article = mapArticle(value);
  return { ...article, liveRevision: article.liveRevisionId ? await getRevision(article.liveRevisionId) : null };
}

export async function ensureDirectoryAirlineArticle(
  airline: OpenFlightsAirline,
) {
  await ready();
  const slug = normalizeSlug(airline.name);
  const existing = await getArticleBySlug(slug, "airline");
  if (existing?.liveRevision?.status === "approved") return existing;
  const articleId = existing?.id || randomUUID();
  const revisionId = randomUUID();
  const now = new Date();
  const fields = [
    { key: "IATA code", value: airline.iata },
    { key: "ICAO code", value: airline.icao || "Not listed" },
    { key: "Callsign", value: airline.callsign || "Not listed" },
    { key: "Country", value: airline.country || "Not listed" },
    { key: "Status", value: airline.active ? "Active" : "Ceased" },
  ];
  const markdown = `${airline.name} is ${airline.active ? "an active" : "a historic"} airline${airline.country ? ` based in ${airline.country}` : ""}. Its IATA code is ${airline.iata}${airline.icao ? ` and its ICAO designator is ${airline.icao}` : ""}.`;
  await sql.begin(async (transaction) => {
    if (!existing)
      await transaction`INSERT INTO articles (id,slug,title,content_type,live_revision_id,created_at,updated_at) VALUES (${articleId},${slug},${airline.name},'airline',NULL,${now},${now}) ON CONFLICT (content_type,slug) DO NOTHING`;
    const [article] = await transaction`SELECT id,live_revision_id FROM articles WHERE content_type='airline' AND slug=${slug} LIMIT 1 FOR UPDATE`;
    if (!article || article.live_revision_id) return;
    await transaction`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,markdown,fields_json,sections_json,sources_json,relationships_json,proposed_slug,parent_revision_id,created_at,updated_at,submitted_at,reviewed_at,moderator_id,moderator_note) VALUES (${revisionId},${String(article.id)},'approved','system','aviation.wiki','Initial import from the OpenFlights airline directory',${airline.name},'airline',${markdown},${transaction.json(fields)},${transaction.json([])},${transaction.json([{ label: "OpenFlights airline database", url: "https://openflights.org/data.php", publisher: "OpenFlights" }])},${transaction.json([])},${slug},NULL,${now},${now},${now},${now},'system','Imported from the public airline directory')`;
    await transaction`UPDATE articles SET live_revision_id=${revisionId},updated_at=${now} WHERE id=${String(article.id)} AND live_revision_id IS NULL`;
  });
  const article = await getArticleBySlug(slug, "airline");
  if (article?.liveRevision?.id === revisionId)
    await submitIndexNow([articlePath("airline", slug)]);
  return article;
}

export async function getArticleById(id: string): Promise<ArticleWithLiveRevision | null> {
  await ready();
  const value = await row<ArticleRow>("SELECT * FROM articles WHERE id=$1", [id]);
  if (!value) return null;
  const article = mapArticle(value);
  return { ...article, liveRevision: article.liveRevisionId ? await getRevision(article.liveRevisionId) : null };
}

export async function listArticleHistory(articleId: string) {
  await ready();
  return (await rows<RevisionRow>(`${revisionSelect} WHERE r.article_id=$1 AND r.status='approved' ORDER BY r.reviewed_at DESC,r.created_at DESC`, [articleId])).map(mapRevision);
}

export async function getApprovedRevision(articleId: string, revisionId: string) {
  const revision = await getRevision(revisionId);
  return revision?.articleId === articleId && revision.status === "approved" ? revision : null;
}

export async function listEntityOptions(): Promise<EntityOption[]> {
  await ready();
  const values = await rows<{id:string;title:string;slug:string;content_type:ContentType}>("SELECT id,title,slug,content_type FROM articles ORDER BY content_type,title");
  return values.map((value) => ({id:value.id,title:value.title,slug:value.slug,contentType:value.content_type}));
}

async function loadApprovedEntityOptions(): Promise<EntityOption[]> {
  await ready();
  const values = await rows<{id:string;title:string;slug:string;content_type:ContentType}>("SELECT a.id,a.title,a.slug,a.content_type FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL ORDER BY a.content_type,a.title");
  return values.map((value) => ({id:value.id,title:value.title,slug:value.slug,contentType:value.content_type}));
}

// Every public article render reads this to build cross-links. The set only
// changes when an article is approved or edited, which already busts this tag.
export const listApprovedEntityOptions = unstable_cache(
  loadApprovedEntityOptions,
  ["approved-entity-options"],
  { revalidate: 86_400, tags: [PUBLIC_SEARCH_DOCUMENTS_TAG] },
);

export async function getEditableRevision(articleId: string, contributorId: string) {
  await ready();
  const value = await row<RevisionRow>(`${revisionSelect} WHERE r.article_id=$1 AND r.contributor_id=$2 AND r.status IN ('draft','changes_requested') ORDER BY r.updated_at DESC LIMIT 1`, [articleId, contributorId]);
  return value ? mapRevision(value) : null;
}

export async function listContributorRevisions(contributorId: string) {
  await ready();
  return (await rows<RevisionRow>(`${revisionSelect} WHERE r.contributor_id=$1 ORDER BY r.updated_at DESC`, [contributorId])).map(mapRevision);
}

export async function getPublicContributorActivity(
  contributorId: string,
): Promise<PublicContributorActivity> {
  await ready();
  const [summary, activity] = await Promise.all([
    row<{
      approved_count: number;
      article_count: number;
      first_contribution_at: Date | string | null;
    }>(
      `SELECT
        COUNT(*)::int approved_count,
        COUNT(DISTINCT r.article_id)::int article_count,
        MIN(COALESCE(r.reviewed_at,r.created_at)) first_contribution_at
      FROM revisions r
      JOIN articles a ON a.id=r.article_id
      WHERE r.contributor_id=$1 AND r.status='approved' AND a.archived_at IS NULL`,
      [contributorId],
    ),
    rows<{
      id: string;
      article_slug: string;
      title: string;
      content_type: ContentType;
      edit_summary: string;
      contributed_at: Date | string;
    }>(
      `SELECT
        r.id,
        a.slug article_slug,
        r.title,
        r.content_type,
        r.edit_summary,
        COALESCE(r.reviewed_at,r.created_at) contributed_at
      FROM revisions r
      JOIN articles a ON a.id=r.article_id
      WHERE r.contributor_id=$1 AND r.status='approved' AND a.archived_at IS NULL
      ORDER BY COALESCE(r.reviewed_at,r.created_at) DESC
      LIMIT 12`,
      [contributorId],
    ),
  ]);

  const contributions: PublicContribution[] = activity.map((item) => ({
    id: item.id,
    articleSlug: item.article_slug,
    title: item.title,
    contentType: item.content_type,
    editSummary: item.edit_summary,
    contributedAt: iso(item.contributed_at),
  }));

  return {
    approvedCount: Number(summary?.approved_count ?? 0),
    articleCount: Number(summary?.article_count ?? 0),
    firstContributionAt: summary?.first_contribution_at
      ? iso(summary.first_contribution_at)
      : null,
    contributions,
  };
}

export async function getContributorRestriction(userId: string) {
  await ready();
  return (await row<{restriction:string}>("SELECT restriction FROM contributor_profiles WHERE user_id=$1", [userId]))?.restriction ?? "none";
}

export async function assertArticleEditable(articleId: string, role: WikiRole, restriction = "none") {
  await ready();
  const article = await row<{archived_at:Date|string|null;protection_level:string;is_locked:boolean}>("SELECT archived_at,protection_level,is_locked FROM articles WHERE id=$1", [articleId]);
  if (!article) throw new UserFacingError("Article not found.");
  if (restriction === "suspended" || restriction === "read_only") throw new UserFacingError("This account is not allowed to submit edits.");
  if (article.archived_at) throw new UserFacingError("Archived articles cannot be edited.");
  if (article.is_locked && role !== "admin") throw new UserFacingError("This article is locked.");
  const ranks: Record<string, number> = { contributor: 0, trusted_contributor: 1, moderator: 2, admin: 3 };
  const required: Record<string, number> = { open: 0, trusted: 1, moderator: 2, admin: 3 };
  if ((ranks[role] ?? 0) < (required[article.protection_level] ?? 0)) throw new UserFacingError("Your role cannot edit this protected article.");
}

export async function validateRelationships(articleId: string, sourceType: ContentType, relationships: EntityRelationship[], citationIdentifiers: Set<string>) {
  if (!relationships.length) return;
  await ready();
  const targetIds = [...new Set(relationships.map((relationship) => relationship.targetArticleId))];
  const values = await sql`SELECT a.id,a.content_type,a.archived_at,r.status FROM articles a LEFT JOIN revisions r ON r.id=a.live_revision_id WHERE a.id IN ${sql(targetIds)}` as unknown as Array<{id:string;content_type:ContentType;archived_at:Date|string|null;status:RevisionStatus|null}>;
  const targets = new Map(values.map((value) => [value.id, value]));
  const seen = new Set<string>();
  for (const relationship of relationships) {
    const key = relationshipKey(relationship);
    if (seen.has(key)) throw new UserFacingError("Duplicate relationships are not allowed.");
    seen.add(key);
    const target = targets.get(relationship.targetArticleId);
    if (!target || target.status !== "approved" || target.archived_at) throw new UserFacingError("Relationships may only target existing approved entities.");
    validateRelationshipShape(articleId, sourceType, relationship, target.content_type);
    for (const identifier of relationship.citationIdentifiers) if (!citationIdentifiers.has(identifier.toLowerCase())) throw new UserFacingError(`Relationship citation [^${identifier}] is not defined in the article.`);
  }
}

export async function createOrGetArticle(slug: string, title: string, contentType: ContentType) {
  const existing = await getArticleBySlug(slug, contentType);
  if (existing) return existing;
  await ready();
  const id = randomUUID();
  const now = new Date();
  await sql.begin(async (transaction) => {
    const reserved = await transaction`SELECT 1 FROM article_slug_redirects WHERE content_type=${contentType} AND old_slug=${slug} LIMIT 1`;
    if (reserved.length) throw new UserFacingError("That slug is reserved by an existing article redirect.");
    await transaction`INSERT INTO articles (id,slug,title,content_type,live_revision_id,created_at,updated_at) VALUES (${id},${slug},${title},${contentType},NULL,${now},${now}) ON CONFLICT (content_type,slug) DO NOTHING`;
  });
  const article = await getArticleBySlug(slug, contentType);
  if (!article) throw new UserFacingError("Article could not be created.");
  return article;
}

export async function saveDraft(input: { revisionId?: string; articleId: string; proposedSlug: string; contributorId: string; contributorName: string; editSummary: string; content: RevisionContent; parentRevisionId: string | null }) {
  await ready();
  const id = input.revisionId || randomUUID();
  const now = new Date();
  await sql.begin(async (transaction) => {
    if (input.revisionId) {
      const values = await transaction.unsafe(`${revisionSelect} WHERE r.id=$1 FOR UPDATE`, [input.revisionId]) as unknown as RevisionRow[];
      const existing = values[0] ? mapRevision(values[0]) : null;
      if (!existing || existing.contributorId !== input.contributorId || !["draft", "changes_requested"].includes(existing.status)) throw new UserFacingError("This revision cannot be edited.");
      await transaction`UPDATE revisions SET status='draft',contributor_name=${input.contributorName},edit_summary=${input.editSummary},title=${input.content.title},content_type=${input.content.contentType},markdown=${input.content.markdown},fields_json=${transaction.json(input.content.fields)},sections_json=${transaction.json(input.content.sections)},sources_json=${transaction.json(input.content.sources)},relationships_json=${transaction.json(input.content.relationships)},proposed_slug=${input.proposedSlug},verification_json=NULL,moderator_note=NULL,updated_at=${now} WHERE id=${input.revisionId}`;
      await transaction`DELETE FROM revision_import_field_sources s WHERE s.revision_id=${input.revisionId} AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(${transaction.json(input.content.fields)}::jsonb) AS f(key text,value text) WHERE f.key=s.field_key AND f.value=s.field_value)`;
      if (existing.status === "changes_requested") await transaction`INSERT INTO revision_events (id,revision_id,actor_id,from_status,to_status,note,created_at) VALUES (${randomUUID()},${input.revisionId},${input.contributorId},${existing.status},'draft','Contributor resumed the requested changes.',${now})`;
      return;
    }
    await transaction`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,markdown,fields_json,sections_json,sources_json,relationships_json,proposed_slug,parent_revision_id,created_at,updated_at) VALUES (${id},${input.articleId},'draft',${input.contributorId},${input.contributorName},${input.editSummary},${input.content.title},${input.content.contentType},${input.content.markdown},${transaction.json(input.content.fields)},${transaction.json(input.content.sections)},${transaction.json(input.content.sources)},${transaction.json(input.content.relationships)},${input.proposedSlug},${input.parentRevisionId},${now},${now})`;
  });
  const revision = await getRevision(id);
  if (!revision) throw new UserFacingError("Draft could not be saved.");
  return revision;
}

export async function transitionRevision(id: string, actorId: string, toStatus: RevisionStatus, options: { note?: string | null; verification?: VerificationResult | null; moderator?: boolean } = {}) {
  const allowedTransitions: Record<RevisionStatus, RevisionStatus[]> = { draft: ["verifying", "pending_review"], verifying: ["pending_review", "changes_requested", "approved", "rejected"], pending_review: ["changes_requested", "approved", "rejected"], changes_requested: ["draft"], approved: [], rejected: [] };
  await ready();
  await sql.begin(async (transaction) => {
    const values = await transaction.unsafe(`${revisionSelect} WHERE r.id=$1 FOR UPDATE`, [id]) as unknown as RevisionRow[];
    const revision = values[0] ? mapRevision(values[0]) : null;
    if (!revision) throw new UserFacingError("Revision not found.");
    if (!allowedTransitions[revision.status].includes(toStatus)) throw new UserFacingError(`Revision cannot move from ${revision.status} to ${toStatus}.`);
    const now = new Date();
    await transaction`UPDATE revisions SET status=${toStatus},verification_json=CASE WHEN ${Boolean(options.verification)} THEN ${options.verification ? transaction.json(options.verification) : null} ELSE verification_json END,moderator_id=CASE WHEN ${Boolean(options.moderator)} THEN ${actorId} ELSE moderator_id END,moderator_note=COALESCE(${options.note ?? null},moderator_note),submitted_at=CASE WHEN ${toStatus} IN ('verifying','pending_review') THEN COALESCE(submitted_at,${now}) ELSE submitted_at END,reviewed_at=CASE WHEN ${toStatus} IN ('approved','rejected','changes_requested') THEN ${now} ELSE reviewed_at END,updated_at=${now} WHERE id=${id}`;
    await transaction`INSERT INTO revision_events (id,revision_id,actor_id,from_status,to_status,note,created_at) VALUES (${randomUUID()},${id},${actorId},${revision.status},${toStatus},${options.note ?? null},${now})`;
  });
  const revision = await getRevision(id);
  if (!revision) throw new UserFacingError("Revision not found.");
  return revision;
}

export async function listReviewQueue() {
  await ready();
  return (await rows<RevisionRow>(`${revisionSelect} WHERE r.status IN ('verifying','pending_review') ORDER BY r.submitted_at ASC,r.updated_at ASC`)).map(mapRevision);
}

export async function moderatorEditRevision(id: string, content: RevisionContent, proposedSlug: string, editSummary: string, moderatorId: string) {
  await ready();
  const now = new Date();
  const updated = await sql`UPDATE revisions SET title=${content.title},content_type=${content.contentType},markdown=${content.markdown},fields_json=${sql.json(content.fields)},sections_json=${sql.json(content.sections)},sources_json=${sql.json(content.sources)},relationships_json=${sql.json(content.relationships)},proposed_slug=${proposedSlug},edit_summary=${editSummary},moderator_id=${moderatorId},updated_at=${now} WHERE id=${id} AND status IN ('pending_review','verifying') RETURNING id`;
  if (updated.length !== 1) throw new UserFacingError("Revision is not awaiting review.");
  await sql`DELETE FROM revision_import_field_sources s WHERE s.revision_id=${id} AND NOT EXISTS (SELECT 1 FROM jsonb_to_recordset(${sql.json(content.fields)}::jsonb) AS f(key text,value text) WHERE f.key=s.field_key AND f.value=s.field_value)`;
  const revision = await getRevision(id);
  if (!revision) throw new UserFacingError("Revision not found.");
  return revision;
}

export async function publishRevision(id: string, moderatorId: string, note?: string | null) {
  const revision = await getRevision(id);
  if (!revision || !["pending_review", "verifying"].includes(revision.status)) throw new UserFacingError("This revision is no longer awaiting review.");
  const article = await getArticleById(revision.articleId);
  if (!article) throw new UserFacingError("Article not found.");
  if (article.liveRevisionId !== revision.parentRevisionId) throw new UserFacingError("The live article changed after this revision was created. Rebase and review it again before approval.");
  if (revision.contentType !== article.contentType) throw new UserFacingError("An existing article cannot change content type through a revision.");
  const parsedMarkdown = parseArticleMarkdown(revision.markdown);
  if (parsedMarkdown.errors.length) throw new UserFacingError("This revision contains invalid or unsafe Markdown and cannot be approved.");
  await validateRelationships(revision.articleId, revision.contentType, revision.relationships, new Set(parsedMarkdown.citations.map((citation) => citation.identifier)));
  await sql.begin(async (transaction) => {
    const [currentRevision] = await transaction`SELECT status FROM revisions WHERE id=${id} FOR UPDATE`;
    const [currentArticle] = await transaction`SELECT slug,live_revision_id,archived_at FROM articles WHERE id=${revision.articleId} FOR UPDATE`;
    if (!currentRevision || !["pending_review", "verifying"].includes(String(currentRevision.status))) throw new UserFacingError("This revision is no longer awaiting review.");
    if (!currentArticle || currentArticle.archived_at) throw new UserFacingError("Archived articles cannot be published.");
    if (currentArticle.live_revision_id !== revision.parentRevisionId) throw new UserFacingError("The live article changed after this revision was created. Rebase and review it again before approval.");
    const [collision] = await transaction`SELECT id FROM articles WHERE content_type=${revision.contentType} AND slug=${revision.proposedSlug} AND id!=${revision.articleId}`;
    if (collision) throw new UserFacingError("That slug is already used by another article of this type.");
    const [aliasCollision] = await transaction`SELECT article_id FROM article_slug_redirects WHERE content_type=${revision.contentType} AND old_slug=${revision.proposedSlug} AND article_id!=${revision.articleId}`;
    if (aliasCollision) throw new UserFacingError("That slug is reserved by another article redirect.");
    const now = new Date();
    await transaction`UPDATE revisions SET status='approved',moderator_id=${moderatorId},moderator_note=COALESCE(${note ?? null},moderator_note),reviewed_at=${now},updated_at=${now} WHERE id=${id}`;
    await transaction`INSERT INTO revision_events (id,revision_id,actor_id,from_status,to_status,note,created_at)
      VALUES (${randomUUID()},${id},${moderatorId},${String(currentRevision.status)},'approved',${note ?? null},${now})`;
    if (revision.proposedSlug !== currentArticle.slug)
      await transaction`INSERT INTO article_slug_redirects (content_type,old_slug,article_id,created_at)
        VALUES (${revision.contentType},${String(currentArticle.slug)},${revision.articleId},${now})
        ON CONFLICT (content_type,old_slug) DO UPDATE SET article_id=EXCLUDED.article_id,created_at=EXCLUDED.created_at
        WHERE article_slug_redirects.article_id=EXCLUDED.article_id`;
    await transaction`UPDATE articles SET slug=${revision.proposedSlug},title=${revision.title},content_type=${revision.contentType},live_revision_id=${id},updated_at=${now} WHERE id=${revision.articleId}`;
    await transaction`DELETE FROM article_relationships WHERE source_article_id=${revision.articleId}`;
    for (const relationship of revision.relationships)
      await transaction`INSERT INTO article_relationships (source_article_id,target_article_id,relationship_type,approved_revision_id,created_at)
        VALUES (${revision.articleId},${relationship.targetArticleId},${relationship.type},${id},${now})`;
  });
  const publishedArticle = (await getArticleById(revision.articleId))!;
  await submitIndexNow([
    articlePath(revision.contentType, revision.articleSlug),
    articlePath(publishedArticle.contentType, publishedArticle.slug),
  ]);
  return publishedArticle;
}

export async function restoreRevision(sourceRevisionId: string, moderatorId: string, moderatorName: string) {
  const source = await getRevision(sourceRevisionId);
  if (!source || source.status !== "approved") throw new UserFacingError("Only approved revisions can be restored.");
  const article = await getArticleById(source.articleId);
  if (!article) throw new UserFacingError("Article not found.");
  const restored = await saveDraft({
    articleId: source.articleId,
    proposedSlug: article.slug,
    contributorId: moderatorId,
    contributorName: moderatorName,
    editSummary: `Restore revision ${source.id.slice(0, 8)}`,
    content: source,
    parentRevisionId: article.liveRevisionId,
  });
  await sql.begin(async (transaction) => {
    await transaction`INSERT INTO revision_import_field_sources
      SELECT ${restored.id},field_key,field_value,provider,source_identifier,source_urls_json
      FROM revision_import_field_sources WHERE revision_id=${sourceRevisionId} ON CONFLICT DO NOTHING`;
    await transaction`INSERT INTO revision_import_images
      SELECT ${restored.id},file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at
      FROM revision_import_images WHERE revision_id=${sourceRevisionId} ON CONFLICT DO NOTHING`;
  });
  return transitionRevision(restored.id, moderatorId, "pending_review", {
    note: "Proposed restoration of an earlier approved revision.",
    moderator: true,
  });
}

export async function createImportedDraft(input: {
  provider: ImportProviderId;
  sourceIdentifier: string;
  title: string;
  contentType: ContentType;
  targetArticleId?: string;
  fields: ImportField[];
  images: ImportImage[];
  actorId: string;
  actorName: string;
}) {
  const slug = normalizeSlug(input.title);
  if (!slug) throw new UserFacingError("The imported title cannot produce a valid slug.");
  if (input.fields.some((field) => !field.verified || !field.sourceUrls.length)) throw new UserFacingError("Every imported field must be verified and retain at least one source.");
  if (input.images.some((image) => !image.compatible || !image.creator || !image.license || !image.licenseUrl || !image.attribution || !image.sourcePage || !image.retrievedAt)) throw new UserFacingError("Every imported image must have complete compatible reuse metadata.");
  await ready();
  const mapping = await row<{article_id:string}>("SELECT article_id FROM article_external_identifiers WHERE provider=$1 AND source_identifier=$2", [input.provider, input.sourceIdentifier]);
  if (mapping && (!input.targetArticleId || mapping.article_id !== input.targetArticleId)) throw new UserFacingError("This provider entity is already linked to another aviation.wiki article.");
  const slugMatch = await getArticleBySlug(slug, input.contentType);
  if (!input.targetArticleId && slugMatch) throw new UserFacingError("A matching article already exists and must be selected explicitly.");
  for (const field of input.fields.filter((item) => /code|registration|callsign|designation|iso 3166/i.test(item.key))) {
    const collision = await row<{id:string;title:string}>(`SELECT DISTINCT a.id,a.title FROM revisions r JOIN articles a ON a.id=r.article_id
      CROSS JOIN LATERAL jsonb_array_elements(r.fields_json) value
      WHERE r.status!='rejected' AND lower(value->>'key')=lower($1) AND lower(value->>'value')=lower($2) AND a.id!=$3 LIMIT 1`,
      [field.key, field.value, input.targetArticleId || ""]);
    if (collision) throw new UserFacingError(`Imported identifier “${field.key}: ${field.value}” already belongs to ${collision.title}.`);
  }
  let article = input.targetArticleId ? await getArticleById(input.targetArticleId) : null;
  if (input.targetArticleId && !article) throw new UserFacingError("Selected target article not found.");
  if (article && article.contentType !== input.contentType) throw new UserFacingError("The target article has a different content type.");
  if (!article) article = await createOrGetArticle(slug, input.title, input.contentType);
  const controls = await row<{archived_at:Date|string|null;redirect_to_slug:string|null}>("SELECT archived_at,redirect_to_slug FROM articles WHERE id=$1", [article.id]);
  if (controls?.archived_at) throw new UserFacingError("Archived articles cannot receive imports.");
  if (controls?.redirect_to_slug) throw new UserFacingError("Redirect articles cannot receive imports.");
  const currentFields = article.liveRevision?.fields || [];
  const currentByKey = new Map(currentFields.map((field) => [field.key.toLowerCase(), field.value]));
  for (const field of input.fields) {
    const current = currentByKey.get(field.key.toLowerCase());
    if (current && current !== field.value) throw new UserFacingError(`Imported field “${field.key}” conflicts with approved information and cannot overwrite it.`);
  }
  const addedFields = input.fields.filter((field) => !currentByKey.has(field.key.toLowerCase())).map(({ key, value }) => ({ key, value }));
  const sources = [...new Map(input.fields.flatMap((field) => field.sourceUrls.map((url) => [url, {
    title: field.sourceLabel,
    publisher: input.provider === "wikidata" ? "Wikidata" : input.provider,
    url,
    accessedAt: new Date().toISOString().slice(0, 10),
  }] as const))).values()];
  const content: RevisionContent = {
    title: input.title,
    contentType: input.contentType,
    markdown: article.liveRevision?.markdown || "",
    fields: [...currentFields, ...addedFields],
    sections: article.liveRevision?.sections || [],
    sources: [...(article.liveRevision?.sources || []), ...sources.filter((source) => !(article.liveRevision?.sources || []).some((current) => current.url === source.url))],
    relationships: article.liveRevision?.relationships || [],
  };
  const revision = await saveDraft({
    articleId: article.id,
    proposedSlug: article.slug,
    contributorId: input.actorId,
    contributorName: input.actorName,
    editSummary: `Imported selected structured data from ${input.provider} ${input.sourceIdentifier}`,
    content,
    parentRevisionId: article.liveRevisionId,
  });
  const now = new Date();
  await sql.begin(async (transaction) => {
    await transaction`INSERT INTO article_external_identifiers (provider,source_identifier,article_id,created_at)
      VALUES (${input.provider},${input.sourceIdentifier},${article.id},${now}) ON CONFLICT (provider,source_identifier) DO NOTHING`;
    const [currentMapping] = await transaction`SELECT article_id FROM article_external_identifiers WHERE provider=${input.provider} AND source_identifier=${input.sourceIdentifier}`;
    if (!currentMapping || currentMapping.article_id !== article.id) throw new UserFacingError("This provider entity was linked concurrently to another article.");
    for (const field of input.fields)
      await transaction`INSERT INTO revision_import_field_sources (revision_id,field_key,field_value,provider,source_identifier,source_urls_json)
        VALUES (${revision.id},${field.key},${field.value},${input.provider},${input.sourceIdentifier},${transaction.json(field.sourceUrls)})`;
    for (const image of input.images)
      await transaction`INSERT INTO revision_import_images (revision_id,file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at)
        VALUES (${revision.id},${image.fileName},${image.imageUrl},${image.thumbnailUrl},${image.creator},${image.license},${image.licenseUrl},${image.attribution},${image.sourcePage},${image.retrievedAt})`;
    await transaction`INSERT INTO import_history (id,actor_id,actor_name,provider,source_identifiers_json,article_id,revision_id,created_at)
      VALUES (${randomUUID()},${input.actorId},${input.actorName},${input.provider},${transaction.json([input.sourceIdentifier, ...input.images.map((image) => image.fileName)])},${article.id},${revision.id},${now})`;
  });
  return revision;
}

export async function getRevisionImportImages(revisionId: string) {
  await ready();
  return await rows<{file_name:string;image_url:string;thumbnail_url:string;creator:string;license:string;license_url:string;attribution:string;source_page:string;retrieved_at:string}>("SELECT file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at::text AS retrieved_at FROM revision_import_images WHERE revision_id=$1 ORDER BY file_name",[revisionId]);
}

export async function getRevisionImportFieldSources(revisionId: string) {
  await ready();
  return await rows<{field_key:string;field_value:string;provider:string;source_identifier:string;source_urls_json:string}>("SELECT field_key,field_value,provider,source_identifier,source_urls_json::text AS source_urls_json FROM revision_import_field_sources WHERE revision_id=$1 ORDER BY field_key",[revisionId]);
}

export async function getSlugRedirect(contentType: ContentType, slug: string) {
  await ready();
  const value = await row<{ slug: string }>("SELECT a.slug FROM article_slug_redirects r JOIN articles a ON a.id=r.article_id WHERE r.content_type=$1 AND r.old_slug=$2", [contentType, slug]);
  return value?.slug ?? null;
}

export async function getArticlePublicationControls(contentType: ContentType, slug: string) {
  await ready();
  return await row<{ id: string; archived_at: Date | string | null; redirect_to_slug: string | null; protection_level: string; is_locked: boolean }>("SELECT id,archived_at,redirect_to_slug,protection_level,is_locked FROM articles WHERE content_type=$1 AND slug=$2",[contentType,slug]);
}

export async function isWatchingArticle(userId: string, articleId: string) {
  await ready();
  return Boolean(await row<{ exists: boolean }>("SELECT true AS exists FROM article_watches WHERE user_id=$1 AND article_id=$2",[userId,articleId]));
}

export async function getSourceHealth(sources: SourceLink[]) {
  const urls = [...new Set(sources.map((source) => source.url).filter(Boolean))];
  if (!urls.length) return { citedCount: 0, lastReviewedAt: null, broken: 0, stale: 0 };
  await ready();
  const checks = await sql`SELECT url,status,checked_at FROM source_checks WHERE url IN ${sql(urls)}` as unknown as Array<{url:string;status:string;checked_at:Date|string}>;
  const byUrl = new Map(checks.map((check) => [check.url,check]));
  const staleBefore = Date.now() - 180 * 24 * 60 * 60 * 1000;
  const dates = checks.map((check) => new Date(check.checked_at).getTime()).filter(Number.isFinite);
  return { citedCount: urls.length, lastReviewedAt: dates.length ? new Date(Math.max(...dates)).toISOString() : null, broken: urls.filter((url) => byUrl.get(url)?.status === "broken").length, stale: urls.filter((url) => { const checked = byUrl.get(url)?.checked_at; return !checked || new Date(checked).getTime() < staleBefore; }).length };
}

const searchableFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign|country|country of origin|national origin|manufacturer|engine|alias|aliases|abbreviation|abbreviations|acronym)(\b|$)/i;
const codeFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign)(\b|$)/i;

function sidebarImages(markdown: string) {
  const opening = /<Sidebar(?:\s[^>]*)?>/.exec(markdown);
  if (opening?.index === undefined) return [];
  const bodyStart = opening.index + opening[0].length;
  const closing = markdown.indexOf("</Sidebar>", bodyStart);
  if (closing < 0) return [];

  return markdown
    .slice(bodyStart, closing)
    .split(/\r?\n/)
    .flatMap((line) => {
      const image = parseArticleImageShorthand(line.trim().replace(/^-\s+/, ""));
      return image && isSafeImageUrl(image.url) ? [image] : [];
    });
}

function articleCardDescription(markdown: string) {
  const paragraph = markdown
    .replace(/<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .find(
      (block) =>
        block.length >= 40 &&
        !/^(#{1,6}\s|[|>]|[-*+]\s|\d+\.\s|<|\[\^[^\]]+\]:)/.test(block) &&
        !block.includes("\n|"),
    );

  return (paragraph ?? "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

async function loadPublicSearchDocuments(): Promise<SearchDocument[]> {
  await ready();
  const [documents, redirects, priorTitles] = await Promise.all([
    rows<{ id: string; slug: string; content_type: ContentType; title: string; fields_json: unknown; markdown: string; updated_at: Date | string }>("SELECT a.id,a.slug,a.content_type,r.title,r.fields_json,r.markdown,COALESCE(r.reviewed_at,r.updated_at) updated_at FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL ORDER BY r.title"),
    rows<{ article_id: string; old_slug: string }>("SELECT x.article_id,x.old_slug FROM article_slug_redirects x JOIN articles a ON a.id=x.article_id JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL"),
    rows<{ article_id: string; title: string }>("SELECT r.article_id,r.title FROM revisions r JOIN articles a ON a.id=r.article_id JOIN revisions live ON live.id=a.live_revision_id WHERE r.status='approved' AND live.status='approved' AND a.archived_at IS NULL"),
  ]);
  const aliases = new Map<string,string[]>(); const titles = new Map<string,string[]>();
  for (const item of redirects) aliases.set(item.article_id,[...(aliases.get(item.article_id) || []),item.old_slug.replaceAll("-"," ")]);
  for (const item of priorTitles) titles.set(item.article_id,[...(titles.get(item.article_id) || []),item.title]);
  return documents.map((item) => {
    const fields = json<Array<{key?:string;value?:string}>>(item.fields_json,[]);
    const searchable = fields.filter((field) => field.key && field.value && searchableFieldPattern.test(field.key));
    const countries = [...new Set(searchable.filter((field) => /country/i.test(field.key!)).flatMap((field) => field.value!.split(/[,;/]/).map((part) => part.trim()).filter(Boolean)))];
    const terms: SearchDocument["terms"] = [{value:item.title,kind:"title"}];
    for (const value of titles.get(item.id) || []) if (value !== item.title) terms.push({value,kind:"alias",label:"Previous title"});
    for (const value of aliases.get(item.id) || []) terms.push({value,kind:"alias",label:"Previous title or slug"});
    for (const field of searchable) { const kind: SearchTermKind = codeFieldPattern.test(field.key!) ? "code" : /alias|abbreviation|acronym/i.test(field.key!) ? "alias" : "field"; for (const value of field.value!.split(/[,;/]|\s+\|\s+/).map((part) => part.trim()).filter(Boolean)) terms.push({value,kind,label:field.key}); }
    const images = sidebarImages(item.markdown);
    return {id:item.id,title:item.title,slug:item.slug,contentType:item.content_type,href:articlePath(item.content_type,item.slug),description:articleCardDescription(item.markdown),updatedAt:iso(item.updated_at),imageUrl:images[0]?.url,imageUrls:images.map((image) => image.url),imageCredit:images[0]?.credit || undefined,countries,terms};
  });
}

// This index includes every live article's searchable fields and Markdown.
// Persist it in Next's data cache so public page and search traffic does not
// repeatedly transfer the entire published corpus from Postgres.
export const listPublicSearchDocuments = unstable_cache(
  loadPublicSearchDocuments,
  ["public-search-documents"],
  { revalidate: 86_400, tags: [PUBLIC_SEARCH_DOCUMENTS_TAG] },
);

export async function listPublicFleetSourceData(): Promise<{
  articles: FleetSourceArticle[];
  relationships: FleetSourceRelationship[];
}> {
  await ready();
  const [articles, relationships] = await Promise.all([
    rows<{
      id: string;
      title: string;
      slug: string;
      content_type: "aircraft" | "airline";
      fields_json: unknown;
      updated_at: Date | string;
    }>(
      `SELECT a.id,r.title,a.slug,a.content_type,r.fields_json,r.updated_at
       FROM articles a
       JOIN revisions r ON r.id=a.live_revision_id
       WHERE r.status='approved'
         AND a.archived_at IS NULL
         AND a.redirect_to_slug IS NULL
         AND a.content_type IN ('aircraft','airline')
       ORDER BY r.title`,
    ),
    rows<{
      relationship_type: string;
      source_article_id: string;
      target_article_id: string;
    }>(
      `SELECT ar.relationship_type,ar.source_article_id,ar.target_article_id
       FROM article_relationships ar
       JOIN articles source ON source.id=ar.source_article_id
       JOIN articles target ON target.id=ar.target_article_id
       JOIN revisions source_revision ON source_revision.id=source.live_revision_id
       JOIN revisions target_revision ON target_revision.id=target.live_revision_id
       WHERE source_revision.status='approved'
         AND target_revision.status='approved'
         AND source.archived_at IS NULL
         AND target.archived_at IS NULL`,
    ),
  ]);

  return {
    articles: articles.map((article) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      contentType: article.content_type,
      fields: json(article.fields_json, []),
      updatedAt: iso(article.updated_at),
    })),
    relationships: relationships.map((relationship) => ({
      type: relationship.relationship_type,
      sourceArticleId: relationship.source_article_id,
      targetArticleId: relationship.target_article_id,
    })),
  };
}

export type PublicRelationship = EntityRelationship & { source: EntityOption; target: EntityOption };
export async function getApprovedRelationships(articleId: string): Promise<PublicRelationship[]> {
  await ready();
  const values = await rows<Record<string,string>>(`SELECT ar.relationship_type,ar.source_article_id,ar.target_article_id,s.title source_title,s.slug source_slug,s.content_type source_type,t.title target_title,t.slug target_slug,t.content_type target_type FROM article_relationships ar JOIN articles s ON s.id=ar.source_article_id JOIN articles t ON t.id=ar.target_article_id JOIN revisions sr ON sr.id=s.live_revision_id JOIN revisions tr ON tr.id=t.live_revision_id WHERE (ar.source_article_id=$1 OR ar.target_article_id=$1) AND sr.status='approved' AND tr.status='approved' AND s.archived_at IS NULL AND t.archived_at IS NULL ORDER BY ar.relationship_type,target_title,source_title`,[articleId]);
  return values.map((value) => ({type:value.relationship_type as EntityRelationship["type"],targetArticleId:value.target_article_id,citationIdentifiers:[],source:{id:value.source_article_id,title:value.source_title,slug:value.source_slug,contentType:value.source_type as ContentType},target:{id:value.target_article_id,title:value.target_title,slug:value.target_slug,contentType:value.target_type as ContentType}}));
}

export type DiscoverySection = { title: string; entities: EntityOption[] };
export async function getPublicDiscoverySections(articleId: string): Promise<DiscoverySection[]> {
  const article = await getArticleById(articleId);
  if (!article?.liveRevision || article.liveRevision.status !== "approved") return [];
  const [relationships, documents] = await Promise.all([getApprovedRelationships(articleId),listPublicSearchDocuments()]);
  const outgoing = (type: EntityRelationship["type"]) => relationships.filter((item) => item.source.id===articleId && item.type===type).map((item) => item.target);
  const incoming = (type: EntityRelationship["type"]) => relationships.filter((item) => item.target.id===articleId && item.type===type).map((item) => item.source);
  const unique = (entities: EntityOption[]) => [...new Map(entities.filter((entity) => entity.id!==articleId).map((entity) => [entity.id,entity])).values()].slice(0,12);
  const sections: DiscoverySection[] = [];
  if (article.contentType === "airline") sections.push(
    {title:"Aircraft operated by this airline",entities:outgoing("operates_aircraft")},
    {title:"Hub airports",entities:outgoing("hub_at_airport")},
  );
  if (article.contentType === "aircraft") sections.push(
    {title:"Airlines operating this aircraft",entities:incoming("operates_aircraft")},
    {title:"Manufacturers",entities:outgoing("manufactured_by")},
    {title:"Engines used",entities:outgoing("uses_engine")},
    {title:"Related variants",entities:unique([...outgoing("variant_of"),...incoming("variant_of")])},
  );
  if (article.contentType === "airport") sections.push({title:"Airlines using this airport",entities:incoming("hub_at_airport")});
  if (article.contentType === "manufacturer") sections.push(
    {title:"Aircraft from this manufacturer",entities:unique([...outgoing("produces_aircraft"),...incoming("manufactured_by")])},
    {title:"Engines from this manufacturer",entities:outgoing("produces_engine")},
  );
  if (article.contentType === "engine") sections.push(
    {title:"Aircraft using this engine",entities:incoming("uses_engine")},
    {title:"Engine manufacturers",entities:incoming("produces_engine")},
  );
  const current = documents.find((document) => document.id===articleId); const countries = current?.countries || [];
  if (countries.length) sections.push({title:`Explore more from ${countries[0]}`,entities:unique(documents.filter((document) => document.id!==articleId && document.countries.some((country) => countries.includes(country))).map((document) => ({id:document.id,title:document.title,slug:document.slug,contentType:document.contentType})))});
  if (current) {
    const category = aviationCategoryFor(current);
    const categoryLabels = {
      commercial: "More commercial airlines",
      cargo: "More cargo and logistics operators",
      alliances: "More airline alliances",
      military: "More military aircraft",
      commercialAircraft: "More commercial aircraft",
      general: "More general aviation aircraft",
      airports: "More airports",
      manufacturers: "More manufacturers",
      engines: "More aircraft engines",
      news: "More aviation event reports",
    } as const;
    sections.push({
      title: categoryLabels[category],
      entities: unique(
        documents
          .filter(
            (document) =>
              document.id !== articleId &&
              aviationCategoryFor(document) === category,
          )
          .map((document) => ({
            id: document.id,
            title: document.title,
            slug: document.slug,
            contentType: document.contentType,
          })),
      ),
    });
  }
  return sections.map((section) => ({...section,entities:unique(section.entities)})).filter((section) => section.entities.length);
}
