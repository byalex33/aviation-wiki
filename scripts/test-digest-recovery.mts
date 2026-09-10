import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire, Module } from "node:module";
import { spawnSync } from "node:child_process";

const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(database.hostname));
assert.match(database.pathname, /^\/(audit|test)_/);
assert.equal(process.env.NODE_ENV, "development");
process.env.DATABASE_POOL_SIZE = "5";
const crash = process.argv.find((arg) => arg.startsWith("--crash-"));
const require = createRequire(import.meta.url);
const clerkPath = require.resolve("@clerk/nextjs/server");
const previousClerk = require.cache[clerkPath];
const clerk = new Module(clerkPath);
let changedRecipient = false;
const failedRecipients = new Set<string>();
clerk.exports = { clerkClient: async () => ({ users: { getUser: async (id: string) => { if (failedRecipients.has(id)) throw new Error("Deleted test user"); return ({
  primaryEmailAddressId: "primary",
  emailAddresses: [{ id: "primary", emailAddress: `${changedRecipient ? "changed" : id}@example.invalid`, verification: { status: "verified" } }],
}); } } }) };
require.cache[clerkPath] = clerk;
const originalFetch = globalThis.fetch;
type Receipt = { key: string; body: string; id: string };
const receipts = new Map<string, Receipt>();
const requests: Receipt[] = [];
let responseMode = "success";
globalThis.fetch = async (input, init) => {
  assert.equal(input, "https://api.resend.com/emails");
  assert.ok(init?.signal, "Provider request is bounded by a timeout");
  const key = new Headers(init.headers).get("Idempotency-Key")!;
  const body = String(init.body);
  if (crash === "--crash-before-send") process.exit(23);
  const receipt = { key, body, id: receipts.get(key)?.id || randomUUID() };
  if (crash === "--crash-after-send") {
    writeFileSync(process.env.DIGEST_TEST_RECEIPT!, JSON.stringify(receipt));
    process.exit(23); // Provider accepted; no local acknowledgement executes.
  }
  requests.push(receipt);
  if (responseMode === "concurrent") return Response.json({ name: "concurrent_idempotent_requests" }, { status: 409 });
  if (responseMode === "mismatch") return Response.json({ name: "invalid_idempotent_request" }, { status: 409 });
  if (responseMode === "malformed") return Response.json({});
  const old = receipts.get(key);
  if (old) assert.equal(body, old.body, "Provider retries must retain the exact request body");
  receipts.set(key, receipt);
  return Response.json({ id: receipt.id });
};
process.env.RESEND_API_KEY = "stub-no-real-email";
process.env.NOTIFICATION_EMAIL_FROM = "test@example.invalid";
const store = await import("../src/lib/notification-storage");
const batches = await import("../src/lib/notification-digest-storage");
const { deliverDailyDigests, deliverNotificationEmail } = await import("../src/lib/notification-service");
const { sql, ensureSchema } = await import("../src/lib/postgres");
async function prepare() {
  const userId = `digest-${randomUUID()}`;
  await store.saveNotificationPreferences(userId, "daily", { custom: true });
  const notifications = [];
  for (let i = 0; i < 2; i++) notifications.push((await store.createNotification({ userId, type: "custom", title: `Message ${i}`, message: `Body ${i}`, href: "/notifications", dedupeKey: randomUUID() }))!);
  const payload = { from: "test@example.invalid", to: [`${userId}@example.invalid`], subject: "2 saved updates", text: "Original persisted body" };
  const id = await batches.createDigestBatch({ userId, notifications, payload });
  assert.ok(id);
  return { id, userId, notifications, payload };
}
async function expire(id: string) {
  await sql`UPDATE notification_digest_batches SET lease_until=NOW()-INTERVAL '1 second' WHERE id=${id}`;
}
async function state(id: string) {
  return (await sql`SELECT status,failure_reason FROM notification_digest_batches WHERE id=${id}`)[0];
}
try {
  await ensureSchema();
  if (crash) {
    await deliverDailyDigests({ recoveryOnly: true });
    throw new Error("Crash worker did not reach the provider boundary");
  }
  const directory = mkdtempSync(join(tmpdir(), "aviation-digest-crash-"));
  for (const mode of ["before-send", "after-send"]) {
    const batch = await prepare();
    const beforeImmediate = requests.length;
    await deliverNotificationEmail(batch.notifications[0]);
    assert.equal(requests.length, beforeImmediate, "An immediate worker cannot send a digest-owned notification");
    const receiptPath = join(directory, `${mode}.json`);
    const worker = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", import.meta.filename, `--crash-${mode}`], {
      env: { ...process.env, DIGEST_TEST_RECEIPT: receiptPath }, encoding: "utf8", timeout: 30_000,
    });
    assert.equal(worker.status, 23, worker.stderr);
    assert.equal((await state(batch.id)).status, "pending");
    const before = requests.length;
    await deliverDailyDigests({ recoveryOnly: true });
    assert.equal(requests.length, before, "A fresh worker's lease cannot be overlapped");
    if (mode === "after-send") {
      const receipt = JSON.parse(readFileSync(receiptPath, "utf8")) as Receipt;
      receipts.set(receipt.key, receipt);
    }
    const newer = await store.createNotification({ userId: batch.userId, type: "custom", title: "Later notification", message: "Do not add to an old batch", href: "/notifications", dedupeKey: randomUUID() });
    await sql`UPDATE notifications SET message='Edited notification' WHERE id=${batch.notifications[0].id}`;
    process.env.NOTIFICATION_EMAIL_FROM = "changed-from@example.invalid";
    await expire(batch.id);
    await Promise.all([deliverDailyDigests({ recoveryOnly: true }), deliverDailyDigests({ recoveryOnly: true })]);
    assert.equal(requests.length, before + 1, "Only one competing recovery worker sends");
    assert.deepEqual(JSON.parse(requests.at(-1)!.body), batch.payload, "Payload survives worker termination and later content/config changes");
    assert.equal((await state(batch.id)).status, "sent");
    const deliveryRows = await sql`SELECT status FROM notification_email_deliveries WHERE notification_id IN ${sql(batch.notifications.map((n) => n.id))}`;
    assert.deepEqual(deliveryRows.map((row) => row.status), ["sent", "sent"]);
    assert.equal((await sql`SELECT 1 FROM notification_digest_items WHERE notification_id=${newer!.id}`).length, 0, "New notifications remain outside the recovered batch");
    await deliverDailyDigests({ recoveryOnly: true });
    assert.equal(requests.length, before + 1, "Sent batch is never replayed");
    await store.saveNotificationPreferences(batch.userId, "in_app", {});
  }
  const old = await prepare();
  await batches.claimDigestBatch(old.id);
  await sql`UPDATE notification_digest_batches SET first_attempt_at=NOW()-INTERVAL '24 hours',lease_until=NOW()-INTERVAL '1 hour' WHERE id=${old.id}`;
  const beforeHold = requests.length;
  await deliverDailyDigests({ recoveryOnly: true });
  assert.equal((await state(old.id)).status, "held");
  assert.equal(requests.length, beforeHold, "Never resend beyond provider idempotency retention");
  const recipient = await prepare();
  changedRecipient = true;
  await deliverDailyDigests({ recoveryOnly: true });
  assert.equal((await state(recipient.id)).status, "held");
  assert.equal(requests.length, beforeHold);
  changedRecipient = false;
  for (const mode of ["concurrent", "malformed", "mismatch"]) {
    const batch = await prepare();
    responseMode = mode;
    await deliverDailyDigests({ recoveryOnly: true });
    assert.equal((await state(batch.id)).status, mode === "mismatch" ? "held" : "pending");
    if (mode !== "mismatch") {
      await expire(batch.id);
      responseMode = "success";
      await deliverDailyDigests({ recoveryOnly: true });
      assert.equal((await state(batch.id)).status, "sent");
    }
  }
  responseMode = "success";
  const badUser = `0-bad-${randomUUID()}`;
  const goodUser = `z-good-${randomUUID()}`;
  for (const userId of [badUser, goodUser]) {
    await store.saveNotificationPreferences(userId, "daily", { custom: true });
    await store.createNotification({ userId, type: "custom", title: "Preparation", message: "Test", href: "/notifications", dedupeKey: randomUUID() });
  }
  failedRecipients.add(badUser);
  const beforePreparation = requests.length;
  const preparation = await deliverDailyDigests();
  assert.equal(preparation.preparationFailures, 1);
  assert.equal(requests.length, beforePreparation + 1, "An unavailable recipient cannot starve later users");
  assert.deepEqual(JSON.parse(requests.at(-1)!.body).to, [`${goodUser}@example.invalid`]);
  await store.saveNotificationPreferences(badUser, "in_app", {});
  await store.saveNotificationPreferences(goodUser, "in_app", {});
  process.env.CRON_SECRET = "test-cron-only";
  const { GET } = await import("../src/app/api/notifications/digest/recover/route");
  assert.equal((await GET(new Request("http://localhost/api/notifications/digest/recover"))).status, 401);
  assert.equal((await GET(new Request("http://localhost/api/notifications/digest/recover", { headers: { authorization: "Bearer test-cron-only" } }))).status, 200);
  console.log("Digest worker termination, immutable provider retries, competing recovery, hold conditions, and authenticated recovery route passed.");
} finally {
  globalThis.fetch = originalFetch;
  require.cache[clerkPath] = previousClerk;
  await sql.end();
}
