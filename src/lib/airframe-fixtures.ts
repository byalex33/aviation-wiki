import { airframeSeedRecord, type AirframeSeed } from "@/lib/airframe-content";
import { airframeSlug, buildOperatorFleets, recordsForType, type AirframeRecord } from "@/lib/airframe-record";
import type { SourceLink } from "@/lib/wiki-types";

const heritage: SourceLink = {
  identifier: "heritage",
  title: "Sample airframe record",
  publisher: "aviation.wiki fixtures",
  url: "https://aviation.wiki/airframes",
};

function seed(input: AirframeSeed): AirframeSeed {
  return { sources: [heritage], ...input };
}

/** Local sample fleet. These rows illustrate the pages; they are not a registry extract. */
export const airframeFixtureSeeds: AirframeSeed[] = [
  seed({
    registration: "G-XWBA",
    msn: "326",
    aircraftType: "Airbus A350-1000",
    variant: "A350-1041",
    status: "active",
    deliveryDate: "2019-07-26",
    manufactureYear: 2019,
    currentOperator: "British Airways",
    operatorHistory: ["British Airways | 2019-07-26 | present"],
    registrationHistory: ["G-XWBA | 2019-07-26 | present"],
    notes: "Sample in-service Airbus A350-1000 used to render fleet age and tail lists.",
  }),
  seed({
    registration: "G-XWBB",
    msn: "340",
    aircraftType: "Airbus A350-1000",
    variant: "A350-1041",
    status: "active",
    deliveryDate: "2019-09-27",
    manufactureYear: 2019,
    currentOperator: "British Airways",
    operatorHistory: ["British Airways | 2019-09-27 | present"],
    registrationHistory: ["G-XWBB | 2019-09-27 | present"],
    notes: "Second sample in-service A350-1000 so the British Airways average age covers more than one tail.",
  }),
  seed({
    registration: "G-VIIA",
    msn: "27483",
    aircraftType: "Boeing 777-200",
    variant: "777-236",
    status: "stored",
    deliveryDate: "1995-11-07",
    manufactureYear: 1995,
    fate: "In storage",
    currentOperator: "British Airways",
    operatorHistory: ["British Airways | 1995-11-07 | present"],
    registrationHistory: ["G-VIIA | 1995-11-07 | present"],
    notes: "Sample stored wide-body. Stored tails stay on the operator page and are left out of the in-service average age.",
  }),
  seed({
    registration: "G-XWBZ",
    aircraftType: "Airbus A350-1000",
    variant: "A350-1041",
    status: "on_order",
    currentOperator: "British Airways",
    operatorHistory: ["British Airways | | present"],
    notes: "Illustrative on-order tail. It has no delivery date, so it has no age.",
  }),
  seed({
    registration: "G-BNLG",
    msn: "24047",
    aircraftType: "Boeing 747-400",
    variant: "747-436",
    status: "scrapped",
    deliveryDate: "1989-06-23",
    manufactureYear: 1989,
    fate: "Parted out",
    operatorHistory: ["British Airways | 1989-06-23 | 2014-01-01"],
    registrationHistory: ["G-BNLG | 1989-06-23 | 2014-01-01"],
    notes: "Sample historical tail. It remains on the British Airways page under historical aircraft.",
  }),
  seed({
    registration: "G-BOAC",
    msn: "100-004",
    aircraftType: "Concorde",
    variant: "Type 1 variant 102",
    status: "stored",
    deliveryDate: "1976-02-13",
    manufactureYear: 1975,
    fate: "Preserved at Manchester Airport Runway Visitor Park",
    currentOperator: "British Airways",
    operatorHistory: ["British Airways | 1976-02-13 | present"],
    registrationHistory: [
      "G-BOAC | 1974-04-03 | 1979-01-05",
      "N81AC | 1979-01-05 | 1980-08-11",
      "G-BOAC | 1980-08-11 | present",
    ],
    notes:
      "G-BOAC is Concorde production number 204, preserved at Manchester. This fixture keeps the registration, serial, operator history, and temporary Braniff registration N81AC. The full encyclopedia article remains the community-edited page after migration from /aircraft/g-boac.",
  }),
  seed({
    registration: "N747NA",
    msn: "21441",
    aircraftType: "Boeing 747SP",
    variant: "747SP-21",
    status: "stored",
    deliveryDate: "1977-05-06",
    manufactureYear: 1977,
    fate: "Preserved at the Pima Air & Space Museum",
    currentOperator: "NASA",
    operatorHistory: [
      "Pan American World Airways | 1977-05-06 | 1986-02-13",
      "United Airlines | 1986-02-13 | 1995-12-01",
      "NASA | 2004-01-01 | present",
    ],
    registrationHistory: [
      "N536PA | 1977-05-06 | 1986-02-13",
      "N145UA | 1986-02-13 | 2004-01-01",
      "N747NA | 2004-01-01 | present",
    ],
    notes:
      "N747NA is the Boeing 747SP-21 used as the SOFIA airborne observatory, manufacturer serial number 21441. Earlier registrations were N536PA and N145UA. This fixture is the structured record behind the former /aircraft/n747na article.",
  }),
  seed({
    registration: "N772UA",
    msn: "26929",
    aircraftType: "Boeing 777-200",
    variant: "777-222",
    status: "active",
    deliveryDate: "1997-05-15",
    manufactureYear: 1997,
    currentOperator: "United Airlines",
    operatorHistory: ["United Airlines | 1997-05-15 | present"],
    registrationHistory: ["N772UA | 1997-05-15 | present"],
    notes: "Sample United Airlines tail so the fleet page can show more than one operator.",
  }),
];

const fixtureAsOf = new Date("2026-10-16T00:00:00Z");

export function airframeFixtureRecords(asOf = fixtureAsOf): AirframeRecord[] {
  return airframeFixtureSeeds.map((item) => airframeSeedRecord(item, airframeSlug(item.registration), asOf));
}

export function airframeFixtureBySlug(slug: string, asOf = fixtureAsOf) {
  const normalized = airframeSlug(slug);
  return (
    airframeFixtureRecords(asOf).find(
      (record) =>
        record.slug === normalized ||
        record.msn?.toLowerCase() === normalized ||
        airframeSlug(record.msn ?? "") === normalized ||
        record.registrationHistory.some((span) => span.slug === normalized),
    ) ?? null
  );
}

export function airframeFixtureFleets(asOf = fixtureAsOf) {
  return buildOperatorFleets(airframeFixtureRecords(asOf));
}

export function airframeFixturesForOperator(slug: string, title: string, asOf = fixtureAsOf) {
  const records = airframeFixtureRecords(asOf);
  return (
    buildOperatorFleets(records, [{ slug: airframeSlug(slug), name: title, href: `/commercial/${airframeSlug(slug)}` }]).find(
      (fleet) => fleet.operatorSlug === airframeSlug(slug) || fleet.operatorSlug === airframeSlug(title),
    ) ?? null
  );
}

export function airframeFixturesForType(slug: string, title: string, asOf = fixtureAsOf) {
  return recordsForType(airframeFixtureRecords(asOf), { slug, title });
}
