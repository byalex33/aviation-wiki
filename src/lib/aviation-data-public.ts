import "server-only";

import { cache } from "react";

import {
  aviationGraphCompleteness,
  buildAirframeProjections,
  type AirframeProjection,
  type AviationGraphSnapshot,
  type GraphAssertion,
  type GraphConfiguration,
  type GraphConflict,
  type GraphEvent,
  type GraphEvidence,
  type GraphIdentifier,
  type GraphModel,
  type GraphModelAssignment,
  type GraphOrganization,
  type GraphRegistration,
  type GraphSource,
} from "@/lib/aviation-data-projections";
import type {
  AviationReviewStatus,
  AviationSubjectType,
} from "@/lib/aviation-data-model";
import { rows } from "@/lib/postgres";

function timestamp(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  return value ? new Date(String(value)).toISOString() : null;
}

function date(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value ? String(value).slice(0, 10) : null;
}

function json(value: unknown) {
  if (typeof value === "string") return JSON.parse(value) as unknown;
  return value;
}

export const loadAviationGraphSnapshot = cache(
  async (): Promise<AviationGraphSnapshot> => {
    const [
      sourceRows,
      assertionRows,
      evidenceRows,
      organizationRows,
      modelRows,
      airframeRows,
      modelAssignmentRows,
      identifierRows,
      registrationRows,
      eventRows,
      configurationRows,
      conflictRows,
      reconciliationRows,
    ] = await Promise.all([
      rows<Record<string, unknown>>(
        "SELECT id,title,publisher,url,retrieved_at FROM aviation_sources ORDER BY id",
      ),
      rows<Record<string, unknown>>(
        `SELECT id,subject_type,subject_id,predicate,value_json::text value_json,
          effective_from,effective_to,observed_at,confidence,review_status,
          reviewed_at,source_id FROM aviation_assertions ORDER BY id`,
      ),
      rows<Record<string, unknown>>(
        "SELECT assertion_id,source_id,evidence_role FROM aviation_assertion_evidence ORDER BY assertion_id,source_id",
      ),
      rows<Record<string, unknown>>(
        "SELECT id,kind,name,slug,country_code FROM aviation_organizations ORDER BY id",
      ),
      rows<Record<string, unknown>>(
        "SELECT id,manufacturer_id,family,variant,designation,icao_type_code FROM aircraft_models ORDER BY id",
      ),
      rows<Record<string, unknown>>(
        "SELECT id,public_id FROM airframes ORDER BY public_id",
      ),
      rows<Record<string, unknown>>(
        "SELECT id,airframe_id,model_id,assertion_id FROM airframe_model_assignments ORDER BY id",
      ),
      rows<Record<string, unknown>>(
        "SELECT id,airframe_id,identifier_type,value,assertion_id FROM airframe_identifiers ORDER BY id",
      ),
      rows<Record<string, unknown>>(
        `SELECT id,airframe_id,registration,country_code,valid_from,valid_to,
          operator_id,owner_id,assertion_id FROM registration_assignments ORDER BY id`,
      ),
      rows<Record<string, unknown>>(
        `SELECT id,airframe_id,event_type,occurred_on,ended_on,from_operator_id,
          to_operator_id,location,status_after,details,assertion_id
          FROM airframe_events ORDER BY id`,
      ),
      rows<Record<string, unknown>>(
        `SELECT id,airframe_id,configuration_type,configuration_json::text configuration_json,
          valid_from,valid_to,assertion_id FROM airframe_configurations ORDER BY id`,
      ),
      rows<Record<string, unknown>>(
        `SELECT c.id,c.subject_id,c.predicate,c.status,
          COALESCE(jsonb_agg(ca.assertion_id ORDER BY ca.assertion_id)
            FILTER (WHERE ca.assertion_id IS NOT NULL),'[]'::jsonb)::text assertion_ids
          FROM reconciliation_cases c
          LEFT JOIN reconciliation_case_assertions ca ON ca.case_id=c.id
          GROUP BY c.id,c.subject_id,c.predicate,c.status ORDER BY c.id`,
      ),
      rows<Record<string, unknown>>(
        "SELECT MAX(reviewed_at) last_reconciled_at FROM aviation_assertions WHERE reviewed_at IS NOT NULL",
      ),
    ]);

    return {
      reconciledAt: timestamp(reconciliationRows[0]?.last_reconciled_at),
      sources: sourceRows.map<GraphSource>((item) => ({
        id: String(item.id),
        title: String(item.title),
        publisher: String(item.publisher),
        url: String(item.url),
        retrievedAt: timestamp(item.retrieved_at) ?? "",
      })),
      assertions: assertionRows.map<GraphAssertion>((item) => ({
        id: String(item.id),
        subjectType: String(item.subject_type) as AviationSubjectType,
        subjectId: String(item.subject_id),
        predicate: String(item.predicate),
        value: json(item.value_json),
        effectiveFrom: date(item.effective_from),
        effectiveTo: date(item.effective_to),
        observedAt: timestamp(item.observed_at) ?? "",
        confidence: Number(item.confidence),
        reviewStatus: String(item.review_status) as AviationReviewStatus,
        reviewedAt: timestamp(item.reviewed_at),
        sourceId: String(item.source_id),
      })),
      evidence: evidenceRows.map<GraphEvidence>((item) => ({
        assertionId: String(item.assertion_id),
        sourceId: String(item.source_id),
        role: String(item.evidence_role) as GraphEvidence["role"],
      })),
      organizations: organizationRows.map<GraphOrganization>((item) => ({
        id: String(item.id),
        kind: String(item.kind),
        name: String(item.name),
        slug: String(item.slug),
        countryCode: item.country_code ? String(item.country_code) : null,
      })),
      models: modelRows.map<GraphModel>((item) => ({
        id: String(item.id),
        manufacturerId: String(item.manufacturer_id),
        family: String(item.family),
        variant: String(item.variant),
        designation: String(item.designation),
        icaoTypeCode: item.icao_type_code ? String(item.icao_type_code) : null,
      })),
      airframes: airframeRows.map((item) => ({
        id: String(item.id),
        publicId: String(item.public_id),
      })),
      modelAssignments: modelAssignmentRows.map<GraphModelAssignment>((item) => ({
        id: String(item.id),
        airframeId: String(item.airframe_id),
        modelId: String(item.model_id),
        assertionId: String(item.assertion_id),
      })),
      identifiers: identifierRows.map<GraphIdentifier>((item) => ({
        id: String(item.id),
        airframeId: String(item.airframe_id),
        type: String(item.identifier_type),
        value: String(item.value),
        assertionId: String(item.assertion_id),
      })),
      registrations: registrationRows.map<GraphRegistration>((item) => ({
        id: String(item.id),
        airframeId: String(item.airframe_id),
        registration: String(item.registration),
        countryCode: String(item.country_code),
        validFrom: date(item.valid_from),
        validTo: date(item.valid_to),
        operatorId: item.operator_id ? String(item.operator_id) : null,
        ownerId: item.owner_id ? String(item.owner_id) : null,
        assertionId: String(item.assertion_id),
      })),
      events: eventRows.map<GraphEvent>((item) => ({
        id: String(item.id),
        airframeId: String(item.airframe_id),
        type: String(item.event_type),
        occurredOn: date(item.occurred_on),
        endedOn: date(item.ended_on),
        fromOperatorId: item.from_operator_id
          ? String(item.from_operator_id)
          : null,
        toOperatorId: item.to_operator_id ? String(item.to_operator_id) : null,
        location: item.location ? String(item.location) : null,
        statusAfter: item.status_after ? String(item.status_after) : null,
        details: item.details ? String(item.details) : null,
        assertionId: String(item.assertion_id),
      })),
      configurations: configurationRows.map<GraphConfiguration>((item) => ({
        id: String(item.id),
        airframeId: String(item.airframe_id),
        type: String(item.configuration_type),
        configuration: json(item.configuration_json),
        validFrom: date(item.valid_from),
        validTo: date(item.valid_to),
        assertionId: String(item.assertion_id),
      })),
      conflicts: conflictRows.map<GraphConflict>((item) => ({
        id: String(item.id),
        subjectId: String(item.subject_id),
        predicate: String(item.predicate),
        status: String(item.status) as GraphConflict["status"],
        assertionIds: json(item.assertion_ids) as string[],
      })),
    };
  },
);

export const loadAirframeProjections = cache(async () => {
  const snapshot = await loadAviationGraphSnapshot();
  return buildAirframeProjections(snapshot);
});

export async function getAirframeProjection(publicId: string) {
  return (await loadAirframeProjections()).find(
    (airframe) => airframe.publicId === publicId,
  );
}

export async function listProductionAirframes(designation: string) {
  return (await loadAirframeProjections()).filter(
    (airframe) => airframe.model?.designation === designation,
  );
}

export async function listOperatorFleet(operatorSlug: string) {
  return (await loadAirframeProjections()).filter(
    (airframe) => airframe.currentOperator?.slug === operatorSlug,
  );
}

export async function loadAviationGraphCompleteness() {
  const [snapshot, projections] = await Promise.all([
    loadAviationGraphSnapshot(),
    loadAirframeProjections(),
  ]);
  return aviationGraphCompleteness(projections, snapshot.reconciledAt);
}

export function filterCurrentFleet(
  airframes: AirframeProjection[],
  operatorSlug: string,
) {
  return airframes.filter(
    (airframe) => airframe.currentOperator?.slug === operatorSlug,
  );
}

