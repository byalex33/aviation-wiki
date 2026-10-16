import { writeFile } from "node:fs/promises";
import { anniversaryDate } from "../src/lib/on-this-day-data";

async function main() {
  const [value, output] = process.argv.slice(2);
  const date = value ? anniversaryDate(value) : null;
  if (!date || !output) throw new Error("Usage: node --import tsx scripts/fetch-aviation-anniversaries.ts MM-DD output.json");
  const label = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).format(date);
  const title = `Portal:Aviation/Anniversaries/${label}`;
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({ action: "parse", page: title, prop: "wikitext|revid", format: "json", formatversion: "2", maxlag: "5" }).toString();
  const response = await fetch(url, {
    headers: { "User-Agent": "aviation.wiki/1.0 (https://www.aviation.wiki)" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Wikipedia returned HTTP ${response.status}`);
  const data = await response.json();
  if (typeof data.parse?.wikitext !== "string" || !Number.isSafeInteger(data.parse?.revid)) {
    throw new Error("Wikipedia did not return the requested anniversary page and revision. Try again later.");
  }
  await writeFile(output, JSON.stringify({
    date: value,
    source: `https://en.wikipedia.org/w/index.php?oldid=${data.parse.revid}`,
    sourceTitle: title,
    attribution: "Wikipedia contributors",
    license: "CC-BY-SA-4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    fetchedAt: new Date().toISOString(),
    status: "unreviewed",
    wikitext: data.parse.wikitext,
  }, null, 2) + "\n", { flag: "wx" });
  console.log(`Saved unreviewed aviation history source for ${value} to ${output}.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
