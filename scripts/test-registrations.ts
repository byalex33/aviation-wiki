import assert from "node:assert/strict";

import { extractRegistrationRecords, filterRegistrationRecords, registrationPrefix, registrationPrefixes, type RegistrationSourceArticle } from "../src/lib/registration-data";

assert.equal(registrationPrefix("G-EUPJ"), "G");
assert.equal(registrationPrefix("N12345"), "N");
assert.equal(registrationPrefix("VH-OQA"), "VH");

const articles: RegistrationSourceArticle[] = [{
  id: "a320",
  title: "Example Airbus A320",
  slug: "example-a320",
  contentType: "aircraft",
  fields: [
    { key: "Registrations", value: "G-EUPJ; N12345 | VH-OQA" },
    { key: "Production", value: "1990–2000" },
  ],
  updatedAt: "2026-08-30T00:00:00.000Z",
}];
const records = extractRegistrationRecords(articles);
assert.deepEqual(records.map((record) => record.registration), ["G-EUPJ", "N12345", "VH-OQA"]);
assert.ok(registrationPrefixes(records).includes("G"));
assert.ok(registrationPrefixes(records).includes("N"));
assert.ok(registrationPrefixes(records).includes("VH"));
assert.deepEqual(filterRegistrationRecords(records, { prefix: "g" }).map((record) => record.registration), ["G-EUPJ"]);
assert.equal(filterRegistrationRecords(records, { query: "airbus" }).length, 3);

console.log("Registration database tests passed");
