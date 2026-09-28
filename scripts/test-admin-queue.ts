import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

async function main() {
  process.env.AVIATION_WIKI_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "admin-queue-")), "test.db");
  const { db } = await import("../src/lib/sqlite");
  const { listAdminQueue, getContributorStats, getAdminTotals } = await import("../src/lib/admin-db");
  const now = new Date().toISOString();
  db.prepare("INSERT INTO articles (id,slug,title,content_type,created_at,updated_at) VALUES ('queue-test','queue-test','Queue test','aircraft',?,?)").run(now, now);
  const insert = db.prepare(`INSERT INTO revisions (id,article_id,status,contributor_id,contributor_name,edit_summary,title,content_type,fields_json,sections_json,sources_json,created_at,updated_at,submitted_at) VALUES (?, 'queue-test', ?, ?, 'Queue tester', '', 'Queue test', 'aircraft', '[]', '[]', '[]', ?, ?, ?)`);
  for (const status of ["draft", "verifying", "pending_review", "changes_requested", "approved", "rejected"]) {
    insert.run(`test-${status}`, status, `user-${status}`, now, now, status === "draft" ? null : now);
  }
  insert.run("test-resumed", "draft", "user-resumed", now, now, now);
  const filter = { contributor: "user-" };
  assert.deepEqual(listAdminQueue(filter).map((r) => r.status).sort(), ["changes_requested", "pending_review", "verifying"]);
  assert.equal(listAdminQueue({ ...filter, status: "approved" }).length, 0);
  assert.equal(listAdminQueue({ ...filter, status: "rejected" }).length, 0);
  db.prepare("UPDATE revisions SET status='approved' WHERE id='test-pending_review'").run();
  assert.equal(listAdminQueue(filter).some((r) => r.id === "test-pending_review"), false);
  assert.deepEqual(db.prepare("SELECT status FROM revisions WHERE id='test-pending_review'").get(), { status: "approved" });
  const stats = new Map(getContributorStats().map((row) => [row.contributor_id, row]));
  assert.equal(stats.get("user-draft")?.submitted_count, 0);
  assert.equal(stats.get("user-resumed")?.submitted_count, 1);
  assert.equal(getAdminTotals().contributors, 6);
  db.close();
  console.log("Admin queue and contributor classification passed.");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
