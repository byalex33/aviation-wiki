import "server-only";
import { AVIATION_FEED_URL, parseAviationFeed } from "./aviation-feed-data";
import type { DatedAviationEvent } from "./on-this-day-data";
import { ensureSchema, sql } from "./postgres";

export async function refreshAviationFeed() {
  const response = await fetch(AVIATION_FEED_URL, {
    cache: "no-store", signal: AbortSignal.timeout(20_000),
    headers: { Accept: "application/rss+xml, application/xml", "User-Agent": "aviation.wiki RSS reader" },
  });
  if (!response.ok) throw new Error(`Aviation RSS returned ${response.status}`);
  const events = parseAviationFeed(await response.text());
  await ensureSchema();
  await sql.begin(async transaction => {
    for (const event of events) {
      await transaction`INSERT INTO aviation_feed_events (url, event_json) VALUES (${event.href}, ${transaction.json(event)})
        ON CONFLICT (url) DO UPDATE SET event_json = EXCLUDED.event_json, fetched_at = now()`;
    }
  });
  return { count: events.length };
}

export async function loadAviationFeedEvents(): Promise<DatedAviationEvent[]> {
  try {
    await ensureSchema();
    const records = await sql`SELECT event_json FROM aviation_feed_events`;
    return records.map(record => (typeof record.event_json === "string"
      ? JSON.parse(record.event_json) : record.event_json) as DatedAviationEvent);
  } catch (error) {
    console.error("Unable to load saved aviation feed", error);
    return [];
  }
}
