import type { ContentType, StructuredField } from "@/lib/wiki-types";

export type FleetEntity = {
  id: string;
  title: string;
  slug: string;
  contentType: ContentType;
  fields: StructuredField[];
};

export type FleetRelationship = {
  sourceId: string;
  targetId: string;
  type: "operates_aircraft" | "uses_engine" | "variant_of";
};

export type FleetRow = {
  id: string;
  title: string;
  slug: string;
  currentOperators: string[];
  historicOperators: string[];
  family: string[];
  variant: string;
  engines: string[];
  entryIntoService: string;
  retirementStatus: string;
};

const values = (entity: FleetEntity, pattern: RegExp) =>
  entity.fields
    .filter((field) => pattern.test(field.key.trim()))
    .flatMap((field) => field.value.split(/[,;]|\s+\|\s+/))
    .map((value) => value.trim())
    .filter(Boolean);

const unique = (items: string[]) => [...new Set(items)];

export function buildFleetRows(
  entities: FleetEntity[],
  relationships: FleetRelationship[],
): FleetRow[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return entities
    .filter((entity) => entity.contentType === "aircraft")
    .map((aircraft) => {
      const related = relationships.filter(
        (relationship) =>
          relationship.sourceId === aircraft.id ||
          relationship.targetId === aircraft.id,
      );
      const operators = related
        .filter(
          (relationship) =>
            relationship.type === "operates_aircraft" &&
            relationship.targetId === aircraft.id,
        )
        .map((relationship) => byId.get(relationship.sourceId))
        .filter((entity): entity is FleetEntity => Boolean(entity));
      const historic = operators.filter((operator) =>
        values(operator, /^status$/i).some((status) =>
          /ceased|defunct|former|historic|inactive|retired/i.test(status),
        ),
      );
      const current = operators.filter(
        (operator) => !historic.includes(operator),
      );
      const targets = (type: FleetRelationship["type"]) =>
        related
          .filter(
            (relationship) =>
              relationship.type === type &&
              relationship.sourceId === aircraft.id,
          )
          .map((relationship) => byId.get(relationship.targetId)?.title)
          .filter((title): title is string => Boolean(title));

      return {
        id: aircraft.id,
        title: aircraft.title,
        slug: aircraft.slug,
        currentOperators: unique([
          ...current.map((operator) => operator.title),
          ...values(aircraft, /^(current operators?|operators?)$/i),
        ]),
        historicOperators: unique([
          ...historic.map((operator) => operator.title),
          ...values(aircraft, /^(historic|former|past) operators?$/i),
        ]),
        family: unique([
          ...targets("variant_of"),
          ...values(aircraft, /^(aircraft )?family$/i),
        ]),
        variant: values(aircraft, /^(variant|model)$/i)[0] || aircraft.title,
        engines: unique([
          ...targets("uses_engine"),
          ...values(aircraft, /^engines?$/i),
        ]),
        entryIntoService:
          values(
            aircraft,
            /^(entry into service|entered service|introduction|introduced)$/i,
          )[0] || "Not recorded",
        retirementStatus:
          values(
            aircraft,
            /^(retirement status|retired|status)$/i,
          )[0] || "Not recorded",
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
