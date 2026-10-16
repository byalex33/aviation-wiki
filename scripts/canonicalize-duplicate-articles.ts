/**
 * Fold duplicate articles onto one canonical row, and rename the F-15 and F-35
 * slugs to the manufacturer-model pattern.
 *
 * Dry-run (no writes):
 *   npm run db:canonicalize-articles
 *
 * Apply to the database in DATABASE_URL (review the dry-run first; do not point
 * this at production until that output looks right):
 *   npm run db:canonicalize-articles -- --apply
 *
 * Revisions are never deleted. A duplicate keeps its slug and gains
 * redirect_to_slug, so its history stays attached to that article id. A renamed
 * article keeps the same id; the previous slug is stored in
 * article_slug_redirects and the public route 308s. Outgoing relationship edges
 * are copied onto the canonical article through a new approved revision whose
 * parent is the previous live revision. Incoming edges are retargeted.
 *
 * Prose is not rewritten. Each pair's canonical page already covers the other
 * page's facts; see the notes printed for each pair.
 */
import { randomUUID } from "node:crypto";

import { getArticleHeadings, parseArticleMarkdown } from "../src/lib/article-markdown";
import { sameRelationshipKeys, unionRelationships, type StoredRelationship } from "../src/lib/article-canonicalization";
import { parseArticlePath } from "../src/lib/article-routes";
import {
  ARTICLE_PATH_ALIASES,
  ARTICLE_SLUG_RENAMES,
  CANONICAL_DUPLICATE_SOURCES,
} from "../src/lib/article-path-aliases";
import { sql } from "../src/lib/postgres";
import type { TransactionSql } from "postgres";
import type { ContentType } from "../src/lib/wiki-types";

const notes: Record<string, string> = {
  "/commercial/iberia": "OpenFlights stub. IB, IBE, IBERIA, Spain and Active are already on Iberia Airlines. No prose merge.",
  "/commercial/air-india-limited": "OpenFlights stub. The long Air India article stays canonical. Its callsign is AIR INDIA; do not replace that with the stub's AIRINDIA.",
  "/aircraft/boeing-737": "Boeing 737 family stays canonical: primary Boeing and FAA sources, the A320-style family slug, and the comparison fields. The other page's revisions stay on its article id. Seating span and the MAX grounding are already on the family page.",
  "/aircraft/airbus-a330-900": "Airbus A330neo stays canonical. It already records the 19 October 2017 first flight, EASA certification and TAP delivery. No prose merge.",
  "/aircraft/f35-lightning-ii": "Rename only. Lockheed Martin F-35 Lightning II follows lockheed-martin-f-22-raptor. The destination slug was unused.",
  "/aircraft/f-15-eagle": "Rename only. McDonnell Douglas F-15 Eagle follows the designing-manufacturer pattern used by the DC-10 and F-16. The destination slug was unused.",
};

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  content_type: ContentType;
  live_revision_id: string | null;
  redirect_to_slug: string | null;
  archived_at: Date | string | null;
};

type RelationshipRow = {
  source_article_id: string;
  target_article_id: string;
  relationship_type: string;
  approved_revision_id: string;
};

type PlanItem = {
  sourcePath: string;
  destinationPath: string;
  kind: "duplicate" | "rename";
  status: "ready" | "absent" | "already" | "blocked";
  detail: string[];
};

function headings(markdown: string) {
  return getArticleHeadings(parseArticleMarkdown(markdown).root).map((heading) => heading.text);
}

function wordCount(markdown: string) {
  return markdown.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

function asRelationships(value: unknown): StoredRelationship[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as StoredRelationship;
    return typeof record.type === "string" && typeof record.targetArticleId === "string" ? [record] : [];
  });
}

function citationIdentifiers(markdown: string) {
  return new Set([...markdown.matchAll(/\[\^([^\]]+)\]/g)].map((match) => match[1].toLowerCase()));
}

async function articleBySlug(contentType: ContentType, slug: string) {
  const [article] = await sql<ArticleRow[]>`
    SELECT id, slug, title, content_type, live_revision_id, redirect_to_slug, archived_at
    FROM articles WHERE content_type=${contentType} AND slug=${slug}`;
  return article ?? null;
}

async function liveMarkdown(revisionId: string | null) {
  if (!revisionId) return null;
  const [revision] = await sql<{ markdown: string; relationships_json: unknown }[]>`
    SELECT markdown, relationships_json FROM revisions WHERE id=${revisionId}`;
  return revision ?? null;
}

async function inspectDuplicates(): Promise<PlanItem[]> {
  const items: PlanItem[] = [];
  for (const sourcePath of CANONICAL_DUPLICATE_SOURCES) {
    const destinationPath = ARTICLE_PATH_ALIASES[sourcePath];
    const source = parseArticlePath(sourcePath);
    const destination = destinationPath ? parseArticlePath(destinationPath) : null;
    const detail = [notes[sourcePath] ?? ""];
    if (!source || !destination || source.contentType !== destination.contentType) {
      items.push({ sourcePath, destinationPath: destinationPath ?? "", kind: "duplicate", status: "blocked", detail: ["The path pair is not two article URLs of the same type."] });
      continue;
    }
    const [from, to] = await Promise.all([
      articleBySlug(source.contentType, source.slug),
      articleBySlug(destination.contentType, destination.slug),
    ]);
    if (!from && !to) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "absent", detail: [...detail, "Neither slug is in this database."] });
      continue;
    }
    if (!to || to.archived_at || to.redirect_to_slug) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "blocked", detail: [...detail, !to ? "Canonical article is missing." : "Canonical article is archived or already redirects."] });
      continue;
    }
    if (!from) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "already", detail: [...detail, "Duplicate slug is already gone; canonical article is present."] });
      continue;
    }
    if (from.id === to.id) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "blocked", detail: [...detail, "Both paths resolved to the same article."] });
      continue;
    }
    if (from.archived_at) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "blocked", detail: [...detail, "Duplicate article is archived, so the in-app redirect would 404. Leave it for a manual decision."] });
      continue;
    }
    if (from.redirect_to_slug && from.redirect_to_slug !== to.slug) {
      items.push({ sourcePath, destinationPath, kind: "duplicate", status: "blocked", detail: [...detail, `Duplicate already redirects to ${from.redirect_to_slug}.`] });
      continue;
    }
    const [fromRevision, toRevision, edges, openRevisions] = await Promise.all([
      liveMarkdown(from.live_revision_id),
      liveMarkdown(to.live_revision_id),
      sql<RelationshipRow[]>`SELECT source_article_id, target_article_id, relationship_type, approved_revision_id FROM article_relationships WHERE source_article_id IN ${sql([from.id, to.id])} OR target_article_id IN ${sql([from.id, to.id])}`,
      sql<{ id: string; status: string }[]>`SELECT id, status FROM revisions WHERE article_id=${from.id} AND status IN ('draft','verifying','pending_review','changes_requested')`,
    ]);
    detail.push(`Duplicate “${from.title}” ${from.id}: ${fromRevision ? wordCount(fromRevision.markdown) : 0} words. Headings: ${(fromRevision ? headings(fromRevision.markdown) : []).join(" | ") || "(none)"}`);
    detail.push(`Canonical “${to.title}” ${to.id}: ${toRevision ? wordCount(toRevision.markdown) : 0} words. Headings: ${(toRevision ? headings(toRevision.markdown) : []).join(" | ") || "(none)"}`);
    detail.push(`Relationship rows touching either article: ${edges.length}. Open revisions kept in place on the duplicate: ${openRevisions.map((revision) => `${revision.status} ${revision.id}`).join(", ") || "none"}.`);
    items.push({
      sourcePath,
      destinationPath,
      kind: "duplicate",
      status: from.redirect_to_slug === to.slug ? "already" : "ready",
      detail,
    });
  }
  return items;
}

async function inspectRenames(): Promise<PlanItem[]> {
  const items: PlanItem[] = [];
  for (const [sourcePath, destinationPath] of Object.entries(ARTICLE_SLUG_RENAMES)) {
    const source = parseArticlePath(sourcePath);
    const destination = parseArticlePath(destinationPath);
    const detail = [notes[sourcePath] ?? ""];
    if (!source || !destination || source.contentType !== destination.contentType) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "blocked", detail: ["The rename pair is not two article URLs of the same type."] });
      continue;
    }
    const [from, to] = await Promise.all([
      articleBySlug(source.contentType, source.slug),
      articleBySlug(destination.contentType, destination.slug),
    ]);
    if (!from && !to) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "absent", detail: [...detail, "Neither slug is in this database."] });
      continue;
    }
    if (from && to && from.id !== to.id) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "blocked", detail: [...detail, "Both slugs already belong to different articles. Renaming would collide."] });
      continue;
    }
    const article = to ?? from;
    if (!article || article.archived_at || article.redirect_to_slug) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "blocked", detail: [...detail, "The article is archived or is itself a redirect."] });
      continue;
    }
    const [reserved] = await sql<{ article_id: string }[]>`
      SELECT article_id FROM article_slug_redirects WHERE content_type=${source.contentType} AND old_slug=${destination.slug} AND article_id<>${article.id}`;
    if (reserved) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "blocked", detail: [...detail, "The new slug is reserved by another article's redirect."] });
      continue;
    }
    const [legacyRedirect] = await sql<{ article_id: string }[]>`
      SELECT article_id FROM article_slug_redirects WHERE content_type=${source.contentType} AND old_slug=${source.slug}`;
    if (legacyRedirect && legacyRedirect.article_id !== article.id) {
      items.push({ sourcePath, destinationPath, kind: "rename", status: "blocked", detail: [...detail, "The old slug already redirects to a different article."] });
      continue;
    }
    const renamed = article.slug === destination.slug;
    detail.push(`Article “${article.title}” ${article.id} is currently /${source.contentType === "airline" ? "commercial" : "aircraft"}/${article.slug}.`);
    items.push({
      sourcePath,
      destinationPath,
      kind: "rename",
      status: renamed && legacyRedirect ? "already" : "ready",
      detail,
    });
  }
  return items;
}

function printPlan(items: PlanItem[]) {
  for (const item of items) {
    console.log(`\n[${item.status}] ${item.kind} ${item.sourcePath} -> ${item.destinationPath}`);
    for (const line of item.detail) if (line) console.log(`  ${line}`);
  }
}

async function applyDuplicates(transaction: TransactionSql) {
  const now = new Date();
  for (const sourcePath of CANONICAL_DUPLICATE_SOURCES) {
    const destinationPath = ARTICLE_PATH_ALIASES[sourcePath];
    const source = parseArticlePath(sourcePath);
    const destination = parseArticlePath(destinationPath);
    if (!source || !destination) throw new Error(`Invalid duplicate pair ${sourcePath}.`);
    const [from] = await transaction<ArticleRow[]>`SELECT id, slug, title, content_type, live_revision_id, redirect_to_slug, archived_at FROM articles WHERE content_type=${source.contentType} AND slug=${source.slug} FOR UPDATE`;
    const [to] = await transaction<ArticleRow[]>`SELECT id, slug, title, content_type, live_revision_id, redirect_to_slug, archived_at FROM articles WHERE content_type=${destination.contentType} AND slug=${destination.slug} FOR UPDATE`;
    if (!from || !to) continue;
    if (from.id === to.id || from.archived_at || to.archived_at || to.redirect_to_slug) throw new Error(`Refusing to merge ${sourcePath}.`);
    if (from.redirect_to_slug && from.redirect_to_slug !== to.slug) throw new Error(`${sourcePath} redirects somewhere else.`);
    if (!to.live_revision_id) throw new Error(`${destinationPath} has no live revision.`);

    const [canonicalRevision] = await transaction<{ id: string; markdown: string; relationships_json: unknown }[]>`
      SELECT id, markdown, relationships_json FROM revisions WHERE id=${to.live_revision_id}`;
    const edges = await transaction<RelationshipRow[]>`
      SELECT source_article_id, target_article_id, relationship_type, approved_revision_id
      FROM article_relationships WHERE source_article_id IN ${transaction([from.id, to.id])} OR target_article_id IN ${transaction([from.id, to.id])}`;
    const citations = new Map(asRelationships(canonicalRevision?.relationships_json).map((item) => [`${item.type}:${item.targetArticleId}`, item.citationIdentifiers ?? []]));
    const fromTable = (id: string): StoredRelationship[] => edges.filter((edge) => edge.source_article_id === id).map((edge) => ({
      type: edge.relationship_type,
      targetArticleId: edge.target_article_id,
      citationIdentifiers: citations.get(`${edge.relationship_type}:${edge.target_article_id}`) ?? [],
    }));
    const merged = unionRelationships(fromTable(to.id), fromTable(from.id), to.id, from.id, citationIdentifiers(canonicalRevision?.markdown ?? ""));
    const canonicalRelationships = fromTable(to.id);
    let approvedRevisionId = to.live_revision_id;
    if (!sameRelationshipKeys(canonicalRelationships, merged)) {
      approvedRevisionId = randomUUID();
      const summary = `Consolidate relationships from ${sourcePath}`;
      await transaction`
        INSERT INTO revisions (
          id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type,
          markdown, fields_json, sections_json, sources_json, relationships_json, verification_json,
          proposed_slug, parent_revision_id, created_at, updated_at, submitted_at, reviewed_at, moderator_id, moderator_note
        )
        SELECT ${approvedRevisionId}, article_id, 'approved', 'system', 'aviation.wiki', ${summary}, title, content_type,
          markdown, fields_json, sections_json, sources_json, ${transaction.json(merged)}, verification_json,
          ${to.slug}, id, ${now}, ${now}, ${now}, ${now}, 'system',
          ${"Previous revisions remain on both articles. The duplicate now redirects here."}
        FROM revisions WHERE id=${to.live_revision_id}`;
      await transaction`
        INSERT INTO revision_events (id, revision_id, actor_id, from_status, to_status, note, created_at)
        VALUES (${randomUUID()}, ${approvedRevisionId}, 'system', NULL, 'approved', ${summary}, ${now})`;
      await transaction`UPDATE articles SET live_revision_id=${approvedRevisionId}, updated_at=${now} WHERE id=${to.id}`;
      await transaction`DELETE FROM article_relationships WHERE source_article_id=${to.id}`;
      for (const relationship of merged) {
        await transaction`
          INSERT INTO article_relationships (source_article_id, target_article_id, relationship_type, approved_revision_id, created_at)
          VALUES (${to.id}, ${relationship.targetArticleId}, ${relationship.type}, ${approvedRevisionId}, ${now})`;
      }
    }
    await transaction`DELETE FROM article_relationships WHERE source_article_id=${from.id}`;
    const incoming = edges.filter((edge) => edge.target_article_id === from.id);
    for (const edge of incoming) {
      if (edge.source_article_id === to.id || edge.source_article_id === from.id) {
        await transaction`DELETE FROM article_relationships WHERE source_article_id=${edge.source_article_id} AND relationship_type=${edge.relationship_type} AND target_article_id=${from.id}`;
        continue;
      }
      const [existing] = await transaction<{ exists: boolean }[]>`
        SELECT true AS exists FROM article_relationships
        WHERE source_article_id=${edge.source_article_id} AND relationship_type=${edge.relationship_type} AND target_article_id=${to.id}`;
      await transaction`DELETE FROM article_relationships WHERE source_article_id=${edge.source_article_id} AND relationship_type=${edge.relationship_type} AND target_article_id=${from.id}`;
      if (!existing) {
        await transaction`
          INSERT INTO article_relationships (source_article_id, target_article_id, relationship_type, approved_revision_id, created_at)
          VALUES (${edge.source_article_id}, ${to.id}, ${edge.relationship_type}, ${edge.approved_revision_id}, ${now})`;
      }
    }
    if (from.redirect_to_slug !== to.slug) {
      await transaction`UPDATE articles SET redirect_to_slug=${to.slug}, updated_at=${now} WHERE id=${from.id}`;
    }
    const [tables] = await transaction<{ watches: string | null; alerts: string | null; collections: string | null }[]>`
      SELECT to_regclass('public.article_watches')::text AS watches,
             to_regclass('public.article_watch_alerts')::text AS alerts,
             to_regclass('public.saved_collection_articles')::text AS collections`;
    if (tables?.watches) {
      await transaction`
        INSERT INTO article_watches (user_id, article_id, created_at)
        SELECT user_id, ${to.id}, created_at FROM article_watches WHERE article_id=${from.id}
        ON CONFLICT DO NOTHING`;
    }
    if (tables?.alerts) {
      await transaction`
        INSERT INTO article_watch_alerts (user_id, article_id, edits, sources, relationships)
        SELECT alerts.user_id, ${to.id}, alerts.edits, alerts.sources, alerts.relationships
        FROM article_watch_alerts alerts
        WHERE alerts.article_id=${from.id}
          AND NOT EXISTS (SELECT 1 FROM article_watch_alerts current WHERE current.user_id=alerts.user_id AND current.article_id=${to.id})
          AND EXISTS (SELECT 1 FROM article_watches watch WHERE watch.user_id=alerts.user_id AND watch.article_id=${to.id})`;
    }
    if (tables?.collections) {
      await transaction`
        INSERT INTO saved_collection_articles (collection_id, article_id, created_at)
        SELECT collection_id, ${to.id}, created_at FROM saved_collection_articles WHERE article_id=${from.id}
        ON CONFLICT DO NOTHING`;
    }
    await transaction`
      INSERT INTO admin_audit_log (id, actor_id, actor_name, action, entity_type, entity_id, article_id, revision_id, before_json, after_json, created_at)
      VALUES (
        ${randomUUID()}, 'system', 'canonicalize-duplicate-articles', 'canonicalize-duplicate', 'article', ${from.id}, ${to.id}, ${approvedRevisionId},
        ${transaction.json({ duplicateId: from.id, duplicateSlug: from.slug, canonicalId: to.id, canonicalSlug: to.slug })},
        ${transaction.json({ redirectToSlug: to.slug, relationshipRevisionId: approvedRevisionId })},
        ${now}
      )`;
    console.log(`Redirected ${sourcePath} to ${destinationPath}.`);
  }
}

async function applyRenames(transaction: TransactionSql) {
  const now = new Date();
  for (const [sourcePath, destinationPath] of Object.entries(ARTICLE_SLUG_RENAMES)) {
    const source = parseArticlePath(sourcePath);
    const destination = parseArticlePath(destinationPath);
    if (!source || !destination) throw new Error(`Invalid rename ${sourcePath}.`);
    const [from] = await transaction<ArticleRow[]>`SELECT id, slug, title, content_type, live_revision_id, redirect_to_slug, archived_at FROM articles WHERE content_type=${source.contentType} AND slug=${source.slug} FOR UPDATE`;
    const [to] = await transaction<ArticleRow[]>`SELECT id, slug, title, content_type, live_revision_id, redirect_to_slug, archived_at FROM articles WHERE content_type=${destination.contentType} AND slug=${destination.slug} FOR UPDATE`;
    if (from && to && from.id !== to.id) throw new Error(`Refusing to rename ${sourcePath}: destination is a different article.`);
    const article = to ?? from;
    if (!article) continue;
    if (article.archived_at || article.redirect_to_slug) throw new Error(`Refusing to rename ${article.slug}.`);
    const [redirectOwner] = await transaction<{ article_id: string }[]>`
      SELECT article_id FROM article_slug_redirects WHERE content_type=${article.content_type} AND old_slug=${source.slug} AND article_id<>${article.id}`;
    if (redirectOwner) throw new Error(`${sourcePath} already redirects to a different article.`);
    if (article.slug !== destination.slug) {
      const [collision] = await transaction<{ id: string }[]>`SELECT id FROM articles WHERE content_type=${destination.contentType} AND slug=${destination.slug} AND id<>${article.id}`;
      if (collision) throw new Error(`${destinationPath} was created while this script was running.`);
      const [reserved] = await transaction<{ article_id: string }[]>`
        SELECT article_id FROM article_slug_redirects WHERE content_type=${article.content_type} AND old_slug=${destination.slug} AND article_id<>${article.id}`;
      if (reserved) throw new Error(`${destinationPath} is reserved by another redirect.`);
      await transaction`
        INSERT INTO article_slug_redirects (content_type, old_slug, article_id, created_at)
        VALUES (${article.content_type}, ${article.slug}, ${article.id}, ${now})
        ON CONFLICT (content_type, old_slug) DO UPDATE SET article_id=EXCLUDED.article_id, created_at=EXCLUDED.created_at
        WHERE article_slug_redirects.article_id=EXCLUDED.article_id`;
      await transaction`UPDATE articles SET slug=${destination.slug}, updated_at=${now} WHERE id=${article.id}`;
      await transaction`
        UPDATE revisions SET proposed_slug=${destination.slug}
        WHERE article_id=${article.id}
          AND status IN ('draft','verifying','pending_review','changes_requested')
          AND proposed_slug=${article.slug}`;
      console.log(`Renamed ${sourcePath} to ${destinationPath}.`);
    } else {
      await transaction`
        INSERT INTO article_slug_redirects (content_type, old_slug, article_id, created_at)
        VALUES (${article.content_type}, ${source.slug}, ${article.id}, ${now})
        ON CONFLICT (content_type, old_slug) DO NOTHING`;
      console.log(`${destinationPath} already exists; old slug redirect ensured.`);
    }
    await transaction`
      INSERT INTO admin_audit_log (id, actor_id, actor_name, action, entity_type, entity_id, article_id, revision_id, before_json, after_json, created_at)
      VALUES (
        ${randomUUID()}, 'system', 'canonicalize-duplicate-articles', 'canonicalize-rename', 'article', ${article.id}, ${article.id}, ${article.live_revision_id},
        ${transaction.json({ from: source.slug, to: destination.slug })},
        ${transaction.json({ slug: destination.slug })},
        ${now}
      )`;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const plan = [...(await inspectDuplicates()), ...(await inspectRenames())];
  printPlan(plan);
  const blocked = plan.filter((item) => item.status === "blocked");
  if (blocked.length) {
    console.error(`\n${blocked.length} pair(s) blocked. Nothing was written.`);
    process.exitCode = 1;
    return;
  }
  if (!apply) {
    console.log("\nDry run only. Re-run with --apply against the intended database after reviewing the report above.");
    console.log("Revisions are kept. Prose is not rewritten. After --apply, redeploy so cached pages and the search index pick up renamed slugs.");
    return;
  }
  await sql.begin(async (transaction) => {
    await transaction`SELECT pg_advisory_xact_lock(1337, 20261016)`;
    await applyDuplicates(transaction);
    await applyRenames(transaction);
  });
  console.log("\nApplied. Redeploy the application so ISR and the 24-hour search index rebuild against the new slugs.");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => sql.end());
