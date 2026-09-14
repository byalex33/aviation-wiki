import assert from "node:assert/strict";
import { buildAirlineDirectory } from "../src/lib/airline-directory";
import type { SearchDocument } from "../src/lib/search-types";
const ana: SearchDocument = {
  id: "ana", title: "All Nippon Airways", slug: "all-nippon-airways", contentType: "airline",
  href: "/commercial/all-nippon-airways", description: "", countries: ["Japan"],
  terms: [{ kind: "title", value: "All Nippon Airways" }],
  fields: [{ key: "IATA code", value: "NH" }, { key: "ICAO code", value: "ANA" },
    { key: "Country", value: "f![jp] Japan" }, { key: "Status", value: "Active" }, { key: "Main hub", value: "Tokyo Haneda" }],
};
const documents: SearchDocument[] = [ana,
  { ...ana, id: "klm", title: "KLM Royal Dutch Airlines", slug: "klm-royal-dutch-airlines", href: "/commercial/klm-royal-dutch-airlines", countries: [], fields: [], terms: [] },
  { ...ana, id: "ceased", title: "Former Airline", href: "/commercial/former-custom-slug", fields: [{ key: "Status", value: "Ceased operations in 2020" }] },
  { ...ana, id: "unknown", title: "New Airline", slug: "new-airline", href: "/commercial/new-airline", countries: [], fields: [], terms: [] },
  { ...ana, id: "aircraft", contentType: "aircraft", href: "/aircraft/example" },
];
const groups = buildAirlineDirectory(documents);
const entries = groups.flatMap((group) => group.airlines);
assert.equal(entries.length, 4);
assert.deepEqual(new Set(entries.map((entry) => entry.href)), new Set(documents.filter((doc) => doc.contentType === "airline").map((doc) => doc.href)));
const entry = entries.find((item) => item.name === ana.title)!;
assert.ok(entry, "published All Nippon Airways must appear in the directory");
assert.equal(entry.iata, "NH");
assert.equal(entry.icao, "ANA");
assert.equal(entry.country, "Japan");
assert.equal(entry.countryCode, "jp");
assert.equal(entry.hub, "Tokyo Haneda");
assert.equal(entry.isActive, true);
assert.equal(entries.find((item) => item.name === "Former Airline")?.isHistoric, true);
assert.equal(entries.find((item) => item.name === "KLM Royal Dutch Airlines")?.iata, "KL");
const unknown = entries.find((item) => item.name === "New Airline")!;
assert.equal(unknown.isActive, false);
assert.equal(unknown.isHistoric, false);
assert.equal(unknown.countryCode, "");
assert.equal(unknown.iata, "");
assert.deepEqual(buildAirlineDirectory([]), []);
assert.deepEqual(groups.map((group) => group.letter), ["A", "F", "K", "N"]);
for (const status of ["Active", "Operating", "In operation"]) {
  const [group] = buildAirlineDirectory([{ ...ana, fields: [{ key: "Status", value: status }] }]);
  assert.equal(group.airlines[0].isActive, true, status);
  assert.equal(group.airlines[0].isHistoric, false, status);
}
console.log("Approved airline directory regression tests passed");
