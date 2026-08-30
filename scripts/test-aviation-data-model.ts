import assert from "node:assert/strict";

import {
  canonicalAssertionId,
  effectiveRangesOverlap,
  findAssertionConflicts,
  type AssertionForConflict,
} from "../src/lib/aviation-data-model";
import { AVIATION_DATA_SCHEMA_SQL } from "../src/lib/aviation-data-schema";

const claims: AssertionForConflict[] = [
  {
    id: "claim-current-ba",
    subjectType: "airframe",
    subjectId: "airframe-1",
    predicate: "registration.assignment",
    valueFingerprint: "g-xwba",
    effectiveFrom: "2019-07-25",
    effectiveTo: null,
    reviewStatus: "accepted",
  },
  {
    id: "claim-conflicting-registration",
    subjectType: "airframe",
    subjectId: "airframe-1",
    predicate: "registration.assignment",
    valueFingerprint: "g-test",
    effectiveFrom: "2020-01-01",
    effectiveTo: null,
    reviewStatus: "unreviewed",
  },
  {
    id: "claim-old-test-registration",
    subjectType: "airframe",
    subjectId: "airframe-1",
    predicate: "registration.assignment",
    valueFingerprint: "f-wxyz",
    effectiveFrom: "2019-01-01",
    effectiveTo: "2019-07-24",
    reviewStatus: "accepted",
  },
];

assert.equal(
  effectiveRangesOverlap(claims[0], claims[1]),
  true,
  "open-ended overlapping assignments must conflict",
);
assert.equal(
  effectiveRangesOverlap(claims[0], claims[2]),
  false,
  "non-overlapping historical assignments must coexist",
);
assert.deepEqual(findAssertionConflicts(claims), [
  {
    subjectType: "airframe",
    subjectId: "airframe-1",
    predicate: "registration.assignment",
    assertionIds: ["claim-conflicting-registration", "claim-current-ba"],
  },
]);
assert.equal(
  canonicalAssertionId({ assertions: [claims[0]], hasOpenConflict: false }),
  "claim-current-ba",
);
assert.equal(
  canonicalAssertionId({ assertions: claims, hasOpenConflict: true }),
  null,
  "an unresolved conflict must suppress canonical projection",
);
assert.throws(
  () =>
    effectiveRangesOverlap(
      { effectiveFrom: "2026-02-01", effectiveTo: "2026-01-01" },
      { effectiveFrom: null, effectiveTo: null },
    ),
  /cannot precede/,
);

for (const table of [
  "airframes",
  "airframe_identifiers",
  "registration_assignments",
  "airframe_events",
  "aviation_sources",
  "aviation_assertions",
  "aviation_assertion_evidence",
  "reconciliation_cases",
]) {
  assert.match(
    AVIATION_DATA_SCHEMA_SQL,
    new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`),
  );
}
assert.match(AVIATION_DATA_SCHEMA_SQL, /value_fingerprint/);
assert.match(AVIATION_DATA_SCHEMA_SQL, /observed_at/);
assert.match(AVIATION_DATA_SCHEMA_SQL, /effective_from/);
assert.match(AVIATION_DATA_SCHEMA_SQL, /confidence BETWEEN 0 AND 100/);
assert.match(AVIATION_DATA_SCHEMA_SQL, /provenance_type/);
assert.match(AVIATION_DATA_SCHEMA_SQL, /review_status/);

console.log("Aviation data model and conflict tests passed");
