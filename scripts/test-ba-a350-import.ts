import assert from "node:assert/strict";

import { britishAirwaysA350Dataset } from "../src/data/british-airways-a350-1000";
import {
  aviationFingerprint,
  britishAirwaysA350ImportPlan,
  stableAviationId,
  summarizeAviationImportPlan,
} from "../src/lib/aviation-data-import";

const plan = britishAirwaysA350ImportPlan;
const summary = summarizeAviationImportPlan(plan);

assert.equal(summary.airframes, 18);
assert.equal(summary.registrations, 18);
assert.equal(summary.configurations, 18);
assert.equal(summary.media, 1);
assert.equal(summary.fleetEvents, 19);
assert.equal(summary.unresolvedConflicts, 1);
assert.equal(new Set(plan.airframes.map((item) => item.id)).size, 18);
assert.equal(new Set(plan.airframes.map((item) => item.publicId)).size, 18);
assert.equal(new Set(plan.identifiers.map((item) => item.value)).size, 18);
assert.equal(new Set(plan.registrations.map((item) => item.registration)).size, 18);
assert.equal(plan.media[0]?.creator, "Mitchul Hope");
assert.equal(plan.media[0]?.licence, "CC BY-SA 2.0");
assert.ok(plan.assertions.every((assertion) => assertion.sourceId && assertion.observedAt === "2026-08-30T00:00:00.000Z" && assertion.confidence >= 0 && assertion.confidence <= 100));
assert.ok(
  plan.assertions.every((assertion) =>
    plan.evidence.some((item) => item.assertionId === assertion.id && item.role === "primary"),
  ),
  "every assertion must retain primary evidence",
);

const conflict = plan.reconciliationCases[0];
assert.ok(conflict);
assert.equal(conflict.assertionIds.length, 2);
assert.deepEqual(
  conflict.assertionIds.map((id) => plan.assertions.find((assertion) => assertion.id === id)?.reviewStatus),
  ["conflicted", "conflicted"],
);
assert.deepEqual(
  conflict.assertionIds.map((id) => (plan.assertions.find((assertion) => assertion.id === id)?.value as { occurredOn: string }).occurredOn).toSorted(),
  ["2019-07-26", "2019-07-29"],
);
assert.equal(aviationFingerprint(britishAirwaysA350Dataset as never), plan.inputFingerprint);
assert.equal(stableAviationId("af", "same-key"), stableAviationId("af", "same-key"));

console.log("British Airways A350-1000 import plan tests passed");
