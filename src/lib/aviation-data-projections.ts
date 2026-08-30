import type { AviationImportPlan } from "@/lib/aviation-data-import";
import type {
  AviationReviewStatus,
  AviationSubjectType,
} from "@/lib/aviation-data-model";

export type GraphSource = {
  id: string;
  title: string;
  publisher: string;
  url: string;
  retrievedAt: string;
};
export type GraphAssertion = {
  id: string;
  subjectType: AviationSubjectType;
  subjectId: string;
  predicate: string;
  value: unknown;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  observedAt: string;
  confidence: number;
  reviewStatus: AviationReviewStatus;
  reviewedAt: string | null;
  sourceId: string;
};
export type GraphEvidence = {
  assertionId: string;
  sourceId: string;
  role: "primary" | "supporting" | "contradicting";
};
export type GraphOrganization = {
  id: string;
  kind: string;
  name: string;
  slug: string;
  countryCode: string | null;
};
export type GraphModel = {
  id: string;
  manufacturerId: string;
  family: string;
  variant: string;
  designation: string;
  icaoTypeCode: string | null;
};
export type GraphFact = {
  id: string;
  airframeId: string;
  assertionId: string;
};
export type GraphModelAssignment = GraphFact & { modelId: string };
export type GraphIdentifier = GraphFact & {
  type: string;
  value: string;
};
export type GraphRegistration = GraphFact & {
  registration: string;
  countryCode: string;
  validFrom: string | null;
  validTo: string | null;
  operatorId: string | null;
  ownerId: string | null;
};
export type GraphEvent = GraphFact & {
  type: string;
  occurredOn: string | null;
  endedOn: string | null;
  fromOperatorId: string | null;
  toOperatorId: string | null;
  location: string | null;
  statusAfter: string | null;
  details: string | null;
};
export type GraphConfiguration = GraphFact & {
  type: string;
  configuration: unknown;
  validFrom: string | null;
  validTo: string | null;
};
export type GraphMedia = GraphFact & {
  imageUrl: string;
  sourcePage: string;
  creator: string;
  licence: string;
  licenceUrl: string;
  caption: string | null;
  capturedOn: string | null;
};
export type GraphConflict = {
  id: string;
  subjectId: string;
  predicate: string;
  status: "open" | "resolved" | "dismissed";
  assertionIds: string[];
};
export type AviationGraphSnapshot = {
  reconciledAt: string | null;
  sources: GraphSource[];
  assertions: GraphAssertion[];
  evidence: GraphEvidence[];
  organizations: GraphOrganization[];
  models: GraphModel[];
  airframes: Array<{ id: string; publicId: string }>;
  modelAssignments: GraphModelAssignment[];
  identifiers: GraphIdentifier[];
  registrations: GraphRegistration[];
  events: GraphEvent[];
  configurations: GraphConfiguration[];
  media: GraphMedia[];
  conflicts: GraphConflict[];
};

export type ProjectedFact<T> = T & {
  assertion: GraphAssertion;
  sources: GraphSource[];
};
export type AirframeProjection = {
  id: string;
  publicId: string;
  msn: string | null;
  model: GraphModel | null;
  manufacturer: GraphOrganization | null;
  currentRegistration: ProjectedFact<GraphRegistration> | null;
  registrationHistory: Array<ProjectedFact<GraphRegistration>>;
  currentOperator: GraphOrganization | null;
  events: Array<ProjectedFact<GraphEvent>>;
  currentConfiguration: ProjectedFact<GraphConfiguration> | null;
  media: Array<ProjectedFact<GraphMedia>>;
  status: string;
  conflicts: Array<{
    id: string;
    predicate: string;
    claims: Array<ProjectedFact<GraphAssertion>>;
  }>;
  completeness: {
    msn: boolean;
    model: boolean;
    registrationHistory: boolean;
    deliveryDate: boolean;
    configuration: boolean;
    photo: boolean;
  };
};

function asTimestamp(value: string | null, fallback: number) {
  if (!value) return fallback;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) ? timestamp : fallback;
}

function currentOn(
  value: { validFrom: string | null; validTo: string | null },
  asOf: string,
) {
  const time = asTimestamp(asOf, Date.now());
  return (
    asTimestamp(value.validFrom, Number.NEGATIVE_INFINITY) <= time &&
    asTimestamp(value.validTo, Number.POSITIVE_INFINITY) >= time
  );
}

export function buildAirframeProjections(
  snapshot: AviationGraphSnapshot,
  asOf = "2026-08-30",
): AirframeProjection[] {
  const assertions = new Map(
    snapshot.assertions.map((assertion) => [assertion.id, assertion]),
  );
  const sources = new Map(snapshot.sources.map((source) => [source.id, source]));
  const organizations = new Map(
    snapshot.organizations.map((organization) => [organization.id, organization]),
  );
  const models = new Map(snapshot.models.map((model) => [model.id, model]));
  const openConflictKeys = new Set(
    snapshot.conflicts
      .filter((conflict) => conflict.status === "open")
      .map((conflict) => `${conflict.subjectId}:${conflict.predicate}`),
  );
  const sourceIdsByAssertion = new Map<string, string[]>();
  for (const item of snapshot.evidence) {
    sourceIdsByAssertion.set(item.assertionId, [
      ...(sourceIdsByAssertion.get(item.assertionId) ?? []),
      item.sourceId,
    ]);
  }

  function projected<T extends GraphFact>(fact: T): ProjectedFact<T> | null {
    const assertion = assertions.get(fact.assertionId);
    if (
      !assertion ||
      assertion.reviewStatus !== "accepted" ||
      openConflictKeys.has(`${assertion.subjectId}:${assertion.predicate}`)
    ) {
      return null;
    }
    const factSources = [
      ...new Set([
        assertion.sourceId,
        ...(sourceIdsByAssertion.get(assertion.id) ?? []),
      ]),
    ]
      .map((id) => sources.get(id))
      .filter((source): source is GraphSource => Boolean(source));
    return { ...fact, assertion, sources: factSources };
  }

  function conflictClaim(assertionId: string) {
    const assertion = assertions.get(assertionId);
    if (!assertion) return null;
    const claimSources = [
      ...new Set([
        assertion.sourceId,
        ...(sourceIdsByAssertion.get(assertion.id) ?? []),
      ]),
    ]
      .map((id) => sources.get(id))
      .filter((source): source is GraphSource => Boolean(source));
    return { ...assertion, assertion, sources: claimSources };
  }

  return snapshot.airframes
    .map<AirframeProjection>((airframe) => {
      const modelAssignment = snapshot.modelAssignments
        .filter((item) => item.airframeId === airframe.id)
        .map(projected)
        .find(Boolean);
      const model = modelAssignment
        ? (models.get(modelAssignment.modelId) ?? null)
        : null;
      const manufacturer = model
        ? (organizations.get(model.manufacturerId) ?? null)
        : null;
      const msn = snapshot.identifiers
        .filter((item) => item.airframeId === airframe.id && item.type === "msn")
        .map(projected)
        .find(Boolean)?.value ?? null;
      const registrationHistory = snapshot.registrations
        .filter((item) => item.airframeId === airframe.id)
        .map(projected)
        .filter(
          (item): item is ProjectedFact<GraphRegistration> => Boolean(item),
        )
        .toSorted(
          (first, second) =>
            asTimestamp(first.validFrom, 0) - asTimestamp(second.validFrom, 0),
        );
      const currentRegistration =
        registrationHistory.findLast((item) => currentOn(item, asOf)) ?? null;
      const currentOperator = currentRegistration?.operatorId
        ? (organizations.get(currentRegistration.operatorId) ?? null)
        : null;
      const events = snapshot.events
        .filter((item) => item.airframeId === airframe.id)
        .map(projected)
        .filter((item): item is ProjectedFact<GraphEvent> => Boolean(item))
        .toSorted(
          (first, second) =>
            asTimestamp(first.occurredOn, 0) - asTimestamp(second.occurredOn, 0),
        );
      const currentConfiguration =
        snapshot.configurations
          .filter((item) => item.airframeId === airframe.id)
          .map(projected)
          .filter(
            (item): item is ProjectedFact<GraphConfiguration> => Boolean(item),
          )
          .findLast((item) => currentOn(item, asOf)) ?? null;
      const media = snapshot.media
        .filter((item) => item.airframeId === airframe.id)
        .map(projected)
        .filter((item): item is ProjectedFact<GraphMedia> => Boolean(item))
        .toSorted(
          (first, second) =>
            asTimestamp(second.capturedOn, 0) - asTimestamp(first.capturedOn, 0),
        );
      const conflicts = snapshot.conflicts
        .filter(
          (conflict) =>
            conflict.subjectId === airframe.id && conflict.status === "open",
        )
        .map((conflict) => ({
          id: conflict.id,
          predicate: conflict.predicate,
          claims: conflict.assertionIds
            .map(conflictClaim)
            .filter(
              (claim): claim is ProjectedFact<GraphAssertion> => Boolean(claim),
            ),
        }));
      const latestStatus = events.findLast((event) => event.statusAfter);
      return {
        id: airframe.id,
        publicId: airframe.publicId,
        msn,
        model,
        manufacturer,
        currentRegistration,
        registrationHistory,
        currentOperator,
        events,
        currentConfiguration,
        media,
        status: latestStatus?.statusAfter ?? (currentRegistration ? "registered" : "unknown"),
        conflicts,
        completeness: {
          msn: Boolean(msn),
          model: Boolean(model),
          registrationHistory: registrationHistory.length > 0,
          deliveryDate: events.some((event) => event.type === "delivered"),
          configuration: Boolean(currentConfiguration),
          photo: media.length > 0,
        },
      };
    })
    .toSorted((first, second) =>
      (first.msn ?? first.publicId).localeCompare(second.msn ?? second.publicId, undefined, {
        numeric: true,
      }),
    );
}

export function aviationGraphCompleteness(
  projections: AirframeProjection[],
  reconciledAt: string | null,
) {
  const count = (key: keyof AirframeProjection["completeness"]) =>
    projections.filter((airframe) => airframe.completeness[key]).length;
  return {
    totalAirframes: projections.length,
    msnsKnown: count("msn"),
    registrationHistoriesComplete: count("registrationHistory"),
    deliveryDatesCanonical: count("deliveryDate"),
    configurationsKnown: count("configuration"),
    photosKnown: count("photo"),
    unresolvedConflicts: projections.reduce(
      (total, airframe) => total + airframe.conflicts.length,
      0,
    ),
    lastReconciledAt: reconciledAt,
  };
}

/** Test and dry-run adapter; production snapshots are loaded from PostgreSQL. */
export function snapshotFromImportPlan(
  plan: AviationImportPlan,
): AviationGraphSnapshot {
  return {
    reconciledAt: plan.reconciledAt,
    sources: plan.sources.map((source) => ({
      id: source.id,
      title: source.title,
      publisher: source.publisher,
      url: source.url,
      retrievedAt: source.retrievedAt,
    })),
    assertions: plan.assertions.map((assertion) => ({
      id: assertion.id,
      subjectType: assertion.subjectType,
      subjectId: assertion.subjectId,
      predicate: assertion.predicate,
      value: assertion.value,
      effectiveFrom: assertion.effectiveFrom,
      effectiveTo: assertion.effectiveTo,
      observedAt: assertion.observedAt,
      confidence: assertion.confidence,
      reviewStatus: assertion.reviewStatus,
      reviewedAt: assertion.reviewedAt,
      sourceId: assertion.sourceId,
    })),
    evidence: plan.evidence.map((item) => ({
      assertionId: item.assertionId,
      sourceId: item.sourceId,
      role: item.role,
    })),
    organizations: plan.organizations.map((organization) => ({
      id: organization.id,
      kind: organization.kind,
      name: organization.name,
      slug: organization.slug,
      countryCode: organization.countryCode,
    })),
    models: [plan.model],
    airframes: plan.airframes.map((airframe) => ({
      id: airframe.id,
      publicId: airframe.publicId,
    })),
    modelAssignments: plan.modelAssignments,
    identifiers: plan.identifiers,
    registrations: plan.registrations.map((item) => ({ ...item, ownerId: null })),
    events: plan.events.map((item) => ({
      ...item,
      endedOn: null,
      fromOperatorId: null,
      location: null,
    })),
    configurations: plan.configurations,
    media: plan.media,
    conflicts: plan.reconciliationCases.map((item) => ({
      id: item.id,
      subjectId: item.subjectId,
      predicate: item.predicate,
      status: "open",
      assertionIds: item.assertionIds,
    })),
  };
}
