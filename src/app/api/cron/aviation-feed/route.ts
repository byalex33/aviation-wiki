import { refreshAviationFeed } from "@/lib/aviation-feed";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return new Response("Unauthorized", { status: 401 });
  try {
    return Response.json(await refreshAviationFeed());
  } catch (error) {
    console.error("Aviation feed refresh failed", error);
    return Response.json({ error: "Aviation feed refresh failed; saved events are unchanged." }, { status: 502 });
  }
}
