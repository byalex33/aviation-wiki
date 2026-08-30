import assert from "node:assert/strict";

import { britishAirwaysA350ImportPlan } from "../src/lib/aviation-data-import";
import {
  aviationGraphCompleteness,
  buildAirframeProjections,
  snapshotFromImportPlan,
} from "../src/lib/aviation-data-projections";

const snapshot = snapshotFromImportPlan(britishAirwaysA350ImportPlan);
const projections = buildAirframeProjections(snapshot, "2026-08-30");
const completeness = aviationGraphCompleteness(
  projections,
  snapshot.reconciledAt,
);

assert.equal(projections.length, 18);
assert.deepEqual(
  projections.map((airframe) => airframe.msn),
  [
    "326",
    "340",
    "362",
    "374",
    "386",
    "402",
    "432",
    "446",
    "473",
    "490",
    "495",
    "547",
    "563",
    "609",
    "617",
    "623",
    "639",
    "652",
  ],
);
assert.ok(
  projections.every(
    (airframe) =>
      airframe.model?.designation === "A350-1041" &&
      airframe.currentOperator?.name === "British Airways" &&
      airframe.currentRegistration?.registration.startsWith("G-XWB"),
  ),
);

const first = projections.find((airframe) => airframe.msn === "326");
assert.ok(first);
assert.equal(first.events.some((event) => event.type === "delivered"), false);
assert.equal(first.conflicts.length, 1);
assert.equal(first.media.length, 1);
assert.equal(first.media[0].licence, "CC BY-SA 2.0");
assert.deepEqual(
  first.conflicts[0].claims
    .map((claim) => (claim.value as { occurredOn: string }).occurredOn)
    .toSorted(),
  ["2019-07-26", "2019-07-29"],
);
assert.ok(
  first.conflicts[0].claims.every((claim) => claim.sources.length >= 1),
);

assert.deepEqual(completeness, {
  totalAirframes: 18,
  msnsKnown: 18,
  registrationHistoriesComplete: 18,
  deliveryDatesCanonical: 17,
  configurationsKnown: 18,
  photosKnown: 1,
  unresolvedConflicts: 1,
  lastReconciledAt: "2026-08-30T00:00:00.000Z",
});

console.log("Airframe, fleet, production, and completeness projection tests passed");
