import assert from "node:assert/strict";

import {
  buildFleetRecords,
  filterFleetRecords,
  fleetFiltersFromSearchParams,
  type FleetSourceArticle,
} from "../src/lib/fleet-data";

const articles: FleetSourceArticle[] = [
  {
    id: "777",
    title: "Boeing 777",
    slug: "boeing-777",
    contentType: "aircraft",
    fields: [
      { key: "Manufacturer", value: "Boeing" },
      { key: "Type", value: "Wide-body airliner" },
      { key: "Engines", value: "GE90" },
      { key: "Status", value: "In production and service" },
      { key: "Entry into service", value: "7 June 1995" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "f16",
    title: "General Dynamics F-16 Fighting Falcon",
    slug: "general-dynamics-f-16-fighting-falcon",
    contentType: "aircraft",
    fields: [
      { key: "Manufacturer", value: "General Dynamics" },
      { key: "Type", value: "Multirole fighter" },
      { key: "Primary users", value: "United States Air Force; Belgian Air Component" },
      { key: "Status", value: "In service" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "tornado",
    title: "Panavia Tornado",
    slug: "panavia-tornado",
    contentType: "aircraft",
    fields: [
      { key: "Type", value: "Variable-sweep strike aircraft" },
      { key: "Production", value: "1979–1998" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "a350",
    title: "Airbus A350",
    slug: "airbus-a350",
    contentType: "aircraft",
    fields: [
      { key: "Type", value: "Wide-body airliner" },
      { key: "Production", value: "2010–present" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "fedex",
    title: "FedEx Express",
    slug: "fedex-express",
    contentType: "airline",
    fields: [
      { key: "Fleet", value: "Boeing 777F, 767F and 757F" },
      { key: "Status", value: "Active" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
  {
    id: "historic",
    title: "Historic Freight",
    slug: "historic-freight",
    contentType: "airline",
    fields: [
      { key: "Fleet", value: "Boeing 777F" },
      { key: "Status", value: "Ceased" },
    ],
    updatedAt: "2026-07-27T00:00:00.000Z",
  },
];

const records = buildFleetRecords({ articles, relationships: [] });
const boeing = records.find((record) => record.slug === "boeing-777");
const fighter = records.find(
  (record) => record.slug === "general-dynamics-f-16-fighting-falcon",
);
const strikeAircraft = records.find((record) => record.slug === "panavia-tornado");
const inProduction = records.find((record) => record.slug === "airbus-a350");

assert.ok(boeing);
assert.equal(boeing.category, "commercial");
assert.deepEqual(
  boeing.currentOperators.map((operator) => operator.name),
  ["FedEx Express"],
);
assert.deepEqual(
  boeing.historicOperators.map((operator) => operator.name),
  ["Historic Freight"],
);
assert.equal(boeing.currentOperators[0]?.evidence, "approved fleet field");

assert.ok(fighter);
assert.equal(fighter.category, "military");
assert.deepEqual(
  fighter.currentOperators.map((operator) => operator.name),
  ["Belgian Air Component", "United States Air Force"],
);
assert.equal(strikeAircraft?.category, "military");
assert.equal(strikeAircraft?.status, "Production ended");
assert.equal(strikeAircraft?.statusGroup, "other");
assert.equal(inProduction?.status, "In production");
assert.equal(inProduction?.statusGroup, "production");

assert.deepEqual(
  filterFleetRecords(records, { manufacturer: "Boeing" }).map(
    (record) => record.slug,
  ),
  ["boeing-777"],
);
assert.deepEqual(
  filterFleetRecords(records, { query: "GE90" }).map((record) => record.slug),
  ["boeing-777"],
);
assert.deepEqual(
  fleetFiltersFromSearchParams(
    new URLSearchParams(
      "q=777&manufacturer=Boeing&category=commercial&status=production",
    ),
  ),
  {
    query: "777",
    manufacturer: "Boeing",
    category: "commercial",
    status: "production",
  },
);

console.log("Fleet data tests passed");
