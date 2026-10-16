export type StoredRelationship = {
  type: string;
  targetArticleId: string;
  citationIdentifiers?: string[];
};

/**
 * Combine relationship lists when one article is folded into another.
 * Edges that would point an article at itself are dropped. Edges aimed at the
 * duplicate are retargeted at the surviving article.
 */
export function unionRelationships(
  canonical: StoredRelationship[],
  duplicate: StoredRelationship[],
  canonicalArticleId: string,
  duplicateArticleId: string,
  citationIdentifiers?: ReadonlySet<string>,
) {
  const merged = new Map<string, StoredRelationship>();
  for (const item of [...canonical, ...duplicate]) {
    if (!item?.type || !item.targetArticleId) continue;
    const targetArticleId = item.targetArticleId === duplicateArticleId ? canonicalArticleId : item.targetArticleId;
    if (targetArticleId === canonicalArticleId) continue;
    const key = `${item.type}:${targetArticleId}`;
    if (merged.has(key)) continue;
    const citations = (item.citationIdentifiers ?? []).filter((identifier) =>
      citationIdentifiers ? citationIdentifiers.has(identifier.toLowerCase()) : true,
    );
    merged.set(key, { type: item.type, targetArticleId, citationIdentifiers: citations });
  }
  return [...merged.values()];
}

export function sameRelationshipKeys(left: StoredRelationship[], right: StoredRelationship[]) {
  const key = (items: StoredRelationship[]) =>
    items.map((item) => `${item.type}:${item.targetArticleId}`).sort().join("|");
  return key(left) === key(right);
}
