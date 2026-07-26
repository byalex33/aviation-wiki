import Link from "next/link";
import {
  CalendarClock,
  ExternalLink,
  FilePenLine,
  History,
  MessageSquareWarning,
} from "lucide-react";

import { ArticleMarkdown } from "@/components/article-markdown";
import { ApprovedRelationships } from "@/components/entity-relationships";
import { ImportedRevisionData } from "@/components/imported-revision-data";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WatchArticleButton } from "@/components/watch-article-button";
import { getArticleHeadings, parseArticleMarkdown, parseStructuredFieldMarkdown } from "@/lib/article-markdown";
import { citedSources, sourceTitle } from "@/lib/article-citations";
import { articleHistoryPath, articlePath, contentTypePaths } from "@/lib/article-routes";
import type {
  ArticleRecord,
  ContentType,
  RevisionRecord,
  SourceLink,
  StructuredField,
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
        <Link href={editorHref} className={buttonVariants({ size: "sm" })}>
          <FilePenLine />
          Edit
        </Link>
        <Link
          href={articleHistoryPath(contentType, slug)}
          className={buttonVariants({ variant: "outline", size: "sm" })}
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
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <MessageSquareWarning />
          Suggest correction
        </Link>
      </div>
    </header>
  );
}

export function InformationSidebar({
  title,
  contentType,
  fields,
}: {
  title: string;
  contentType: ContentType;
  fields: StructuredField[];
}) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-md">
      <CardHeader className="border-b bg-primary/5 py-5">
        <CardTitle>{title}</CardTitle>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          {formatDisplayLabel(contentType)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="divide-y">
          {fields.length ? (
            fields.map((field, index) => {
              const parsed = parseStructuredFieldMarkdown(field.value);
              return (
                <div
                  key={`${field.key}-${index}`}
                  className="grid grid-cols-[42%_1fr] gap-3 px-5 py-3 text-sm"
                >
                  <dt className="min-w-0 break-words font-medium text-muted-foreground">
                    {field.key}
                  </dt>
                  <dd className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {parsed.errors.length ? field.value : <ArticleMarkdown root={parsed.root} compact />}
                  </dd>
                </div>
              );
            })
          ) : (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No structured information has been added.
            </p>
          )}
        </dl>
      </CardContent>
    </Card>
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
  return (
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
          <ApprovedRelationships article={article} />
          <ImportedRevisionData revisionId={revision.id} />
          <SourceList sources={revision.sources} citations={parsed.citations} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-20">
          <InformationSidebar
            title={revision.title}
            contentType={revision.contentType}
            fields={revision.fields}
          />
        </aside>
      </div>
    </main>
  );
}
