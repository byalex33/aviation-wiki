import { randomUUID } from "node:crypto";

import { airframeSeedMarkdown, type AirframeSeed } from "../src/lib/airframe-content";
import { upsertImportedAirframe } from "../src/lib/airframe-db";
import { airframeFixtureSeeds } from "../src/lib/airframe-fixtures";
import { airframeSlug } from "../src/lib/airframe-record";
import { ensureSchema, sql } from "../src/lib/postgres";
import type { ContentType, EntityRelationship } from "../src/lib/wiki-types";

function databaseHost() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  const host = new URL(url).host;
  if (/aiven|vercel|aviation\.wiki/i.test(host)) {
    throw new Error(`Refusing to seed fixtures into ${host}. Point DATABASE_URL at a local database.`);
  }
  return host;
}

async function ensureStub(slug: string, title: string, contentType: ContentType) {
  const [existing] = await sql<{ id: string }[]>`SELECT id FROM articles WHERE content_type = ${contentType} AND slug = ${slug}`;
  if (existing) return existing.id;
  const articleId = randomUUID();
  const revisionId = randomUUID();
  const now = new Date();
  const markdown = `${title} is a reference article used by airframe fixture data.\n\n<Sidebar>\nName: ${title}\n</Sidebar>\n`;
  await sql.begin(async (transaction) => {
    await transaction`
      INSERT INTO articles (id, slug, title, content_type, live_revision_id, created_at, updated_at)
      VALUES (${articleId}, ${slug}, ${title}, ${contentType}, NULL, ${now}, ${now})
    `;
    await transaction`
      INSERT INTO revisions (
        id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type,
        markdown, fields_json, sections_json, sources_json, relationships_json, proposed_slug,
        parent_revision_id, created_at, updated_at, submitted_at, reviewed_at, moderator_id, moderator_note
      ) VALUES (
        ${revisionId}, ${articleId}, 'approved', 'airframe-fixtures', 'Airframe fixtures', 'Seed reference article',
        ${title}, ${contentType}, ${markdown}, ${transaction.json([{ key: "Name", value: title }])},
        ${transaction.json([])}, ${transaction.json([])}, ${transaction.json([])}, ${slug}, NULL,
        ${now}, ${now}, ${now}, ${now}, 'airframe-fixtures', 'Fixture seed'
      )
    `;
    await transaction`UPDATE articles SET live_revision_id = ${revisionId} WHERE id = ${articleId}`;
  });
  return articleId;
}

async function main() {
  if (!process.argv.includes("--apply")) {
    console.log(`Dry run. ${airframeFixtureSeeds.length} fixture airframes would be inserted. Re-run with --apply against a local DATABASE_URL.`);
    return;
  }
  console.log(`Seeding airframe fixtures into ${databaseHost()}`);
  await ensureSchema();
  const airlines = new Map<string, string>();
  const types = new Map<string, string>();
  for (const seed of airframeFixtureSeeds) {
    const names = [seed.currentOperator, ...(seed.operatorHistory ?? []).map((span) => span.split("|")[0]?.trim())].filter((name): name is string => !!name);
    for (const name of names) {
      const slug = airframeSlug(name);
      if (!airlines.has(slug)) airlines.set(slug, await ensureStub(slug, name, "airline"));
    }
    const typeSlug = airframeSlug(seed.aircraftType);
    if (!types.has(typeSlug)) types.set(typeSlug, await ensureStub(typeSlug, seed.aircraftType, "aircraft"));
  }
  const counts = { inserted: 0, updated: 0, unchanged: 0, kept: 0 };
  for (const seed of airframeFixtureSeeds) {
    const relationships: EntityRelationship[] = [];
    const typeId = types.get(airframeSlug(seed.aircraftType));
    if (typeId) relationships.push({ type: "instance_of", targetArticleId: typeId, citationIdentifiers: [] });
    if (seed.currentOperator) {
      const airlineId = airlines.get(airframeSlug(seed.currentOperator));
      if (airlineId) relationships.push({ type: "operated_by", targetArticleId: airlineId, citationIdentifiers: [] });
    }
    const result = await upsertImportedAirframe({
      provider: "airframe-fixtures",
      sourceIdentifier: airframeSlug(seed.registration),
      contributorId: "airframe-fixtures",
      contributorName: "Airframe fixtures",
      seed: seed satisfies AirframeSeed,
      relationships,
      editSummary: "Seed airframe fixture",
    });
    counts[result] += 1;
    if (seed.registration === "G-BOAC" || seed.registration === "N747NA") {
      await sql`
        INSERT INTO article_slug_redirects (content_type, old_slug, article_id, created_at)
        SELECT 'aircraft', ${airframeSlug(seed.registration)}, article_id, NOW()
        FROM article_external_identifiers
        WHERE provider = 'airframe-fixtures' AND source_identifier = ${airframeSlug(seed.registration)}
        ON CONFLICT (content_type, old_slug) DO NOTHING
      `;
    }
  }
  console.log(counts);
  console.log("Fixture markdown check:", airframeFixtureSeeds.every((seed) => airframeSeedMarkdown(seed).includes("Sidebar")));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => sql.end({ timeout: 5 }));
