import { auth } from "@clerk/nextjs/server";

import { consumeRateLimit, rateLimitHeaders } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
  const url = new URL(request.url);
  const { getUnreadCount, listNotifications } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/notification-db");
  if (url.searchParams.get("stream") !== "1") {
    return Response.json(
      {
        unreadCount: await getUnreadCount(userId),
        ...await listNotifications(userId, 1, 8),
      },
      { headers: rateLimitHeaders(rateLimit) },
    );
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      let lastCount = -1;
      const send = async () => {
        if (request.signal.aborted) {
          if (timer) clearInterval(timer);
          controller.close();
          return;
        }
        const unreadCount = await getUnreadCount(userId);
        if (unreadCount !== lastCount) {
          lastCount = unreadCount;
          controller.enqueue(
            encoder.encode(
              `event: notifications\ndata: ${JSON.stringify({ unreadCount })}\n\n`,
            ),
          );
        } else controller.enqueue(encoder.encode(": keep-alive\n\n"));
      };
      void send();
      timer = setInterval(() => void send(), 5_000);
      request.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
