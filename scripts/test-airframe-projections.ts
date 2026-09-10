import assert from "node:assert/strict";

import { britishAirwaysA350ImportPlan } from "../src/lib/aviation-data-import";
import {
  aviationGraphCompleteness,
  buildAirframeProjections,
  snapshotFromImportPlan,
  operatorFleetHistory,
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



const temporal = structuredClone(snapshot);
const registration = temporal.registrations[0];
registration.validTo = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
assert.equal(buildAirframeProjections(temporal).find((item) => item.id === registration.airframeId)?.currentRegistration, null, "default projection uses today's date");
const event = temporal.events.find((item) => temporal.assertions.some((assertion) => assertion.id === item.assertionId && assertion.reviewStatus === "accepted") && !temporal.conflicts.some((conflict) => conflict.assertionIds.includes(item.assertionId)))!;
event.occurredOn = "2099-01-01";
event.statusAfter = "retired";
assert.notEqual(buildAirframeProjections(temporal, "2026-09-10").find((item) => item.id === event.airframeId)?.status, "retired");
assert.equal(buildAirframeProjections(temporal, "2099-01-01").find((item) => item.id === event.airframeId)?.status, "retired");
const membership = structuredClone(snapshot);
const association = membership.registrations[0];
association.operatorId = "audit-operator";
const assertion = membership.assertions.find((item) => item.id === association.assertionId)!;
assert.equal(operatorFleetHistory(buildAirframeProjections(membership), new Set(["audit-operator"])).length, 1);
assertion.reviewStatus = "rejected";
assert.equal(operatorFleetHistory(buildAirframeProjections(membership), new Set(["audit-operator"])).length, 0);
assertion.reviewStatus = "accepted";
membership.conflicts.push({ id: "audit-conflict", subjectId: assertion.subjectId, predicate: assertion.predicate, status: "open", assertionIds: [assertion.id] });
assert.equal(operatorFleetHistory(buildAirframeProjections(membership), new Set(["audit-operator"])).length, 0);
console.log("Airframe, fleet, production, and completeness projection tests passed");
