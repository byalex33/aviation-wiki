import assert from "node:assert/strict";

import {
  planReconciliationResolution,
  type AssertionForConflict,
  type ReconciliationCaseForResolution,
} from "../src/lib/aviation-data-model";

const assertions: AssertionForConflict[] = ["26", "29"].map((day) => ({
  id: `delivery-${day}`,
  subjectType: "airframe",
  subjectId: "airframe-g-xwba",
  predicate: "delivery_date",
  valueFingerprint: day,
  effectiveFrom: `2019-07-${day}`,
  effectiveTo: null,
  reviewStatus: "conflicted",
}));
const reconciliationCase: ReconciliationCaseForResolution = {
  id: "case-g-xwba-delivery",
  subjectType: "airframe",
  subjectId: "airframe-g-xwba",
  predicate: "delivery_date",
  status: "open",
  assertionIds: assertions.map((assertion) => assertion.id),
};
const plan = planReconciliationResolution({
  reconciliationCase,
  assertions,
  resolution: {
    canonicalAssertionId: "delivery-29",
    reviewer: "reviewer-1",
    note: "Manufacturer delivery announcement is authoritative for handover date.",
  },
});
assert.deepEqual(plan.assertionUpdates, [
  { assertionId: "delivery-26", reviewStatus: "rejected" },
  { assertionId: "delivery-29", reviewStatus: "accepted" },
]);
assert.throws(
  () =>
    planReconciliationResolution({
      reconciliationCase,
      assertions,
      resolution: { canonicalAssertionId: "other", reviewer: "reviewer-1", note: "No" },
    }),
  /must belong/,
);
assert.throws(
  () =>
    planReconciliationResolution({
      reconciliationCase: { ...reconciliationCase, status: "resolved" },
      assertions,
      resolution: { canonicalAssertionId: "delivery-29", reviewer: "reviewer-1", note: "No" },
    }),
  /Only an open/,
);
assert.throws(
  () =>
    planReconciliationResolution({
      reconciliationCase,
      assertions,
      resolution: { canonicalAssertionId: "delivery-29", reviewer: " ", note: "No" },
    }),
  /reviewer/,
);

console.log("Aviation reconciliation validation tests passed");
