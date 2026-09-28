import { XMLParser, XMLValidator } from "fast-xml-parser";
import { parseExactEventDate, type DatedAviationEvent } from "./on-this-day-data";

export const AVIATION_FEED_URL = "https://www.thisdayinaviation.com/category/aviation/feed/";
export const AVIATION_FEED_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS aviation_feed_events (
    url text PRIMARY KEY,
    event_json jsonb NOT NULL,
    fetched_at timestamptz NOT NULL DEFAULT now()
  );
`;

export function parseAviationFeed(xml: string): DatedAviationEvent[] {
  if (Buffer.byteLength(xml) > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new Error("Invalid aviation RSS feed");
  const parser = new XMLParser({ parseTagValue: false, htmlEntities: true, isArray: (_name, path) => path === "rss.channel.item" });
  const channel = parser.parse(xml)?.rss?.channel;
  if (!channel || typeof channel !== "object") throw new Error("Missing RSS channel");
  const events = new Map<string, DatedAviationEvent>();
  for (const item of channel.item ?? []) {
    if (typeof item.title !== "string" || typeof item.link !== "string") continue;
    // RSS publication dates describe reposts, not the historical event.
    const date = parseExactEventDate(item.title.split(/:\s*/, 1)[0]);
    if (!date) continue;
    let url: URL;
    try { url = new URL(item.link); } catch { continue; }
    if (url.protocol !== "https:" || url.hostname !== "www.thisdayinaviation.com" || url.port || url.username || url.password) continue;
    url.hash = "";
    url.search = "";
    const href = url.href;
    // Keep a short text excerpt; never render upstream HTML or copy full articles.
    const excerpt = typeof item.description === "string" ? item.description
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, " ").replace(/Continue reading[\s\S]*$/i, "") : "";
    const decoded = parser.parse(`<text>${excerpt.replace(/</g, "&lt;")}</text>`).text;
    const description = typeof decoded === "string" ? decoded.replace(/\s+/g, " ").trim() : "";
    events.set(href, {
      id: `tdia:${href}`, title: item.title, href,
      description: description.length > 240 ? `${description.slice(0, 237).trimEnd()}…` : description,
      ...date,
      eventDate: `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`,
      eventType: "This Day in Aviation",
      sources: [{ title: "This Day in Aviation", url: href }],
    });
  }
  if (!events.size) throw new Error("No dated aviation entries in RSS feed");
  return [...events.values()];
}
