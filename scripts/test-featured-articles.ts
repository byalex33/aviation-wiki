import assert from "node:assert/strict";

import { featuredArticles } from "../src/lib/growth-content";
import type { SearchDocument } from "../src/lib/search-types";

const documents: SearchDocument[] = Array.from({ length: 19 }, (_, index) => ({
  id: `article-${index}`,
  title: `Article ${index}`,
  slug: `article-${index}`,
  contentType: "aircraft",
  href: `/aircraft/article-${index}`,
  description: "An approved article",
  countries: [],
  terms: [],
}));
const start = new Date("2026-09-28T00:00:00Z");
const selected = featuredArticles(documents, start);
assert.equal(selected.length, 6);
assert.equal(new Set(selected.map((article) => article.id)).size, 6);
assert.deepEqual(featuredArticles([...documents].reverse(), start), selected);
assert.deepEqual(
  featuredArticles(documents, new Date("2026-09-28T23:59:59.999Z")),
  selected,
);
const tomorrow = featuredArticles(documents, new Date("2026-09-29T00:00:00Z"));
assert.ok(tomorrow.every((article) => !selected.includes(article)));
const seen = new Set<string>();
for (let day = 0; day < documents.length; day++) {
  for (const article of featuredArticles(documents, new Date(+start + day * 86_400_000))) {
    seen.add(article.id);
  }
}
assert.equal(seen.size, documents.length);
for (let size = 0; size <= 6; size++) {
  const small = documents.slice(0, size);
  const result = featuredArticles(small, start);
  assert.equal(result.length, size);
  assert.deepEqual(new Set(result), new Set(small));
}
assert.deepEqual(documents.map((article) => article.id),
  Array.from({ length: 19 }, (_, index) => `article-${index}`));
console.log("Featured article rotation tests passed");
