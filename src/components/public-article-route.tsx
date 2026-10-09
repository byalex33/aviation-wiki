import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import {
  PublicArticle,
} from "@/components/public-article";
import { getAircraftArticleTitles } from "@/lib/article-markdown";
import {
  ComparisonPrompt,
  RevisionHistory,
} from "@/components/revision-history";
import { RevisionComparison } from "@/components/revision-comparison";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import {
  getApprovedRevision,
  getArticleBySlug,
  getSlugRedirect,
  listArticleHistory,
  normalizeSlug,
  getArticlePublicationControls,
  listApprovedEntityOptions,
} from "@/lib/wiki-public-db";
import type { ContentType } from "@/lib/wiki-types";
import { aviationDataEnabled } from "@/lib/aviation-data-flags";
import {
  listOperatorFleet,
  listProductionAirframes,
} from "@/lib/aviation-data-public";

export async function PublicArticleRoute({
  params,
  contentType,
}: {
  params: Promise<{ slug: string }>;
  contentType: ContentType;
}) {
  // Rendered once and cached for every reader (ISR), so nothing here may read
  // the request or depend on who is viewing; the Watch button loads its own state.
  const slug = normalizeSlug((await params).slug);
  if (!slug) notFound();
  const controls = await getArticlePublicationControls(contentType, slug);
  if (controls?.archived_at) notFound();
  if (controls?.redirect_to_slug)
    permanentRedirect(articlePath(contentType, controls.redirect_to_slug));
  const article = await getArticleBySlug(slug, contentType);
  if (!article) {
    const destination = await getSlugRedirect(contentType, slug);
    if (destination) permanentRedirect(articlePath(contentType, destination));
  }
  if (!article?.liveRevision || article.liveRevision.status !== "approved")
    notFound();
  const structuredData = !aviationDataEnabled
    ? undefined
    : contentType === "airline" && slug === "british-airways"
      ? { href: "/fleet/british-airways", label: "Fleet history", records: (await listOperatorFleet("british-airways")).length }
      : contentType === "aircraft" && ["airbus-a350", "airbus-a350-1000"].includes(slug)
        ? { href: "/production-lists/a350-1000", label: "A350-1000 production data", records: (await listProductionAirframes("A350-1041")).length }
        : undefined;
  const entities = await listApprovedEntityOptions();
  const articleLinks = entities
    .filter((entity) => entity.contentType === "aircraft")
    .flatMap((entity) =>
      getAircraftArticleTitles(entity.title).map((title) => ({
        title,
        href:
          entity.id === article.id
            ? null
            : articlePath(entity.contentType, entity.slug),
      })),
    );
  return (
    <PublicArticle
      article={article}
      revision={article.liveRevision}
      articleLinks={articleLinks}
      availableArticlePaths={entities.map((entity) => articlePath(entity.contentType, entity.slug))}
      structuredData={structuredData}
    />
  );
}

export async function PublicArticleHistoryRoute({
  params,
  searchParams,
  contentType,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
  contentType: ContentType;
}) {
  const slug = normalizeSlug((await params).slug);
  const controls = await getArticlePublicationControls(contentType, slug);
  if (controls?.archived_at) notFound();
  if (controls?.redirect_to_slug)
    permanentRedirect(
      articleHistoryPath(contentType, controls.redirect_to_slug),
    );
  const article = await getArticleBySlug(slug, contentType);
  if (!article) {
    const destination = await getSlugRedirect(contentType, slug);
    if (destination)
      permanentRedirect(articleHistoryPath(contentType, destination));
  }
  if (!article?.liveRevision || article.liveRevision.status !== "approved")
    notFound();
  const history = await listArticleHistory(article.id);
  const query = await searchParams;
  const from = query.from ? await getApprovedRevision(article.id, query.from) : null;
  const to = query.to ? await getApprovedRevision(article.id, query.to) : null;
  const pathname = articleHistoryPath(contentType, slug);
  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="text-sm text-muted-foreground">
        <Link href={articlePath(contentType, slug)} className="article-link">
          {article.title}
        </Link>
        <span> / History</span>
      </nav>
      <h1 className="mt-5 text-4xl font-bold">Revision history</h1>
      <p className="mt-3 text-muted-foreground">
        Only approved versions are public. Select any two versions to review
        their structured fields and Markdown changes.
      </p>
      <div className="mt-8">
        <RevisionHistory
          revisions={history}
          pathname={pathname}
          selectedFrom={from?.id}
          selectedTo={to?.id}
        />
      </div>
      <section className="mt-12">
        <h2 className="mb-5 text-2xl font-bold">Compare approved revisions</h2>
        {from && to ? (
          <RevisionComparison current={from} proposed={to} />
        ) : (
          <ComparisonPrompt />
        )}
      </section>
    </main>
  );
}
