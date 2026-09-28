import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { AVIATION_FEED_SCHEMA_SQL, parseAviationFeed } from "../src/lib/aviation-feed-data";

const item = (title = "28 September 1952", link = "https://www.thisdayinaviation.com/28-september-1952/") => `<item><title>${title}</title><link>${link}</link><pubDate>Mon, 28 Sep 2026 12:12:34 +0000</pubDate><description><![CDATA[First flight &#8212; <b>aircraft</b> &amp; crew. <a>Continue reading</a>]]></description></item>`;
const feed = (items: string) => `<rss version="2.0"><channel>${items}</channel></rss>`;
const parsed = parseAviationFeed(feed(item() + item()));
assert.equal(parsed.length, 1);
assert.equal(parsed[0].eventDate, "1952-09-28");
assert.equal(parsed[0].description, "First flight — aircraft & crew.");
assert.equal(parsed[0].sources?.[0].url, parsed[0].href);
assert.throws(() => parseAviationFeed("<rss>"));
assert.throws(() => parseAviationFeed('<!DOCTYPE rss><rss/>'));
assert.throws(() => parseAviationFeed(feed(item("30 February 1952"))));
assert.throws(() => parseAviationFeed(feed(item("28 September 1952", "javascript:alert(1)"))));
assert.throws(() => parseAviationFeed(feed(item("28 September 1952", "https://evil.example/"))));
assert.equal(parseAviationFeed(feed(item("29 February 2000")))[0].day, 29);
assert.equal(parseAviationFeed(feed(item("28 September 1920: The Gordon-Bennett Air Race")))[0].year, 1920);

// Exercise production queries against an isolated PostgreSQL-compatible database.
Object.assign(process.env, { NODE_ENV: "production", CRON_SECRET: "feed-test-secret" });
const db = new PGlite();
await db.exec(AVIATION_FEED_SCHEMA_SQL);
function adapter(database: Pick<PGlite, "query" | "transaction">) {
  const tag = async (parts: TemplateStringsArray, ...values: unknown[]) =>
    (await database.query(parts.reduce((query, part, index) => query + (index ? `$${index}` : "") + part, ""), values)).rows;
  return Object.assign(tag, {
    json: (value: unknown) => JSON.stringify(value),
    begin: <T,>(run: (transaction: ReturnType<typeof adapter>) => Promise<T>): Promise<T> =>
      database.transaction(transaction => run(adapter(transaction as unknown as PGlite))),
  });
}
globalThis.aviationWikiSql = adapter(db) as unknown as typeof globalThis.aviationWikiSql;
const originalFetch = globalThis.fetch;
let body = feed(item());
let fetches = 0;
globalThis.fetch = async () => { fetches++; return new Response(body); };
try {
  const { GET } = await import("../src/app/api/cron/aviation-feed/route");
  const { loadAviationFeedEvents } = await import("../src/lib/aviation-feed");
  const request = (authorized = true) => new Request("https://aviation.wiki/api/cron/aviation-feed", { headers: authorized ? { authorization: "Bearer feed-test-secret" } : {} });
  assert.equal((await GET(request(false))).status, 401);
  assert.equal(fetches, 0);
  assert.equal((await GET(request())).status, 200);
  assert.equal((await GET(request())).status, 200);
  assert.deepEqual(await loadAviationFeedEvents(), parsed);
  await db.query("UPDATE aviation_feed_events SET event_json = to_jsonb(event_json::text)");
  assert.deepEqual(await loadAviationFeedEvents(), parsed, "Reads entries saved as JSON strings by the first importer");
  assert.equal((await loadAviationFeedEvents()).length, 1);
  body = feed(item("29 February 2000", "https://www.thisdayinaviation.com/29-february-2000/"));
  assert.equal((await GET(request())).status, 200);
  assert.equal((await loadAviationFeedEvents()).length, 2, "Older feed entries are retained");
  body = "Bad upstream response";
  assert.equal((await GET(request())).status, 502);
  assert.equal((await loadAviationFeedEvents()).length, 2, "Failure preserves saved events");
  globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
  assert.equal((await GET(request())).status, 502);
  assert.equal((await loadAviationFeedEvents()).length, 2);
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
  assert.ok(config.crons.some((cron: { path: string; schedule: string }) => cron.path === "/api/cron/aviation-feed" && cron.schedule === "0 14 * * *"));
} finally {
  globalThis.fetch = originalFetch;
  await db.close();
}
console.log("Aviation RSS parsing, persistence, and daily cron checks passed");
