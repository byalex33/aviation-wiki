import { auth } from "@clerk/nextjs/server";

import { isWatchingArticle } from "@/lib/wiki-public-db";

export const dynamic = "force-dynamic";

// Per-user watch state for the WatchArticleButton client island. The article
// page itself is static/ISR (issue #5); this is the only per-request read.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ articleId: string }> },
) {
  const { userId } = await auth();
  const { articleId } = await params;
  const watching =
    userId && articleId ? await isWatchingArticle(userId, articleId) : false;
  return Response.json(
    { watching },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
