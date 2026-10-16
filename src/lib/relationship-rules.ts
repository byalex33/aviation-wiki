import type { ContentType, EntityRelationship, RelationshipType } from "@/lib/wiki-types";
import { UserFacingError } from "@/lib/user-facing-error";

export const relationshipLabels: Record<RelationshipType, string> = {
  operates_aircraft: "Operates aircraft",
  hub_at_airport: "Has a hub at",
  manufactured_by: "Manufactured by",
  uses_engine: "Uses engine",
  variant_of: "Variant of",
  produces_aircraft: "Produces aircraft",
  produces_engine: "Produces engines",
  instance_of: "Instance of aircraft type",
  operated_by: "Operated by",
};

const combinations: Record<RelationshipType, { sources: readonly ContentType[]; target: ContentType }> = {
  operates_aircraft: { sources: ["airline"], target: "aircraft" },
  hub_at_airport: { sources: ["airline"], target: "airport" },
  manufactured_by: { sources: ["aircraft", "airframe"], target: "manufacturer" },
  uses_engine: { sources: ["aircraft"], target: "engine" },
  variant_of: { sources: ["aircraft"], target: "aircraft" },
  produces_aircraft: { sources: ["manufacturer"], target: "aircraft" },
  produces_engine: { sources: ["manufacturer"], target: "engine" },
  instance_of: { sources: ["airframe"], target: "aircraft" },
  operated_by: { sources: ["airframe"], target: "airline" },
};

export function allowedRelationshipTypes(sourceType: ContentType) {
  return (Object.entries(combinations) as Array<[RelationshipType, { sources: readonly ContentType[]; target: ContentType }]>)
    .filter(([, combination]) => combination.sources.includes(sourceType))
    .map(([type]) => type);
}

export function relationshipTargetType(type: RelationshipType) {
  return combinations[type]?.target;
}

export function validateRelationshipShape(sourceId: string, sourceType: ContentType, relationship: EntityRelationship, targetType: ContentType) {
  if (relationship.targetArticleId === sourceId) throw new UserFacingError("An article cannot relate to itself.");
  const combination = combinations[relationship.type];
  if (!combination || !combination.sources.includes(sourceType) || combination.target !== targetType) {
    throw new UserFacingError(`Invalid relationship combination: ${sourceType} ${relationship.type} ${targetType}.`);
  }
}

export function relationshipKey(relationship: EntityRelationship) {
  return `${relationship.type}:${relationship.targetArticleId}`;
}
