import { parseAviationItems } from "../src/lib/aviation-feed-data";
import { saveAviationFeedEvents } from "../src/lib/aviation-feed";
import { sql } from "../src/lib/postgres";
import type { DatedAviationEvent } from "../src/lib/on-this-day-data";

// Two gaps in the publisher's archive, checked against primary sources.
const additionalEvents: DatedAviationEvent[] = [
  {
    id: "history:brady-1968", title: "Patrick Brady's helicopter rescue missions", eventDate: "1968-01-06", year: 1968, month: 1, day: 6,
    href: "https://achh.army.mil/regiment/moh-bios-brady/",
    description: "Major Patrick Brady flew helicopter rescue missions near Chu Lai, Vietnam, actions for which he received the Medal of Honor.",
    eventType: "U.S. Army",
    sources: [{ title: "U.S. Army Medical Department: Patrick H. Brady", url: "https://achh.army.mil/regiment/moh-bios-brady/" }],
  },
  {
    id: "history:f101-first-flight", title: "First flight of the McDonnell F-101 Voodoo", eventDate: "1954-09-29", year: 1954, month: 9, day: 29,
    href: "https://www.aflcmc.af.mil/NEWS/Article/3915525/this-week-in-aflcmc-history-september-23-30-2024/",
    description: "The McDonnell F-101 Voodoo made its first flight at Edwards Air Force Base.",
    eventType: "U.S. Air Force",
    sources: [{ title: "Air Force Life Cycle Management Center history", url: "https://www.aflcmc.af.mil/NEWS/Article/3915525/this-week-in-aflcmc-history-september-23-30-2024/" }],
  },
];

async function main() {
  const posts: { title: { rendered: string }; link: string; excerpt: { rendered: string } }[] = [];
  let pages = 1;
  for (let page = 1; page <= pages; page++) {
    const response = await fetch(`https://www.thisdayinaviation.com/wp-json/wp/v2/posts?per_page=100&_fields=title,link,excerpt&page=${page}`, {
      headers: { "User-Agent": "aviation.wiki archive importer" }, signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Archive page ${page} returned ${response.status}`);
    pages = Number(response.headers.get("X-WP-TotalPages"));
    if (!Number.isInteger(pages) || pages < 1 || pages > 100) throw new Error("Unexpected archive page count");
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error("Invalid archive response");
    posts.push(...batch);
  }
  const events = [...parseAviationItems(posts.map(post => ({ title: post.title?.rendered, link: post.link, description: post.excerpt?.rendered }))), ...additionalEvents];
  const dates = new Set(events.map(event => `${event.month}-${event.day}`));
  const missing: string[] = [];
  for (let day = new Date("2000-01-01T00:00:00Z"); day.getUTCFullYear() === 2000; day.setUTCDate(day.getUTCDate() + 1)) {
    if (!dates.has(`${day.getUTCMonth() + 1}-${day.getUTCDate()}`)) missing.push(day.toISOString().slice(5, 10));
  }
  console.log(JSON.stringify({ entries: events.length, coveredDates: dates.size, missingDates: missing }));
  if (missing.length) throw new Error("Archive does not cover every calendar date; no changes saved");
  if (process.argv.includes("--apply")) console.log(await saveAviationFeedEvents(events));
  else console.log("Dry run. Add --apply to save the archive to the configured database.");
}
void main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sql.end());
