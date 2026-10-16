import "server-only";

import { randomUUID } from "node:crypto";
import type { Sql, TransactionSql } from "postgres";

import {
  airframeFieldsFromRevision,
  airframeSeedFields,
  airframeSeedMarkdown,
  type AirframeSeed,
} from "@/lib/airframe-content";
import {
  airframeRecordFromFields,
  airframeSlug,
  buildOperatorFleet,
  buildOperatorFleets,
  fleetHasTails,
  recordsForType,
  type AirframeRecord,
  type AirframeStatus,
  type OperatorFleetSummary,
  type OperatorSpan,
  type RegistrationSpan,
} from "@/lib/airframe-record";
import {
  airframeFixtureBySlug,
  airframeFixtureFleets,
  airframeFixtureRecords,
  airframeFixtureSeeds,
  airframeFixturesForOperator,
  airframeFixturesForType,
} from "@/lib/airframe-fixtures";
import { ensureSchema, sql } from "@/lib/postgres";
import type { EntityRelationship, SourceLink, StructuredField } from "@/lib/wiki-types";

type IndexRow = {
  article_id: string;
  registration: string;
  registration_slug: string;
  msn: string | null;
  aircraft_type: string;
  variant: string;
  status: AirframeStatus;
  delivery_on: Date | string | null;
  manufacture_year: number | null;
  fate: string | null;
  current_operator_name: string | null;
  current_operator_slug: string | null;
  type_slug: string | null;
  operator_history: OperatorSpan[] | string;
  registration_history: RegistrationSpan[] | string;
};

async function ready() {
  try {
    await ensureSchema();
  } catch (error) {
    if (!fixturesEnabled() && !unavailable(error)) throw error;
  }
}

function fixturesEnabled() {
  return process.env.AIRFRAME_FIXTURES === "true";
}

function unavailable(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  return ["42P01", "ECONNREFUSED", "ENOTFOUND", "EAI_AGAIN", "3D000", "28P01", "28000", "57P01"].includes(code);
}

function asDate(value: Date | string | null) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function asJson<T>(value: T[] | string): T[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapIndexRow(row: IndexRow): AirframeRecord {
  const deliveryDate = asDate(row.delivery_on);
  const operatorHistory = asJson<OperatorSpan>(row.operator_history);
  const registrationHistory = asJson<RegistrationSpan>(row.registration_history);
  const fields: StructuredField[] = [
    { key: "Registration", value: row.registration },
    { key: "Aircraft type", value: row.aircraft_type },
    { key: "Status", value: row.status },
    ...(row.msn ? [{ key: "Manufacturer serial number", value: row.msn }] : []),
    ...(row.variant ? [{ key: "Variant", value: row.variant }] : []),
    ...(deliveryDate ? [{ key: "Delivery date", value: deliveryDate }] : []),
    ...(row.manufacture_year ? [{ key: "Year of manufacture", value: String(row.manufacture_year) }] : []),
    ...(row.fate ? [{ key: "Fate", value: row.fate }] : []),
    ...(row.current_operator_name ? [{ key: "Current operator", value: row.current_operator_name }] : []),
    ...operatorHistory.map((span) => ({
      key: "Operator history",
      value: `${span.operator} | ${span.from ?? ""} | ${span.to ?? "present"}`,
    })),
    ...registrationHistory.map((span) => ({
      key: "Registration history",
      value: `${span.registration} | ${span.from ?? ""} | ${span.to ?? "present"}`,
    })),
  ];
  const record = airframeRecordFromFields({
    articleId: row.article_id,
    title: row.registration,
    slug: row.registration_slug,
    fields,
  });
  return { ...record, typeSlug: row.type_slug || record.typeSlug };
}

async function queryIndex(statement: string, params: unknown[] = []) {
  return (await sql.unsafe(statement, params as never[])) as unknown as IndexRow[];
}

const readableIndex = `
  SELECT i.article_id,i.registration,i.registration_slug,i.msn,i.aircraft_type,i.variant,i.status,
         i.delivery_on,i.manufacture_year,i.fate,i.current_operator_name,i.current_operator_slug,
         i.type_slug,i.operator_history,i.registration_history
  FROM airframe_index i
  JOIN articles a ON a.id = i.article_id
  WHERE a.archived_at IS NULL AND a.redirect_to_slug IS NULL
`;

export async function writeAirframeIndex(
  transaction: Sql | TransactionSql,
  record: AirframeRecord,
) {
  const now = new Date();
  await transaction`
    INSERT INTO airframe_index (
      article_id, registration, registration_slug, msn, msn_slug, aircraft_type, variant, status,
      delivery_on, manufacture_year, fate, current_operator_name, current_operator_slug, type_slug,
      operator_history, registration_history, updated_at
    ) VALUES (
      ${record.articleId}, ${record.registration}, ${record.slug}, ${record.msn},
      ${record.msn ? airframeSlug(record.msn) : null}, ${record.aircraftType}, ${record.variant},
      ${record.status}, ${record.deliveryDate}, ${record.manufactureYear}, ${record.fate},
      ${record.currentOperatorName}, ${record.currentOperatorSlug}, ${record.typeSlug},
      ${transaction.json(record.operatorHistory)}, ${transaction.json(record.registrationHistory)}, ${now}
    )
    ON CONFLICT (article_id) DO UPDATE SET
      registration = EXCLUDED.registration,
      registration_slug = EXCLUDED.registration_slug,
      msn = EXCLUDED.msn,
      msn_slug = EXCLUDED.msn_slug,
      aircraft_type = EXCLUDED.aircraft_type,
      variant = EXCLUDED.variant,
      status = EXCLUDED.status,
      delivery_on = EXCLUDED.delivery_on,
      manufacture_year = EXCLUDED.manufacture_year,
      fate = EXCLUDED.fate,
      current_operator_name = EXCLUDED.current_operator_name,
      current_operator_slug = EXCLUDED.current_operator_slug,
      type_slug = EXCLUDED.type_slug,
      operator_history = EXCLUDED.operator_history,
      registration_history = EXCLUDED.registration_history,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function syncPublishedAirframe(
  transaction: Sql | TransactionSql,
  articleId: string,
  revision: { title: string; contentType: string; fields: StructuredField[]; markdown: string; proposedSlug: string },
) {
  if (revision.contentType !== "airframe") return;
  const record = airframeRecordFromFields({
    articleId,
    title: revision.title,
    slug: revision.proposedSlug,
    fields: airframeFieldsFromRevision(revision.fields, revision.markdown),
  });
  await writeAirframeIndex(transaction, record);
}

async function typeHrefs() {
  const rows = (await sql`
    SELECT a.slug, a.title
    FROM articles a
    JOIN revisions r ON r.id = a.live_revision_id
    WHERE a.content_type = 'aircraft' AND r.status = 'approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL
  `) as unknown as Array<{ slug: string; title: string }>;
  return new Map(rows.flatMap((row) => [
    [airframeSlug(row.slug), `/aircraft/${row.slug}`] as const,
    [airframeSlug(row.title), `/aircraft/${row.slug}`] as const,
  ]));
}

async function operatorHrefs() {
  const rows = (await sql`
    SELECT a.slug, a.title
    FROM articles a
    JOIN revisions r ON r.id = a.live_revision_id
    WHERE a.content_type = 'airline' AND r.status = 'approved' AND a.archived_at IS NULL AND a.redirect_to_slug IS NULL
  `) as unknown as Array<{ slug: string; title: string }>;
  return rows.map((row) => ({
    slug: row.slug,
    name: row.title,
    href: `/commercial/${row.slug}`,
    aliases: [airframeSlug(row.slug), airframeSlug(row.title)],
  }));
}

export async function listAirframeRecords() {
  await ready();
  try {
    const rows = await queryIndex(`${readableIndex} ORDER BY i.registration`);
    if (!rows.length && fixturesEnabled()) return airframeFixtureRecords();
    return rows.map(mapIndexRow);
  } catch (error) {
    if (fixturesEnabled() || unavailable(error)) return fixturesEnabled() ? airframeFixtureRecords() : [];
    throw error;
  }
}

export async function loadAirframePage(slug: string): Promise<{
  redirectTo?: string;
  record: AirframeRecord;
  markdown: string;
  sources: SourceLink[];
  editHref?: string;
} | null> {
  await ready();
  const record = await findAirframeRecord(slug);
  if (!record) return null;
  if (record.slug !== airframeSlug(slug)) return { redirectTo: record.href, record, markdown: "", sources: [] };
  try {
    const [revision] = (await sql`
      SELECT r.markdown, r.sources_json
      FROM articles a
      JOIN revisions r ON r.id = a.live_revision_id
      WHERE a.id = ${record.articleId} AND a.content_type = 'airframe' AND r.status = 'approved'
    `) as unknown as Array<{ markdown: string; sources_json: SourceLink[] | string }>;
    if (revision) {
      const sources = Array.isArray(revision.sources_json)
        ? revision.sources_json
        : asJson<SourceLink>(revision.sources_json);
      return {
        record,
        markdown: String(revision.markdown),
        sources,
        editHref: `/editor?type=airframe&slug=${encodeURIComponent(record.slug)}`,
      };
    }
  } catch (error) {
    if (!fixturesEnabled() && !unavailable(error)) throw error;
  }
  const seed = airframeFixtureSeeds.find((item) => airframeSlug(item.registration) === record.slug);
  return {
    record,
    markdown: seed ? airframeSeedMarkdown(seed) : "",
    sources: seed?.sources ?? [],
    editHref: `/editor?type=airframe&slug=${encodeURIComponent(record.slug)}`,
  };
}

export async function findAirframeRecord(slug: string) {
  await ready();
  const normalized = airframeSlug(slug);
  try {
    const rows = await queryIndex(
      `${readableIndex} AND (
        i.registration_slug = $1
        OR i.msn_slug = $1
        OR lower(i.msn) = lower($1)
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(i.registration_history) item
          WHERE item->>'slug' = $1
        )
      ) LIMIT 1`,
      [normalized],
    );
    if (rows[0]) return mapIndexRow(rows[0]);
  } catch (error) {
    if (!fixturesEnabled() && !unavailable(error)) throw error;
  }
  return fixturesEnabled() ? airframeFixtureBySlug(normalized) : null;
}

export async function loadOperatorFleetSummary(slug: string, title: string): Promise<OperatorFleetSummary | null> {
  await ready();
  const aliases = [...new Set([airframeSlug(slug), airframeSlug(title)].filter(Boolean))];
  try {
    const rows = await queryIndex(
      `${readableIndex} AND (
        i.current_operator_slug = ANY($1::text[])
        OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(i.operator_history) item
          WHERE item->>'slug' = ANY($1::text[])
        )
      )`,
      [aliases],
    );
    if (!rows.length && fixturesEnabled()) return airframeFixturesForOperator(slug, title);
    const hrefs = await typeHrefs().catch(() => new Map<string, string>());
    const summary = buildOperatorFleet(
      rows.map(mapIndexRow),
      { slug: airframeSlug(slug), name: title, href: `/commercial/${airframeSlug(slug)}`, aliases },
      hrefs,
    );
    return fleetHasTails(summary) ? summary : null;
  } catch (error) {
    if (fixturesEnabled()) return airframeFixturesForOperator(slug, title);
    if (unavailable(error)) return null;
    throw error;
  }
}

export async function loadTypeAirframeRecords(slug: string, title: string) {
  await ready();
  const aliases = [...new Set([airframeSlug(slug), airframeSlug(title)].filter(Boolean))];
  try {
    const rows = await queryIndex(`${readableIndex} AND i.type_slug = ANY($1::text[]) ORDER BY i.registration`, [aliases]);
    if (!rows.length && fixturesEnabled()) return airframeFixturesForType(slug, title);
    return recordsForType(rows.map(mapIndexRow), { slug, title });
  } catch (error) {
    if (fixturesEnabled()) return airframeFixturesForType(slug, title);
    if (unavailable(error)) return [];
    throw error;
  }
}

export async function loadOperatorFleetSummaries() {
  await ready();
  try {
    const rows = await queryIndex(
      `${readableIndex} AND (i.current_operator_slug IS NOT NULL OR jsonb_array_length(i.operator_history) > 0) ORDER BY i.registration`,
    );
    if (!rows.length && fixturesEnabled()) return airframeFixtureFleets();
    const [operators, hrefs] = await Promise.all([operatorHrefs(), typeHrefs()]);
    const operatorList = operators.flatMap((operator) =>
      operator.aliases.map((alias) => ({ slug: alias, name: operator.name, href: operator.href })),
    );
    return buildOperatorFleets(rows.map(mapIndexRow), operatorList, hrefs);
  } catch (error) {
    if (fixturesEnabled()) return airframeFixtureFleets();
    if (unavailable(error)) return [];
    throw error;
  }
}

export type AirframeImportResult = "inserted" | "updated" | "unchanged" | "kept";

export async function upsertImportedAirframe(input: {
  provider: string;
  sourceIdentifier: string;
  contributorId: string;
  contributorName: string;
  seed: AirframeSeed;
  relationships?: EntityRelationship[];
  editSummary?: string;
}): Promise<AirframeImportResult> {
  const fields = airframeSeedFields(input.seed);
  const markdown = airframeSeedMarkdown(input.seed);
  const sources: SourceLink[] = input.seed.sources ?? [];
  const slug = airframeSlug(input.seed.registration);
  const fingerprint = JSON.stringify({ fields, markdown });
  await ready();
  return sql.begin(async (transaction) => {
    const [owned] = await transaction`
      SELECT article_id FROM article_external_identifiers
      WHERE provider = ${input.provider} AND source_identifier = ${input.sourceIdentifier}
    `;
    const [bySlug] = await transaction`
      SELECT id FROM articles WHERE content_type = 'airframe' AND slug = ${slug}
    `;
    const articleId = String(owned?.article_id || bySlug?.id || "");
    if (articleId && (!owned || String(owned.article_id) !== articleId)) return "kept";
    if (articleId) {
      const [live] = await transaction`
        SELECT r.id, r.contributor_id, r.fields_json, r.markdown
        FROM articles a JOIN revisions r ON r.id = a.live_revision_id
        WHERE a.id = ${articleId}
      `;
      if (!live) return "kept";
      if (String(live.contributor_id) !== input.contributorId) return "kept";
      const current = JSON.stringify({ fields: live.fields_json, markdown: String(live.markdown) });
      if (current === fingerprint) return "unchanged";
      const revisionId = randomUUID();
      const now = new Date();
      await transaction`
        INSERT INTO revisions (
          id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type,
          markdown, fields_json, sections_json, sources_json, relationships_json, proposed_slug,
          parent_revision_id, created_at, updated_at, submitted_at, reviewed_at, moderator_id, moderator_note
        ) VALUES (
          ${revisionId}, ${articleId}, 'approved', ${input.contributorId}, ${input.contributorName},
          ${input.editSummary ?? "Update imported airframe"}, ${input.seed.registration.toUpperCase()}, 'airframe',
          ${markdown}, ${transaction.json(fields)}, ${transaction.json([])}, ${transaction.json(sources)},
          ${transaction.json(input.relationships ?? [])}, ${slug}, ${String(live.id)}, ${now}, ${now}, ${now}, ${now},
          ${input.contributorId}, ${"Imported update"}
        )
      `;
      await transaction`UPDATE articles SET title = ${input.seed.registration.toUpperCase()}, live_revision_id = ${revisionId}, updated_at = ${now} WHERE id = ${articleId}`;
      await replaceRelationships(transaction, articleId, revisionId, input.relationships ?? []);
      await syncPublishedAirframe(transaction, articleId, {
        title: input.seed.registration.toUpperCase(),
        contentType: "airframe",
        fields,
        markdown,
        proposedSlug: slug,
      });
      return "updated";
    }
    const newArticleId = randomUUID();
    const revisionId = randomUUID();
    const now = new Date();
    await transaction`
      INSERT INTO articles (id, slug, title, content_type, live_revision_id, created_at, updated_at)
      VALUES (${newArticleId}, ${slug}, ${input.seed.registration.toUpperCase()}, 'airframe', NULL, ${now}, ${now})
    `;
    await transaction`
      INSERT INTO revisions (
        id, article_id, status, contributor_id, contributor_name, edit_summary, title, content_type,
        markdown, fields_json, sections_json, sources_json, relationships_json, proposed_slug,
        parent_revision_id, created_at, updated_at, submitted_at, reviewed_at, moderator_id, moderator_note
      ) VALUES (
        ${revisionId}, ${newArticleId}, 'approved', ${input.contributorId}, ${input.contributorName},
        ${input.editSummary ?? "Import airframe"}, ${input.seed.registration.toUpperCase()}, 'airframe',
        ${markdown}, ${transaction.json(fields)}, ${transaction.json([])}, ${transaction.json(sources)},
        ${transaction.json(input.relationships ?? [])}, ${slug}, NULL, ${now}, ${now}, ${now}, ${now},
        ${input.contributorId}, ${"Initial import"}
      )
    `;
    await transaction`UPDATE articles SET live_revision_id = ${revisionId}, updated_at = ${now} WHERE id = ${newArticleId}`;
    await transaction`
      INSERT INTO article_external_identifiers (provider, source_identifier, article_id, created_at)
      VALUES (${input.provider}, ${input.sourceIdentifier}, ${newArticleId}, ${now})
    `;
    await replaceRelationships(transaction, newArticleId, revisionId, input.relationships ?? []);
    await syncPublishedAirframe(transaction, newArticleId, {
      title: input.seed.registration.toUpperCase(),
      contentType: "airframe",
      fields,
      markdown,
      proposedSlug: slug,
    });
    return "inserted";
  });
}

async function replaceRelationships(
  transaction: Sql | TransactionSql,
  articleId: string,
  revisionId: string,
  relationships: EntityRelationship[],
) {
  await transaction`DELETE FROM article_relationships WHERE source_article_id = ${articleId}`;
  const now = new Date();
  for (const relationship of relationships) {
    await transaction`
      INSERT INTO article_relationships (source_article_id, target_article_id, relationship_type, approved_revision_id, created_at)
      VALUES (${articleId}, ${relationship.targetArticleId}, ${relationship.type}, ${revisionId}, ${now})
    `;
  }
}
