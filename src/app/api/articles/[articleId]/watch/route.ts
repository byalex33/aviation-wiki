import { auth } from "@clerk/nextjs/server";

import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// Article pages are cached for everyone, so the reader's own watch state is
// fetched separately by the Watch button.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  const rateLimit = await consumeRateLimit({
    scope: "article-watch-state",
    subject: userId,
    limit: 120,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed)
    return Response.json(
      { error: "Too many requests" },
      { status: 429, headers: rateLimitHeaders(rateLimit) },
    );
  const articleId = (await params).articleId.slice(0, 100);
  const { isWatchingArticle } = await import("@/lib/notification-storage");
  return Response.json(
    { watching: await isWatchingArticle(userId, articleId) },
    {
      headers: {
        ...rateLimitHeaders(rateLimit),
        "Cache-Control": "private, no-store",
      },
    },
  );
}
