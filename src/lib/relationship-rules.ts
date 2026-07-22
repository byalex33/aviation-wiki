import type { ContentType, EntityRelationship, RelationshipType } from "@/lib/wiki-types";

export const relationshipLabels: Record<RelationshipType, string> = {
  operates_aircraft: "Operates aircraft",
  hub_at_airport: "Has a hub at",
  manufactured_by: "Manufactured by",
  uses_engine: "Uses engine",
  variant_of: "Variant of",
  located_in_country: "Located in",
  produces_aircraft: "Produces aircraft",
  produces_engine: "Produces engines",
};

const combinations: Record<RelationshipType, readonly [ContentType, ContentType]> = {
  operates_aircraft: ["airline", "aircraft"],
  hub_at_airport: ["airline", "airport"],
  manufactured_by: ["aircraft", "manufacturer"],
  uses_engine: ["aircraft", "engine"],
  variant_of: ["aircraft", "aircraft"],
  located_in_country: ["airport", "country"],
  produces_aircraft: ["manufacturer", "aircraft"],
  produces_engine: ["manufacturer", "engine"],
};

export function allowedRelationshipTypes(sourceType: ContentType) {
  return (Object.entries(combinations) as Array<[RelationshipType, readonly [ContentType, ContentType]]>)
    .filter(([, [source]]) => source === sourceType)
    .map(([type]) => type);
}

export function relationshipTargetType(type: RelationshipType) {
  return combinations[type]?.[1];
}

export function validateRelationshipShape(sourceId: string, sourceType: ContentType, relationship: EntityRelationship, targetType: ContentType) {
  if (relationship.targetArticleId === sourceId) throw new Error("An article cannot relate to itself.");
  const combination = combinations[relationship.type];
  if (!combination || combination[0] !== sourceType || combination[1] !== targetType) {
    throw new Error(`Invalid relationship combination: ${sourceType} ${relationship.type} ${targetType}.`);
  }
}

export function relationshipKey(relationship: EntityRelationship) {
  return `${relationship.type}:${relationship.targetArticleId}`;
}
