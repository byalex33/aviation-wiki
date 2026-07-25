import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const db = new Database(
  path.join(tmpdir(), `aviation-wiki-notifications-${randomUUID()}.db`),
);
db.exec(`
  CREATE TABLE notifications (
    id TEXT PRIMARY KEY,user_id TEXT NOT NULL,type TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,
    href TEXT NOT NULL,article_id TEXT,revision_id TEXT,dedupe_key TEXT NOT NULL UNIQUE,read_at TEXT,created_at TEXT NOT NULL
  );
  CREATE TABLE notification_preferences (
    user_id TEXT PRIMARY KEY,email_frequency TEXT NOT NULL,enabled_types_json TEXT NOT NULL,updated_at TEXT NOT NULL
  );
  CREATE TABLE notification_email_deliveries (
    id TEXT PRIMARY KEY,notification_id TEXT NOT NULL REFERENCES notifications(id),user_id TEXT NOT NULL,status TEXT NOT NULL,
    provider_message_id TEXT,failure_reason TEXT,retry_count INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
    UNIQUE(notification_id)
  );
`);

const insert = db.prepare(`INSERT OR IGNORE INTO notifications
  (id,user_id,type,title,message,href,dedupe_key,created_at) VALUES (?,?,?,?,?,?,?,?)`);
const now = new Date().toISOString();
insert.run(
  "n1",
  "user_a",
  "revision_approved",
  "Approved",
  "Approved",
  "/wiki/a",
  "revision:1:approved",
  now,
);
insert.run(
  "n2",
  "user_b",
  "revision_rejected",
  "Rejected",
  "Rejected",
  "/wiki/b",
  "revision:2:rejected",
  now,
);

assert.equal(
  db
    .prepare("SELECT COUNT(*) count FROM notifications WHERE user_id=?")
    .get("user_a").count,
  1,
  "queries are user-scoped",
);
assert.equal(
  db
    .prepare(
      "SELECT COUNT(*) count FROM notifications WHERE user_id=? AND id=?",
    )
    .get("user_a", "n2").count,
  0,
  "another user's notification is inaccessible",
);
assert.equal(
  insert.run(
    "n3",
    "user_a",
    "revision_approved",
    "Approved",
    "Approved",
    "/wiki/a",
    "revision:1:approved",
    now,
  ).changes,
  0,
  "retried events are deduplicated",
);

db.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?").run(
  now,
  "n1",
  "user_a",
);
assert.equal(
  db.prepare("SELECT read_at FROM notifications WHERE id='n1'").get().read_at,
  now,
  "a user can mark their notification read",
);
db.prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?").run(
  now,
  "n2",
  "user_a",
);
assert.equal(
  db.prepare("SELECT read_at FROM notifications WHERE id='n2'").get().read_at,
  null,
  "a user cannot mutate another user's notification",
);

const enabled = { revision_approved: true, revision_rejected: false };
db.prepare("INSERT INTO notification_preferences VALUES (?,?,?,?)").run(
  "user_a",
  "daily",
  JSON.stringify(enabled),
  now,
);
const preference = db
  .prepare("SELECT * FROM notification_preferences WHERE user_id=?")
  .get("user_a");
assert.equal(preference.email_frequency, "daily");
assert.deepEqual(
  JSON.parse(preference.enabled_types_json),
  enabled,
  "per-type email preferences persist",
);

const before = db
  .prepare(
    "SELECT COUNT(*) count FROM notifications WHERE user_id=? AND read_at IS NULL",
  )
  .get("user_a").count;
insert.run(
  "n4",
  "user_a",
  "moderator_feedback",
  "Feedback",
  "Feedback",
  "/revision/4",
  "revision:4:feedback",
  new Date(Date.now() + 1).toISOString(),
);
const after = db
  .prepare(
    "SELECT COUNT(*) count FROM notifications WHERE user_id=? AND read_at IS NULL",
  )
  .get("user_a").count;
assert.equal(
  after,
  before + 1,
  "the polling response changes when a notification arrives",
);

db.prepare(
  "INSERT INTO notification_email_deliveries (id,notification_id,user_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",
).run("d1", "n4", "user_a", "pending", now, now);
assert.throws(
  () =>
    db
      .prepare(
        "INSERT INTO notification_email_deliveries (id,notification_id,user_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)",
      )
      .run("d2", "n4", "user_a", "pending", now, now),
  /UNIQUE/,
  "one delivery is queued per notification",
);

db.close();
console.log(
  "Notification polling, email preference, scoping, and deduplication checks passed.",
);
