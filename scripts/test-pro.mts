import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { PGlite } from "@electric-sql/pglite";

// Run the real PostgreSQL schema and queries in memory. Never read .env.local.
process.env.DATABASE_URL = "postgres://localhost/pro-test";
Object.assign(process.env, { NODE_ENV: "development" });
delete process.env.RESEND_API_KEY;
delete process.env.NOTIFICATION_EMAIL_FROM;
const database = new PGlite();
const require = createRequire(import.meta.url);
function mock(id: string, exports: unknown) {
  const resolved = require.resolve(id);
  const replacement = new Module(resolved);
  replacement.exports = exports;
  require.cache[resolved] = replacement;
}
type QueryDatabase = Pick<PGlite, "query" | "exec" | "transaction">;
function adapter(db: QueryDatabase) {
  const tag = async (parts: TemplateStringsArray, ...values: unknown[]) =>
    (await db.query(parts.reduce((query, part, i) => query + (i ? `$${i}` : "") + part, ""), values)).rows;
  return Object.assign(tag, {
    json: (value: unknown) => JSON.stringify(value),
    unsafe: async (query: string, values: unknown[] = []) => values.length || !query.includes(";")
      ? (await db.query(query, values)).rows : (await db.exec(query)).at(-1)?.rows ?? [],
    begin: <T,>(run: (transaction: ReturnType<typeof adapter>) => Promise<T>): Promise<T> =>
      db.transaction(transaction => run(adapter(transaction as unknown as QueryDatabase))),
    end: async () => {},
  });
}
mock("postgres", () => adapter(database));
type TestUser = { id: string; username: string; publicMetadata: Record<string, unknown> };
const users = new Map<string, TestUser>([
  ["free", { id: "free", username: "free", publicMetadata: {} }],
  ["pro", { id: "pro", username: "pro", publicMetadata: { pro: true } }],
  ["other", { id: "other", username: "other", publicMetadata: { pro: true } }],
  ["admin", { id: "admin", username: "admin", publicMetadata: { role: "admin" } }],
]);
let signedIn: string | null = "pro";
let clerkUnavailable = false;
mock("@clerk/nextjs/server", {
  auth: async () => ({ userId: signedIn, isAuthenticated: !!signedIn }),
  currentUser: async () => users.get(signedIn || "") ?? null,
  clerkClient: async () => ({ users: {
    getUserList: async ({ userId, limit }: { userId?: string[]; limit: number }) => {
      if (clerkUnavailable) throw new Error("Test Clerk outage");
      assert.ok(!userId || userId.length <= limit);
      const data = userId ? userId.map(id => users.get(id)).filter(Boolean) : [...users.values()];
      return { data, totalCount: data.length };
    },
    updateUserMetadata: async (id: string, patch: { publicMetadata: Record<string, unknown> }) => {
      Object.assign(users.get(id)!.publicMetadata, patch.publicMetadata);
    },
  } }),
});
mock("next/cache", { revalidatePath: () => {}, unstable_cache: (fn: unknown) => fn });
mock("next/navigation", { unstable_rethrow: () => {} });
const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("Tests must not contact external services"); };

try {
  const { hasPro } = await import("../src/lib/pro");
  const { parseNameStyle, nameStyleFromMetadata } = await import("../src/lib/name-style");
  for (const metadata of [null, undefined, {}, { pro: "true" }, { role: "trusted_contributor" }]) assert.equal(hasPro(metadata), false);
  for (const metadata of [{ pro: true }, { role: "moderator" }, { role: "admin" }]) assert.equal(hasPro(metadata), true);
  assert.equal(parseNameStyle({ icon: "__proto__" }), null);
  assert.equal(parseNameStyle({ font: "constructor" }), null);
  const style = { icon: "plane", font: "serif", effect: "gold" };
  assert.equal(nameStyleFromMetadata({ nameStyle: style }), null);
  assert.deepEqual(nameStyleFromMetadata({ pro: true, nameStyle: style }), style);

  const { ensureSchema, sql } = await import("../src/lib/postgres");
  await ensureSchema();
  const { PRO_SCHEMA_SQL } = await import("../src/lib/pro-schema");
  await database.exec(PRO_SCHEMA_SQL); // additive migration is repeatable
  const wiki = await import("../src/lib/wiki-public-db");
  const article = await wiki.createOrGetArticle("pro-test", "Pro test aircraft", "aircraft");
  await sql`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,created_at,updated_at)
    VALUES ('test-live',${article.id},'approved','author','Author','Initial','Pro test aircraft','aircraft',NOW(),NOW())`;
  await sql`UPDATE articles SET live_revision_id='test-live' WHERE id=${article.id}`;
  const privateArticle = await wiki.createOrGetArticle("private-test", "Unpublished", "aircraft");
  const storage = await import("../src/lib/saved-articles");
  const notifications = await import("../src/lib/notification-storage");
  const collection = await storage.createCollection("pro", "Research");
  await assert.rejects(storage.createCollection("pro", " "), /name/);
  await assert.rejects(storage.createCollection("pro", "Research"), /already/);
  await assert.rejects(storage.saveCollectionArticle("other", collection, article.id, true), /your collections/);
  await assert.rejects(storage.saveCollectionArticle("pro", collection, privateArticle.id, true), /published/);
  await storage.saveCollectionArticle("pro", collection, article.id, true);
  await storage.saveCollectionArticle("pro", collection, article.id, true);
  assert.equal((await storage.listSavedArticles("pro")).collections[0].articles.length, 1);
  assert.equal((await storage.listSavedArticles("other")).collections.length, 0);
  await storage.saveCollectionArticle("other", collection, article.id, false);
  await storage.deleteCollection("other", collection);
  assert.equal((await storage.listSavedArticles("pro")).collections[0].articles.length, 1);
  await sql`UPDATE articles SET archived_at=NOW() WHERE id=${article.id}`;
  assert.equal((await storage.listSavedArticles("pro")).collections[0].articles.length, 0);
  await sql`UPDATE articles SET archived_at=NULL WHERE id=${article.id}`;

  const { savedArticlesAction } = await import("../src/app/saved/actions");
  const form = (values: Record<string, string>) => {
    const result = new FormData();
    for (const [key, value] of Object.entries(values)) result.set(key, value);
    return result;
  };
  for (const identity of [null, "free"]) {
    signedIn = identity;
    for (const operation of ["create", "add", "remove", "delete", "alerts"]) {
      assert.ok((await savedArticlesAction({ error: null }, form({ operation, name: "Bypass", articleId: article.id, collectionId: collection }))).error, `${identity} cannot ${operation}`);
    }
  }
  signedIn = "pro";
  assert.equal((await savedArticlesAction({ error: null }, form({ operation: "create", name: "Via action" }))).error, null);
  await assert.rejects(storage.saveWatchAlerts("pro", article.id, false, true, true), /Watch this article/);
  for (const id of ["pro", "free", "other"]) await notifications.setArticleWatch(id, article.id, true);
  await storage.saveWatchAlerts("pro", article.id, false, true, true);
  await storage.saveWatchAlerts("free", article.id, false, true, true); // simulate revoked entitlement
  const service = await import("../src/lib/notification-service");
  const revision = {
    id: "approved-test", articleId: article.id, articleSlug: article.slug, proposedSlug: article.slug,
    title: article.title, contentType: "aircraft", status: "approved", contributorId: "author", contributorName: "Author",
    editSummary: "Add sources and relationships", sources: [{ url: "https://example.org/source" }],
    relationships: [{ type: "uses_engine", targetArticleId: "engine-test", citationIdentifiers: [] }],
    markdown: "", fields: [], sections: [], verification: null, moderatorId: null, moderatorNote: null,
    parentRevisionId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), submittedAt: null, reviewedAt: null,
  } satisfies Parameters<typeof service.emitRevisionOutcome>[0]["revision"];
  await service.emitRevisionOutcome({ actorId: "admin", revision, outcome: "approved" });
  assert.deepEqual((await notifications.listNotifications("pro")).items.map(n => n.type).sort(), ["relationship_accepted", "source_accepted"]);
  assert.deepEqual((await notifications.listNotifications("free")).items.map(n => n.type), ["watched_article_edited"], "A free/revoked account uses standard alerts");
  assert.deepEqual((await notifications.listNotifications("other")).items.map(n => n.type), ["watched_article_edited"], "Existing watches preserve standard alerts");
  await service.emitRevisionOutcome({ actorId: "admin", revision, outcome: "approved" });
  assert.equal((await notifications.listNotifications("pro")).total, 2, "Notifications are deduplicated");
  await service.emitRevisionOutcome({ actorId: "admin", previousLiveRevision: revision,
    revision: { ...revision, id: "removal-test", sources: [], relationships: [] }, outcome: "approved" });
  assert.deepEqual((await notifications.listNotifications("pro")).items.map(n => n.type).sort(), ["relationship_accepted", "relationship_removed", "source_accepted", "source_removed"]);
  await storage.saveWatchAlerts("pro", article.id, false, false, false);
  await service.emitRevisionOutcome({ actorId: "admin", revision: { ...revision, id: "muted-test" }, outcome: "approved" });
  assert.equal((await notifications.listNotifications("pro")).total, 4, "A muted article sends no watch alerts");
  clerkUnavailable = true;
  const originalError = console.error;
  try {
    console.error = () => {};
    await service.emitRevisionOutcome({ actorId: "admin", revision: { ...revision, id: "identity-outage-test" }, outcome: "approved" });
    assert.equal((await notifications.listNotifications("pro")).total, 4, "An identity outage cannot unmute an article or interrupt publication");
  } finally { console.error = originalError; clerkUnavailable = false; }
  await notifications.setArticleWatch("pro", article.id, false);
  assert.equal((await notifications.listArticleWatchAlerts(article.id)).some(p => p.user_id === "pro"), false, "Unwatching removes saved filters");
  await notifications.setArticleWatch("pro", article.id, true);
  assert.equal((await storage.listSavedArticles("pro")).watches[0].edits, true);

  const { saveNameStyleAction } = await import("../src/app/settings/profile/actions");
  signedIn = "free";
  assert.ok((await saveNameStyleAction(style)).error);
  signedIn = "pro";
  assert.equal((await saveNameStyleAction(style)).error, null);
  assert.deepEqual(users.get("pro")!.publicMetadata.nameStyle, style);
  assert.ok((await saveNameStyleAction({ icon: "invalid" })).error);
  assert.equal((await saveNameStyleAction({})).error, null);
  assert.equal(users.get("pro")!.publicMetadata.nameStyle, null);

  const { updateUserAction } = await import("../src/app/admin/actions");
  const grant = form({ userId: "free", role: "contributor", restriction: "none", pro: "on" });
  await assert.rejects(updateUserAction(grant), /Moderator access/);
  signedIn = "admin";
  await updateUserAction(grant);
  assert.equal(users.get("free")!.publicMetadata.pro, true);
  assert.equal(users.get("free")!.publicMetadata.role, "contributor", "Granting Pro does not grant staff access");
  grant.delete("pro");
  await updateUserAction(grant);
  assert.equal(users.get("free")!.publicMetadata.pro, false);
  signedIn = "pro";

  // A newer Pro submission must survive the 250-row cap ahead of older free submissions.
  for (let i = 0; i < 251; i++) await sql`INSERT INTO revisions
    (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,created_at,updated_at,submitted_at)
    VALUES (${`queue-${i}`},${article.id},'pending_review',${i === 250 ? "pro" : "free"},'Tester','Test','Pro test aircraft','aircraft',${new Date(i * 1000)},${new Date(i * 1000)},${new Date(i * 1000)})`;
  const queue = await wiki.listAdminQueue({ status: "pending_review" });
  assert.equal(queue.length, 250);
  assert.equal(queue[0].id, "queue-250");
  assert.equal(queue[1].id, "queue-0");
  assert.equal((await wiki.listReviewQueue())[0].id, "queue-250");
  assert.equal((await wiki.getAdminDashboard()).queue[0].id, "queue-250");
  assert.equal((await wiki.getRevision("queue-250"))?.status, "pending_review", "Priority cannot approve a revision");

  const { createApiKey } = await import("../src/lib/api-keys");
  const { POST } = await import("../src/app/api/v1/drafts/route");
  for (const [userId, limit] of [["free", 10], ["pro", 60]] as const) {
    const keys = await Promise.all(["one", "two"].map(name => createApiKey({ userId, userName: userId, name, scopes: ["articles:draft"] })));
    for (let i = 0; i <= limit; i++) {
      const response = await POST(new Request("http://localhost/api/v1/drafts", {
        method: "POST", headers: { authorization: `Bearer ${keys[i % 2].rawToken}` }, body: "{}",
      }));
      assert.equal(response.status, i < limit ? 400 : 429, `${userId} request ${i + 1}`);
      if (i === limit) assert.equal(response.headers.get("RateLimit-Limit"), String(limit));
    }
    clerkUnavailable = true;
    assert.equal((await POST(new Request("http://localhost/api/v1/drafts", { method: "POST", headers: { authorization: `Bearer ${keys[0].rawToken}` }, body: "{}" }))).status, 503);
    clerkUnavailable = false;
  }
  await storage.deleteCollection("pro", collection);
  assert.equal((await storage.listSavedArticles("pro")).collections.some(c => c.id === collection), false);
  console.log("Pro entitlement, profile styles, private collections, watch filters, notification delivery, moderation priority, and aggregate API limits passed on isolated PostgreSQL.");
} finally {
  globalThis.fetch = originalFetch;
  await database.close();
}
