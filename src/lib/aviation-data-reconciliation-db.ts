import "server-only";

import { randomUUID } from "node:crypto";
import type postgres from "postgres";

import {
  planReconciliationResolution,
  type AssertionForConflict,
  type AviationReviewStatus,
  type AviationSubjectType,
  type ReconciliationResolutionInput,
} from "@/lib/aviation-data-model";
import { sql } from "@/lib/postgres";

type Transaction = postgres.TransactionSql<Record<string, never>>;

export type ResolveAviationConflictInput = ReconciliationResolutionInput & {
  caseId: string;
};

export async function writeAviationConflictResolution(
  transaction: Transaction,
  input: ResolveAviationConflictInput,
) {
  const cases = await transaction.unsafe<
    Array<{
      id: string;
      subject_type: AviationSubjectType;
      subject_id: string;
      predicate: string;
      status: "open" | "resolved" | "dismissed";
      canonical_assertion_id: string | null;
      resolution_note: string | null;
      reviewed_by: string | null;
      resolved_at: Date | null;
    }>
  >(
    `SELECT id,subject_type,subject_id,predicate,status,canonical_assertion_id,
       resolution_note,reviewed_by,resolved_at
     FROM reconciliation_cases WHERE id=$1 FOR UPDATE`,
    [input.caseId],
  );
  const reconciliationCase = cases[0];
  if (!reconciliationCase) throw new Error(`Unknown reconciliation case ${input.caseId}`);

  const assertions = await transaction.unsafe<
    Array<{
      id: string;
      subject_type: AviationSubjectType;
      subject_id: string;
      predicate: string;
      value_fingerprint: string;
      effective_from: Date | string | null;
      effective_to: Date | string | null;
      review_status: AviationReviewStatus;
    }>
  >(
    `SELECT a.id,a.subject_type,a.subject_id,a.predicate,a.value_fingerprint,
       a.effective_from,a.effective_to,a.review_status
     FROM reconciliation_case_assertions ca
     JOIN aviation_assertions a ON a.id=ca.assertion_id
     WHERE ca.case_id=$1 ORDER BY a.id FOR UPDATE`,
    [input.caseId],
  );
  const assertionInputs: AssertionForConflict[] = assertions.map((assertion) => ({
    id: assertion.id,
    subjectType: assertion.subject_type,
    subjectId: assertion.subject_id,
    predicate: assertion.predicate,
    valueFingerprint: assertion.value_fingerprint,
    effectiveFrom: assertion.effective_from
      ? new Date(assertion.effective_from).toISOString().slice(0, 10)
      : null,
    effectiveTo: assertion.effective_to
      ? new Date(assertion.effective_to).toISOString().slice(0, 10)
      : null,
    reviewStatus: assertion.review_status,
  }));
  const plan = planReconciliationResolution({
    reconciliationCase: {
      id: reconciliationCase.id,
      subjectType: reconciliationCase.subject_type,
      subjectId: reconciliationCase.subject_id,
      predicate: reconciliationCase.predicate,
      status: reconciliationCase.status,
      assertionIds: assertionInputs.map((assertion) => assertion.id),
    },
    assertions: assertionInputs,
    resolution: input,
  });
  const resolvedAt = new Date().toISOString();
  const before = {
    case: reconciliationCase,
    assertions: assertionInputs.map(({ id, reviewStatus }) => ({ id, reviewStatus })),
  };

  for (const update of plan.assertionUpdates) {
    await transaction.unsafe(
      `UPDATE aviation_assertions
       SET review_status=$1,reviewed_by=$2,reviewed_at=$3,review_note=$4
       WHERE id=$5`,
      [update.reviewStatus, plan.reviewer, resolvedAt, plan.note, update.assertionId],
    );
  }
  await transaction.unsafe(
    `UPDATE reconciliation_cases
     SET status='resolved',canonical_assertion_id=$1,resolution_note=$2,
       reviewed_by=$3,resolved_at=$4
     WHERE id=$5`,
    [plan.canonicalAssertionId, plan.note, plan.reviewer, resolvedAt, plan.caseId],
  );
  const after = {
    status: "resolved",
    canonicalAssertionId: plan.canonicalAssertionId,
    reviewer: plan.reviewer,
    resolvedAt,
    assertions: plan.assertionUpdates,
  };
  await transaction.unsafe(
    `INSERT INTO aviation_reconciliation_events
      (id,case_id,actor_id,action,canonical_assertion_id,before_json,after_json,note,created_at)
     VALUES ($1,$2,$3,'resolved',$4,$5::jsonb,$6::jsonb,$7,$8)`,
    [
      randomUUID(),
      plan.caseId,
      plan.reviewer,
      plan.canonicalAssertionId,
      JSON.stringify(before),
      JSON.stringify(after),
      plan.note,
      resolvedAt,
    ],
  );
  return after;
}

export async function resolveAviationConflict(input: ResolveAviationConflictInput) {
  return sql.begin((transaction) => writeAviationConflictResolution(transaction, input));
}
