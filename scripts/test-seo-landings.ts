import assert from "node:assert/strict";

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
