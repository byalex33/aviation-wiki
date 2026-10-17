import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

process.env.AVIATION_WIKI_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "moderation-")), "test.db");
delete process.env.DATABASE_URL;
delete process.env.INDEXNOW_KEY;

async function main() {
  const { db } = await import("../src/lib/sqlite");
  const { getRevision, transitionRevision } = await import("../src/lib/wiki-db");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO articles (id,slug,title,content_type,created_at,updated_at) VALUES ('mod-article','mod-article','Moderation article','aircraft',?,?)").run(now, now);
  db.prepare(`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,fields_json,sections_json,sources_json,created_at,updated_at,submitted_at)
    VALUES ('changes-1','mod-article','changes_requested','contributor','Contributor','Add a source','Moderation article','aircraft','[]','[]','[]',?,?,?)`).run(now, now, now);

  await assert.rejects(
    async () => transitionRevision("changes-1", "moderator", "approved", { moderator: true, note: "no" }),
    /cannot move from changes_requested to approved/,
  );
  assert.equal(getRevision("changes-1")?.status, "changes_requested");

  const closed = transitionRevision("changes-1", "moderator", "rejected", { moderator: true, note: "Closing this requested change." });
  assert.equal(closed.status, "rejected");
  assert.equal(closed.moderatorNote, "Closing this requested change.");
  assert.equal(closed.moderatorId, "moderator");
  const event = db.prepare("SELECT from_status,to_status,note FROM revision_events WHERE revision_id='changes-1'").get() as { from_status: string; to_status: string; note: string };
  assert.deepEqual(event, { from_status: "changes_requested", to_status: "rejected", note: "Closing this requested change." });
  db.close();
  console.log("SQLite moderation can reject a changes-requested revision.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
