import assert from "node:assert/strict";

import { buildProductionListRecords, filterProductionListRecords, productionListManufacturers } from "../src/lib/production-list-data";
import type { FleetSourceArticle } from "../src/lib/fleet-data";

const articles: FleetSourceArticle[] = [
  { id: "a380", title: "Airbus A380", slug: "airbus-a380", contentType: "aircraft", fields: [{ key: "Manufacturer", value: "Airbus" }, { key: "Production", value: "2003–2021" }, { key: "Number built", value: "251" }, { key: "Variants", value: "A380-800" }], updatedAt: "2026-08-30" },
  { id: "a350", title: "Airbus A350", slug: "airbus-a350", contentType: "aircraft", fields: [{ key: "Manufacturer", value: "Airbus" }, { key: "Production", value: "2010–present" }], updatedAt: "2026-08-30" },
  { id: "airline", title: "Example Air", slug: "example-air", contentType: "airline", fields: [], updatedAt: "2026-08-30" },
];
const records = buildProductionListRecords(articles);
assert.equal(records.length, 2);
assert.equal(records.find((record) => record.slug === "airbus-a380")?.numberBuilt, "251");
assert.equal(records.find((record) => record.slug === "airbus-a380")?.status, "ended");
assert.equal(records.find((record) => record.slug === "airbus-a350")?.status, "ongoing");
assert.deepEqual(productionListManufacturers(records), ["Airbus"]);
assert.deepEqual(filterProductionListRecords(records, { status: "ongoing" }).map((record) => record.slug), ["airbus-a350"]);
assert.equal(filterProductionListRecords(records, { query: "A380-800" }).length, 1);

console.log("Production list tests passed");
