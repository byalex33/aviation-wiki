import assert from "node:assert/strict";

process.env.AVIATION_WIKI_DB_PATH = ":memory:";

async function main() {
  const wiki = await import("../src/lib/wiki-db");

  const markdown = `<Chart
  type="line"
  title="Annual passengers"
  source="https://example.com/report"
>

Year | Passengers
2024 | 12.5
2025 | 14.8

</Chart>`;
  const article = wiki.createOrGetArticle(
    "chart-round-trip",
    "Chart round trip",
    "aircraft",
  );
  const revision = wiki.saveDraft({
    articleId: article.id,
    proposedSlug: article.slug,
    contributorId: "chart-test",
    contributorName: "Chart test",
    editSummary: "Verify raw Markdown storage",
    content: {
      title: article.title,
      contentType: article.contentType,
      markdown,
      fields: [],
      sections: [],
      sources: [],
      relationships: [],
    },
    parentRevisionId: null,
  });

  assert.equal(wiki.getRevision(revision.id)?.markdown, markdown);
  console.log("Chart revision round-trip test passed");
}

void main();
