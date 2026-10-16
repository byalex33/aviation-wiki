import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";

import { assertAirframeMarkdown, airframeSeedMarkdown } from "../src/lib/airframe-content";
import { OperatorFleet } from "../src/components/operator-fleet";
import { airframeFixtureBySlug, airframeFixtureFleets, airframeFixtureSeeds } from "../src/lib/airframe-fixtures";
import { ageYearsAt, airframeMigrationDecision } from "../src/lib/airframe-record";
import { parseFaaRegistry } from "../src/lib/faa-registry";

const secretName = "PRIVATE OWNER, JANE Q";
const secretStreet = "123 SECRET STREET";
function masterRow(columns: string[]) {
  return columns.map((column) => column.includes(",") ? `"${column}"` : column).join(",");
}
const blank = Array.from({ length: 24 }, () => "");
const active = [...blank];
active[0] = "747NA";
active[1] = "21441";
active[2] = "1234567";
active[4] = "1977";
active[6] = secretName;
active[7] = secretStreet;
active[9] = "TUCSON";
active[18] = "5";
active[20] = "V";
active[23] = "19770506";
const reserved = [...blank];
reserved[0] = "99999";
reserved[1] = "1";
reserved[6] = "RESERVED NAME";
reserved[20] = "5";
const expired = [...blank];
expired[0] = "12345";
expired[1] = "26929";
expired[2] = "1234567";
expired[4] = "1997";
expired[6] = secretName;
expired[7] = "HIDDEN";
expired[9] = "CHICAGO";
expired[20] = "13";
const master = [active, reserved, expired].map(masterRow).join("\n");
const acftref = "1234567,BOEING,747SP-21,5,5,1,0,4,300,3,600,TCDS,BOEING\n";
const parsed = parseFaaRegistry({ master, acftref });
assert.equal(parsed.summary.skippedReserved, 1);
assert.equal(parsed.airframes.length, 2);
const sofia = parsed.airframes.find((row) => row.registration === "N747NA");
assert.ok(sofia);
assert.equal(sofia.msn, "21441");
assert.equal(sofia.manufacturer, "BOEING");
assert.equal(sofia.model, "747SP-21");
assert.equal(sofia.status, "active");
assert.equal(sofia.year, 1977);
const dumped = JSON.stringify(parsed);
assert.equal(dumped.includes(secretName), false);
assert.equal(dumped.includes(secretStreet), false);
assert.equal(dumped.includes("TUCSON"), false);
const expiredAirframe = parsed.airframes.find((row) => row.registration === "N12345");
assert.equal(expiredAirframe?.status, "stored");

const asOf = new Date("2026-10-16T00:00:00Z");
const fleets = airframeFixtureFleets(asOf);
const britishAirways = fleets.find((fleet) => fleet.operatorSlug === "british-airways");
assert.ok(britishAirways);
assert.equal(britishAirways.inServiceCount, 2);
assert.equal(britishAirways.storedCount, 2);
assert.equal(britishAirways.onOrderCount, 1);
assert.equal(britishAirways.historicalCount, 1);
const expectedAge = ageYearsAt("2019-07-26", 2019, asOf);
const secondAge = ageYearsAt("2019-09-27", 2019, asOf);
assert.equal(expectedAge !== null && secondAge !== null, true);
assert.equal(
  britishAirways.averageAgeYears,
  Math.round((((expectedAge ?? 0) + (secondAge ?? 0)) / 2) * 10) / 10,
);
assert.equal(britishAirways.onOrder[0]?.tails[0]?.ageYears, null);
const united = fleets.find((fleet) => fleet.operatorSlug === "united-airlines");
assert.equal(united?.inServiceCount, 1);
assert.equal(united?.historicalCount, 1);
assert.equal(united?.historical[0]?.tails[0]?.registration, "N747NA");
assert.equal(airframeFixtureBySlug("n536pa", asOf)?.registration, "N747NA");
assert.equal(airframeFixtureBySlug("21441", asOf)?.registration, "N747NA");

assert.equal(airframeMigrationDecision({ slug: "g-boac", contentType: "aircraft", fields: [] }), "migrate");
assert.equal(airframeMigrationDecision({ slug: "n747na", contentType: "aircraft", fields: [] }), "migrate");
assert.equal(
  airframeMigrationDecision({
    slug: "n12345",
    contentType: "aircraft",
    fields: [{ key: "Manufacturer serial number", value: "1" }],
  }),
  "migrate",
);
assert.equal(airframeMigrationDecision({ slug: "n12345", contentType: "aircraft", fields: [] }), "review");
assert.equal(airframeMigrationDecision({ slug: "boeing-747", contentType: "aircraft", fields: [] }), "skip");
assert.equal(airframeMigrationDecision({ slug: "g-boac", contentType: "airline", fields: [] }), "skip");

for (const seed of airframeFixtureSeeds) assertAirframeMarkdown(airframeSeedMarkdown(seed));
const html = renderToStaticMarkup(createElement(OperatorFleet, { summary: britishAirways }));
assert.match(html, /G-XWBA/);
assert.match(html, /href="\/airframes\/g-xwba"/);
assert.match(html, /G-XWBZ/);
assert.match(html, /G-BNLG/);
assert.match(html, /Average fleet age/);
assert.match(html, /In service/);
assert.match(html, /On order/);
assert.match(html, /Historical/);

console.log("Airframe and fleet age tests passed");
