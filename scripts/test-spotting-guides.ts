import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { articlePath } from "../src/lib/article-routes";
import { parseArticleMarkdown } from "../src/lib/article-markdown";
import { contentTypeSqlList } from "../src/lib/wiki-types";
import { spottingGuideContentTypeSql } from "../src/lib/spotting-guide-schema";
import {
  SPOTTING_LOCATIONS_HELP,
  spottingFreshness,
  spottingGuideIssues,
  spottingGuideStarterMarkdown,
} from "../src/lib/spotting-guide";
import { SpottingFreshnessBanner } from "../src/components/spotting-freshness";
import { SpottingLocationsView } from "../src/components/spotting-map";
import {
  spottingGuideSeedContent,
  spottingGuideSeeds,
} from "../src/data/spotting-guide-seeds";

assert.equal(
  articlePath("spotting_guide", "london-heathrow-airport"),
  "/airports/london-heathrow-airport/spotting",
);
assert.match(contentTypeSqlList, /'spotting_guide'/);
assert.match(spottingGuideContentTypeSql(), /spotting_guide/);
assert.doesNotMatch(spottingGuideContentTypeSql(), /INSERT|UPDATE|DELETE/i);

const starter = parseArticleMarkdown(spottingGuideStarterMarkdown("London Heathrow Airport plane spotting"));
assert.deepEqual(starter.errors, []);
assert.equal(starter.spottingLocations?.locations[0]?.latitude, null);

const help = parseArticleMarkdown(SPOTTING_LOCATIONS_HELP);
assert.deepEqual(help.errors, []);
assert.equal(help.spottingLocations?.locations.length, 1);

for (const seed of spottingGuideSeeds) {
  const content = spottingGuideSeedContent(seed, {
    title: seed.airportTitle,
    slug: seed.preferredSlugs[0],
  });
  const parsed = parseArticleMarkdown(content.markdown);
  assert.deepEqual(parsed.errors, [], seed.id);
  assert.match(content.title, /plane spotting$/);
  assert.equal(parsed.spottingLocations?.placeholder, true);
  assert.equal(parsed.spottingLocations?.locations.length, 1);
  const location = parsed.spottingLocations!.locations[0];
  assert.equal(location.placeholder, true);
  assert.match(location.note, /PLACEHOLDER/);
  assert.match(location.note, /not a spotting location/);
  assert.equal(location.latitude, Number(seed.latitude));
  assert.equal(location.longitude, Number(seed.longitude));
  assert.equal(content.fields.some((field) => field.key.toLowerCase() === "last verified"), false);
  assert.deepEqual(spottingGuideIssues({
    title: content.title,
    markdown: content.markdown,
    fields: content.fields,
    citationCount: parsed.citations.length,
  }, parsed), []);
  assert.doesNotMatch(content.markdown.split("\n\n")[0], /51\.|53\./);
}

const verified = parseArticleMarkdown(`A checked guide.[^aip]

<Sidebar>
Last verified: 2026-01-01
</Sidebar>

<SpottingLocations placeholder="false">
- Name: Example mound
  Latitude: 51.47000
  Longitude: -0.45000
  Runways: 27L
  Placeholder: false
  Note: Community-checked example used only by the test.
</SpottingLocations>

## Runway use

Westerly departures use 27L.[^aip]

## Parking and access

The test car park is cited.[^aip]

## Legal and security

Stay landside.[^aip]

## Best times and light

Morning.[^aip]

## Typical traffic

Narrowbodies.[^aip]

[^aip]: https://example.com/aip
`);
assert.deepEqual(verified.errors, []);
assert.deepEqual(spottingGuideIssues({
  title: "Example Airport plane spotting",
  markdown: verified.root ? "x" : "",
  fields: [{ key: "Last verified", value: "2026-01-01" }],
  citationCount: verified.citations.length,
}, { ...verified, root: verified.root }), []);

const missingDate = spottingGuideIssues({
  title: "Example Airport plane spotting",
  markdown: "checked",
  fields: [],
  citationCount: 1,
}, verified);
assert.match(missingDate.join(" "), /Last verified/);

const placeholderDated = spottingGuideIssues({
  title: "Example Airport plane spotting",
  markdown: "PLACEHOLDER",
  fields: [
    { key: "Guide status", value: "Placeholder — not field-verified" },
    { key: "Last verified", value: "2026-01-01" },
  ],
  citationCount: 1,
}, verified);
assert.match(placeholderDated.join(" "), /Remove the Last verified date/);

const future = spottingGuideIssues({
  title: "Example Airport plane spotting",
  markdown: "checked",
  fields: [{ key: "Last verified", value: "2999-01-01" }],
  citationCount: 1,
}, verified);
assert.match(future.join(" "), /future/);

assert.equal(spottingFreshness(null).state, "unverified");
assert.equal(spottingFreshness("2026-10-01", new Date("2026-10-16T00:00:00Z")).state, "fresh");
assert.equal(spottingFreshness("2026-07-01", new Date("2026-10-16T00:00:00Z")).state, "aging");
assert.equal(spottingFreshness("2025-01-01", new Date("2026-10-16T00:00:00Z")).state, "stale");

const badPin = parseArticleMarkdown(`<SpottingLocations placeholder="false">
- Name: Too far north
  Latitude: 91
  Longitude: 0
  Runways: 27L
  Note: Out of range.
</SpottingLocations>`);
assert.ok(badPin.errors.some((error) => /latitude/i.test(error.message)));

const banner = renderToStaticMarkup(
  createElement(SpottingFreshnessBanner, { placeholder: true, state: "unverified", label: "Not yet verified" }),
);
assert.match(banner, /Not yet verified/);
assert.match(banner, /not been checked in the field/);

const list = renderToStaticMarkup(
  createElement(SpottingLocationsView, { block: starter.spottingLocations! }),
);
assert.match(list, /No map pin yet/);
assert.match(list, /PLACEHOLDER/);

console.log("Spotting guide tests passed");
