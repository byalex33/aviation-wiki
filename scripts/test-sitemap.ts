import assert from "node:assert/strict";

import { sitemapImageUrl } from "../src/lib/sitemap-images";

assert.equal(
  sitemapImageUrl(
    "https://upload.wikimedia.org/example.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail",
  ),
  "https://upload.wikimedia.org/example.jpg",
  "tracking parameters should not make the generated XML invalid",
);
assert.equal(
  sitemapImageUrl("https://images.example.com/photo.jpg#credit"),
  "https://images.example.com/photo.jpg",
  "fragments should be removed from sitemap image URLs",
);
assert.equal(
  sitemapImageUrl("https://images.example.com/photo.jpg?width=1280&format=jpg"),
  undefined,
  "image URLs that the current serializer cannot represent safely should be omitted",
);
assert.equal(sitemapImageUrl("javascript:alert(1)"), undefined);
assert.equal(sitemapImageUrl("not a URL"), undefined);

console.log("Sitemap image URL tests passed");
