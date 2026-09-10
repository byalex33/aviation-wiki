import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { sql } from "../src/lib/postgres";
import {
  createOrGetArticle, ensureDirectoryAirlineArticle, getArticleById, getRevision,
  moderatorEditRevision, publishRevision, saveDraft, transitionRevision,
} from "../src/lib/wiki-public-db";
import type { RevisionContent, RevisionRecord } from "../src/lib/wiki-types";

// Run only against a disposable database. Never load a developer/production env file.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL must point to a disposable local audit_* or test_* database.");
const target = new URL(databaseUrl);
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(target.hostname));
assert.match(target.pathname, /^\/(audit|test)_[a-z0-9_]+$/);
assert.equal(process.env.INDEXNOW_KEY, undefined, "IndexNow must be disabled for these tests.");
const competing = postgres(databaseUrl, { max: 2, prepare: false });
const suffix = randomUUID().slice(0, 8);
const content: RevisionContent = { title: "Editorial fixture", contentType: "aircraft", markdown: "A reviewed aircraft description.", fields: [], sections: [], sources: [], relationships: [] };
const inputFor = (articleId: string, parentRevisionId: string | null, revisionContent = content) => ({ articleId, parentRevisionId, proposedSlug: `editorial-${suffix}`, contributorId: "contributor", contributorName: "Contributor", editSummary: "Regression fixture", content: revisionContent });
const auditFor = (revision: RevisionRecord, action: string) => ({ actorId: "moderator", actorName: "Moderator", action, entityType: "revision", entityId: revision.id, articleId: revision.articleId, revisionId: revision.id, before: { status: revision.status } });

async function waitForPublicationLock() {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const waiting = await competing`SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT r.%'`;
    if (waiting.length) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("The publication did not reach the expected row lock.");
}

async function main() {
  const article = await createOrGetArticle(`editorial-${suffix}`, content.title, content.contentType);
  const first = await saveDraft(inputFor(article.id, null));
  await transitionRevision(first.id, "contributor", "pending_review");
  await publishRevision(first.id, "moderator", "Initial", auditFor(first, "revision.approve"));
  const newer = await saveDraft(inputFor(article.id, first.id, { ...content, title: "Newer publication", markdown: "Newly reviewed content." }));
  await transitionRevision(newer.id, "contributor", "pending_review");
  await publishRevision(newer.id, "moderator");

  // F02: an editor that displayed V1 must keep V1 as its base after V2 publishes.
  const stale = await saveDraft(inputFor(article.id, first.id));
  assert.equal(stale.parentRevisionId, first.id);
  await assert.rejects(transitionRevision(stale.id, "contributor", "pending_review"), /live article changed/);
  assert.equal((await getRevision(stale.id))?.status, "draft");
  assert.equal((await getArticleById(article.id))?.liveRevisionId, newer.id);

  // An ordinary save must not silently rebase even if the caller supplies the latest ID.
  await saveDraft({ ...inputFor(article.id, newer.id), revisionId: stale.id });
  const savedStale = (await getRevision(stale.id))!;
  assert.equal(savedStale.parentRevisionId, first.id);
  await assert.rejects(saveDraft({ ...inputFor(article.id, first.id), revisionId: stale.id, reconcile: { expectedUpdatedAt: "stale timestamp", liveRevisionId: newer.id } }), /draft changed/);
  await assert.rejects(saveDraft({ ...inputFor(article.id, first.id), revisionId: stale.id, reconcile: { expectedUpdatedAt: savedStale.updatedAt, liveRevisionId: first.id } }), /live article changed again/);
  await assert.rejects(saveDraft({ ...inputFor(article.id, first.id), revisionId: stale.id, contributorId: "intruder", reconcile: { expectedUpdatedAt: savedStale.updatedAt, liveRevisionId: newer.id } }), /cannot be edited/);
  const reconciledContent = { ...content, markdown: "Newly reviewed content. Contributor's preserved addition.", fields: [{ key: "Designation", value: "Preserved" }] };
  const reconciled = await saveDraft({ ...inputFor(article.id, first.id, reconciledContent), revisionId: stale.id, reconcile: { expectedUpdatedAt: savedStale.updatedAt, liveRevisionId: newer.id } });
  assert.equal(reconciled.parentRevisionId, newer.id);
  assert.equal(reconciled.markdown, reconciledContent.markdown);
  assert.deepEqual(reconciled.fields, reconciledContent.fields);
  await transitionRevision(reconciled.id, "contributor", "pending_review");
  await transitionRevision(reconciled.id, "moderator", "changes_requested", { moderator: true, note: "Clarify a detail", audit: auditFor(reconciled, "revision.request_changes") });

  // F18: requested-changes drafts reconcile after another publication.
  const third = await saveDraft(inputFor(article.id, newer.id, { ...content, markdown: "Third publication." }));
  await transitionRevision(third.id, "contributor", "pending_review");
  await publishRevision(third.id, "moderator");
  const requested = (await getRevision(reconciled.id))!;
  const resumed = await saveDraft({ ...inputFor(article.id, newer.id, reconciledContent), revisionId: requested.id, reconcile: { expectedUpdatedAt: requested.updatedAt, liveRevisionId: third.id } });
  assert.equal(resumed.status, "draft");
  assert.equal(resumed.parentRevisionId, third.id);
  assert.equal(resumed.markdown, reconciledContent.markdown);
  const events = await sql`SELECT note FROM revision_events WHERE revision_id=${requested.id} AND note LIKE 'Contributor reconciled%'`;
  assert.equal(events.length, 2);

  // F15: a competing editor owns the row; publication must validate its committed body.
  const race = await saveDraft(inputFor(article.id, third.id));
  await transitionRevision(race.id, "contributor", "pending_review");
  let releaseEdit!: () => void;
  const holdEdit = new Promise<void>((resolve) => { releaseEdit = resolve; });
  let editLocked!: () => void;
  const locked = new Promise<void>((resolve) => { editLocked = resolve; });
  const editing = competing.begin(async (transaction) => {
    await transaction`UPDATE revisions SET markdown='<script>alert(1)</script>' WHERE id=${race.id}`;
    editLocked();
    await holdEdit;
  });
  await locked;
  const publishing = publishRevision(race.id, "moderator").then(() => null, (error: unknown) => error);
  try { await waitForPublicationLock(); } finally { releaseEdit(); }
  await editing;
  assert.match(String(await publishing), /invalid or unsafe Markdown/);
  assert.equal((await getArticleById(article.id))?.liveRevisionId, third.id);
  assert.equal((await getRevision(race.id))?.status, "pending_review");
  await moderatorEditRevision(race.id, { ...content, title: "Validated title", markdown: "Validated new body." }, `editorial-${suffix}`, "Moderator repair", "moderator");

  // F16: a failed audit write rolls back the publication; successful events are durable.
  await assert.rejects(publishRevision(race.id, "moderator", null, { ...auditFor(race, "revision.approve"), actorId: null as unknown as string }));
  assert.equal((await getRevision(race.id))?.status, "pending_review");
  assert.equal((await getArticleById(article.id))?.liveRevisionId, third.id);
  await publishRevision(race.id, "moderator", "Edited and approved", auditFor(race, "revision.edited_and_approved"));
  const live = await getArticleById(article.id);
  assert.equal(live?.title, "Validated title");
  assert.equal(live?.liveRevision?.markdown, "Validated new body.");
  const rejected = await saveDraft(inputFor(article.id, race.id));
  await transitionRevision(rejected.id, "contributor", "pending_review");
  await transitionRevision(rejected.id, "moderator", "rejected", { moderator: true, note: "Rejected fixture", audit: auditFor(rejected, "revision.reject") });
  const audits = await sql`SELECT action FROM admin_audit_log WHERE article_id=${article.id}`;
  assert.deepEqual(audits.map((value) => value.action).sort(), ["revision.approve", "revision.edited_and_approved", "revision.reject", "revision.request_changes"].sort());

  // F17: same-slug records of different types retain identity and reject cross-type drafts.
  const engine = await createOrGetArticle(`editorial-${suffix}`, "Engine fixture", "engine");
  const engineDraft = await saveDraft(inputFor(engine.id, null, { ...content, contentType: "engine" }));
  assert.equal(engineDraft.contentType, "engine");
  assert.notEqual(engineDraft.articleId, article.id);
  await assert.rejects(saveDraft({ ...inputFor(article.id, race.id), revisionId: engineDraft.id }), /cannot be edited/);

  // F09: validation uses approved canonical destinations, including structured fields.
  const broken = await saveDraft(inputFor(article.id, race.id, { ...content, markdown: "[Missing](/aircraft/nonexistent-regression-fixture)" }));
  await transitionRevision(broken.id, "contributor", "pending_review");
  await assert.rejects(publishRevision(broken.id, "moderator"), /No published article exists/);

  // F19: every editorial restriction prevents anonymous directory publication.
  for (const control of ["locked", "trusted", "moderator", "admin", "archived", "redirect"]) {
    const name = `Directory ${control} ${suffix}`;
    const airline = await createOrGetArticle(name.toLowerCase().replaceAll(" ", "-"), name, "airline");
    await sql`UPDATE articles SET is_locked=${control === "locked"}, protection_level=${["trusted", "moderator", "admin"].includes(control) ? control : "open"}, archived_at=${control === "archived" ? new Date() : null}, redirect_to_slug=${control === "redirect" ? "another-airline" : null} WHERE id=${airline.id}`;
    await ensureDirectoryAirlineArticle({ id: "1", name, alias: "", iata: "ZZ", icao: "ZZZ", callsign: "TEST", country: "United Kingdom", active: true });
    assert.equal((await getArticleById(airline.id))?.liveRevisionId, null, `${control} article remains unpublished`);
  }
  const openName = `Directory open ${suffix}`;
  const directoryRecord = { id: "2", name: openName, alias: "", iata: "ZY", icao: "ZZY", callsign: "TEST", country: "United Kingdom", active: true };
  const initialized = await ensureDirectoryAirlineArticle(directoryRecord);
  assert.equal(initialized?.liveRevision?.status, "approved");
  const initializedRevision = initialized?.liveRevisionId;
  const preserved = await ensureDirectoryAirlineArticle({ ...directoryRecord, country: "Different country" });
  assert.equal(preserved?.liveRevisionId, initializedRevision, "Existing publication is preserved");
  console.log("Editorial PostgreSQL regressions passed: stale saves, explicit reconciliation, locked validation race, atomic audits, typed identity, internal links and protected initialization.");
}

main().finally(async () => {
  await Promise.all([sql.end(), competing.end()]);
}).catch((error) => { console.error(error); process.exitCode = 1; });
