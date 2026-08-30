import "server-only";

import type postgres from "postgres";

import type { AviationImportPlan } from "@/lib/aviation-data-import";
import { AVIATION_DATA_MIGRATION_ID } from "@/lib/aviation-data-schema";
import { sql } from "@/lib/postgres";

export type AviationImportResult = {
  alreadyImported: boolean;
  importRunId: string;
  airframes: number;
  assertions: number;
  conflicts: number;
};

type Transaction = postgres.TransactionSql<Record<string, never>>;

export async function writeAviationImportPlan(
  transaction: Transaction,
  plan: AviationImportPlan,
): Promise<AviationImportResult> {
  const migration = await transaction.unsafe<Array<{ id: string }>>(
    "SELECT id FROM aviation_data_migrations WHERE id=$1",
    [AVIATION_DATA_MIGRATION_ID],
  );
  if (!migration.length) {
    throw new Error(
      `Missing ${AVIATION_DATA_MIGRATION_ID}; run the aviation data migration before importing.`,
    );
  }

  await transaction`INSERT INTO aviation_sources ${transaction(
    plan.sources.map((source) => ({
      id: source.id,
      source_type: source.type,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      citation: source.citation ?? null,
      licence: source.licence ?? null,
      retrieved_at: source.retrievedAt,
      created_at: source.retrievedAt,
    })),
    "id",
    "source_type",
    "title",
    "publisher",
    "url",
    "citation",
    "licence",
    "retrieved_at",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;

  const primarySource = plan.sources[0];
  if (!primarySource) throw new Error("An aviation import requires a source.");
  const insertedRun = await transaction.unsafe<Array<{ id: string }>>(
    `INSERT INTO aviation_import_runs
      (id,importer,importer_version,source_id,observed_at,input_fingerprint,status,metadata_json,started_at)
     VALUES ($1,$2,$3,$4,$5,$6,'running',$7::jsonb,NOW())
     ON CONFLICT (importer,input_fingerprint) DO NOTHING
     RETURNING id`,
    [
      plan.importRunId,
      plan.importer,
      plan.importerVersion,
      primarySource.id,
      plan.observedAt,
      plan.inputFingerprint,
      JSON.stringify({ datasetId: plan.datasetId }),
    ],
  );
  if (!insertedRun.length) {
    return {
      alreadyImported: true,
      importRunId: plan.importRunId,
      airframes: 0,
      assertions: 0,
      conflicts: 0,
    };
  }

  await transaction`INSERT INTO aviation_organizations ${transaction(
    plan.organizations.map((organization) => ({
      id: organization.id,
      kind: organization.kind,
      name: organization.name,
      slug: organization.slug,
      country_code: organization.countryCode,
      created_at: plan.reconciledAt,
      updated_at: plan.reconciledAt,
    })),
    "id",
    "kind",
    "name",
    "slug",
    "country_code",
    "created_at",
    "updated_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction.unsafe(
    `INSERT INTO aircraft_models
      (id,manufacturer_id,family,variant,designation,icao_type_code,created_at,updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW()) ON CONFLICT (id) DO NOTHING`,
    [
      plan.model.id,
      plan.model.manufacturerId,
      plan.model.family,
      plan.model.variant,
      plan.model.designation,
      plan.model.icaoTypeCode,
    ],
  );
  await transaction`INSERT INTO airframes ${transaction(
    plan.airframes.map((airframe) => ({
      id: airframe.id,
      public_id: airframe.publicId,
      created_at: plan.reconciledAt,
      updated_at: plan.reconciledAt,
    })),
    "id",
    "public_id",
    "created_at",
    "updated_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO aviation_assertions ${transaction(
    plan.assertions.map((assertion) => ({
      id: assertion.id,
      subject_type: assertion.subjectType,
      subject_id: assertion.subjectId,
      predicate: assertion.predicate,
      value_json: transaction.json(assertion.value),
      value_fingerprint: assertion.valueFingerprint,
      effective_from: assertion.effectiveFrom,
      effective_to: assertion.effectiveTo,
      observed_at: assertion.observedAt,
      confidence: assertion.confidence,
      provenance_type: "importer",
      importer_name: plan.importer,
      import_run_id: plan.importRunId,
      source_id: assertion.sourceId,
      review_status: assertion.reviewStatus,
      reviewed_by: assertion.reviewedBy,
      reviewed_at: assertion.reviewedAt,
      review_note: assertion.reviewNote,
      created_at: plan.reconciledAt,
    })),
    "id",
    "subject_type",
    "subject_id",
    "predicate",
    "value_json",
    "value_fingerprint",
    "effective_from",
    "effective_to",
    "observed_at",
    "confidence",
    "provenance_type",
    "importer_name",
    "import_run_id",
    "source_id",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_note",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO aviation_assertion_evidence ${transaction(
    plan.evidence.map((item) => ({
      assertion_id: item.assertionId,
      source_id: item.sourceId,
      evidence_role: item.role,
      locator: item.locator,
      note: item.note,
      observed_at: item.observedAt,
    })),
    "assertion_id",
    "source_id",
    "evidence_role",
    "locator",
    "note",
    "observed_at",
  )} ON CONFLICT (assertion_id,source_id) DO NOTHING`;
  await transaction`INSERT INTO airframe_model_assignments ${transaction(
    plan.modelAssignments.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      model_id: item.modelId,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "model_id",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO airframe_identifiers ${transaction(
    plan.identifiers.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      identifier_type: item.type,
      value: item.value,
      normalized_value: item.normalizedValue,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "identifier_type",
    "value",
    "normalized_value",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO registration_assignments ${transaction(
    plan.registrations.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      registration: item.registration,
      normalized_registration: item.normalizedRegistration,
      country_code: item.countryCode,
      valid_from: item.validFrom,
      valid_to: item.validTo,
      operator_id: item.operatorId,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "registration",
    "normalized_registration",
    "country_code",
    "valid_from",
    "valid_to",
    "operator_id",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO airframe_events ${transaction(
    plan.events.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      event_type: item.type,
      occurred_on: item.occurredOn,
      to_operator_id: item.toOperatorId,
      status_after: item.statusAfter,
      details: item.details,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "event_type",
    "occurred_on",
    "to_operator_id",
    "status_after",
    "details",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO airframe_configurations ${transaction(
    plan.configurations.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      configuration_type: item.type,
      configuration_json: transaction.json(item.configuration),
      valid_from: item.validFrom,
      valid_to: item.validTo,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "configuration_type",
    "configuration_json",
    "valid_from",
    "valid_to",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO airframe_media ${transaction(
    plan.media.map((item) => ({
      id: item.id,
      airframe_id: item.airframeId,
      image_url: item.imageUrl,
      source_page: item.sourcePage,
      creator: item.creator,
      licence: item.licence,
      licence_url: item.licenceUrl,
      caption: item.caption,
      captured_on: item.capturedOn,
      assertion_id: item.assertionId,
      created_at: plan.reconciledAt,
    })),
    "id",
    "airframe_id",
    "image_url",
    "source_page",
    "creator",
    "licence",
    "licence_url",
    "caption",
    "captured_on",
    "assertion_id",
    "created_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO reconciliation_cases ${transaction(
    plan.reconciliationCases.map((item) => ({
      id: item.id,
      subject_type: item.subjectType,
      subject_id: item.subjectId,
      predicate: item.predicate,
      status: "open",
      opened_at: plan.reconciledAt,
    })),
    "id",
    "subject_type",
    "subject_id",
    "predicate",
    "status",
    "opened_at",
  )} ON CONFLICT (id) DO NOTHING`;
  await transaction`INSERT INTO reconciliation_case_assertions ${transaction(
    plan.reconciliationCases.flatMap((item) =>
      item.assertionIds.map((assertionId) => ({
        case_id: item.id,
        assertion_id: assertionId,
      })),
    ),
    "case_id",
    "assertion_id",
  )} ON CONFLICT (case_id,assertion_id) DO NOTHING`;
  await transaction.unsafe(
    `UPDATE aviation_import_runs
     SET status='completed', completed_at=NOW(), metadata_json=$2::jsonb
     WHERE id=$1`,
    [
      plan.importRunId,
      JSON.stringify({ datasetId: plan.datasetId, airframes: plan.airframes.length, assertions: plan.assertions.length, unresolvedConflicts: plan.reconciliationCases.length }),
    ],
  );
  return {
    alreadyImported: false,
    importRunId: plan.importRunId,
    airframes: plan.airframes.length,
    assertions: plan.assertions.length,
    conflicts: plan.reconciliationCases.length,
  };
}

export async function importAviationData(plan: AviationImportPlan) {
  return sql.begin((transaction) => writeAviationImportPlan(transaction, plan));
}
