import "server-only";

import { articlePath } from "@/lib/article-routes";
import {
  comparisonDefinition,
  type ComparisonDefinition,
} from "@/lib/comparison-content";
import { getArticleBySlug } from "@/lib/wiki-public-db";
import type { RevisionRecord } from "@/lib/wiki-types";

function fieldValue(revision: RevisionRecord, keys: string[]) {
  const expected = new Set(keys.map((key) => key.trim().toLowerCase()));
  return revision.fields.find((field) =>
    expected.has(field.key.trim().toLowerCase()),
  )?.value;
}

export async function loadComparison(slug: string) {
  const definition = comparisonDefinition(slug);
  if (!definition) return null;

  const articles = await Promise.all(
    definition.entities.map((entity) =>
      getArticleBySlug(entity.slug, entity.contentType),
    ),
  );

  if (
    articles.some(
      (article) =>
        !article?.liveRevision || article.liveRevision.status !== "approved",
    )
  ) {
    return null;
  }

  const entities = articles.map((article, index) => {
    const approved = article!;
    const revision = approved.liveRevision!;
    const entity = definition.entities[index];
    return {
      ...entity,
      articleTitle: revision.title,
      href: articlePath(revision.contentType, approved.slug),
      updatedAt: revision.updatedAt,
      revision,
    };
  });

  const rows = definition.fields.map((field) => ({
    label: field.label,
    values: entities.map((entity, index) => {
      const keys = field.keys[index] || field.keys[0] || [];
      return fieldValue(entity.revision, keys) || "Not listed";
    }),
  }));

  return {
    definition,
    entities,
    rows,
    updatedAt: entities
      .map((entity) => entity.updatedAt)
      .sort((a, b) => b.localeCompare(a))[0],
  };
}

export type LoadedComparison = NonNullable<
  Awaited<ReturnType<typeof loadComparison>>
>;

export function comparisonPath(definition: ComparisonDefinition) {
  return `/compare/${definition.slug}`;
}
