import { createHash } from "node:crypto";

import {
  britishAirwaysA350Dataset,
  type AviationSeedSource,
} from "@/data/british-airways-a350-1000";
import type {
  AviationReviewStatus,
  AviationSubjectType,
} from "@/lib/aviation-data-model";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type PlannedSource = AviationSeedSource & { id: string };
export type PlannedOrganization = {
  id: string;
  kind: "manufacturer" | "operator";
  name: string;
  slug: string;
  countryCode: string;
};
export type PlannedModel = {
  id: string;
  manufacturerId: string;
  family: string;
  variant: string;
  designation: string;
  icaoTypeCode: string;
};
export type PlannedAirframe = { id: string; publicId: string; msn: string };
export type PlannedAssertion = {
  id: string;
  subjectType: AviationSubjectType;
  subjectId: string;
  predicate: string;
  value: JsonValue;
  valueFingerprint: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  observedAt: string;
  confidence: number;
  sourceId: string;
  reviewStatus: AviationReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
};
export type PlannedEvidence = {
  assertionId: string;
  sourceId: string;
  role: "primary" | "supporting" | "contradicting";
  locator: string | null;
  note: string | null;
  observedAt: string;
};
export type PlannedModelAssignment = {
  id: string;
  airframeId: string;
  modelId: string;
  assertionId: string;
};
export type PlannedIdentifier = {
  id: string;
  airframeId: string;
  type: "msn";
  value: string;
  normalizedValue: string;
  assertionId: string;
};
export type PlannedRegistration = {
  id: string;
  airframeId: string;
  registration: string;
  normalizedRegistration: string;
  countryCode: string;
  validFrom: string;
  validTo: null;
  operatorId: string;
  assertionId: string;
};
export type PlannedEvent = {
  id: string;
  airframeId: string;
  type: "delivered";
  occurredOn: string;
  toOperatorId: string;
  statusAfter: "in_service";
  details: string;
  assertionId: string;
};
export type PlannedConfiguration = {
  id: string;
  airframeId: string;
  type: "cabin";
  configuration: JsonValue;
  validFrom: string;
  validTo: null;
  assertionId: string;
};
export type PlannedMedia = {
  id: string;
  airframeId: string;
  imageUrl: string;
  sourcePage: string;
  creator: string;
  licence: string;
  licenceUrl: string;
  caption: string;
  capturedOn: string;
  assertionId: string;
};
export type PlannedReconciliationCase = {
  id: string;
  subjectType: "airframe";
  subjectId: string;
  predicate: string;
  assertionIds: string[];
};

export type AviationImportPlan = {
  datasetId: string;
  importer: string;
  importerVersion: string;
  inputFingerprint: string;
  importRunId: string;
  observedAt: string;
  reconciledAt: string;
  sources: PlannedSource[];
  organizations: PlannedOrganization[];
  model: PlannedModel;
  airframes: PlannedAirframe[];
  assertions: PlannedAssertion[];
  evidence: PlannedEvidence[];
  modelAssignments: PlannedModelAssignment[];
  identifiers: PlannedIdentifier[];
  registrations: PlannedRegistration[];
  events: PlannedEvent[];
  configurations: PlannedConfiguration[];
  media: PlannedMedia[];
  reconciliationCases: PlannedReconciliationCase[];
};

function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .toSorted(([first], [second]) => first.localeCompare(second))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function aviationFingerprint(value: JsonValue) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function stableAviationId(namespace: string, key: string) {
  return `${namespace}_${createHash("sha256")
    .update(`${namespace}:${key}`)
    .digest("hex")
    .slice(0, 24)}`;
}

function normalizedRegistration(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function planBritishAirwaysA350Import(): AviationImportPlan {
  const dataset = britishAirwaysA350Dataset;
  const importer = "curated-airframe-dataset";
  const importerVersion = "1";
  const inputFingerprint = aviationFingerprint(dataset as unknown as JsonValue);
  const importRunId = stableAviationId(
    "airun",
    `${importer}:${inputFingerprint}`,
  );
  const curator = `system:${dataset.id}`;
  const sources = dataset.sources.map<PlannedSource>((source) => ({
    ...source,
    id: stableAviationId("asrc", source.url),
  }));
  const sourceByKey = new Map(sources.map((source) => [source.key, source]));
  const source = (key: string) => {
    const value = sourceByKey.get(key);
    if (!value) throw new Error(`Unknown aviation seed source: ${key}`);
    return value;
  };
  const manufacturer: PlannedOrganization = {
    id: stableAviationId("aorg", dataset.manufacturer.slug),
    kind: "manufacturer",
    ...dataset.manufacturer,
  };
  const operator: PlannedOrganization = {
    id: stableAviationId("aorg", dataset.operator.slug),
    kind: "operator",
    ...dataset.operator,
  };
  const model: PlannedModel = {
    id: stableAviationId(
      "amodel",
      `${manufacturer.id}:${dataset.model.designation}`,
    ),
    manufacturerId: manufacturer.id,
    ...dataset.model,
  };
  const assertions: PlannedAssertion[] = [];
  const evidence: PlannedEvidence[] = [];
  const modelAssignments: PlannedModelAssignment[] = [];
  const identifiers: PlannedIdentifier[] = [];
  const registrations: PlannedRegistration[] = [];
  const events: PlannedEvent[] = [];
  const configurations: PlannedConfiguration[] = [];
  const media: PlannedMedia[] = [];

  function assertion({
    airframeId,
    predicate,
    value,
    sourceKey,
    confidence,
    effectiveFrom = null,
    reviewStatus = "accepted",
    reviewNote = null,
    evidence: extraEvidence = [],
  }: {
    airframeId: string;
    predicate: string;
    value: JsonValue;
    sourceKey: string;
    confidence: number;
    effectiveFrom?: string | null;
    reviewStatus?: AviationReviewStatus;
    reviewNote?: string | null;
    evidence?: Array<{
      sourceKey: string;
      role: PlannedEvidence["role"];
      note?: string;
    }>;
  }) {
    const primarySource = source(sourceKey);
    const valueFingerprint = aviationFingerprint(value);
    const id = stableAviationId(
      "aclaim",
      [
        airframeId,
        predicate,
        valueFingerprint,
        primarySource.id,
        effectiveFrom ?? "",
      ].join(":"),
    );
    assertions.push({
      id,
      subjectType: "airframe",
      subjectId: airframeId,
      predicate,
      value,
      valueFingerprint,
      effectiveFrom,
      effectiveTo: null,
      observedAt: dataset.observedAt,
      confidence,
      sourceId: primarySource.id,
      reviewStatus,
      reviewedBy: reviewStatus === "accepted" ? curator : null,
      reviewedAt:
        reviewStatus === "accepted" ? dataset.reconciledAt : null,
      reviewNote,
    });
    evidence.push({
      assertionId: id,
      sourceId: primarySource.id,
      role: "primary",
      locator: primarySource.citation ?? null,
      note: null,
      observedAt: dataset.observedAt,
    });
    for (const item of extraEvidence) {
      const supportingSource = source(item.sourceKey);
      evidence.push({
        assertionId: id,
        sourceId: supportingSource.id,
        role: item.role,
        locator: supportingSource.citation ?? null,
        note: item.note ?? null,
        observedAt: dataset.observedAt,
      });
    }
    return id;
  }

  const airframes = dataset.airframes.map<PlannedAirframe>((record) => {
    const id = stableAviationId("af", `${model.id}:msn:${record.msn}`);
    const publicId = `af_${createHash("sha256")
      .update(id)
      .digest("hex")
      .slice(0, 12)}`;
    const modelAssertionId = assertion({
      airframeId: id,
      predicate: "aircraft.model",
      value: { modelId: model.id, designation: model.designation },
      sourceKey: "plane-finder-fleet",
      confidence: 95,
      evidence: [{ sourceKey: "airfleets-fleet", role: "supporting" }],
    });
    modelAssignments.push({
      id: stableAviationId("amap", modelAssertionId),
      airframeId: id,
      modelId: model.id,
      assertionId: modelAssertionId,
    });

    const identifierAssertionId = assertion({
      airframeId: id,
      predicate: "identifier.msn",
      value: { type: "msn", value: record.msn },
      sourceKey: "plane-finder-fleet",
      confidence: 95,
      evidence: [{ sourceKey: "airfleets-fleet", role: "supporting" }],
    });
    identifiers.push({
      id: stableAviationId("aid", identifierAssertionId),
      airframeId: id,
      type: "msn",
      value: record.msn,
      normalizedValue: record.msn,
      assertionId: identifierAssertionId,
    });

    const registrationAssertionId = assertion({
      airframeId: id,
      predicate: "registration.assignment",
      value: {
        registration: record.registration,
        countryCode: "GB",
        operatorId: operator.id,
        validFrom: record.registeredOn,
      },
      sourceKey: "plane-finder-fleet",
      confidence: 90,
      effectiveFrom: record.registeredOn,
      evidence: [
        { sourceKey: "airfleets-fleet", role: "supporting" },
        {
          sourceKey: "ba-fleet-facts",
          role: "supporting",
          note: "The operator reports 18 A350-1000s in its current fleet.",
        },
      ],
    });
    registrations.push({
      id: stableAviationId("areg", registrationAssertionId),
      airframeId: id,
      registration: record.registration,
      normalizedRegistration: normalizedRegistration(record.registration),
      countryCode: "GB",
      validFrom: record.registeredOn,
      validTo: null,
      operatorId: operator.id,
      assertionId: registrationAssertionId,
    });

    const deliveryConflicted = record.msn === "326";
    const deliveryAssertionId = assertion({
      airframeId: id,
      predicate: "event.delivery_date",
      value: {
        type: "delivered",
        occurredOn: record.deliveredOn,
        toOperatorId: operator.id,
      },
      sourceKey: "airfleets-fleet",
      confidence: 85,
      effectiveFrom: record.deliveredOn,
      reviewStatus: deliveryConflicted ? "conflicted" : "accepted",
      reviewNote: deliveryConflicted
        ? "Competes with the Airbus 29 July delivery statement."
        : null,
    });
    events.push({
      id: stableAviationId("aevent", deliveryAssertionId),
      airframeId: id,
      type: "delivered",
      occurredOn: record.deliveredOn,
      toOperatorId: operator.id,
      statusAfter: "in_service",
      details: `Delivered to British Airways as ${record.registration}.`,
      assertionId: deliveryAssertionId,
    });

    const configurationAssertionId = assertion({
      airframeId: id,
      predicate: "configuration.cabin",
      value: dataset.configuration as unknown as JsonValue,
      sourceKey: "ba-fleet-facts",
      confidence: 95,
      effectiveFrom: record.deliveredOn,
      evidence:
        record.msn === "326"
          ? [{ sourceKey: "airbus-first-delivery", role: "supporting" }]
          : [],
    });
    configurations.push({
      id: stableAviationId("aconfig", configurationAssertionId),
      airframeId: id,
      type: "cabin",
      configuration: dataset.configuration as unknown as JsonValue,
      validFrom: record.deliveredOn,
      validTo: null,
      assertionId: configurationAssertionId,
    });

    return { id, publicId, msn: record.msn };
  });

  const airframeByMsn = new Map(
    airframes.map((airframe) => [airframe.msn, airframe]),
  );
  const reconciliationCases = dataset.conflicts.map<PlannedReconciliationCase>(
    (conflict) => {
      const airframe = airframeByMsn.get(conflict.msn);
      if (!airframe) throw new Error(`Conflict references unknown MSN ${conflict.msn}`);
      const conflictingAssertionId = assertion({
        airframeId: airframe.id,
        predicate: conflict.predicate,
        value: {
          type: "delivered",
          occurredOn: conflict.claimedValue,
          toOperatorId: operator.id,
        },
        sourceKey: conflict.sourceKey,
        confidence: 100,
        effectiveFrom: conflict.claimedValue,
        reviewStatus: "conflicted",
        reviewNote: conflict.note,
        evidence: [
          {
            sourceKey: "airfleets-fleet",
            role: "contradicting",
            note: "Airfleets reports 26 July 2019.",
          },
        ],
      });
      events.push({
        id: stableAviationId("aevent", conflictingAssertionId),
        airframeId: airframe.id,
        type: "delivered",
        occurredOn: conflict.claimedValue,
        toOperatorId: operator.id,
        statusAfter: "in_service",
        details: "Manufacturer-reported first delivery date.",
        assertionId: conflictingAssertionId,
      });
      const existingAssertion = assertions.find(
        (item) =>
          item.subjectId === airframe.id &&
          item.predicate === conflict.predicate &&
          item.id !== conflictingAssertionId,
      );
      if (!existingAssertion)
        throw new Error(`No baseline assertion for ${conflict.predicate}`);
      return {
        id: stableAviationId(
          "arecon",
          `${airframe.id}:${conflict.predicate}`,
        ),
        subjectType: "airframe",
        subjectId: airframe.id,
        predicate: conflict.predicate,
        assertionIds: [existingAssertion.id, conflictingAssertionId].toSorted(),
      };
    },
  );

  for (const item of dataset.media) {
    const record = dataset.airframes.find(
      (airframe) => airframe.registration === item.registration,
    );
    const airframe = record ? airframeByMsn.get(record.msn) : undefined;
    if (!airframe) throw new Error(`Photo references unknown airframe ${item.registration}`);
    const mediaAssertionId = assertion({
      airframeId: airframe.id,
      predicate: "media.photo",
      value: {
        imageUrl: item.imageUrl,
        creator: item.creator,
        licence: item.licence,
        capturedOn: item.capturedOn,
      },
      sourceKey: item.sourceKey,
      confidence: 100,
      effectiveFrom: item.capturedOn,
    });
    media.push({
      id: stableAviationId("amedia", mediaAssertionId),
      airframeId: airframe.id,
      imageUrl: item.imageUrl,
      sourcePage: source(item.sourceKey).url,
      creator: item.creator,
      licence: item.licence,
      licenceUrl: item.licenceUrl,
      caption: item.caption,
      capturedOn: item.capturedOn,
      assertionId: mediaAssertionId,
    });
  }

  return {
    datasetId: dataset.id,
    importer,
    importerVersion,
    inputFingerprint,
    importRunId,
    observedAt: dataset.observedAt,
    reconciledAt: dataset.reconciledAt,
    sources,
    organizations: [manufacturer, operator],
    model,
    airframes,
    assertions,
    evidence,
    modelAssignments,
    identifiers,
    registrations,
    events,
    configurations,
    media,
    reconciliationCases,
  };
}

export const britishAirwaysA350ImportPlan = planBritishAirwaysA350Import();

export function summarizeAviationImportPlan(plan: AviationImportPlan) {
  return {
    datasetId: plan.datasetId,
    fingerprint: plan.inputFingerprint,
    sources: plan.sources.length,
    airframes: plan.airframes.length,
    assertions: plan.assertions.length,
    registrations: plan.registrations.length,
    fleetEvents: plan.events.length,
    configurations: plan.configurations.length,
    media: plan.media.length,
    unresolvedConflicts: plan.reconciliationCases.length,
  };
}
