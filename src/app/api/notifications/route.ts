import { auth } from "@clerk/nextjs/server";

import { getUnreadCount, listNotifications } from "@/lib/notification-db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.userId;
  const url = new URL(request.url);
  if (url.searchParams.get("stream") !== "1") {
    return Response.json({
      unreadCount: getUnreadCount(userId),
      ...listNotifications(userId, 1, 8),
    });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream({
    start(controller) {
      let lastCount = -1;
      const send = () => {
        if (request.signal.aborted) {
          if (timer) clearInterval(timer);
          controller.close();
          return;
        }
        const unreadCount = getUnreadCount(userId);
        if (unreadCount !== lastCount) {
          lastCount = unreadCount;
          controller.enqueue(
            encoder.encode(
              `event: notifications\ndata: ${JSON.stringify({ unreadCount })}\n\n`,
            ),
          );
        } else controller.enqueue(encoder.encode(": keep-alive\n\n"));
      };
      send();
      timer = setInterval(send, 5_000);
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
