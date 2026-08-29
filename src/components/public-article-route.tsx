import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import {
  MissingArticleState,
  PublicArticle,
} from "@/components/public-article";
import {
  ComparisonPrompt,
  RevisionHistory,
} from "@/components/revision-history";
import { RevisionComparison } from "@/components/revision-comparison";
import { articleHistoryPath, articlePath } from "@/lib/article-routes";
import {
  getApprovedRevision,
  getArticleBySlug,
  getPublicArticleView,
  getSlugRedirect,
  listArticleHistory,
  normalizeSlug,
  getArticlePublicationControls,
} from "@/lib/wiki-public-db";
import type { ContentType } from "@/lib/wiki-types";

export async function PublicArticleRoute({
  params,
  contentType,
}: {
  params: Promise<{ slug: string }>;
  contentType: ContentType;
}) {
  // No auth() here: the article shell is identical for every reader, so this
  // render path stays static/ISR-eligible. Per-user state (the watch button)
  // resolves client-side. See issue #5.
  const view = await getPublicArticleView(contentType, (await params).slug);
  switch (view.kind) {
    case "not-found":
      return notFound();
    case "redirect":
      return permanentRedirect(view.to);
    case "missing":
      return <MissingArticleState slug={view.slug} contentType={contentType} />;
    case "ok":
      return (
        <PublicArticle
          article={view.article}
          revision={view.revision}
          articleLinks={view.articleLinks}
        />
      );
  }
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
