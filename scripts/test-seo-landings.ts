import assert from "node:assert/strict";

import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";

import { sameRelationshipKeys, unionRelationships } from "../src/lib/article-canonicalization";
import { contentTypePaths } from "../src/lib/article-routes";
import { ARTICLE_PATH_ALIASES, ARTICLE_SLUG_RENAMES, CANONICAL_DUPLICATE_SOURCES, canonicalizeSearchDocuments, parseArticlePath, preferredArticlePath } from "../src/lib/article-path-aliases";
import { publicArticlePath } from "../src/lib/public-article-paths";
import { legacyRedirects } from "../src/lib/legacy-redirects";
import { documentsForSeoLanding, seoLandingDefinition, seoLandingDefinitions } from "../src/lib/seo-landing-data";
import type { SearchDocument } from "../src/lib/search-types";

const document = (id: string, title: string, contentType: SearchDocument["contentType"], countries: string[] = [], terms: SearchDocument["terms"] = []): SearchDocument => ({ id, title, slug: id, contentType, href: `/${contentType}/${id}`, description: "", countries, terms: [{ value: title, kind: "title" }, ...terms] });
const documents = [
  document("a320", "Airbus A320 family", "aircraft"),
  document("partner", "Partner-built aircraft", "aircraft", [], [{ value: "Airbus", kind: "field", label: "Manufacturer" }]),
  document("boeing", "Boeing 747", "aircraft"),
  document("ba", "British Airways", "airline", ["United Kingdom"]),
  document("lhr", "London Heathrow Airport", "airport", ["England"]),
  document("trent", "Rolls-Royce Trent 1000", "engine"),
];
assert.deepEqual(documentsForSeoLanding(seoLandingDefinition("aircraft-airbus"), documents).map((item) => item.id), ["a320", "partner"]);
assert.deepEqual(documentsForSeoLanding(seoLandingDefinition("airlines-united-kingdom"), documents).map((item) => item.id), ["ba"]);
assert.deepEqual(documentsForSeoLanding(seoLandingDefinition("airports-united-kingdom"), documents).map((item) => item.id), ["lhr"]);
assert.deepEqual(documentsForSeoLanding(seoLandingDefinition("engines-rolls-royce"), documents).map((item) => item.id), ["trent"]);
assert.equal(new Set(seoLandingDefinitions.map((item) => item.href)).size, seoLandingDefinitions.length);

console.log("SEO landing page tests passed");

// Legacy redirects must never shadow a live landing page.
const redirectFor = (pathname: string) => {
  for (const redirect of legacyRedirects()) {
    const params = getPathMatch(redirect.source, { removeUnnamedParams: true, strict: true })(pathname);
    if (params) return redirect.destination.replace(/:(\w+)\*?/g, (_: string, key: string) => [params[key]].flat().join("/"));
  }
  return null;
};
for (const landing of seoLandingDefinitions) assert.equal(redirectFor(landing.href), null, `${landing.href} must not redirect`);
assert.equal(redirectFor("/airlines"), null);
assert.equal(redirectFor("/airlines/british-airways"), "/commercial/british-airways");
assert.equal(redirectFor("/airlines/united-kingdom-airways"), "/commercial/united-kingdom-airways");
assert.equal(redirectFor("/airline/british-airways"), "/commercial/british-airways");
assert.equal(redirectFor("/airport/heathrow"), "/airports/heathrow");
for (const source of CANONICAL_DUPLICATE_SOURCES) {
  const destination = ARTICLE_PATH_ALIASES[source];
  assert.equal(redirectFor(source), destination, source);
  assert.equal(redirectFor(`${source}/history`), `${destination}/history`, `${source} history`);
  assert.equal(Object.hasOwn(ARTICLE_PATH_ALIASES, destination), false, `${destination} must not redirect again`);
}
assert.equal(redirectFor("/aircraft/f35-lightning-ii"), null);
assert.equal(redirectFor("/aircraft/f-15-eagle"), null);
assert.equal(preferredArticlePath("/aircraft/f35-lightning-ii", ["/aircraft/f35-lightning-ii"]), null);
assert.equal(preferredArticlePath("/aircraft/f35-lightning-ii", ["/aircraft/lockheed-martin-f-35-lightning-ii"]), ARTICLE_SLUG_RENAMES["/aircraft/f35-lightning-ii"]);
assert.equal(preferredArticlePath("/commercial/iberia", ["/commercial/iberia-airlines"]), "/commercial/iberia-airlines");
assert.equal(publicArticlePath("airline", "iberia"), "/commercial/iberia-airlines");
assert.equal(publicArticlePath("aircraft", "f-15-eagle"), "/aircraft/f-15-eagle");
for (const [contentType, prefix] of Object.entries(contentTypePaths)) {
  assert.equal(parseArticlePath(`/${prefix}/example-slug`)?.contentType, contentType);
}
const indexed = canonicalizeSearchDocuments([
  { ...document("iberia", "Iberia", "airline"), slug: "iberia", href: "/commercial/iberia" },
  { ...document("iberia-airlines", "Iberia Airlines", "airline"), slug: "iberia-airlines", href: "/commercial/iberia-airlines" },
]);
assert.deepEqual(indexed.map((item) => item.href), ["/commercial/iberia-airlines"]);
assert.equal(indexed[0]?.terms.some((term) => term.value === "iberia"), true);

const merged = unionRelationships(
  [{ type: "variant_of", targetArticleId: "max", citationIdentifiers: ["boeing"] }],
  [{ type: "variant_of", targetArticleId: "classic", citationIdentifiers: ["wiki"] }, { type: "variant_of", targetArticleId: "family", citationIdentifiers: [] }],
  "family",
  "editorial",
  new Set(["boeing"]),
);
assert.deepEqual(merged, [
  { type: "variant_of", targetArticleId: "max", citationIdentifiers: ["boeing"] },
  { type: "variant_of", targetArticleId: "classic", citationIdentifiers: [] },
]);
assert.equal(sameRelationshipKeys(merged, [{ type: "variant_of", targetArticleId: "classic" }, { type: "variant_of", targetArticleId: "max" }]), true);

console.log("Legacy redirect tests passed");
