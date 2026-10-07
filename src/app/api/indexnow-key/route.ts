import { indexNowKey } from "@/lib/indexnow-key";

// Served at `/<INDEXNOW_KEY>.txt` through a rewrite in next.config.ts, so a
// dynamic top-level segment does not swallow every unknown URL.
export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404 });
  return new Response(key, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
