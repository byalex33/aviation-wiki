import assert from "node:assert/strict";

import { aviationCategoryFor } from "../src/lib/article-categories";
import { InMemorySearchProvider } from "../src/lib/search-core";
import type { SearchDocument } from "../src/lib/search-types";

const documents: SearchDocument[] = [
  { id: "approved", title: "British Airways", slug: "british-airways", contentType: "airline", href: "/commercial/british-airways", description: "Approved airline", countries: ["United Kingdom"], terms: [{ value: "British Airways", kind: "title" }, { value: "BA", kind: "code", label: "IATA code" }, { value: "Speedbird", kind: "code", label: "Callsign" }] },
  { id: "aircraft", title: "Boeing 747", slug: "boeing-747", contentType: "aircraft", href: "/aircraft/boeing-747", description: "A long-range wide-body airliner", countries: ["United States"], terms: [{ value: "Boeing 747", kind: "title" }, { value: "B747", kind: "code", label: "ICAO designation" }, { value: "Jumbo Jet", kind: "alias", label: "Alias" }] },
  { id: "event", title: "US Airways Flight 1549 ditching", slug: "us-airways-flight-1549-ditching", contentType: "event", href: "/aviation-news/us-airways-flight-1549-ditching", description: "A completed aviation event", countries: ["United States"], terms: [{ value: "US Airways Flight 1549 ditching", kind: "title" }, { value: "Miracle on the Hudson", kind: "alias", label: "Common name" }] },
];
const provider = new InMemorySearchProvider(documents);

assert.equal(provider.search({ query: "BA" }).directHit?.id, "approved", "an unambiguous exact code should navigate directly");
assert.equal(provider.search({ query: "Boeing 747" }).hits[0]?.id, "aircraft", "exact titles should rank first");
assert.equal(provider.search({ query: "Boieng" }).hits[0]?.id, "aircraft", "practical typo tolerance should match a close title word");
assert.equal(provider.search({ query: "Jumbo" }).hits[0]?.matchedLabel, "Alias", "approved aliases should be searchable");
assert.deepEqual(provider.search({ query: "B", contentType: "airline" }).hits.map((hit) => hit.id), ["approved"]);
assert.deepEqual(provider.search({ query: "B", country: "United States" }).hits.map((hit) => hit.id), ["aircraft"]);
assert.equal(provider.search({ query: "missing" }).total, 0);
assert.equal(provider.search({ query: "" }).total, 0);
assert.equal(aviationCategoryFor(documents[1]), "commercialAircraft");
assert.equal(aviationCategoryFor({ ...documents[1], id: "regional", title: "Embraer E-Jet family", description: "A family of twin-engine regional airliners" }), "commercialAircraft");
assert.equal(aviationCategoryFor({ ...documents[1], id: "military", title: "F-35 Lightning II", description: "A military fighter aircraft" }), "military");
assert.equal(aviationCategoryFor({ ...documents[1], id: "general", title: "Cessna 172", description: "A four-seat light aircraft" }), "general");
assert.equal(aviationCategoryFor(documents[2]), "news");
assert.equal(provider.search({ query: "Miracle on the Hudson" }).hits[0]?.id, "event");

console.log("Search ranking tests passed");
