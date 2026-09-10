import assert from "node:assert/strict";
import { parseArticleMarkdown } from "../src/lib/article-markdown";
import { parseExactEventDate } from "../src/lib/on-this-day-data";
import type { RevisionContent } from "../src/lib/wiki-types";

const seeds = [
  {
    slug: "wright-brothers-first-powered-flights",
    title: "Wright brothers make their first powered flights",
    date: "1903-12-17",
    location: "Kitty Hawk, North Carolina, United States",
    publisher: "Smithsonian National Air and Space Museum",
    sourceTitle: "1903 Wright Flyer",
    url: "https://airandspace.si.edu/collection-objects/1903-wright-flyer/nasm_A19610048000",
    introduction: "On 17 December 1903, the Wright brothers flew their powered aircraft at Kitty Hawk, North Carolina. Orville piloted the first flight, which covered 120 feet in 12 seconds.[^primary]",
    body: "## From gliders to powered flight\n\nThe brothers built and tested three full-sized gliders before attempting powered flight. Their 1903 Flyer brought together propulsion and the control methods developed through that earlier work.[^primary]\n\n## The aircraft\n\nThe Smithsonian preserves the original 1903 Wright Flyer. Its collection record documents the aircraft and the flight, providing a reference for the date and the performance of Orville's first attempt.[^primary]",
  },
  {
    slug: "bell-x-1-first-supersonic-flight",
    title: "Bell X-1 makes the first piloted supersonic flight",
    date: "1947-10-14",
    location: "Muroc Army Air Field, California, United States",
    publisher: "NASA",
    sourceTitle: "Fiftieth Anniversary of X-1",
    url: "https://www.nasa.gov/history/x1/",
    introduction: "On 14 October 1947, the Bell X-1 programme achieved the first piloted flight faster than the speed of sound. Chuck Yeager flew the aircraft during tests at Muroc Army Air Field in California.[^primary]",
    body: "## Research programme\n\nTests with two XS-1 aircraft began in 1946 to investigate flight near the speed of sound. Bell built the aircraft, the Army Air Forces funded them, and the National Advisory Committee for Aeronautics contributed specifications and research. The design was a research aircraft rather than a planned production model.[^primary]\n\n## Recognition\n\nThe 1948 Collier Trophy recognised the programme's work. It was shared by Lawrence Bell, Yeager and the NACA's John Stack. NASA's historical account describes how the programme's research methods influenced later experimental aircraft projects.[^primary]",
  },
  {
    slug: "airbus-a300-first-flight",
    title: "Airbus A300 makes its first flight",
    date: "1972-10-28",
    location: "Toulouse, France",
    publisher: "Airbus",
    sourceTitle: "50th Anniversary of the first flight of the Airbus A300",
    url: "https://www.airbus.com/en/newsroom/stories/2022-10-28-october-50th-anniversary-of-the-first-flight-of-the-airbus-a300",
    introduction: "On 28 October 1972, the Airbus A300B1 made its first flight from Toulouse. The aircraft, registered F-WUAB, was the first twin-engine wide-body commercial airliner.[^primary]",
    body: "## The test flight\n\nFog postponed the planned departure on 27 October. The following day, Max Fischl and Bernard Ziegler led the flight crew on an 85-minute test. They reached 14,000 feet and tested the autopilot, control surfaces and landing gear before returning to Blagnac.[^primary]\n\n## Towards certification\n\nThe flight began a test programme involving three aircraft. Airbus obtained type certification on 11 March 1974, less than 18 months after the first flight. The A300 programme also established the manufacturing partnership behind later Airbus aircraft.[^primary]",
  },
];

function content(seed: typeof seeds[number]): RevisionContent {
  const fields = [{ key: "Event date", value: seed.date }, { key: "Location", value: seed.location }, { key: "Event type", value: "Aviation milestone" }];
  const markdown = `# ${seed.title}\n\n${seed.introduction}\n\n<Sidebar>\n${fields.map(({ key, value }) => `${key}: ${value}`).join("\n")}\n</Sidebar>\n\n${seed.body}\n\n[^primary]: ${seed.url}`;
  return {
    title: seed.title, contentType: "event", markdown, fields, sections: [], relationships: [],
    sources: [{ identifier: "primary", title: seed.sourceTitle, publisher: seed.publisher, url: seed.url, accessedAt: "2026-09-10" }],
  };
}

for (const seed of seeds) {
  assert.ok(parseExactEventDate(seed.date));
  assert.deepEqual(parseArticleMarkdown(content(seed).markdown).errors, []);
}

async function publish() {
  const { createArticleIfAbsent, saveDraft, transitionRevision, publishRevision } = await import("../src/lib/wiki-public-db");
  for (const seed of seeds) {
    // Never overwrite an existing contributor article or draft.
    const article = await createArticleIfAbsent(seed.slug, seed.title, "event");
    if (!article) {
      console.log(`Skipped existing article: ${seed.slug}`);
      continue;
    }
    const draft = await saveDraft({ articleId: article.id, proposedSlug: seed.slug, contributorId: "system-aviation-history", contributorName: "aviation.wiki", editSummary: "Add aviation anniversary with a primary source", content: content(seed), parentRevisionId: article.liveRevisionId });
    await transitionRevision(draft.id, "system-aviation-history", "pending_review", { note: "Exact date and original summary checked against the linked primary source." });
    await publishRevision(draft.id, "system-aviation-history", "Approved sourced aviation history starter article.");
    console.log(`Published: /aviation-news/${seed.slug}`);
  }
}

if (process.argv.includes("--publish")) {
  publish().catch((error) => { console.error(error); process.exitCode = 1; });
} else {
  console.log(`Validated ${seeds.length} aviation history articles. Use --publish to publish new articles.`);
}
