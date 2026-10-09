import { canonicalizeArticleLinks } from "@/lib/article-link-policy";
import Link from "next/link";
import { Menu } from "@base-ui/react/menu";
import {
  BadgeCheck,
  ExternalLink,
  FilePenLine,
  GitCompareArrows,
  History,
  MessageSquareWarning,
  MoreHorizontal,
  Database,
} from "lucide-react";

import { ArticleTocDesktop, ArticleTocMobile, type TocHeading } from "@/components/article-toc";
import { InformationSidebar } from "@/components/article-information-sidebar";
import { ArticleMarkdown } from "@/components/article-markdown";
import { ApprovedRelationships } from "@/components/entity-relationships";
import { ImportedRevisionData } from "@/components/imported-revision-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WatchArticleButton } from "@/components/watch-article-button";
import {
  getArticleHeadings,
  getArticleLeadText,
  parseArticleMarkdown,
  type ArticleMentionLink,
} from "@/lib/article-markdown";
import { citedSources, sourceTitle } from "@/lib/article-citations";
import { articleHistoryPath, articlePath, contentTypePaths } from "@/lib/article-routes";
import { comparisonsForEntity } from "@/lib/comparison-content";
import type {
  ArticleRecord,
  ContentType,
  RevisionRecord,
} from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";
import {
  articleDescription,
  articleImageDetails,
  jsonLd,
  siteUrl,
} from "@/lib/seo";

const menuItemClass =
  "rounded-md text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground";
const menuLinkClass = "flex items-center gap-2.5 px-2.5 py-2";

function estimateReadingMinutes(markdown: string) {
  const words = markdown
    .replace(/<[^>]+>/g, " ")
    .replace(/\[\^[^\]]+\]/g, " ")
    .replace(/[#*_>`~[\]()]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function ArticleHeader({
  title,
  description,
  contentType,
  typeLabel,
  slug,
  articleId,
  reviewedAt,
  citedSourcesCount,
  readingMinutes,
  contributorName,
}: {
  title: string;
  description?: string;
  contentType: ContentType;
  typeLabel?: string;
  slug: string;
  articleId: string;
  reviewedAt: string;
  citedSourcesCount: number;
  readingMinutes: number;
  contributorName?: string;
}) {
  const editorHref = `/editor?type=${contentType}&slug=${encodeURIComponent(slug)}`;
  return (
    <header id="top">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-primary/15 bg-primary/10 text-primary">
          {formatDisplayLabel(contentType)}
        </Badge>
        {typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
      </div>
      <h1 className="mt-3.5 text-4xl font-bold leading-[1.03] tracking-[-0.045em] text-balance sm:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">
          {description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <BadgeCheck className="size-3.5 text-emerald-600" />
          Reviewed{" "}
          {new Date(reviewedAt).toLocaleDateString(undefined, { dateStyle: "long" })}
        </span>
        {citedSourcesCount > 0 && (
          <a href="#sources" className="underline underline-offset-[3px] hover:text-primary">
            {citedSourcesCount} {citedSourcesCount === 1 ? "source" : "sources"}
          </a>
        )}
        <span>{readingMinutes} min read</span>
        {contributorName && (
          <span>
            Last edited by <span className="font-medium text-foreground">{contributorName}</span>
          </span>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link href={editorHref} className={`${buttonVariants({ size: "sm" })} min-h-10 px-3.5`}>
          <FilePenLine />
          Edit
        </Link>
        <WatchArticleButton articleId={articleId} />
        <Menu.Root>
          <Menu.Trigger
            aria-label="More actions"
            className={`${buttonVariants({ variant: "outline", size: "icon" })} size-10`}
          >
            <MoreHorizontal />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-[100] outline-none">
              <Menu.Popup className="beui-dropdown w-56 border bg-popover p-1.5 text-popover-foreground outline-none">
                <Menu.Item className={menuItemClass}>
                  <Link href={articleHistoryPath(contentType, slug)} className={menuLinkClass}>
                    <History className="size-4 text-muted-foreground" />
                    View history
                  </Link>
                </Menu.Item>
                <Menu.Item className={menuItemClass}>
                  <Link href={`${editorHref}&correction=1`} className={menuLinkClass}>
                    <MessageSquareWarning className="size-4 text-muted-foreground" />
                    Suggest correction
                  </Link>
                </Menu.Item>
                {contentType === "aircraft" && (
                  <Menu.Item className={menuItemClass}>
                    <Link href={`/fleet/compare?aircraft=${encodeURIComponent(slug)}`} className={menuLinkClass}>
                      <GitCompareArrows className="size-4 text-muted-foreground" />
                      Compare aircraft
                    </Link>
                  </Menu.Item>
                )}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
    </header>
  );
}

export function SourceList({ cited }: { cited: ReturnType<typeof citedSources> }) {
  return (
    <section id="sources" className="mt-12 scroll-mt-24 border-t border-foreground/15 pt-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-bold tracking-[-0.03em]">Sources</h2>
        {cited.length > 0 && (
          <span className="text-[13px] text-muted-foreground">
            {cited.length} cited
          </span>
        )}
      </div>
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
  articleLinks,
  availableArticlePaths,
  structuredData,
}: {
  article: ArticleRecord;
  revision: RevisionRecord;
  articleLinks: ArticleMentionLink[];
  availableArticlePaths?: string[];
  structuredData?: { href: string; label: string; records: number };
}) {
  const parsed = parseArticleMarkdown(revision.markdown);
  if (availableArticlePaths) parsed.root = canonicalizeArticleLinks(parsed.root, availableArticlePaths);
  parsed.root = { ...parsed.root, children: parsed.root.children.filter((node) => !(node.type === "heading" && node.depth === 1 && node.children?.map((child) => child.value ?? "").join("").trim().toLowerCase() === revision.title.trim().toLowerCase())) };
  const headings = getArticleHeadings(parsed.root);
  const tocHeadings: TocHeading[] = headings.map(({ id, text, depth }) => ({ id, text, depth }));
  const url = new URL(articlePath(revision.contentType, article.slug), siteUrl);
  const image = articleImageDetails(revision.markdown);
  const imageUrl = image ? new URL(image.url, siteUrl).href : undefined;
  const relatedComparisons = comparisonsForEntity(
    article.slug,
    revision.contentType,
  );
  const historicalFields = revision.fields.filter((field) =>
    /date|year|service|retir|operator|production|first flight|deliver/i.test(
      field.key,
    ),
  );
  const typeField = revision.fields.find((field) =>
    /^(role|type|category|classification)$/i.test(field.key.trim()),
  );
  const approvedAt = revision.reviewedAt || revision.updatedAt;
  const readingMinutes = estimateReadingMinutes(revision.markdown);
  const cited = citedSources(parsed.citations, revision.sources);
  const rawDescription = getArticleLeadText(parsed.root);
  const description = rawDescription && rawDescription.length >= 220
    ? `${rawDescription.slice(0, 220).replace(/\s+\S*$/, "")}…`
    : rawDescription;
  const editorHref = `/editor?type=${revision.contentType}&slug=${encodeURIComponent(article.slug)}`;
  const jsonLdGraph = [
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: revision.title,
      description: articleDescription(revision.markdown),
      url,
      mainEntityOfPage: url,
      datePublished: article.createdAt,
      dateModified: approvedAt,
      publisher: { "@id": `${siteUrl}#organization` },
      ...(imageUrl
        ? {
            image: {
              "@type": "ImageObject",
              url: imageUrl,
              contentUrl: imageUrl,
              caption: revision.title,
              representativeOfPage: true,
              ...(image?.credit ? { creditText: image.credit } : {}),
            },
          }
        : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "aviation.wiki", item: siteUrl },
        {
          "@type": "ListItem",
          position: 2,
          name:
            revision.contentType === "airline"
              ? "Commercial airlines"
              : formatDisplayLabel(contentTypePaths[revision.contentType]),
          item: new URL(`/${contentTypePaths[revision.contentType]}`, siteUrl),
        },
        { "@type": "ListItem", position: 3, name: revision.title, item: url },
      ],
    },
    ...(historicalFields.length >= 4
      ? [
          {
            "@type": "Dataset",
            name: `${revision.title} historical data`,
            description: `Structured historical data published in the ${revision.title} article.`,
            url,
            isPartOf: { "@id": `${url}#article` },
            creator: { "@id": `${siteUrl}#organization` },
            variableMeasured: historicalFields.map((field) => field.key),
          },
        ]
      : []),
  ];
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": jsonLdGraph,
          }),
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
        description={description || undefined}
        contentType={revision.contentType}
        typeLabel={typeField?.value}
        slug={article.slug}
        articleId={article.id}
        reviewedAt={approvedAt}
        citedSourcesCount={cited.length}
        readingMinutes={readingMinutes}
        contributorName={revision.contributorName || undefined}
      />
      {headings.length > 0 && (
        <div className="mt-7 xl:hidden">
          <ArticleTocMobile headings={tocHeadings} />
        </div>
      )}
      <div className={`mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px] ${headings.length ? "xl:grid-cols-[190px_minmax(0,1fr)_320px]" : ""}`}>
        {headings.length > 0 && (
          <aside className="hidden xl:sticky xl:top-24 xl:block">
            <ArticleTocDesktop headings={tocHeadings} />
          </aside>
        )}
        <div className="min-w-0">
          {structuredData && (
            <Link
              href={structuredData.href}
              className="mb-8 flex items-center gap-4 rounded-2xl border bg-card p-4 transition-colors hover:border-foreground/20"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10">
                <Database className="size-[18px] text-primary" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{structuredData.label}</span>
                <span className="block text-[13px] text-muted-foreground">
                  {structuredData.records} individual airframe records with dates and provenance
                </span>
              </span>
              <span className="whitespace-nowrap text-sm font-semibold">Explore →</span>
            </Link>
          )}
          {parsed.errors.length ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              This approved revision cannot be rendered safely.
            </p>
          ) : (
            <ArticleMarkdown root={parsed.root} citations={parsed.citations} citationSources={revision.sources} hideSidebar articleLinks={articleLinks} />
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
          <SourceList cited={cited} />

          <section className="mt-10 flex flex-wrap items-center gap-5 rounded-2xl border bg-card p-6">
            <div className="min-w-[240px] flex-1">
              <h2 className="text-lg font-bold tracking-[-0.03em]">
                Spot something missing or out of date?
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Every change is reviewed by a moderator before it goes live.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={editorHref} className={`${buttonVariants({ size: "sm" })} min-h-10 px-3.5`}>
                Edit this article
              </Link>
              <Link
                href={`${editorHref}&correction=1`}
                className={`${buttonVariants({ variant: "outline", size: "sm" })} min-h-10 px-3.5`}
              >
                Suggest a correction
              </Link>
            </div>
            <p className="basis-full border-t pt-3 text-xs text-muted-foreground">
              Last approved{" "}
              {new Date(approvedAt).toLocaleDateString(undefined, { dateStyle: "long" })} · Revision{" "}
              {revision.id.slice(0, 8)} ·{" "}
              <Link href={articleHistoryPath(revision.contentType, article.slug)} className="article-link">
                View history
              </Link>
            </p>
          </section>
        </div>
        <aside
          className="space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
          aria-label="Article information"
        >
          <InformationSidebar
            title={revision.title}
            contentType={revision.contentType}
            fields={parsed.sidebarFields ?? revision.fields}
            images={parsed.sidebarImages}
            articleLinks={articleLinks}
          />
        </aside>
      </div>
      </main>
    </>
  );
}
