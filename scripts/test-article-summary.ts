import assert from "node:assert/strict";

import { configuredSiteUrl, firstArticleImage, truncateDescription } from "../src/lib/article-summary";

const long = Array.from({ length: 30 }, () => "aerodynamic").join(" ");
const cut = truncateDescription(long);
assert.ok(cut.length <= 160);
assert.ok(cut.length > 0);
assert.equal(long.startsWith(cut), true);
assert.equal(long[cut.length], " ");
assert.equal(truncateDescription("Short description."), "Short description.");
assert.equal(truncateDescription("  spaced   words  "), "spaced words");

assert.equal(configuredSiteUrl(undefined).origin, "https://www.aviation.wiki");
assert.equal(configuredSiteUrl("").origin, "https://www.aviation.wiki");
assert.equal(configuredSiteUrl("https://preview.example").origin, "https://preview.example");

assert.equal(
  firstArticleImage(`![Lead photo](https://upload.wikimedia.org/lead.jpg)\n\nThe lead image is the article image.`)?.url,
  "https://upload.wikimedia.org/lead.jpg",
);
assert.equal(
  firstArticleImage(`<Sidebar>\n![https://upload.wikimedia.org/sidebar.jpg | Airbus]\nName: Airbus\n</Sidebar>\n\n![Lead](https://upload.wikimedia.org/lead.jpg)`)?.url,
  "https://upload.wikimedia.org/sidebar.jpg",
);
assert.equal(
  firstArticleImage(`![https://upload.wikimedia.org/shorthand.jpg | Credit]\n\nBody text for the article image.`)?.url,
  "https://upload.wikimedia.org/shorthand.jpg",
);
assert.equal(
  firstArticleImage(`<Gallery>\n![https://upload.wikimedia.org/gallery.jpg]\n</Gallery>`)?.url,
  "https://upload.wikimedia.org/gallery.jpg",
);
assert.equal(firstArticleImage("No image in this article, only prose."), undefined);
assert.equal(firstArticleImage("![Bad](https://evil.test/a.png)"), undefined);

console.log("Article summary tests passed");
