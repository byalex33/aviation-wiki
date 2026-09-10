import "server-only";

import { randomUUID } from "node:crypto";

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
import { ensureSchema, sql } from "@/lib/postgres";

type BatchRow = {
  id: string;
  user_id: string;
  payload_json: DigestPayload;
  notification_ids_json: string[];
  status: "pending" | "sent" | "held";
  lease_until: Date | null;
  first_attempt_at: Date | null;
};

export async function createDigestBatch(input: NewDigestBatch, now = new Date()): Promise<string | null> {
  const ids = input.notifications.map((notification) => notification.id);
  if (!ids.length || ids.length > 100 || new Set(ids).size !== ids.length) return null;
  await ensureSchema();
  try {
    return await sql.begin(async (transaction) => {
      await transaction`SELECT pg_advisory_xact_lock(8248, hashtext(${input.userId}))`;
      const [preferences] = await transaction<{
        email_frequency: string;
        enabled_types_json: Record<string, boolean>;
      }[]>`
        SELECT email_frequency, enabled_types_json FROM notification_preferences
        WHERE user_id = ${input.userId} FOR UPDATE
      `;
      if (preferences?.email_frequency !== "daily") return null;
      const eligible = await transaction<{ id: string; type: string }[]>`
        SELECT n.id, n.type FROM notifications n
        WHERE n.id IN ${transaction(ids)} AND n.user_id = ${input.userId}
          AND NOT EXISTS (SELECT 1 FROM notification_email_deliveries d WHERE d.notification_id = n.id)
          AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id = n.id)
        FOR UPDATE OF n
      `;
      if (eligible.length !== ids.length || eligible.some((notification) => preferences.enabled_types_json[notification.type] === false))
        return null;
      const id = randomUUID();
      await transaction`
        INSERT INTO notification_digest_batches
          (id, user_id, payload_json, notification_ids_json, created_at, updated_at)
        VALUES (${id}, ${input.userId}, ${transaction.json(input.payload)}, ${transaction.json(ids)}, ${now}, ${now})
      `;
      for (const notificationId of ids) {
        await transaction`
          INSERT INTO notification_digest_items (notification_id, batch_id) VALUES (${notificationId}, ${id})
        `;
        await transaction`
          INSERT INTO notification_email_deliveries
            (id, notification_id, user_id, status, created_at, updated_at)
          VALUES (${randomUUID()}, ${notificationId}, ${input.userId}, 'pending', ${now}, ${now})
        `;
      }
      return id;
    });
  } catch (error) {
    // Another delivery path can reserve a notification after selection. Roll
    // back the entire batch so its saved payload never describes a subset.
    if (error && typeof error === "object" && "code" in error && error.code === "23505") return null;
    throw error;
  }
}

export async function listRecoverableDigestBatchIds(now = new Date()): Promise<string[]> {
  await ensureSchema();
  const records = await sql<{ id: string }[]>`
    SELECT id FROM notification_digest_batches
    WHERE status = 'pending' AND (lease_until IS NULL OR lease_until <= ${now})
    ORDER BY created_at, id LIMIT 100
  `;
  return records.map((record) => record.id);
}

export async function claimDigestBatch(id: string, now = new Date()): Promise<ClaimedDigestBatch | null> {
  await ensureSchema();
  return sql.begin(async (transaction) => {
    const [batch] = await transaction<BatchRow[]>`
      SELECT * FROM notification_digest_batches WHERE id = ${id} FOR UPDATE
    `;
    if (!batch || batch.status !== "pending" || (batch.lease_until && batch.lease_until > now)) return null;
    if (batch.first_attempt_at && batch.first_attempt_at.getTime() <= now.getTime() - DIGEST_RETRY_WINDOW_MS) {
      await transaction`
        UPDATE notification_digest_batches SET status = 'held', failure_reason = ${DIGEST_HOLD_REASON},
          lease_token = NULL, lease_until = NULL, updated_at = ${now} WHERE id = ${id}
      `;
      await transaction`
        UPDATE notification_email_deliveries SET status = 'failed', failure_reason = ${DIGEST_HOLD_REASON}, updated_at = ${now}
        WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id = ${id})
      `;
      return null;
    }
    const [preferences] = await transaction<{
      email_frequency: string;
      enabled_types_json: Record<string, boolean>;
    }[]>`
      SELECT email_frequency, enabled_types_json FROM notification_preferences
      WHERE user_id = ${batch.user_id} FOR UPDATE
    `;
    const members = await transaction<{ type: string }[]>`
      SELECT n.type FROM notifications n JOIN notification_digest_items i ON i.notification_id = n.id
      WHERE i.batch_id = ${id}
    `;
    if (preferences?.email_frequency !== "daily" || members.some((notification) => preferences.enabled_types_json[notification.type] === false)) {
      await transaction`
        UPDATE notification_digest_batches SET status = 'held', failure_reason = ${DIGEST_PREFERENCE_HOLD_REASON},
          lease_token = NULL, lease_until = NULL, updated_at = ${now} WHERE id = ${id}
      `;
      await transaction`
        UPDATE notification_email_deliveries SET status = 'held', failure_reason = ${DIGEST_PREFERENCE_HOLD_REASON}, updated_at = ${now}
        WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id = ${id})
      `;
      return null;
    }
    const leaseToken = randomUUID();
    await transaction`
      UPDATE notification_digest_batches SET lease_token = ${leaseToken}, lease_until = ${new Date(now.getTime() + DIGEST_LEASE_MS)},
        first_attempt_at = COALESCE(first_attempt_at, ${now}), updated_at = ${now} WHERE id = ${id}
    `;
    return {
      id: batch.id,
      userId: batch.user_id,
      notificationIds: batch.notification_ids_json,
      payload: batch.payload_json,
      leaseToken,
    };
  });
}

export async function finishDigestBatch(result: DigestBatchResult, now = new Date()): Promise<boolean> {
  await ensureSchema();
  return sql.begin(async (transaction) => {
    const failureReason = result.status === "sent" ? null : result.failureReason?.slice(0, 500) ?? "Digest delivery failed.";
    const providerMessageId = result.status === "sent" ? result.providerMessageId ?? null : null;
    const changed = await transaction<{ id: string }[]>`
      UPDATE notification_digest_batches SET status = ${result.status}, provider_message_id = ${providerMessageId},
        failure_reason = ${failureReason}, lease_token = NULL,
        lease_until = ${result.status === "pending" ? new Date(now.getTime() + DIGEST_LEASE_MS) : null}, updated_at = ${now}
      WHERE id = ${result.id} AND status = 'pending' AND lease_token = ${result.leaseToken} AND lease_until > ${now}
      RETURNING id
    `;
    if (!changed.length) return false;
    await transaction`
      UPDATE notification_email_deliveries SET status = ${result.status === "pending" ? "failed" : result.status},
        provider_message_id = ${providerMessageId}, failure_reason = ${failureReason},
        retry_count = retry_count + ${result.status === "pending" ? 1 : 0}, updated_at = ${now}
      WHERE notification_id IN (SELECT notification_id FROM notification_digest_items WHERE batch_id = ${result.id})
    `;
    return true;
  });
}

export async function holdLegacyDigestDeliveries(now = new Date()): Promise<number> {
  await ensureSchema();
  const records = await sql<{ id: string }[]>`
    UPDATE notification_email_deliveries d SET status = 'held', failure_reason = ${LEGACY_DIGEST_HOLD_REASON}, updated_at = ${now}
    WHERE d.status IN ('pending', 'failed') AND d.updated_at <= ${new Date(now.getTime() - 15 * 60_000)}
      AND EXISTS (SELECT 1 FROM notification_preferences p WHERE p.user_id = d.user_id AND p.email_frequency = 'daily')
      AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id = d.notification_id)
    RETURNING d.id
  `;
  return records.length;
}

/** Reserve an individual email without borrowing a durable digest reservation. */
export async function queueImmediateEmailDelivery(notificationId: string, userId: string) {
  await ensureSchema();
  return sql.begin(async (transaction) => {
    // Digest creation locks the same notification before reserving its members.
    const [notification] = await transaction<{ id: string }[]>`
      SELECT id FROM notifications WHERE id = ${notificationId} AND user_id = ${userId} FOR UPDATE
    `;
    if (!notification) return undefined;
    const [membership] = await transaction<{ notification_id: string }[]>`
      SELECT notification_id FROM notification_digest_items WHERE notification_id = ${notificationId}
    `;
    if (membership) return undefined;
    const now = new Date();
    await transaction`
      INSERT INTO notification_email_deliveries (id, notification_id, user_id, status, created_at, updated_at)
      VALUES (${randomUUID()}, ${notificationId}, ${userId}, 'pending', ${now}, ${now})
      ON CONFLICT (notification_id) DO NOTHING
    `;
    const [delivery] = await transaction<Record<string, unknown>[]>`
      SELECT d.* FROM notification_email_deliveries d
      WHERE d.notification_id = ${notificationId} AND d.user_id = ${userId} AND d.status <> 'held'
        AND NOT EXISTS (SELECT 1 FROM notification_digest_items i WHERE i.notification_id = d.notification_id)
    `;
    return delivery;
  });
}
