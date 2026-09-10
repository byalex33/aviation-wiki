import "server-only";

import { randomUUID } from "node:crypto";
import "@/lib/notification-db";
import { db } from "@/lib/sqlite";
import {
  DIGEST_HOLD_REASON,
  DIGEST_LEASE_MS,
  DIGEST_PREFERENCE_HOLD_REASON,
  DIGEST_RETRY_WINDOW_MS,
  LEGACY_DIGEST_HOLD_REASON,
  type ClaimedDigestBatch,
  type DigestBatchResult,
  type DigestPayload,
  type NewDigestBatch,
} from "@/lib/notification-digest";

db.exec(`
  CREATE TABLE IF NOT EXISTS notification_digest_batches (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    notification_ids_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','held')),
    lease_token TEXT,
    lease_until TEXT,
    first_attempt_at TEXT,
    provider_message_id TEXT,
    failure_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS notification_digest_batches_pending_idx ON notification_digest_batches(status,lease_until);
  CREATE TABLE IF NOT EXISTS notification_digest_items (
    notification_id TEXT PRIMARY KEY REFERENCES notifications(id),
    batch_id TEXT NOT NULL REFERENCES notification_digest_batches(id)
  );
  CREATE INDEX IF NOT EXISTS notification_digest_items_batch_idx ON notification_digest_items(batch_id);
`);

type BatchRow = {
  id: string;
  user_id: string;
  payload_json: string;
  notification_ids_json: string;
  status: "pending" | "sent" | "held";
  lease_token: string | null;
  lease_until: string | null;
  first_attempt_at: string | null;
};

export function createDigestBatch(input: NewDigestBatch, now = new Date()): string | null {
  const ids = input.notifications.map((notification) => notification.id);
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) return null;
  return db.transaction(() => {
    const preferences = db.prepare("SELECT email_frequency,enabled_types_json FROM notification_preferences WHERE user_id=?")
      .get(input.userId) as { email_frequency: string; enabled_types_json: string } | undefined;
    if (preferences?.email_frequency !== "daily") return null;
    const enabled = JSON.parse(preferences.enabled_types_json) as Record<string, boolean>;
    const available = db.prepare(`SELECT n.id,n.user_id,n.type,d.id delivery_id,i.batch_id
      FROM notifications n
      LEFT JOIN notification_email_deliveries d ON d.notification_id=n.id
      LEFT JOIN notification_digest_items i ON i.notification_id=n.id
      WHERE n.id IN (${ids.map(() => "?").join(",")})`).all(...ids) as Array<{
        id: string; user_id: string; type: string; delivery_id: string | null; batch_id: string | null;
      }>;
    if (available.length !== ids.length || available.some((notification) =>
      notification.user_id !== input.userId || enabled[notification.type] === false || notification.delivery_id || notification.batch_id)) return null;
    const id = randomUUID();
    const timestamp = now.toISOString();
    db.prepare(`INSERT INTO notification_digest_batches (id,user_id,payload_json,notification_ids_json,created_at,updated_at)
      VALUES (?,?,?,?,?,?)`).run(id, input.userId, JSON.stringify(input.payload), JSON.stringify(ids), timestamp, timestamp);
    const insertItem = db.prepare("INSERT INTO notification_digest_items (notification_id,batch_id) VALUES (?,?)");
    const insertDelivery = db.prepare(`INSERT INTO notification_email_deliveries (id,notification_id,user_id,status,created_at,updated_at)
      VALUES (?,?,?,'pending',?,?)`);
    for (const notificationId of ids) {
      insertItem.run(notificationId, id);
      insertDelivery.run(randomUUID(), notificationId, input.userId, timestamp, timestamp);
    }
    return id;
  }).immediate();
}

export function listRecoverableDigestBatchIds(now = new Date()): string[] {
  return (db.prepare(`SELECT id FROM notification_digest_batches
    WHERE status='pending' AND (lease_until IS NULL OR lease_until<=?) ORDER BY created_at,id LIMIT 100`)
    .all(now.toISOString()) as Array<{ id: string }>).map((batch) => batch.id);
}

export function claimDigestBatch(id: string, now = new Date()): ClaimedDigestBatch | null {
  return db.transaction(() => {
    const batch = db.prepare("SELECT * FROM notification_digest_batches WHERE id=?").get(id) as BatchRow | undefined;
    const timestamp = now.toISOString();
    if (!batch || batch.status !== "pending" || (batch.lease_until && batch.lease_until > timestamp)) return null;
    const preferences = db.prepare("SELECT email_frequency,enabled_types_json FROM notification_preferences WHERE user_id=?")
      .get(batch.user_id) as { email_frequency: string; enabled_types_json: string } | undefined;
    const enabled = preferences ? JSON.parse(preferences.enabled_types_json) as Record<string, boolean> : {};
    const members = db.prepare(`SELECT n.type FROM notification_digest_items i JOIN notifications n ON n.id=i.notification_id WHERE i.batch_id=?`)
      .all(id) as Array<{ type: string }>;
    if (preferences?.email_frequency !== "daily" || members.some((member) => enabled[member.type] === false)) {
      db.prepare(`UPDATE notification_digest_batches SET status='held',lease_token=NULL,lease_until=NULL,failure_reason=?,updated_at=? WHERE id=?`)
        .run(DIGEST_PREFERENCE_HOLD_REASON, timestamp, id);
      db.prepare(`UPDATE notification_email_deliveries SET status='held',failure_reason=?,updated_at=?
        WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id=?)`)
        .run(DIGEST_PREFERENCE_HOLD_REASON, timestamp, id);
      return null;
    }
    if (batch.first_attempt_at && batch.first_attempt_at <= new Date(now.getTime() - DIGEST_RETRY_WINDOW_MS).toISOString()) {
      db.prepare(`UPDATE notification_digest_batches SET status='held',lease_token=NULL,lease_until=NULL,failure_reason=?,updated_at=? WHERE id=?`)
        .run(DIGEST_HOLD_REASON, timestamp, id);
      db.prepare(`UPDATE notification_email_deliveries SET status='failed',failure_reason=?,updated_at=?
        WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id=?)`)
        .run(DIGEST_HOLD_REASON, timestamp, id);
      return null;
    }
    const leaseToken = randomUUID();
    db.prepare(`UPDATE notification_digest_batches SET lease_token=?,lease_until=?,first_attempt_at=COALESCE(first_attempt_at,?),updated_at=? WHERE id=?`)
      .run(leaseToken, new Date(now.getTime() + DIGEST_LEASE_MS).toISOString(), timestamp, timestamp, id);
    return {
      id,
      userId: batch.user_id,
      payload: JSON.parse(batch.payload_json) as DigestPayload,
      notificationIds: JSON.parse(batch.notification_ids_json) as string[],
      leaseToken,
    };
  }).immediate();
}

export function finishDigestBatch(result: DigestBatchResult, now = new Date()): boolean {
  return db.transaction(() => {
    const timestamp = now.toISOString();
    const batch = db.prepare(`SELECT id FROM notification_digest_batches
      WHERE id=? AND status='pending' AND lease_token=? AND lease_until>?`).get(result.id, result.leaseToken, timestamp);
    if (!batch) return false;
    const sent = result.status === "sent";
    const retryable = result.status === "pending";
    const reason = sent ? null : result.failureReason?.slice(0, 500) ?? "Digest delivery failed.";
    const providerId = result.providerMessageId ?? null;
    db.prepare(`UPDATE notification_digest_batches SET status=?,lease_token=NULL,lease_until=?,provider_message_id=?,failure_reason=?,updated_at=? WHERE id=?`)
      .run(result.status, retryable ? new Date(now.getTime() + DIGEST_LEASE_MS).toISOString() : null, providerId, reason, timestamp, result.id);
    db.prepare(`UPDATE notification_email_deliveries SET status=?,provider_message_id=?,failure_reason=?,retry_count=retry_count+?,updated_at=?
      WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id=?)`)
      .run(retryable ? "failed" : result.status, providerId, reason, retryable ? 1 : 0, timestamp, result.id);
    return true;
  }).immediate();
}

export function holdLegacyDigestDeliveries(now = new Date()): number {
  return db.prepare(`UPDATE notification_email_deliveries SET status='held',failure_reason=?,updated_at=?
    WHERE status IN ('pending','failed') AND updated_at<=?
      AND user_id IN (SELECT user_id FROM notification_preferences WHERE email_frequency='daily')
      AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id=notification_email_deliveries.notification_id)`)
    .run(LEGACY_DIGEST_HOLD_REASON, now.toISOString(), new Date(now.getTime() - 15 * 60_000).toISOString()).changes;
}

export function queueImmediateEmailDelivery(notificationId: string, userId: string, now = new Date()): Record<string, unknown> | null {
  return db.transaction(() => {
    const timestamp = now.toISOString();
    db.prepare(`INSERT OR IGNORE INTO notification_email_deliveries
      (id,notification_id,user_id,status,created_at,updated_at)
      SELECT ?,n.id,n.user_id,'pending',?,? FROM notifications n
      WHERE n.id=? AND n.user_id=?
        AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id=n.id)`)
      .run(randomUUID(), timestamp, timestamp, notificationId, userId);
    const delivery = db.prepare(`SELECT d.* FROM notification_email_deliveries d
      WHERE d.notification_id=? AND d.user_id=? AND d.status!='held'
        AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id=d.notification_id)`)
      .get(notificationId, userId) as Record<string, unknown> | undefined;
    return delivery ?? null;
  }).immediate();
}
