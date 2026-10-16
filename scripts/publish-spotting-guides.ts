import { parseArticleMarkdown } from "../src/lib/article-markdown";
import { spottingGuideIssues } from "../src/lib/spotting-guide";
import {
  spottingGuideSeedContent,
  spottingGuideSeeds,
  type SpottingGuideSeed,
} from "../src/data/spotting-guide-seeds";

function checkSeeds() {
  for (const seed of spottingGuideSeeds) {
    const content = spottingGuideSeedContent(seed, {
      title: seed.airportTitle,
      slug: seed.preferredSlugs[0],
    });
    const parsed = parseArticleMarkdown(content.markdown);
    if (parsed.errors.length) {
      console.error(seed.id, parsed.errors);
      return false;
    }
    const issues = spottingGuideIssues(
      {
        title: content.title,
        markdown: content.markdown,
        fields: content.fields,
        citationCount: parsed.citations.length,
      },
      parsed,
    );
    if (issues.length) {
      console.error(seed.id, issues);
      return false;
    }
  }
  return true;
}

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname;
  } catch {
    return "";
  }
}

function matchAirport(
  airports: Array<{ slug: string; title: string }>,
  seed: SpottingGuideSeed,
) {
  const bySlug = airports.find((airport) => seed.preferredSlugs.includes(airport.slug));
  if (bySlug) return bySlug;
  const byTitle = airports.filter((airport) => seed.titlePattern.test(airport.title));
  return byTitle.length === 1 ? byTitle[0] : null;
}

async function publish() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Refusing to publish placeholder spotting guides.");
    process.exitCode = 1;
    return;
  }
  const host = databaseHost();
  if (/aiven/i.test(host) && !process.argv.includes("--allow-production")) {
    console.error(`Refusing to write placeholder spotting guides to ${host || "that database"}. Pass --allow-production only if it should receive them.`);
    process.exitCode = 1;
    return;
  }

  const { sql } = await import("../src/lib/postgres");
  const {
    createOrGetArticle,
    getArticleBySlug,
    publishRevision,
    saveDraft,
    transitionRevision,
  } = await import("../src/lib/wiki-public-db");
  const published: string[] = [];
  const skipped: string[] = [];
  try {
    const airports = await sql<Array<{ slug: string; title: string }>>`
      SELECT a.slug, r.title
      FROM articles a
      JOIN revisions r ON r.id = a.live_revision_id
      WHERE a.content_type = 'airport'
        AND r.status = 'approved'
        AND a.archived_at IS NULL
        AND a.redirect_to_slug IS NULL
    `;
    for (const seed of spottingGuideSeeds) {
      const airport = matchAirport(airports, seed);
      if (!airport) {
        skipped.push(`${seed.airportTitle}: no single approved airport matched`);
        continue;
      }
      const content = spottingGuideSeedContent(seed, airport);
      const existing = await getArticleBySlug(airport.slug, "spotting_guide");
      if (existing?.liveRevision?.markdown === content.markdown && existing.liveRevision.title === content.title) {
        skipped.push(`${airport.slug}: already published`);
        continue;
      }
      const article = existing ?? await createOrGetArticle(airport.slug, content.title, "spotting_guide");
      const draft = await saveDraft({
        articleId: article.id,
        proposedSlug: airport.slug,
        contributorId: "system-spotting-guides",
        contributorName: "aviation.wiki",
        editSummary: "Seeded a placeholder spotting guide. Not field-verified.",
        content,
        parentRevisionId: article.liveRevisionId,
      });
      await transitionRevision(draft.id, "system-spotting-guides", "pending_review", {
        note: "Placeholder spotting guide for review. It is not a field-verified guide.",
      });
      await publishRevision(
        draft.id,
        "system-spotting-guides",
        "Approved placeholder spotting guide. Locations are not verified spotting spots.",
      );
      published.push(airport.slug);
    }
    console.log(JSON.stringify({ published, skipped }, null, 2));
  } finally {
    await sql.end();
  }
}

if (!checkSeeds()) process.exitCode = 1;
else if (process.argv.includes("--publish")) {
  publish().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
} else {
  console.log(`Spotting guide seed check passed (${spottingGuideSeeds.length} placeholder guides).`);
}
