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



const datedAircraft: FleetSourceArticle = { ...articles[0], fields: [
  { key: "First flight", value: "1994" },
  { key: "Introduction", value: "1996" },
  { key: "Entry into service", value: "1995" },
] };
const airline = (id: string, key: string, value: string): FleetSourceArticle => ({
  ...articles[4], id, title: id, fields: [{ key, value }, { key: "Status", value: "Active" }],
});
const temporalFleet = buildFleetRecords({ articles: [datedAircraft,
  airline("Future", "Future fleet", "Boeing 777"),
  airline("Ordered", "Fleet", "Boeing 777 on order"),
  airline("Former", "Fleet", "Formerly operated Boeing 777"),
  airline("Historic", "Former fleet", "Boeing 777"),
  airline("Mixed", "Fleet", "Current Boeing 777; future Airbus A350"),
], relationships: [] })[0];
assert.equal(temporalFleet.entryIntoService, "1995", "service date key priority is independent of field order");
assert.deepEqual(temporalFleet.currentOperators.map((operator) => operator.name), ["Mixed"]);
assert.deepEqual(temporalFleet.historicOperators.map((operator) => operator.name), ["Former", "Historic"]);
assert.equal(buildFleetRecords({ articles: [{ ...datedAircraft, fields: [{ key: "First flight", value: "1994" }] }], relationships: [] })[0].entryIntoService, "Not recorded");
const clauseFleet = buildFleetRecords({ articles: [datedAircraft,
  airline("Current wording", "Fleet", "Currently operated Boeing 777"),
  airline("Current field", "Current fleet", "Boeing 777 operated on long-haul services"),
  airline("Mixed orders", "Fleet", "Boeing 777, Airbus A350 on order"),
  airline("Changed fleet", "Fleet", "Formerly operated Airbus A350, now Boeing 777 only"),
  airline("Negated", "Fleet", "No Boeing 777 aircraft"),
  airline("Never operated", "Fleet", "Never operated Boeing 777"),
  airline("Unclear former list", "Fleet", "Formerly operated Airbus A350, Boeing 777"),
  airline("Former local clause", "Fleet", "Airbus A350, formerly operated Boeing 777"),
], relationships: [] })[0];
assert.deepEqual(clauseFleet.currentOperators.map((operator) => operator.name), ["Changed fleet", "Current field", "Current wording", "Mixed orders"]);
assert.deepEqual(clauseFleet.historicOperators.map((operator) => operator.name), ["Former local clause"]);
console.log("Fleet data tests passed");
