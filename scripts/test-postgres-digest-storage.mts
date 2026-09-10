import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(database.hostname), "Use an isolated local PostgreSQL database");
assert.equal(process.env.NODE_ENV, "development");
process.env.DATABASE_POOL_SIZE = "5";
const { sql } = await import("../src/lib/postgres");
const notifications = await import("../src/lib/postgres-notification-db");
const store = await import("../src/lib/postgres-digest-db");
const { DIGEST_LEASE_MS, DIGEST_RETRY_WINDOW_MS, DIGEST_HOLD_REASON, LEGACY_DIGEST_HOLD_REASON, DIGEST_PREFERENCE_HOLD_REASON } = await import("../src/lib/notification-digest");
const now = new Date("2030-01-01T00:00:00Z");
const later = (ms: number) => new Date(now.getTime() + ms);
const userId = `digest-storage-${randomUUID()}`;
const payload = { from: "wiki@example.invalid", to: ["reader@example.invalid"], subject: "Original subject", text: "Exact original digest\nwith newlines" };
async function notification(type: "custom" | "revision_approved" = "custom") {
  const value = await notifications.createNotification({ userId, type, title: "Test", message: "Test", href: "/notifications", dedupeKey: randomUUID() });
  assert.ok(value);
  return value;
}
async function batch() {
  const members = [await notification(), await notification("revision_approved")];
  const id = await store.createDigestBatch({ userId, notifications: members, payload }, now);
  assert.ok(id);
  return { id, members };
}
try {
  await notifications.saveNotificationPreferences(userId, "daily", { custom: true, revision_approved: true });
  const members = [await notification(), await notification("revision_approved")];
  const input = { userId, notifications: members, payload };
  const concurrent = await Promise.all(Array.from({ length: 5 }, () => store.createDigestBatch(input, now)));
  const ids = concurrent.filter((id): id is string => id !== null);
  assert.equal(ids.length, 1, "Overlapping workers persist exactly one whole immutable batch");
  const id = ids[0];
  assert.equal(await store.queueImmediateEmailDelivery(members[0].id, userId), undefined,
    "An immediate sender cannot borrow a digest-owned pending delivery");
  const immediate = await notification();
  assert.equal((await store.queueImmediateEmailDelivery(immediate.id, userId))?.status, "pending");
  assert.equal(await store.createDigestBatch({ userId, notifications: [immediate], payload }, now), null,
    "An immediate reservation prevents later digest membership");
  await notifications.updateEmailDelivery({ notificationId: immediate.id, status: "failed", failureReason: "Test immediate retry" });
  assert.equal((await store.queueImmediateEmailDelivery(immediate.id, userId))?.status, "failed",
    "Individual email retries retain their existing reservation");
  await sql`UPDATE notification_email_deliveries SET status = 'held' WHERE notification_id = ${immediate.id}`;
  assert.equal(await store.queueImmediateEmailDelivery(immediate.id, userId), undefined);
  assert.equal(await store.queueImmediateEmailDelivery(immediate.id, "different-user"), undefined);
  for (let index = 0; index < 8; index += 1) {
    const contested = await notification();
    const [digestId, immediateDelivery] = await Promise.all([
      store.createDigestBatch({ userId, notifications: [contested], payload }, now),
      store.queueImmediateEmailDelivery(contested.id, userId),
    ]);
    assert.equal(Number(Boolean(digestId)) + Number(Boolean(immediateDelivery)), 1,
      "Concurrent digest and individual senders cannot both reserve the notification");
    if (digestId) {
      const contestedLease = await store.claimDigestBatch(digestId, now);
      assert.ok(contestedLease);
      await store.finishDigestBatch({ id: digestId, leaseToken: contestedLease.leaseToken, status: "held", failureReason: "Test reservation completed" }, now);
    }
  }

  assert.equal(await store.createDigestBatch({ ...input, payload: { ...payload, text: "A different retry payload" } }, now), null);
  assert.equal(await store.createDigestBatch({ ...input, notifications: [] }, now), null);
  assert.equal(await store.createDigestBatch({ ...input, notifications: [members[0], members[0]] }, now), null);
  assert.equal(await store.createDigestBatch({ ...input, userId: "another-user" }, now), null);
  const claims = await Promise.all(Array.from({ length: 5 }, () => store.claimDigestBatch(id, now)));
  const claimed = claims.filter(value => value !== null);
  assert.equal(claimed.length, 1, "Only one worker holds the batch lease");
  const original = claimed[0];
  assert.deepEqual(original.payload, payload);
  assert.deepEqual(original.notificationIds, members.map(value => value.id));
  assert.ok(!(await store.listRecoverableDigestBatchIds(now)).includes(id));
  assert.equal(await store.finishDigestBatch({ id, leaseToken: "wrong", status: "sent" }, now), false);
  assert.equal(await store.finishDigestBatch({ id, leaseToken: original.leaseToken, status: "sent" }, later(DIGEST_LEASE_MS)), false, "An expired lease cannot acknowledge delivery");
  const recovered = await store.claimDigestBatch(id, later(DIGEST_LEASE_MS));
  assert.ok(recovered);
  assert.notEqual(recovered.leaseToken, original.leaseToken);
  assert.deepEqual(recovered.payload, payload, "Crash recovery retains exact email contents");
  assert.equal(await store.finishDigestBatch({ id, leaseToken: original.leaseToken, status: "sent" }, later(DIGEST_LEASE_MS + 1)), false);
  assert.equal(await store.finishDigestBatch({ id, leaseToken: recovered.leaseToken, status: "sent", providerMessageId: "provider-original" }, later(DIGEST_LEASE_MS + 1)), true);
  const acknowledgements = await sql<{ status: string; provider_message_id: string }[]>`
    SELECT status, provider_message_id FROM notification_email_deliveries WHERE notification_id IN ${sql(members.map(value => value.id))}
  `;
  assert.deepEqual(acknowledgements.map(value => value.status), ["sent", "sent"]);
  assert.ok(acknowledgements.every(value => value.provider_message_id === "provider-original"));
  assert.equal(await store.claimDigestBatch(id, later(DIGEST_RETRY_WINDOW_MS)), null);

  const failed = await batch();
  const firstAttempt = await store.claimDigestBatch(failed.id, now);
  assert.ok(firstAttempt);
  assert.equal(await store.finishDigestBatch({ id: failed.id, leaseToken: firstAttempt.leaseToken, status: "pending", failureReason: "Timeout with unknown provider outcome" }, now), true);
  assert.equal(await store.claimDigestBatch(failed.id, later(DIGEST_LEASE_MS - 1)), null);
  const retry = await store.claimDigestBatch(failed.id, later(DIGEST_LEASE_MS));
  assert.ok(retry);
  assert.deepEqual(retry.payload, payload);
  assert.equal(await store.claimDigestBatch(failed.id, later(DIGEST_RETRY_WINDOW_MS)), null, "Ambiguous outcomes outside the safe retry window must not resend");
  const [held] = await sql<{ status: string; failure_reason: string }[]>`SELECT status, failure_reason FROM notification_digest_batches WHERE id = ${failed.id}`;
  assert.equal(held.status, "held");
  assert.equal(held.failure_reason, DIGEST_HOLD_REASON);

  const optedOut = await batch();
  await notifications.saveNotificationPreferences(userId, "daily", { custom: true, revision_approved: false });
  assert.equal(await store.claimDigestBatch(optedOut.id, now), null, "One disabled type holds the whole original batch");
  const [preferenceHold] = await sql<{ status: string; failure_reason: string }[]>`SELECT status, failure_reason FROM notification_digest_batches WHERE id = ${optedOut.id}`;
  assert.equal(preferenceHold.status, "held");
  assert.equal(preferenceHold.failure_reason, DIGEST_PREFERENCE_HOLD_REASON);
  const disabled = await notification("revision_approved");
  assert.equal(await store.createDigestBatch({ userId, notifications: [disabled], payload }, now), null, "Batch creation rechecks current type preferences");
  await notifications.saveNotificationPreferences(userId, "daily", { custom: true, revision_approved: true });
  const manualHold = await batch();
  const lease = await store.claimDigestBatch(manualHold.id, now);
  assert.ok(lease);
  assert.equal(await store.finishDigestBatch({ id: manualHold.id, leaseToken: lease.leaseToken, status: "held", failureReason: "Verified recipient changed" }, now), true);
  const memberStatuses = await sql<{ status: string }[]>`SELECT status FROM notification_email_deliveries WHERE notification_id IN ${sql(manualHold.members.map(value => value.id))}`;
  assert.ok(memberStatuses.every(value => value.status === "held"));

  const legacy = await notification();
  await notifications.queueEmailDelivery(legacy.id, userId);
  await sql`UPDATE notification_email_deliveries SET updated_at = ${new Date(now.getTime() - 15 * 60_000)} WHERE notification_id = ${legacy.id}`;
  assert.ok(await store.holdLegacyDigestDeliveries(now) >= 1);
  const [legacyHold] = await sql<{ status: string; failure_reason: string }[]>`SELECT status, failure_reason FROM notification_email_deliveries WHERE notification_id = ${legacy.id}`;
  assert.equal(legacyHold.status, "held");
  assert.equal(legacyHold.failure_reason, LEGACY_DIGEST_HOLD_REASON);
  await notifications.saveNotificationPreferences(userId, "in_app", {});
  console.log("PostgreSQL digest concurrent reservation, immutable recovery, lease fencing, atomic acknowledgement, cooldown, and hold checks passed.");
} finally {
  await sql.end();
}
