import { auth } from "@clerk/nextjs/server";

import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  const rateLimit = await consumeRateLimit({
    scope: "notification-poll",
    subject: userId,
    limit: 60,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed)
    return Response.json(
      { error: "Too many notification requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  const { getUnreadCount, listNotifications } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/notification-db");

  return Response.json(
    {
      unreadCount: await getUnreadCount(userId),
      ...await listNotifications(userId, 1, 8),
    },
    {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "private, no-store",
      },
    },
  );
}
