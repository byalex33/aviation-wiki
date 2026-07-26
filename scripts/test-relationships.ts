import assert from "node:assert/strict";

import { allowedRelationshipTypes, relationshipKey, relationshipTargetType, validateRelationshipShape } from "../src/lib/relationship-rules";
import type { ContentType, EntityRelationship } from "../src/lib/wiki-types";

const valid: Array<[ContentType, EntityRelationship, ContentType]> = [
  ["airline", { type: "operates_aircraft", targetArticleId: "aircraft", citationIdentifiers: ["1"] }, "aircraft"],
  ["airline", { type: "hub_at_airport", targetArticleId: "airport", citationIdentifiers: [] }, "airport"],
  ["aircraft", { type: "manufactured_by", targetArticleId: "maker", citationIdentifiers: [] }, "manufacturer"],
  ["aircraft", { type: "uses_engine", targetArticleId: "engine", citationIdentifiers: [] }, "engine"],
  ["aircraft", { type: "variant_of", targetArticleId: "family", citationIdentifiers: [] }, "aircraft"],
  ["manufacturer", { type: "produces_aircraft", targetArticleId: "aircraft", citationIdentifiers: [] }, "aircraft"],
  ["manufacturer", { type: "produces_engine", targetArticleId: "engine", citationIdentifiers: [] }, "engine"],
];
for (const [sourceType, relationship, targetType] of valid) assert.doesNotThrow(() => validateRelationshipShape("source", sourceType, relationship, targetType));
assert.throws(() => validateRelationshipShape("same", "aircraft", { type: "variant_of", targetArticleId: "same", citationIdentifiers: [] }, "aircraft"), /cannot relate to itself/);
assert.throws(() => validateRelationshipShape("source", "airline", { type: "uses_engine", targetArticleId: "engine", citationIdentifiers: [] }, "engine"), /Invalid relationship combination/);
assert.equal(relationshipTargetType("produces_engine"), "engine");
assert.deepEqual(allowedRelationshipTypes("airport"), []);
assert.equal(relationshipKey(valid[0][1]), "operates_aircraft:aircraft");
console.log("Relationship rule tests passed");
