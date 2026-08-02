import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  FilePenLine,
  GitCompareArrows,
  History,
  MessageSquareWarning,
} from "lucide-react";

import { InformationSidebar } from "@/components/article-information-sidebar";
import { ArticleMarkdown } from "@/components/article-markdown";
import { ApprovedRelationships } from "@/components/entity-relationships";
import { ImportedRevisionData } from "@/components/imported-revision-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WatchArticleButton } from "@/components/watch-article-button";
import { getArticleHeadings, parseArticleMarkdown } from "@/lib/article-markdown";
import { citedSources, sourceTitle } from "@/lib/article-citations";
import { articleHistoryPath, articlePath, contentTypePaths } from "@/lib/article-routes";
import { articleDescription } from "@/lib/article-seo";
import { comparisonsForEntity } from "@/lib/comparison-content";
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site";
import type {
  ArticleRecord,
  ContentType,
  RevisionRecord,
  SourceLink,
} from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";

export function ArticleHeader({
  title,
  contentType,
  slug,
  articleId,
  watching,
  signedIn,
}: {
  title: string;
  contentType: ContentType;
  slug: string;
  articleId: string;
  watching: boolean;
  signedIn: boolean;
}) {
  const editorHref = `/editor?type=${contentType}&slug=${encodeURIComponent(slug)}`;
  return (
    <header className="border-b pb-6">
      <Badge variant="outline">{formatDisplayLabel(contentType)}</Badge>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
        {title}
      </h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={editorHref}
          className={`${buttonVariants({ size: "sm" })} min-h-10 px-3`}
        >
          <FilePenLine />
          Edit
        </Link>
        <Link
          href={articleHistoryPath(contentType, slug)}
          className={`${buttonVariants({ variant: "outline", size: "sm" })} min-h-10 px-3`}
        >
          <History />
          View history
        </Link>
        {signedIn && (
          <WatchArticleButton
            articleId={articleId}
            returnTo={articlePath(contentType, slug)}
            watching={watching}
          />
        )}
        <Link
          href={`${editorHref}&correction=1`}
          className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-10 px-3`}
        >
          <MessageSquareWarning />
          Suggest correction
        </Link>
        {contentType === "aircraft" && (
          <Link
            href={`/fleet/compare?aircraft=${encodeURIComponent(slug)}`}
            className={`${buttonVariants({ variant: "ghost", size: "sm" })} min-h-10 px-3`}
          >
            <GitCompareArrows />
            Compare
          </Link>
        )}
      </div>
    </header>
  );
}

export function ArticleMetadata({ revision }: { revision: RevisionRecord }) {
  const approvedAt = revision.reviewedAt || revision.updatedAt;
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <CalendarClock className="size-4" />
        Last approved{" "}
        {new Date(approvedAt).toLocaleDateString(undefined, {
          dateStyle: "long",
        })}
      </span>
      <span>Revision {revision.id.slice(0, 8)}</span>
    </div>
  );
}

export function SourceList({
  sources,
  citations,
}: {
  sources: SourceLink[];
  citations: ReturnType<typeof parseArticleMarkdown>["citations"];
}) {
  const cited = citedSources(citations, sources);
  return (
    <section id="sources" className="mt-12 scroll-mt-24 border-t pt-8">
      <h2 className="text-2xl font-bold">Sources</h2>
      {cited.length ? (
        <ol className="mt-4 space-y-3 pl-5 text-sm text-muted-foreground">
          {cited.map(({ citation, source }) => (
            <li
              key={citation.identifier}
              id={`source-${citation.number}`}
              value={citation.number}
              className="scroll-mt-24 list-decimal"
            >
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="article-link [overflow-wrap:anywhere]"
              >
                {sourceTitle(source)}
                <ExternalLink className="ml-1 inline size-3.5" />
              </a>
              {source.publisher && <span>. {source.publisher}</span>}
              {source.accessedAt && (
                <span>
                  . Accessed{" "}
                  {new Date(
                    `${source.accessedAt}T00:00:00Z`,
                  ).toLocaleDateString()}
                </span>
              )}
              {source.archiveUrl && (
                <span>
                  {" "}
                  ·{" "}
                  <a
                    href={source.archiveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="article-link"
                  >
                    Archived copy
                  </a>
                </span>
              )}
              {citation.occurrences > 1 && (
                <span className="ml-2 text-xs">
                  Cited {citation.occurrences} times
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          This revision does not contain inline citations.
        </p>
      )}
    </section>
  );
}

export function MissingArticleState({
  slug,
  contentType,
}: {
  slug: string;
  contentType: ContentType;
}) {
  const title = slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
  return (
    <main className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-5 py-20 text-center">
      <div>
        <Badge variant="outline">{formatDisplayLabel(contentType)}</Badge>
        <h1 className="mt-5 text-4xl font-bold">
          This article does not exist yet
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
          There is no approved revision for “{title}”. Drafts and submissions
          awaiting review are never shown publicly.
        </p>
        <Link
          href={`/editor?type=${contentType}&slug=${encodeURIComponent(slug)}`}
          className={`${buttonVariants()} mt-7`}
        >
          Create this article
        </Link>
      </div>
    </main>
  );
}

export function PublicArticle({
  article,
  revision,
  watching,
  signedIn,
}: {
  article: ArticleRecord;
  revision: RevisionRecord;
  watching: boolean;
  signedIn: boolean;
}) {
  const parsed = parseArticleMarkdown(revision.markdown);
  const headings = getArticleHeadings(parsed.root);
  const pathname = articlePath(revision.contentType, article.slug);
  const relatedComparisons = comparisonsForEntity(
    article.slug,
    revision.contentType,
  );
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${absoluteUrl(pathname)}#article`,
        headline: revision.title,
        description: articleDescription(revision),
        url: absoluteUrl(pathname),
        mainEntityOfPage: absoluteUrl(pathname),
        datePublished: revision.reviewedAt || revision.createdAt,
        dateModified: revision.updatedAt,
        author:
          revision.contributorId === "system"
            ? { "@id": `${SITE_URL}/#organization` }
            : {
                "@type": "Person",
                name: revision.contributorName,
              },
        publisher: { "@id": `${SITE_URL}/#organization` },
        citation: revision.sources.map((source) => source.url),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name:
              revision.contentType === "airline"
                ? "Commercial airlines"
                : formatDisplayLabel(contentTypePaths[revision.contentType]),
            item: absoluteUrl(`/${contentTypePaths[revision.contentType]}`),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: revision.title,
            item: absoluteUrl(pathname),
          },
        ],
      },
    ],
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto max-w-[1380px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-7 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          aviation.wiki
        </Link>
        <span> / </span>
        <Link href={`/${contentTypePaths[revision.contentType]}`} className="article-link">
          {revision.contentType === "airline"
            ? "Commercial airlines"
            : formatDisplayLabel(contentTypePaths[revision.contentType])}
        </Link>
        <span> / </span>
        <span>{revision.title}</span>
      </nav>
      <ArticleHeader
        title={revision.title}
        contentType={revision.contentType}
        slug={article.slug}
        articleId={article.id}
        watching={watching}
        signedIn={signedIn}
      />
      <div className="mt-5">
        <ArticleMetadata revision={revision} />
      </div>
      <div className={`mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] ${headings.length ? "xl:grid-cols-[190px_minmax(0,1fr)_320px]" : ""}`}>
        {headings.length > 0 && (
          <aside className="hidden xl:sticky xl:top-20 xl:block">
            <nav aria-label="On this page">
              <p className="text-sm font-semibold">On this page</p>
              <ul className="mt-3 space-y-2 border-l text-sm text-muted-foreground">
                {headings.map((heading) => (
                  <li key={heading.id} className={heading.depth === 3 ? "pl-6" : "pl-3"}>
                    <a href={`#${heading.id}`} className="block leading-5 hover:text-primary">
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        )}
        <div className="min-w-0">
          {parsed.errors.length ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              This approved revision cannot be rendered safely.
            </p>
          ) : (
            <ArticleMarkdown root={parsed.root} citations={parsed.citations} hideSidebar />
          )}
          {relatedComparisons.length > 0 && (
            <section className="mt-10 rounded-xl border bg-muted/30 p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="size-5 text-primary" />
                <h2 className="text-xl font-semibold">
                  Compare {revision.title}
                </h2>
              </div>
              <div className="mt-4 flex flex-col items-start gap-2">
                {relatedComparisons.map((comparison) => (
                  <Link
                    key={comparison.slug}
                    href={`/compare/${comparison.slug}`}
                    className="article-link font-medium"
                  >
                    {comparison.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
          <ApprovedRelationships article={article} />
          <ImportedRevisionData revisionId={revision.id} />
          <SourceList sources={revision.sources} citations={parsed.citations} />
        </div>
        <aside
          className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
          aria-label="Article information"
        >
          <InformationSidebar
            title={revision.title}
            contentType={revision.contentType}
            fields={parsed.sidebarFields ?? revision.fields}
            images={parsed.sidebarImages}
          />
        </aside>
      </div>
      </main>
    </>
  );
}
