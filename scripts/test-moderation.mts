import assert from "node:assert/strict";
import { createRequire, Module } from "node:module";
import { PGlite } from "@electric-sql/pglite";

process.env.DATABASE_URL = "postgres://localhost/moderation-test";
Object.assign(process.env, { NODE_ENV: "development" });
delete process.env.INDEXNOW_KEY;
delete process.env.RESEND_API_KEY;

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
    (await db.query(parts.reduce((query, part, index) => query + (index ? `$${index}` : "") + part, ""), values)).rows;
  return Object.assign(tag, {
    json: (value: unknown) => JSON.stringify(value),
    unsafe: async (query: string, values: unknown[] = []) =>
      values.length || !query.includes(";")
        ? (await db.query(query, values)).rows
        : (await db.exec(query)).at(-1)?.rows ?? [],
    begin: <T,>(run: (transaction: ReturnType<typeof adapter>) => Promise<T>): Promise<T> =>
      db.transaction((transaction) => run(adapter(transaction as unknown as QueryDatabase))),
    end: async () => {},
  });
}

class RedirectError extends Error {
  constructor(url: string) {
    super(`REDIRECT:${url}`);
    this.name = "RedirectError";
  }
}

mock("postgres", () => adapter(database));
mock("next/cache", {
  revalidatePath: () => {},
  revalidateTag: () => {},
  unstable_cache: (fn: unknown) => fn,
});
mock("next/navigation", {
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  unstable_rethrow(error: unknown) {
    if (error instanceof RedirectError) throw error;
  },
});
mock("@clerk/nextjs/server", {
  auth: async () => ({ userId: "moderator", isAuthenticated: true }),
  currentUser: async () => ({
    id: "moderator",
    username: "Moderator",
    fullName: "Moderator",
    primaryEmailAddress: null,
    publicMetadata: { role: "moderator" },
  }),
  clerkClient: async () => ({
    users: {
      getUserList: async () => ({ data: [], totalCount: 0 }),
      getUser: async () => {
        throw new Error("Clerk user lookup is unused in this test");
      },
    },
  }),
});

const liveArticleChanged = "The live article changed after this revision was created. Reconcile it in the editor and submit it for review again before approval.";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

async function main() {
  const { ensureSchema, sql } = await import("../src/lib/postgres");
  await ensureSchema();
  const now = new Date();
  await sql`INSERT INTO articles (id,slug,title,content_type,created_at,updated_at)
    VALUES ('article-1','stale-aircraft','Stale aircraft','aircraft',${now},${now})`;
  await sql`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,created_at,updated_at,submitted_at,reviewed_at)
    VALUES ('live-revision','article-1','approved','contributor','Contributor','Initial publication','Stale aircraft','aircraft',${now},${now},${now},${now})`;
  await sql`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,parent_revision_id,created_at,updated_at,submitted_at)
    VALUES ('pending-stale','article-1','pending_review','contributor','Contributor','Update the introduction','Stale aircraft','aircraft','older-revision',${now},${now},${now})`;
  await sql`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,created_at,updated_at,submitted_at)
    VALUES ('changes-1','article-1','changes_requested','contributor','Contributor','Add a source','Stale aircraft','aircraft',${now},${now},${now})`;
  await sql`UPDATE articles SET live_revision_id='live-revision' WHERE id='article-1'`;

  const { adminModerateRevisionFormAction } = await import("../src/app/admin/actions");
  const { getRevision } = await import("../src/lib/wiki-public-db");
  const approval = await adminModerateRevisionFormAction(
    { error: null },
    form({ revisionId: "pending-stale", intent: "approve", moderatorNote: "Looks good" }),
  );
  assert.deepEqual(approval, { error: liveArticleChanged });
  assert.equal((await getRevision("pending-stale"))?.status, "pending_review");

  await assert.rejects(
    () => adminModerateRevisionFormAction(
      { error: null },
      form({ revisionId: "changes-1", intent: "reject", moderatorNote: "Closing this requested change." }),
    ),
    (error: unknown) => error instanceof RedirectError && error.message === "REDIRECT:/admin/moderation",
  );
  const closed = await getRevision("changes-1");
  assert.equal(closed?.status, "rejected");
  assert.equal(closed?.moderatorNote, "Closing this requested change.");
  const events = await sql<{ note: string }[]>`SELECT note FROM revision_events WHERE revision_id='changes-1' AND to_status='rejected'`;
  assert.equal(events[0]?.note, "Closing this requested change.");

  const blocked = await adminModerateRevisionFormAction(
    { error: null },
    form({ revisionId: "changes-1", intent: "approve" }),
  );
  assert.deepEqual(blocked, { error: "This revision is not awaiting review." });
  console.log("Admin moderation returns publish errors inline and can reject changes-requested revisions.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
