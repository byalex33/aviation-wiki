import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

// Do not load .env files or touch an existing application database.
process.env.AVIATION_WIKI_DB_PATH = path.join(mkdtempSync(path.join(tmpdir(), "aviation-digest-")), "test.db");
const { db } = await import("../src/lib/sqlite");
const notifications = await import("../src/lib/notification-db");
const digest = await import("../src/lib/sqlite-digest-db");
const { DIGEST_HOLD_REASON, LEGACY_DIGEST_HOLD_REASON, DIGEST_PREFERENCE_HOLD_REASON, DIGEST_LEASE_MS, DIGEST_RETRY_WINDOW_MS } = await import("../src/lib/notification-digest");
const now = new Date("2026-09-10T12:00:00.000Z");
const at = (offset: number) => new Date(now.getTime() + offset);
const payload = { from: "test@example.invalid", to: ["reader@example.invalid"], subject: "Saved digest", text: "First notification.\nSecond notification." };
let sequence = 0;
function notice(userId = "reader") {
  const result = notifications.createNotification({ userId, type: "custom", title: "Test", message: "Fixture", href: "/notifications", dedupeKey: `digest-${++sequence}` });
  assert.ok(result);
  return result;
}
function deliveries(batchId: string) {
  return db.prepare(`SELECT d.status,d.failure_reason,d.retry_count FROM notification_email_deliveries d
    JOIN notification_digest_items i ON i.notification_id=d.notification_id WHERE i.batch_id=? ORDER BY d.notification_id`).all(batchId) as Array<{ status: string; failure_reason: string | null; retry_count: number }>;
}
try {
  notifications.saveNotificationPreferences("reader", "daily", { custom: true });
  const first = notice();
  const second = notice();
  const source = { userId: "reader", notifications: [first, second], payload: { ...payload } };
  const batchId = digest.createDigestBatch(source, now);
  assert.ok(batchId);
  assert.equal(deliveries(batchId).length, 2);
  assert.ok(deliveries(batchId).every((value) => value.status === "pending"));
  assert.equal(digest.createDigestBatch(source, now), null, "A notification can belong to only one immutable batch");
  const unclaimed = notice();
  assert.equal(digest.createDigestBatch({ ...source, notifications: [unclaimed, first] }, now), null, "Conflicting input is rejected without saving a payload for a subset");
  assert.equal((db.prepare("SELECT COUNT(*) count FROM notification_digest_items WHERE notification_id=?").get(unclaimed.id) as { count: number }).count, 0);
  assert.equal(digest.createDigestBatch({ ...source, notifications: [] }, now), null);
  assert.equal(digest.createDigestBatch({ ...source, notifications: [unclaimed, unclaimed] }, now), null);
  assert.equal(digest.createDigestBatch({ ...source, notifications: Array(101).fill(unclaimed) }, now), null);
  assert.equal(digest.createDigestBatch({ ...source, notifications: [notice("other")] }, now), null, "Ownership is checked from stored notifications");
  notifications.saveNotificationPreferences("reader", "in_app", { custom: true });
  assert.equal(digest.createDigestBatch({ ...source, notifications: [unclaimed] }, now), null, "Stale selection cannot override a changed frequency");
  notifications.saveNotificationPreferences("reader", "daily", { custom: false });
  assert.equal(digest.createDigestBatch({ ...source, notifications: [unclaimed] }, now), null, "Stale selection cannot override a disabled type");
  notifications.saveNotificationPreferences("reader", "daily", { custom: true });

  source.payload.text = "Changed after batch creation.";
  const claim = digest.claimDigestBatch(batchId, now);
  assert.ok(claim);
  assert.deepEqual(claim.payload, payload, "Sending always uses the immutable stored payload");
  assert.deepEqual(claim.notificationIds, [first.id, second.id]);
  assert.equal(digest.claimDigestBatch(batchId, at(1)), null, "Fresh leases exclude a second worker");
  assert.equal(digest.listRecoverableDigestBatchIds(at(DIGEST_LEASE_MS - 1)).includes(batchId), false);
  assert.equal(digest.finishDigestBatch({ id: batchId, leaseToken: claim.leaseToken, status: "sent" }, at(DIGEST_LEASE_MS)), false, "An expired owner cannot acknowledge delivery");
  assert.equal(digest.listRecoverableDigestBatchIds(at(DIGEST_LEASE_MS)).includes(batchId), true);
  const recovered = digest.claimDigestBatch(batchId, at(DIGEST_LEASE_MS));
  assert.ok(recovered);
  assert.notEqual(recovered.leaseToken, claim.leaseToken);
  assert.deepEqual(recovered.payload, claim.payload, "A worker crash preserves the exact retry body");
  assert.equal(digest.finishDigestBatch({ id: batchId, leaseToken: claim.leaseToken, status: "sent" }, at(DIGEST_LEASE_MS + 1)), false, "A stale token cannot acknowledge the reclaimed batch");
  assert.equal(digest.finishDigestBatch({ id: batchId, leaseToken: recovered.leaseToken, status: "sent", providerMessageId: "email-1" }, at(DIGEST_LEASE_MS + 1)), true);
  assert.ok(deliveries(batchId).every((value) => value.status === "sent"));
  assert.equal(digest.claimDigestBatch(batchId, at(DIGEST_LEASE_MS * 3)), null);
  assert.equal(digest.listRecoverableDigestBatchIds(at(DIGEST_LEASE_MS * 3)).includes(batchId), false);

  const failureId = digest.createDigestBatch({ ...source, notifications: [unclaimed] }, now);
  assert.ok(failureId);
  const failure = digest.claimDigestBatch(failureId, now);
  assert.ok(failure);
  assert.equal(digest.finishDigestBatch({ id: failureId, leaseToken: failure.leaseToken, status: "pending", failureReason: "Timed out" }, at(1_000)), true);
  assert.deepEqual(deliveries(failureId), [{ status: "failed", failure_reason: "Timed out", retry_count: 1 }]);
  assert.equal(digest.claimDigestBatch(failureId, at(DIGEST_LEASE_MS)), null, "A failed attempt has a cooldown");
  const retry = digest.claimDigestBatch(failureId, at(DIGEST_LEASE_MS + 1_000));
  assert.ok(retry);
  assert.deepEqual(retry.payload, failure.payload);
  assert.equal(digest.claimDigestBatch(failureId, at(DIGEST_RETRY_WINDOW_MS)), null, "Unknown outcomes are not retried outside the provider's idempotency window");
  assert.equal((db.prepare("SELECT status FROM notification_digest_batches WHERE id=?").get(failureId) as { status: string }).status, "held");
  assert.equal(deliveries(failureId)[0].failure_reason, DIGEST_HOLD_REASON);

  const legacy = notice();
  notifications.queueEmailDelivery(legacy.id, "reader");
  db.prepare("UPDATE notification_email_deliveries SET updated_at=? WHERE notification_id=?").run(at(-15 * 60_000).toISOString(), legacy.id);
  const freshLegacy = notice();
  notifications.queueEmailDelivery(freshLegacy.id, "reader");
  db.prepare("UPDATE notification_email_deliveries SET updated_at=? WHERE notification_id=?").run(at(-14 * 60_000).toISOString(), freshLegacy.id);
  assert.equal(digest.holdLegacyDigestDeliveries(now), 1);
  const heldLegacy = db.prepare("SELECT status,failure_reason FROM notification_email_deliveries WHERE notification_id=?").get(legacy.id);
  assert.deepEqual(heldLegacy, { status: "held", failure_reason: LEGACY_DIGEST_HOLD_REASON });
  assert.equal(digest.holdLegacyDigestDeliveries(now), 0, "Held and batched failures are not reprocessed");

  const explicitHoldId = digest.createDigestBatch({ ...source, notifications: [notice()] }, now);
  assert.ok(explicitHoldId);
  const explicitHold = digest.claimDigestBatch(explicitHoldId, now);
  assert.ok(explicitHold);
  assert.equal(digest.finishDigestBatch({ id: explicitHoldId, leaseToken: explicitHold.leaseToken, status: "held", failureReason: "Verified recipient changed" }, at(1)), true);
  assert.deepEqual(deliveries(explicitHoldId), [{ status: "held", failure_reason: "Verified recipient changed", retry_count: 0 }]);
  assert.equal(digest.claimDigestBatch(explicitHoldId, at(DIGEST_LEASE_MS)), null);

  for (const changedPreference of ["frequency", "type"]) {
    const optedOutId = digest.createDigestBatch({ ...source, notifications: [notice(), notice()] }, now);
    assert.ok(optedOutId);
    notifications.saveNotificationPreferences("reader", changedPreference === "frequency" ? "in_app" : "daily", { custom: changedPreference !== "type" });
    assert.equal(digest.claimDigestBatch(optedOutId, now), null, "Changed preferences hold the whole saved batch");
    assert.ok(deliveries(optedOutId).every((value) => value.status === "held" && value.failure_reason === DIGEST_PREFERENCE_HOLD_REASON));
    notifications.saveNotificationPreferences("reader", "daily", { custom: true });
    assert.equal(digest.claimDigestBatch(optedOutId, at(DIGEST_LEASE_MS)), null, "A held batch is not silently reactivated");
  }

  const digestOwned = notice();
  const digestOwnedId = digest.createDigestBatch({ ...source, notifications: [digestOwned] }, now);
  assert.ok(digestOwnedId);
  assert.equal(digest.queueImmediateEmailDelivery(digestOwned.id, "reader", now), null, "An immediate producer cannot send a digest-owned notification");
  const immediateOwned = notice();
  assert.equal(digest.queueImmediateEmailDelivery(immediateOwned.id, "other", now), null, "Immediate reservations enforce notification ownership");
  const immediate = digest.queueImmediateEmailDelivery(immediateOwned.id, "reader", now);
  assert.equal(immediate?.status, "pending");
  assert.equal(digest.createDigestBatch({ ...source, notifications: [immediateOwned] }, now), null, "An immediate reservation prevents a later digest batch");
  notifications.updateEmailDelivery({ notificationId: immediateOwned.id, status: "failed", failureReason: "Transient failure" });
  assert.equal(digest.queueImmediateEmailDelivery(immediateOwned.id, "reader", now)?.status, "failed", "Admin retries can use an existing individual delivery");
  db.prepare("UPDATE notification_email_deliveries SET status='held' WHERE notification_id=?").run(immediateOwned.id);
  assert.equal(digest.queueImmediateEmailDelivery(immediateOwned.id, "reader", now), null, "Held individual outcomes require review before sending");

  for (const deliveryStatus of ["pending", "failed"] as const) {
    const provenanceUser = `immediate-provenance-${deliveryStatus}`;
    notifications.saveNotificationPreferences(provenanceUser, "immediate", { custom: true });
    const individual = notice(provenanceUser);
    digest.queueImmediateEmailDelivery(individual.id, provenanceUser, at(-16 * 60_000));
    db.prepare("UPDATE notification_email_deliveries SET status=?,updated_at=? WHERE notification_id=?")
      .run(deliveryStatus, at(-16 * 60_000).toISOString(), individual.id);
    notifications.saveNotificationPreferences(provenanceUser, "daily", { custom: true });
    digest.holdLegacyDigestDeliveries(now);
    assert.equal(digest.queueImmediateEmailDelivery(individual.id, provenanceUser, now)?.status, deliveryStatus, "Known individual attempts remain retryable after switching to daily email");
    assert.equal((db.prepare("SELECT COUNT(*) count FROM notification_immediate_deliveries WHERE notification_id=?").get(individual.id) as { count: number }).count, 1, "An immediate retry preserves its original provenance");
  }
  const unknown = notice();
  notifications.queueEmailDelivery(unknown.id, "reader");
  db.prepare("UPDATE notification_email_deliveries SET updated_at=? WHERE notification_id=?").run(at(-16 * 60_000).toISOString(), unknown.id);
  digest.queueImmediateEmailDelivery(unknown.id, "reader", now);
  assert.equal((db.prepare("SELECT COUNT(*) count FROM notification_immediate_deliveries WHERE notification_id=?").get(unknown.id) as { count: number }).count, 0, "Existing ambiguous deliveries are not retroactively labeled immediate");
  assert.equal(digest.holdLegacyDigestDeliveries(now), 1, "Unknown legacy attempts still require review");
  assert.equal(digest.queueImmediateEmailDelivery(unknown.id, "reader", now), null);

  // Force a member update to fail and verify the batch and every member roll back.
  const atomicFirst = notice();
  const atomicSecond = notice();
  const atomicId = digest.createDigestBatch({ ...source, notifications: [atomicFirst, atomicSecond] }, now);
  assert.ok(atomicId);
  const atomicClaim = digest.claimDigestBatch(atomicId, now);
  assert.ok(atomicClaim);
  db.exec(`CREATE TRIGGER fail_digest_member BEFORE UPDATE ON notification_email_deliveries
    WHEN NEW.notification_id='${atomicSecond.id}' AND NEW.status='sent'
    BEGIN SELECT RAISE(ABORT, 'Test member update failed'); END;`);
  assert.throws(() => digest.finishDigestBatch({ id: atomicId, leaseToken: atomicClaim.leaseToken, status: "sent" }, at(1)), /Test member update failed/);
  assert.equal((db.prepare("SELECT status FROM notification_digest_batches WHERE id=?").get(atomicId) as { status: string }).status, "pending");
  assert.ok(deliveries(atomicId).every((value) => value.status === "pending"), "No partial member acknowledgement can commit");
  console.log("SQLite digest batches: immutable payloads, ownership/preferences, crash recovery, leases, cooldown, held outcomes and atomic acknowledgement passed.");
} finally { db.close(); }
