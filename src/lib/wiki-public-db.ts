import "server-only";

import { randomUUID } from "node:crypto";

import { articlePath } from "@/lib/article-routes";
import { f15Article } from "@/lib/builtin-articles";
import { ensureSchema, row, rows, sql } from "@/lib/postgres";
import type { SearchDocument, SearchTermKind } from "@/lib/search-types";
import type { ArticleRecord, ArticleWithLiveRevision, ContentType, EntityOption, EntityRelationship, RevisionRecord, RevisionStatus } from "@/lib/wiki-types";

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

const searchableFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign|country|country of origin|manufacturer|engine|alias|aliases|abbreviation|abbreviations|acronym)(\b|$)/i;
const codeFieldPattern = /(^|\b)(iata|icao|code|designation|registration|callsign|call sign)(\b|$)/i;

export async function listPublicSearchDocuments(): Promise<SearchDocument[]> {
  await ready();
  const [documents, redirects, priorTitles, relatedCountries] = await Promise.all([
    rows<{ id: string; slug: string; content_type: ContentType; title: string; fields_json: unknown; markdown: string }>("SELECT a.id,a.slug,a.content_type,r.title,r.fields_json,r.markdown FROM articles a JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL ORDER BY r.title"),
    rows<{ article_id: string; old_slug: string }>("SELECT x.article_id,x.old_slug FROM article_slug_redirects x JOIN articles a ON a.id=x.article_id JOIN revisions r ON r.id=a.live_revision_id WHERE r.status='approved' AND a.archived_at IS NULL"),
    rows<{ article_id: string; title: string }>("SELECT r.article_id,r.title FROM revisions r JOIN articles a ON a.id=r.article_id JOIN revisions live ON live.id=a.live_revision_id WHERE r.status='approved' AND live.status='approved' AND a.archived_at IS NULL"),
    rows<{ source_article_id: string; title: string }>("SELECT ar.source_article_id,c.title FROM article_relationships ar JOIN articles c ON c.id=ar.target_article_id JOIN revisions cr ON cr.id=c.live_revision_id JOIN articles s ON s.id=ar.source_article_id JOIN revisions sr ON sr.id=s.live_revision_id WHERE ar.relationship_type='located_in_country' AND cr.status='approved' AND sr.status='approved' AND c.archived_at IS NULL AND s.archived_at IS NULL"),
  ]);
  const aliases = new Map<string,string[]>(); const titles = new Map<string,string[]>(); const countriesByArticle = new Map<string,string[]>();
  for (const item of redirects) aliases.set(item.article_id,[...(aliases.get(item.article_id) || []),item.old_slug.replaceAll("-"," ")]);
  for (const item of priorTitles) titles.set(item.article_id,[...(titles.get(item.article_id) || []),item.title]);
  for (const item of relatedCountries) countriesByArticle.set(item.source_article_id,[...(countriesByArticle.get(item.source_article_id) || []),item.title]);
  return documents.map((item) => {
    const fields = json<Array<{key?:string;value?:string}>>(item.fields_json,[]);
    const searchable = fields.filter((field) => field.key && field.value && searchableFieldPattern.test(field.key));
    const countries = [...new Set([...(item.content_type === "country" ? [item.title] : []),...searchable.filter((field) => /country/i.test(field.key!)).flatMap((field) => field.value!.split(/[,;/]/).map((part) => part.trim()).filter(Boolean)),...(countriesByArticle.get(item.id) || [])])];
    const terms: SearchDocument["terms"] = [{value:item.title,kind:"title"}];
    for (const value of titles.get(item.id) || []) if (value !== item.title) terms.push({value,kind:"alias",label:"Previous title"});
    for (const value of aliases.get(item.id) || []) terms.push({value,kind:"alias",label:"Previous title or slug"});
    for (const field of searchable) { const kind: SearchTermKind = codeFieldPattern.test(field.key!) ? "code" : /alias|abbreviation|acronym/i.test(field.key!) ? "alias" : "field"; for (const value of field.value!.split(/[,;/]|\s+\|\s+/).map((part) => part.trim()).filter(Boolean)) terms.push({value,kind,label:field.key}); }
    return {id:item.id,title:item.title,slug:item.slug,contentType:item.content_type,href:articlePath(item.content_type,item.slug),description:item.markdown.replace(/\[\^[^\]]+\]/g,"").replace(/[#*_>`\[\]()]/g," ").replace(/\s+/g," ").trim().slice(0,180),countries,terms};
  });
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
  if (article.contentType === "airline") sections.push({title:"Aircraft operated by this airline",entities:outgoing("operates_aircraft")});
  if (article.contentType === "aircraft") sections.push({title:"Related airlines",entities:incoming("operates_aircraft")},{title:"Related variants",entities:unique([...outgoing("variant_of"),...incoming("variant_of")])});
  if (article.contentType === "airport") sections.push({title:"Airlines using this airport",entities:incoming("hub_at_airport")});
  if (article.contentType === "manufacturer") sections.push({title:"Other products from this manufacturer",entities:unique([...outgoing("produces_aircraft"),...incoming("manufactured_by"),...outgoing("produces_engine")])});
  const current = documents.find((document) => document.id===articleId); const countries = current?.countries || [];
  if (countries.length) sections.push({title:article.contentType === "country" ? "Explore more from this country" : `Explore more from ${countries[0]}`,entities:unique(documents.filter((document) => document.id!==articleId && document.countries.some((country) => countries.includes(country))).map((document) => ({id:document.id,title:document.title,slug:document.slug,contentType:document.contentType})))});
  return sections.map((section) => ({...section,entities:unique(section.entities)})).filter((section) => section.entities.length);
}
