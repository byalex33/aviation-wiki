import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire, Module } from "node:module";

const require = createRequire(import.meta.url);
const clerkPath = require.resolve("@clerk/nextjs/server");
const clerk = new Module(clerkPath);
clerk.exports = { clerkClient: async () => ({ users: { getUserList: async () => ({ data: [] }) } }) };
require.cache[clerkPath] = clerk;

const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(database.hostname), "Use an isolated loopback PostgreSQL database");
assert.equal(process.env.NODE_ENV, "development");
process.env.DATABASE_POOL_SIZE = "5";
const { sql } = await import("../src/lib/postgres");
const { createApiKey, listApiKeys, revokeApiKey, verifyApiKey, MAX_ACTIVE_API_KEYS } = await import("../src/lib/api-keys");
try {
  const userId = `account-limit-${randomUUID()}`;
  const input = { userId, userName: "Test account", name: "Test key", scopes: ["articles:draft"] };
  const creations = await Promise.allSettled(Array.from({ length: MAX_ACTIVE_API_KEYS + 3 }, () => createApiKey(input)));
  const successes = creations.filter(value => value.status === "fulfilled").map(value => value.value);
  assert.equal(successes.length, MAX_ACTIVE_API_KEYS, "Concurrent creation cannot exceed the active-key bound");
  assert.equal((await listApiKeys(userId)).filter(key => !key.revokedAt).length, MAX_ACTIVE_API_KEYS);
  assert.equal(creations.filter(value => value.status === "rejected").length, 3);
  assert.equal(await revokeApiKey(successes[0].key.id, "another-user"), false);
  assert.equal(await revokeApiKey(successes[0].key.id, userId), true);
  assert.equal(await verifyApiKey(successes[0].rawToken), null);
  const replacement = await createApiKey(input);
  assert.ok(replacement.rawToken);
  await assert.rejects(createApiKey(input), /up to 5 active/);
  await revokeApiKey(replacement.key.id, userId);
  await assert.rejects(createApiKey(input), /10 API keys per hour/, "Revoking keys cannot bypass the account creation throttle");

  const { POST } = await import("../src/app/api/v1/drafts/route");
  const tokens = successes.slice(1).map(key => key.rawToken);
  const responses = await Promise.all(Array.from({ length: 14 }, (_, index) => POST(new Request("http://localhost/api/v1/drafts", {
    method: "POST",
    headers: { authorization: `Bearer ${tokens[index % tokens.length]}`, "content-type": "application/json" },
    body: JSON.stringify({}),
  }))));
  assert.equal(responses.filter(response => response.status === 400).length, 10, "Ten requests reach validation across every key combined");
  const blocked = responses.filter(response => response.status === 429);
  assert.equal(blocked.length, 4, "Additional keys do not increase the account request allowance");
  assert.equal(blocked[0].headers.get("Retry-After"), "60");
  const other = await createApiKey({ ...input, userId: `other-${randomUUID()}` });
  assert.equal((await POST(new Request("http://localhost/api/v1/drafts", {
    method: "POST", headers: { authorization: `Bearer ${other.rawToken}` }, body: "{}",
  }))).status, 400, "A different account has its own allowance");
  const title = `Shared type ${randomUUID()}`;
  const { createOrGetArticle, normalizeSlug } = await import("../src/lib/wiki-public-db");
  await createOrGetArticle(normalizeSlug(title), title, "aircraft");
  const created = await POST(new Request("http://localhost/api/v1/drafts", {
    method: "POST", headers: { authorization: `Bearer ${other.rawToken}` },
    body: JSON.stringify({ title, type: "engine", content: "Engine draft." }),
  }));
  assert.equal(created.status, 201);
  const result = await created.json();
  assert.equal(new URL(result.url).pathname, `/contribute/${normalizeSlug(title)}`);
  assert.equal(new URL(result.url).searchParams.get("type"), "engine", "API draft URLs preserve type when another article shares the slug");
  console.log("PostgreSQL concurrent API key cap, creation throttle, and aggregate multi-key draft request checks passed.");
} finally {
  await sql.end();
}
