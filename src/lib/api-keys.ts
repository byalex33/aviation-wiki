import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";

import { ensureSchema, sql } from "@/lib/postgres";
import { enforceRateLimit } from "@/lib/rate-limit";
import { UserFacingError } from "@/lib/user-facing-error";

export const MAX_ACTIVE_API_KEYS = 5;

const KEY_DISPLAY_PREFIX_LENGTH = 7; // "aw_" + 4 random hex chars

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  userId: string;
  userName: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type VerifiedApiKey = {
  keyId: string;
  userId: string;
  userName: string;
  scopes: string[];
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateRawToken(): string {
  return `aw_${randomBytes(32).toString("hex")}`;
}

const iso = (v: Date | string | null | undefined): string | null =>
  v == null ? null : v instanceof Date ? v.toISOString() : String(v);

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  user_id: string;
  user_name: string;
  scopes_json: unknown;
  created_at: Date | string;
  last_used_at: Date | string | null;
  revoked_at: Date | string | null;
};

function mapRow(r: ApiKeyRow): ApiKey {
  return {
    id: r.id,
    name: r.name,
    keyPrefix: r.key_prefix,
    userId: r.user_id,
    userName: r.user_name,
    scopes: Array.isArray(r.scopes_json) ? (r.scopes_json as string[]) : [],
    createdAt: iso(r.created_at)!,
    lastUsedAt: iso(r.last_used_at),
    revokedAt: iso(r.revoked_at),
  };
}

export async function createApiKey(input: {
  name: string;
  userId: string;
  userName: string;
  scopes: string[];
}): Promise<{ key: ApiKey; rawToken: string }> {
  await ensureSchema();
  await enforceRateLimit({ scope: "api-key-create", subject: input.userId, limit: 10, windowMs: 3_600_000 }, "You can attempt to create up to 10 API keys per hour.");
  const rawToken = generateRawToken();
  const keyHash = hashToken(rawToken);
  const keyPrefix = rawToken.slice(0, KEY_DISPLAY_PREFIX_LENGTH);
  const id = randomUUID();
  const now = new Date();
  await sql.begin(async (transaction) => {
    // Serialize creations for one account, including its first key.
    await transaction`SELECT pg_advisory_xact_lock(8247, hashtext(${input.userId}))`;
    const [count] = await transaction<{ count: number }[]>`
      SELECT COUNT(*)::integer AS count FROM api_keys
      WHERE user_id = ${input.userId} AND revoked_at IS NULL
    `;
    if (count.count >= MAX_ACTIVE_API_KEYS)
      throw new UserFacingError(`You can have up to ${MAX_ACTIVE_API_KEYS} active API keys. Revoke an existing key first.`);
    await transaction`
      INSERT INTO api_keys (id, name, key_hash, key_prefix, user_id, user_name, scopes_json, created_at)
      VALUES (${id}, ${input.name}, ${keyHash}, ${keyPrefix}, ${input.userId}, ${input.userName}, ${transaction.json(input.scopes)}, ${now})
    `;
  });
  return {
    rawToken,
    key: {
      id,
      name: input.name,
      keyPrefix,
      userId: input.userId,
      userName: input.userName,
      scopes: input.scopes,
      createdAt: now.toISOString(),
      lastUsedAt: null,
      revokedAt: null,
    },
  };
}

export async function verifyApiKey(rawToken: string): Promise<VerifiedApiKey | null> {
  if (!rawToken.startsWith("aw_")) return null;
  await ensureSchema();
  const keyHash = hashToken(rawToken);
  const records = await sql<
    Array<{
      id: string;
      user_id: string;
      user_name: string;
      scopes_json: unknown;
      revoked_at: Date | string | null;
    }>
  >`
    SELECT id, user_id, user_name, scopes_json, revoked_at
    FROM api_keys
    WHERE key_hash = ${keyHash}
    LIMIT 1
  `;
  const record = records[0];
  if (!record || record.revoked_at) return null;
  await sql`UPDATE api_keys SET last_used_at = ${new Date()} WHERE id = ${record.id}`;
  return {
    keyId: record.id,
    userId: record.user_id,
    userName: record.user_name,
    scopes: Array.isArray(record.scopes_json) ? (record.scopes_json as string[]) : [],
  };
}

export async function listApiKeys(userId: string): Promise<ApiKey[]> {
  await ensureSchema();
  const records = await sql<ApiKeyRow[]>`
    SELECT id, name, key_prefix, user_id, user_name, scopes_json, created_at, last_used_at, revoked_at
    FROM api_keys
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return records.map(mapRow);
}

export async function revokeApiKey(keyId: string, userId: string): Promise<boolean> {
  await ensureSchema();
  const result = await sql`
    UPDATE api_keys SET revoked_at = ${new Date()}
    WHERE id = ${keyId} AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `;
  return result.length > 0;
}

export async function revokeAllApiKeys(userId: string): Promise<void> {
  await ensureSchema();
  await sql`UPDATE api_keys SET revoked_at = ${new Date()} WHERE user_id = ${userId} AND revoked_at IS NULL`;
}

export async function regenerateApiKey(
  keyId: string,
  userId: string,
): Promise<{ key: ApiKey; rawToken: string } | null> {
  await ensureSchema();
  const rawToken = generateRawToken();
  const keyHash = hashToken(rawToken);
  const keyPrefix = rawToken.slice(0, KEY_DISPLAY_PREFIX_LENGTH);
  const records = await sql<ApiKeyRow[]>`
    UPDATE api_keys
    SET key_hash = ${keyHash}, key_prefix = ${keyPrefix}, last_used_at = NULL
    WHERE id = ${keyId} AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id, name, key_prefix, user_id, user_name, scopes_json, created_at, last_used_at, revoked_at
  `;
  if (!records.length) return null;
  return { rawToken, key: mapRow(records[0]) };
}
