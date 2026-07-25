import "server-only";

import { ensureSchema, sql } from "@/lib/postgres";

type RateLimitOptions = {
  scope: string;
  subject: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export async function consumeRateLimit({
  scope,
  subject,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  await ensureSchema();
  const now = new Date();
  const expiredBefore = new Date(now.getTime() - windowMs);
  const accepted = await sql<{ request_count: number }[]>`
    INSERT INTO request_rate_limits (
      scope,
      subject,
      window_started_at,
      request_count
    )
    VALUES (${scope}, ${subject}, ${now}, 1)
    ON CONFLICT (scope, subject) DO UPDATE
    SET
      window_started_at = CASE
        WHEN request_rate_limits.window_started_at <= ${expiredBefore}
          THEN EXCLUDED.window_started_at
        ELSE request_rate_limits.window_started_at
      END,
      request_count = CASE
        WHEN request_rate_limits.window_started_at <= ${expiredBefore}
          THEN 1
        ELSE request_rate_limits.request_count + 1
      END
    WHERE
      request_rate_limits.window_started_at <= ${expiredBefore}
      OR request_rate_limits.request_count < ${limit}
    RETURNING request_count
  `;
  const requestCount = accepted[0]?.request_count;

  return {
    allowed: requestCount !== undefined,
    limit,
    remaining: requestCount === undefined ? 0 : Math.max(0, limit - requestCount),
    retryAfterSeconds: Math.ceil(windowMs / 1000),
  };
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    ...(result.allowed
      ? {}
      : { "Retry-After": String(result.retryAfterSeconds) }),
  };
}
