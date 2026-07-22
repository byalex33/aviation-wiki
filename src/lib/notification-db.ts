import "server-only";

import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

import {
  notificationTypes,
  type EmailFrequency,
  type NotificationPreferences,
  type NotificationRecord,
  type NotificationType,
} from "@/lib/notification-types";

const databasePath =
  process.env.AVIATION_WIKI_DB_PATH ||
  path.join(process.cwd(), ".data", "aviation-wiki.db");
mkdirSync(path.dirname(databasePath), { recursive: true });
const db = new Database(databasePath, { timeout: 5_000 });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    href TEXT NOT NULL,
    article_id TEXT,
    revision_id TEXT,
    dedupe_key TEXT NOT NULL UNIQUE,
    read_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, read_at, created_at DESC);
  CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id TEXT PRIMARY KEY,
    email_frequency TEXT NOT NULL DEFAULT 'in_app',
    enabled_types_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS article_watches (
    user_id TEXT NOT NULL,
    article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, article_id)
  );
  CREATE INDEX IF NOT EXISTS article_watches_article_idx ON article_watches(article_id);
  CREATE TABLE IF NOT EXISTS notification_email_deliveries (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_message_id TEXT,
    failure_reason TEXT,
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(notification_id)
  );
  CREATE INDEX IF NOT EXISTS notification_email_status_idx ON notification_email_deliveries(status, updated_at DESC);
`);

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  article_id: string | null;
  revision_id: string | null;
  read_at: string | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): NotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    href: row.href,
    articleId: row.article_id,
    revisionId: row.revision_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  articleId?: string | null;
  revisionId?: string | null;
  dedupeKey: string;
}) {
  const id = randomUUID();
  const now = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT OR IGNORE INTO notifications
       (id,user_id,type,title,message,href,article_id,revision_id,dedupe_key,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(
      id,
      input.userId,
      input.type,
      input.title.slice(0, 160),
      input.message.slice(0, 1_000),
      input.href,
      input.articleId ?? null,
      input.revisionId ?? null,
      input.dedupeKey,
      now,
    );
  if (!result.changes) return null;
  return getNotificationForUser(id, input.userId);
}

export function getNotificationForUser(id: string, userId: string) {
  const row = db
    .prepare("SELECT * FROM notifications WHERE id=? AND user_id=?")
    .get(id, userId) as NotificationRow | undefined;
  return row ? mapNotification(row) : null;
}

export function listNotifications(userId: string, page = 1, pageSize = 20) {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(50, Math.max(1, Math.floor(pageSize)));
  const total = Number(
    (
      db
        .prepare("SELECT COUNT(*) count FROM notifications WHERE user_id=?")
        .get(userId) as {
        count: number;
      }
    ).count,
  );
  const rows = db
    .prepare(
      "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?",
    )
    .all(userId, safeSize, (safePage - 1) * safeSize) as NotificationRow[];
  return {
    items: rows.map(mapNotification),
    total,
    page: safePage,
    pages: Math.max(1, Math.ceil(total / safeSize)),
  };
}

export function getUnreadCount(userId: string) {
  return Number(
    (
      db
        .prepare(
          "SELECT COUNT(*) count FROM notifications WHERE user_id=? AND read_at IS NULL",
        )
        .get(userId) as { count: number }
    ).count,
  );
}

export function markNotificationRead(userId: string, id: string) {
  return db
    .prepare(
      "UPDATE notifications SET read_at=COALESCE(read_at,?) WHERE id=? AND user_id=?",
    )
    .run(new Date().toISOString(), id, userId).changes;
}

export function markAllNotificationsRead(userId: string) {
  return db
    .prepare(
      "UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",
    )
    .run(new Date().toISOString(), userId).changes;
}

export function getNotificationPreferences(
  userId: string,
): NotificationPreferences {
  const row = db
    .prepare("SELECT * FROM notification_preferences WHERE user_id=?")
    .get(userId) as
    | { email_frequency: EmailFrequency; enabled_types_json: string }
    | undefined;
  const stored = row
    ? (JSON.parse(row.enabled_types_json) as Record<string, boolean>)
    : {};
  return {
    frequency: row?.email_frequency || "in_app",
    enabledTypes: Object.fromEntries(
      notificationTypes.map((type) => [type, stored[type] !== false]),
    ) as Record<NotificationType, boolean>,
  };
}

export function saveNotificationPreferences(
  userId: string,
  frequency: EmailFrequency,
  enabledTypes: Partial<Record<NotificationType, boolean>>,
) {
  const normalized = Object.fromEntries(
    notificationTypes.map((type) => [type, enabledTypes[type] === true]),
  );
  db.prepare(
    `INSERT INTO notification_preferences (user_id,email_frequency,enabled_types_json,updated_at)
     VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET
     email_frequency=excluded.email_frequency,enabled_types_json=excluded.enabled_types_json,updated_at=excluded.updated_at`,
  ).run(
    userId,
    frequency,
    JSON.stringify(normalized),
    new Date().toISOString(),
  );
}

export function setArticleWatch(
  userId: string,
  articleId: string,
  watching: boolean,
) {
  if (watching)
    db.prepare(
      "INSERT OR IGNORE INTO article_watches (user_id,article_id,created_at) VALUES (?,?,?)",
    ).run(userId, articleId, new Date().toISOString());
  else
    db.prepare(
      "DELETE FROM article_watches WHERE user_id=? AND article_id=?",
    ).run(userId, articleId);
}

export function isWatchingArticle(userId: string, articleId: string) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM article_watches WHERE user_id=? AND article_id=?")
      .get(userId, articleId),
  );
}

export function listArticleWatcherIds(articleId: string) {
  return (
    db
      .prepare("SELECT user_id FROM article_watches WHERE article_id=?")
      .all(articleId) as Array<{
      user_id: string;
    }>
  ).map((row) => row.user_id);
}

export function queueEmailDelivery(notificationId: string, userId: string) {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO notification_email_deliveries
     (id,notification_id,user_id,status,created_at,updated_at) VALUES (?,?,?,'pending',?,?)`,
  ).run(id, notificationId, userId, now, now);
  return db
    .prepare(
      "SELECT * FROM notification_email_deliveries WHERE notification_id=?",
    )
    .get(notificationId) as Record<string, unknown> | undefined;
}

export function updateEmailDelivery(input: {
  notificationId: string;
  status: "pending" | "sent" | "failed";
  providerMessageId?: string | null;
  failureReason?: string | null;
  incrementRetry?: boolean;
}) {
  db.prepare(
    `UPDATE notification_email_deliveries SET status=?,provider_message_id=?,failure_reason=?,
     retry_count=retry_count+?,updated_at=? WHERE notification_id=?`,
  ).run(
    input.status,
    input.providerMessageId ?? null,
    input.failureReason?.slice(0, 500) ?? null,
    input.incrementRetry ? 1 : 0,
    new Date().toISOString(),
    input.notificationId,
  );
}

export function listFailedEmailDeliveries(limit = 100) {
  return db
    .prepare(
      `SELECT d.id,d.notification_id,d.status,d.provider_message_id,d.failure_reason,d.retry_count,d.created_at,d.updated_at,
       n.type,n.article_id,n.revision_id FROM notification_email_deliveries d
       JOIN notifications n ON n.id=d.notification_id WHERE d.status='failed'
       ORDER BY d.updated_at DESC LIMIT ?`,
    )
    .all(Math.min(500, Math.max(1, limit))) as Array<Record<string, unknown>>;
}

export function listPendingDigestNotifications() {
  const rows = db
    .prepare(
      `SELECT n.* FROM notifications n JOIN notification_preferences p ON p.user_id=n.user_id
       LEFT JOIN notification_email_deliveries d ON d.notification_id=n.id
       WHERE p.email_frequency='daily' AND d.id IS NULL AND n.created_at>=datetime('now','-2 days')
       ORDER BY n.user_id,n.created_at`,
    )
    .all() as NotificationRow[];
  return rows.map(mapNotification);
}

export function getNotificationById(id: string) {
  const row = db.prepare("SELECT * FROM notifications WHERE id=?").get(id) as
    | NotificationRow
    | undefined;
  return row ? mapNotification(row) : null;
}
