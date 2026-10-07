import assert from "node:assert/strict";

import { getPathMatch } from "next/dist/shared/lib/router/utils/path-match";

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

console.log("Legacy redirect tests passed");
