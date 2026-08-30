export const aviationSubjectTypes = [
  "airframe",
  "aircraft_model",
  "organization",
  "registration_assignment",
  "airframe_event",
  "airframe_configuration",
] as const;
export type AviationSubjectType = (typeof aviationSubjectTypes)[number];

export const aviationReviewStatuses = [
  "unreviewed",
  "accepted",
  "rejected",
  "superseded",
  "conflicted",
] as const;
export type AviationReviewStatus = (typeof aviationReviewStatuses)[number];

export const airframeEventTypes = [
  "built",
  "first_flight",
  "delivered",
  "leased",
  "transferred",
  "stored",
  "returned_to_service",
  "converted",
  "retired",
  "scrapped",
  "preserved",
  "incident",
] as const;
export type AirframeEventType = (typeof airframeEventTypes)[number];

export type AssertionForConflict = {
  id: string;
  subjectType: AviationSubjectType;
  subjectId: string;
  predicate: string;
  valueFingerprint: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  reviewStatus: AviationReviewStatus;
};

export type AssertionConflict = {
  subjectType: AviationSubjectType;
  subjectId: string;
  predicate: string;
  assertionIds: string[];
};

const inactiveReviewStatuses = new Set<AviationReviewStatus>([
  "rejected",
  "superseded",
]);

function dateBoundary(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ISO date: ${value}`);
  return parsed;
}

export function validateEffectiveRange(
  effectiveFrom: string | null,
  effectiveTo: string | null,
) {
  const start = dateBoundary(effectiveFrom, Number.NEGATIVE_INFINITY);
  const end = dateBoundary(effectiveTo, Number.POSITIVE_INFINITY);
  if (end < start) throw new Error("effective_to cannot precede effective_from");
}

export function effectiveRangesOverlap(
  first: Pick<AssertionForConflict, "effectiveFrom" | "effectiveTo">,
  second: Pick<AssertionForConflict, "effectiveFrom" | "effectiveTo">,
) {
  validateEffectiveRange(first.effectiveFrom, first.effectiveTo);
  validateEffectiveRange(second.effectiveFrom, second.effectiveTo);
  const firstStart = dateBoundary(
    first.effectiveFrom,
    Number.NEGATIVE_INFINITY,
  );
  const firstEnd = dateBoundary(first.effectiveTo, Number.POSITIVE_INFINITY);
  const secondStart = dateBoundary(
    second.effectiveFrom,
    Number.NEGATIVE_INFINITY,
  );
  const secondEnd = dateBoundary(second.effectiveTo, Number.POSITIVE_INFINITY);
  return firstStart <= secondEnd && secondStart <= firstEnd;
}

/**
 * Finds competing active claims without choosing a winner. Callers must persist
 * a reconciliation case and explicitly review it before a canonical projection
 * can select one of the assertions.
 */
export function findAssertionConflicts(
  assertions: AssertionForConflict[],
): AssertionConflict[] {
  const active = assertions.filter(
    (assertion) => !inactiveReviewStatuses.has(assertion.reviewStatus),
  );
  const groups = new Map<string, AssertionForConflict[]>();
  for (const assertion of active) {
    validateEffectiveRange(assertion.effectiveFrom, assertion.effectiveTo);
    const key = [
      assertion.subjectType,
      assertion.subjectId,
      assertion.predicate,
    ].join(":");
    groups.set(key, [...(groups.get(key) ?? []), assertion]);
  }

  const conflicts: AssertionConflict[] = [];
  for (const group of groups.values()) {
    const conflictingIds = new Set<string>();
    for (let firstIndex = 0; firstIndex < group.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < group.length;
        secondIndex += 1
      ) {
        const first = group[firstIndex];
        const second = group[secondIndex];
        if (
          first.valueFingerprint !== second.valueFingerprint &&
          effectiveRangesOverlap(first, second)
        ) {
          conflictingIds.add(first.id);
          conflictingIds.add(second.id);
        }
      }
    }
    if (conflictingIds.size > 1) {
      conflicts.push({
        subjectType: group[0].subjectType,
        subjectId: group[0].subjectId,
        predicate: group[0].predicate,
        assertionIds: [...conflictingIds].toSorted(),
      });
    }
  }
  return conflicts.toSorted((first, second) =>
    `${first.subjectType}:${first.subjectId}:${first.predicate}`.localeCompare(
      `${second.subjectType}:${second.subjectId}:${second.predicate}`,
    ),
  );
}

export function canonicalAssertionId({
  assertions,
  hasOpenConflict,
}: {
  assertions: AssertionForConflict[];
  hasOpenConflict: boolean;
}) {
  if (hasOpenConflict) return null;
  const accepted = assertions.filter(
    (assertion) => assertion.reviewStatus === "accepted",
  );
  return accepted.length === 1 ? accepted[0].id : null;
}

export type ReconciliationCaseForResolution = {
  id: string;
  subjectType: AviationSubjectType;
  subjectId: string;
  predicate: string;
  status: "open" | "resolved" | "dismissed";
  assertionIds: string[];
};

export type ReconciliationResolutionInput = {
  canonicalAssertionId: string;
  reviewer: string;
  note: string;
};

export type ReconciliationResolutionPlan = {
  caseId: string;
  canonicalAssertionId: string;
  reviewer: string;
  note: string;
  assertionUpdates: Array<{
    assertionId: string;
    reviewStatus: "accepted" | "rejected";
  }>;
};

/**
 * Validates a human reconciliation decision without discarding any claim.
 * Persistence adapters apply these status changes and append an audit event.
 */
export function planReconciliationResolution({
  reconciliationCase,
  assertions,
  resolution,
}: {
  reconciliationCase: ReconciliationCaseForResolution;
  assertions: AssertionForConflict[];
  resolution: ReconciliationResolutionInput;
}): ReconciliationResolutionPlan {
  if (reconciliationCase.status !== "open") {
    throw new Error("Only an open reconciliation case can be resolved");
  }
  const reviewer = resolution.reviewer.trim();
  const note = resolution.note.trim();
  if (!reviewer) throw new Error("A reviewer is required");
  if (!note) throw new Error("A resolution note is required");
  if (reconciliationCase.assertionIds.length < 2) {
    throw new Error("A reconciliation case must contain competing assertions");
  }

  const assertionById = new Map(
    assertions.map((assertion) => [assertion.id, assertion]),
  );
  const assertionIds = new Set(reconciliationCase.assertionIds);
  if (!assertionIds.has(resolution.canonicalAssertionId)) {
    throw new Error("The canonical assertion must belong to the reconciliation case");
  }
  for (const assertionId of assertionIds) {
    const assertion = assertionById.get(assertionId);
    if (!assertion) {
      throw new Error(`Missing assertion ${assertionId}`);
    }
    if (
      assertion.subjectType !== reconciliationCase.subjectType ||
      assertion.subjectId !== reconciliationCase.subjectId ||
      assertion.predicate !== reconciliationCase.predicate
    ) {
      throw new Error(`Assertion ${assertionId} does not match the reconciliation case`);
    }
  }

  return {
    caseId: reconciliationCase.id,
    canonicalAssertionId: resolution.canonicalAssertionId,
    reviewer,
    note,
    assertionUpdates: reconciliationCase.assertionIds.map((assertionId) => ({
      assertionId,
      reviewStatus:
        assertionId === resolution.canonicalAssertionId ? "accepted" : "rejected",
    })),
  };
}
