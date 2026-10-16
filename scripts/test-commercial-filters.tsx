import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import { CommercialDirectory } from "../src/components/commercial-directory";
import {
  commercialFilterFromParams,
  commercialFilterHref,
  defaultCommercialFilter,
  groupCommercialAirlines,
  type CommercialAirlineCard,
} from "../src/lib/commercial-filters";

const airlines = [
  { name: "British Airways", country: "United Kingdom", operatingStatus: "active" as const },
  { name: "Alitalia", country: "Italy", operatingStatus: "historic" as const },
  { name: "Aer Lingus", country: "Ireland", operatingStatus: "active" as const },
];
const countries = ["Ireland", "Italy", "United Kingdom"];

const active = groupCommercialAirlines(airlines, { status: "active", sort: "asc", country: "all" });
assert.deepEqual(active.map((group) => group.letter), ["A", "B"]);
assert.deepEqual(active[0]?.airlines.map((airline) => airline.name), ["Aer Lingus"]);
assert.equal(active.some((group) => group.airlines.some((airline) => airline.name === "Alitalia")), false);

const descending = groupCommercialAirlines(airlines, { status: "all", sort: "desc", country: "all" });
assert.deepEqual(descending.map((group) => group.letter), ["B", "A"]);
assert.deepEqual(descending[0]?.airlines.map((airline) => airline.name), ["British Airways"]);

const unitedKingdom = groupCommercialAirlines(airlines, {
  status: "all",
  sort: "asc",
  country: "United Kingdom",
});
assert.deepEqual(unitedKingdom.map((group) => group.airlines.map((airline) => airline.name)), [["British Airways"]]);

assert.deepEqual(
  commercialFilterFromParams(new URLSearchParams("status=active&sort=desc&country=Italy"), countries),
  { status: "active", sort: "desc", country: "Italy" },
);
assert.deepEqual(
  commercialFilterFromParams(new URLSearchParams("status=ceased&country=Mars&sort=sideways"), countries),
  defaultCommercialFilter,
);

assert.equal(
  commercialFilterHref(new URLSearchParams("status=active"), { sort: "desc" }),
  "/commercial?status=active&sort=desc",
);
assert.equal(
  commercialFilterHref(new URLSearchParams("status=active&sort=desc&country=Italy"), {
    status: "all",
    sort: "asc",
    country: "all",
  }),
  "/commercial",
);

const cards: CommercialAirlineCard[] = [
  {
    name: "British Airways",
    href: "/commercial/british-airways",
    iata: "BA",
    icao: "BAW",
    callsign: "SPEEDBIRD",
    status: "Active",
    operatingStatus: "active",
    country: "United Kingdom",
    countryCode: "gb",
    detailLabel: "Main hub",
    detailValue: "London Heathrow",
    showLogo: true,
  },
  {
    name: "Alitalia",
    href: "/commercial/alitalia",
    iata: "AZ",
    icao: "AZA",
    callsign: "ALITALIA",
    status: "Ceased",
    operatingStatus: "historic",
    country: "Italy",
    countryCode: "it",
    detailLabel: "Main hub",
    detailValue: "Rome",
    showLogo: false,
  },
];
const html = renderToStaticMarkup(
  <CommercialDirectory airlines={cards} countries={["Italy", "United Kingdom"]}>
    <p>controls</p>
  </CommercialDirectory>,
);
assert.match(html, /British Airways/);
assert.match(html, /Alitalia/);
assert.match(html, /id="letter-A"/);
assert.match(html, /id="letter-B"/);
assert.equal(html.includes("getElementById") || html.includes("appendChild"), false);

console.log("Commercial filter tests passed");
