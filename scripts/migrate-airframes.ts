import { AIRFRAME_MIGRATION_ID, AIRFRAME_SCHEMA_SQL } from "../src/lib/airframe-schema";
import { airframeFieldsFromRevision } from "../src/lib/airframe-content";
import { syncPublishedAirframe } from "../src/lib/airframe-db";
import { airframeMigrationDecision } from "../src/lib/airframe-record";
import { sql } from "../src/lib/postgres";
import type { StructuredField } from "../src/lib/wiki-types";

function databaseHost() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Refusing to guess a database.");
  return new URL(url).host;
}

function fieldsOf(value: unknown): StructuredField[] {
  return Array.isArray(value) ? value as StructuredField[] : [];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const migrateArticles = process.argv.includes("--migrate-articles");
  const host = databaseHost();
  console.log(`Airframe migration ${AIRFRAME_MIGRATION_ID}`);
  console.log(`Database host: ${host}`);
  console.log("This script is not part of the Vercel build. Review the host before applying.");

  const candidates = await sql<Array<{ id: string; slug: string; content_type: string; fields_json: unknown; markdown: string; title: string }>>`
    SELECT a.id, a.slug, a.content_type, a.title, r.fields_json, r.markdown
    FROM articles a
    JOIN revisions r ON r.id = a.live_revision_id
    WHERE a.content_type = 'aircraft' AND a.archived_at IS NULL
  `;
  const plan = candidates.flatMap((article) => {
    const fields = airframeFieldsFromRevision(fieldsOf(article.fields_json), String(article.markdown));
    const decision = airframeMigrationDecision({ slug: article.slug, contentType: article.content_type, fields });
    return decision === "skip" ? [] : [{ ...article, decision, fields }];
  });
  for (const article of plan) {
    console.log(`${article.decision === "migrate" ? "MOVE" : "REVIEW"} /aircraft/${article.slug} → /airframes/${article.slug} (${article.title})`);
  }
  if (!plan.length) console.log("No single-registration aircraft articles matched.");

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to update the schema.");
    console.log("Add --migrate-articles with --apply to move MOVE rows and keep /aircraft/<slug> redirecting.");
    return;
  }

  await sql.unsafe(AIRFRAME_SCHEMA_SQL);
  console.log("Schema updated. Article tables were not dropped.");

  if (!migrateArticles) {
    console.log("Article rows were left unchanged. Re-run with --apply --migrate-articles after reviewing MOVE lines.");
    return;
  }

  for (const article of plan.filter((item) => item.decision === "migrate")) {
    const [collision] = await sql`SELECT id FROM articles WHERE content_type = 'airframe' AND slug = ${article.slug} AND id <> ${article.id}`;
    if (collision) {
      console.log(`SKIP ${article.slug}: an airframe article already uses that registration.`);
      continue;
    }
    const now = new Date();
    await sql.begin(async (transaction) => {
      await transaction`
        INSERT INTO article_slug_redirects (content_type, old_slug, article_id, created_at)
        VALUES ('aircraft', ${article.slug}, ${article.id}, ${now})
        ON CONFLICT (content_type, old_slug) DO UPDATE SET article_id = EXCLUDED.article_id, created_at = EXCLUDED.created_at
        WHERE article_slug_redirects.article_id = EXCLUDED.article_id
      `;
      await transaction`UPDATE revisions SET content_type = 'airframe' WHERE article_id = ${article.id}`;
      await transaction`UPDATE articles SET content_type = 'airframe', updated_at = ${now} WHERE id = ${article.id}`;
      const [live] = await transaction<{ title: string; fields_json: unknown; markdown: string; proposed_slug: string }[]>`
        SELECT r.title, r.fields_json, r.markdown, r.proposed_slug
        FROM articles a JOIN revisions r ON r.id = a.live_revision_id
        WHERE a.id = ${article.id}
      `;
      if (live) {
        await syncPublishedAirframe(transaction, article.id, {
          title: String(live.title),
          contentType: "airframe",
          fields: fieldsOf(live.fields_json),
          markdown: String(live.markdown),
          proposedSlug: String(live.proposed_slug || article.slug),
        });
      }
    });
    console.log(`Moved ${article.slug}. /aircraft/${article.slug} now redirects to /airframes/${article.slug}.`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 5 }));
