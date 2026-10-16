import assert from "node:assert/strict";
import images from "./alliance-images.json";
import { parseArticleMarkdown } from "../src/lib/article-markdown";

function addImage(markdown: string, image: typeof images[number]) {
  const parsed = parseArticleMarkdown(markdown);
  assert.deepEqual(parsed.errors, [], "Existing article must be valid");
  if (parsed.sidebarImages.length) return markdown;
  assert.ok(markdown.includes("</Sidebar>"), "Expected an existing article sidebar");
  const newline = markdown.includes("\r\n") ? "\r\n" : "\n";
  const credit = `${image.caption}. Photo: [${image.creator}](${image.sourcePage}), [${image.license}](${image.licenseUrl}). Cropped and shaded in article cards.`;
  const result = markdown.replace("</Sidebar>", `![${image.imageUrl} | ${credit}]${newline}</Sidebar>`);
  assert.deepEqual(parseArticleMarkdown(result).errors, [], `Invalid image markup for ${image.slug}`);
  return result;
}

for (const image of images) {
  const original = "<Sidebar>\nName: Alliance\n</Sidebar>\n\nExisting article text.";
  const updated = addImage(original, image);
  assert.equal(parseArticleMarkdown(updated).sidebarImages.length, 1);
  assert.equal(addImage(updated, image), updated, "Repeated runs must preserve existing images");
  assert.ok(updated.endsWith("\n\nExisting article text."));
  assert.ok(parseArticleMarkdown(updated).sidebarImages[0].credit?.includes(image.licenseUrl));
  const windows = addImage(original.replaceAll("\n", "\r\n"), image);
  assert.ok(windows.includes("]\r\n</Sidebar>"));
}

async function run(publish: boolean) {
  const { getArticleBySlug, saveDraft, transitionRevision, publishRevision } = await import("../src/lib/wiki-public-db");
  const { sql } = await import("../src/lib/postgres");
  try {
    for (const image of images) {
      const article = await getArticleBySlug(image.slug, "alliance");
      assert.ok(article?.liveRevision?.status === "approved", `No approved alliance: ${image.slug}`);
      const live = article.liveRevision;
      const markdown = addImage(live.markdown, image);
      if (markdown === live.markdown) {
        console.log(`Skipped existing image: ${image.slug}`);
        continue;
      }
      if (!publish) {
        console.log(`Ready: ${image.slug} / ${image.creator} / ${image.license}`);
        continue;
      }
      const actor = "system-alliance-images";
      const draft = await saveDraft({
        articleId: article.id,
        proposedSlug: article.slug,
        contributorId: actor,
        contributorName: "aviation.wiki",
        editSummary: "Add a licensed alliance photograph with attribution",
        content: { ...live, markdown },
        parentRevisionId: live.id,
      });
      await sql`INSERT INTO revision_import_images
        (revision_id,file_name,image_url,thumbnail_url,creator,license,license_url,attribution,source_page,retrieved_at)
        VALUES (${draft.id},${image.fileName},${image.imageUrl},${image.thumbnailUrl},${image.creator},${image.license},${image.licenseUrl},${image.caption + ". Photo: " + image.creator},${image.sourcePage},${image.retrievedAt})`;
      await transitionRevision(draft.id, actor, "pending_review", { note: "Photograph, creator, and reuse license checked against the Wikimedia Commons file page." });
      await publishRevision(draft.id, actor, "Add the requested alliance picture; retain the existing article text and structured data.");
      console.log(`Published: /alliances/${image.slug}`);
    }
  } finally {
    await sql.end();
  }
}

if (process.argv.includes("--publish") || process.argv.includes("--check-live")) {
  run(process.argv.includes("--publish")).catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  console.log(`Validated ${images.length} alliance images, credits, and repeat-run behavior. Use --check-live to preview or --publish to apply.`);
}
