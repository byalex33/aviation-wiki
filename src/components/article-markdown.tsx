import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleBlock } from "@/components/article-blocks";
import { SpottingLocationsView } from "@/components/spotting-map";
import {
  ArticleChart,
  UnavailableArticleChart,
} from "@/components/article-chart";
import {
  isSafeImageUrl,
  getArticleHeadings,
  getArticleImageShorthandMatches,
  getArticleMentionParts,
  getBlockAttributes,
  parseArticleImageShorthand,
  parseStructuredFieldMarkdown,
  resolveFlagCode,
  type ArticleBlockName,
  type ArticleImage,
  type ArticleMentionLink,
  type Citation,
  type MarkdownNode,
  type MarkdownRoot,
} from "@/lib/article-markdown";
import { sourceForCitation, sourceTitle } from "@/lib/article-citations";
import type { SourceLink } from "@/lib/wiki-types";
import { cn } from "@/lib/utils";

type Definitions = Map<string, { url: string; title?: string | null }>;

type CitationMap = Map<string, Citation>;
type CitationSourceMap = Map<string, SourceLink>;

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function ArticleImageDisplay({
  image,
  alt = "",
  flush = false,
}: {
  image: ArticleImage;
  alt?: string;
  flush?: boolean;
}) {
  if (!isSafeImageUrl(image.url)) return <p className="my-4 text-sm text-muted-foreground">Image unavailable: this host is not supported.</p>;
  const credit = image.credit
    ? parseStructuredFieldMarkdown(image.credit)
    : null;

  return (
    <figure
      className={cn(
        "my-5 block overflow-hidden rounded-xl border bg-muted/30",
        flush && "my-0 rounded-none border-x-0 border-t-0",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.url} alt={alt} width={1200} height={800} loading="lazy" decoding="async" className="h-auto w-full" />
      {image.credit && (
        <figcaption className="border-t px-3 py-2 text-[11px] leading-4 text-muted-foreground">
          {credit?.errors.length
            ? image.credit
            : credit && <ArticleMarkdown root={credit.root} compact />}
        </figcaption>
      )}
    </figure>
  );
}

function renderText(
  value: string,
  key: string,
  compact: boolean,
  articleLinks: ArticleMentionLink[],
) {
  const tokens = [
    ...[...value.matchAll(/f!\[[^\]]+\]/g)].map((match) => ({
      index: match.index ?? 0,
      value: match[0],
      kind: "flag" as const,
    })),
    ...getArticleImageShorthandMatches(value).map((match) => ({
      ...match,
      kind: "image" as const,
    })),
  ].sort((left, right) => left.index - right.index);
  const rendered: ReactNode[] = [];
  let offset = 0;
  const pushText = (text: string, textOffset: number) => {
    rendered.push(
      ...getArticleMentionParts(text, articleLinks).map((part, index) =>
        part.href ? (
          <Link
            key={`${key}-article-${textOffset}-${index}`}
            href={part.href}
            className={compact ? "font-medium text-primary underline-offset-4 hover:underline" : "wiki-a"}
          >
            {part.text}
          </Link>
        ) : (
          part.text
        ),
      ),
    );
  };

  for (const [index, token] of tokens.entries()) {
    if (token.index < offset) continue;
    if (token.index > offset)
      pushText(value.slice(offset, token.index), offset);

    if (token.kind === "flag") {
      const code = /^f!\[([^\]]+)\]$/.exec(token.value)?.[1];
      const flagCode = code ? resolveFlagCode(code) : null;
      rendered.push(
        flagCode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${key}-${index}`}
            src={`https://flagcdn.com/w40/${flagCode}.png`}
            alt={`Flag of ${regionNames.of(flagCode.toUpperCase()) ?? flagCode.toUpperCase()}`}
            width={40}
            height={30}
            loading="lazy"
            decoding="async"
            className={compact ? "mr-1 inline-block h-auto w-6 rounded-xs align-middle" : "wiki-flag"}
          />
        ) : token.value,
      );
    } else {
      const image = parseArticleImageShorthand(token.value);
      rendered.push(
        image
          ? <ArticleImageDisplay key={`${key}-${index}`} image={image} />
          : token.value,
      );
    }
    offset = token.index + token.value.length;
  }

  if (offset < value.length) pushText(value.slice(offset), offset);
  return rendered;
}

function citationHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderChildren(node: MarkdownNode, definitions: Definitions, citations: CitationMap, citationSources: CitationSourceMap, headingIds: Map<MarkdownNode, string>, compact: boolean, articleLinks: ArticleMentionLink[]): ReactNode {
  return node.children?.map((child, index) => renderNode(child, `${child.type}-${index}`, definitions, citations, citationSources, headingIds, compact, articleLinks));
}

// Literal class names so Tailwind generates the wiki-h* utilities.
const headingClasses = ["wiki-h wiki-h1", "wiki-h wiki-h2", "wiki-h wiki-h3", "wiki-h wiki-h4"];

function renderNode(node: MarkdownNode, key: string, definitions: Definitions, citations: CitationMap, citationSources: CitationSourceMap, headingIds: Map<MarkdownNode, string>, compact = false, articleLinks: ArticleMentionLink[] = []): ReactNode {
  const children = node.type === "table" ? null : renderChildren(
    node,
    definitions,
    citations,
    citationSources,
    headingIds,
    compact,
    node.type === "link" || node.type === "linkReference" ? [] : articleLinks,
  );
  switch (node.type) {
    case "text": return renderText(node.value ?? "", key, compact, articleLinks);
    case "paragraph": {
      const onlyChild = node.children?.length === 1 ? node.children[0] : null;
      if (onlyChild?.type === "image") return renderNode(onlyChild, key, definitions, citations, citationSources, headingIds, compact);
      if (onlyChild?.type === "imageReference") return renderNode(onlyChild, key, definitions, citations, citationSources, headingIds, compact);
      if (onlyChild?.type === "text") {
        const image = parseArticleImageShorthand(onlyChild.value ?? "");
        if (image) return <ArticleImageDisplay key={key} image={image} />;
      }
      return <p key={key} className={compact ? "leading-normal" : "wiki-p"}>{children}</p>;
    }
    case "heading": {
      const Heading = `h${node.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={key} id={headingIds.get(node)} className={compact ? cn(
        "mb-3 mt-8 scroll-mt-24 font-bold tracking-tight first:mt-0",
        node.depth === 1 && "text-3xl",
        node.depth === 2 && "text-2xl",
        node.depth === 3 && "text-xl",
        (node.depth ?? 0) >= 4 && "text-base",
      ) : headingClasses[Math.min(node.depth ?? 4, 4) - 1]}>{children}</Heading>;
    }
    case "strong": return <strong key={key} className={compact ? "font-semibold text-foreground" : "wiki-strong"}>{children}</strong>;
    case "emphasis": return <em key={key}>{children}</em>;
    case "delete": return <del key={key}>{children}</del>;
    case "inlineCode": return <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{node.value}</code>;
    case "code": return <pre key={key} className="my-5 overflow-x-auto rounded-lg border bg-muted p-4 text-sm"><code>{node.value}</code></pre>;
    case "break": return <br key={key} />;
    case "thematicBreak": return <hr key={key} className="my-8" />;
    case "blockquote": return <blockquote key={key} className="my-5 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">{children}</blockquote>;
    case "list": {
      const List = node.ordered ? "ol" : "ul";
      return <List key={key} start={node.ordered ? node.start ?? undefined : undefined} className={compact ? (node.ordered ? "mb-4 list-decimal space-y-1 pl-6" : "mb-4 list-disc space-y-1 pl-6") : node.ordered ? "wiki-ol" : "wiki-ul"}>{children}</List>;
    }
    case "listItem": return <li key={key} className={compact ? "pl-1" : "wiki-li"}>{children}</li>;
    case "link": return <a key={key} href={node.url} className={compact ? "font-medium text-primary underline-offset-4 hover:underline" : "wiki-a"} rel={node.url?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
    case "image": return <ArticleImageDisplay key={key} image={{ url: node.url ?? "", credit: node.title ?? null }} alt={node.alt ?? ""} />;
    case "linkReference": {
      const definition = definitions.get(node.identifier?.toLowerCase() ?? "");
      return definition ? <a key={key} href={definition.url} className="font-medium text-primary hover:underline">{children}</a> : children;
    }
    case "imageReference": {
      const definition = definitions.get(node.identifier?.toLowerCase() ?? "");
      return definition ? <ArticleImageDisplay key={key} image={{ url: definition.url, credit: definition.title ?? null }} alt={node.alt ?? ""} /> : null;
    }
    case "footnoteReference": {
      const citation = citations.get(node.identifier?.toLowerCase() ?? "");
      if (!citation) return null;
      const source = citationSources.get(citation.identifier) ?? {
        identifier: citation.identifier,
        url: citation.url,
      };
      const occurrenceId = `${citation.number}-${node.position?.start.offset ?? key}`;
      return (
        <sup key={key} className="wiki-cite">
          <a
            href={`#source-${citation.number}`}
            id={`citation-${occurrenceId}`}
            aria-label={`Citation ${citation.number}: ${sourceTitle(source)}`}
            aria-describedby={`citation-preview-${occurrenceId}`}
          >
            [{citation.number}]
          </a>
          <span
            id={`citation-preview-${occurrenceId}`}
            role="tooltip"
            className="wiki-cite-tip"
          >
            <strong className="block text-sm font-semibold leading-5">
              {sourceTitle(source)}
            </strong>
            <span className="mt-1 block text-muted-foreground">
              {[source.publisher, citationHost(source.url)]
                .filter(Boolean)
                .join(" · ")}
              {source.accessedAt ? ` · Accessed ${source.accessedAt}` : ""}
            </span>
            <span className="mt-1 block font-medium text-primary">
              Open source details
            </span>
          </span>
        </sup>
      );
    }
    case "footnoteDefinition": return null;
    case "table": {
      const [header, ...rows] = node.children ?? [];
      return <div key={key} className="wiki-table"><table>
        {header && <thead><tr>{header.children?.map((cell, index) => <th key={index} scope="col">{renderChildren(cell, definitions, citations, citationSources, headingIds, compact, articleLinks)}</th>)}</tr></thead>}
        <tbody>{rows.map((row, index) => renderNode(row, `row-${index}`, definitions, citations, citationSources, headingIds, compact, articleLinks))}</tbody>
      </table></div>;
    }
    case "tableRow": return <tr key={key}>{children}</tr>;
    case "tableCell": return <td key={key}>{children}</td>;
    case "mdxJsxFlowElement":
      if (node.name === "Chart")
        return node.chartDefinition ? (
          <ArticleChart key={key} definition={node.chartDefinition} />
        ) : (
          <UnavailableArticleChart key={key} />
        );
      if (node.name === "SpottingLocations")
        return node.spottingLocations ? (
          <SpottingLocationsView key={key} block={node.spottingLocations} />
        ) : null;
      return (
        <ArticleBlock
          key={key}
          name={node.name as Exclude<ArticleBlockName, "Chart" | "SpottingLocations">}
          attributes={getBlockAttributes(node)}
        >
          {children}
        </ArticleBlock>
      );
    case "definition": return null;
    default: return null;
  }
}

export function ArticleMarkdown({ root, citations = [], citationSources = [], compact = false, hideSidebar = false, articleLinks = [] }: { root: MarkdownRoot; citations?: Citation[]; citationSources?: SourceLink[]; compact?: boolean; hideSidebar?: boolean; articleLinks?: ArticleMentionLink[] }) {
  const definitions: Definitions = new Map();
  for (const node of root.children) {
    if (node.type === "definition" && node.identifier && node.url) {
      definitions.set(node.identifier.toLowerCase(), { url: node.url, title: node.title });
    }
  }

  const citationMap = new Map(citations.map((citation) => [citation.identifier, citation]));
  const citationSourceMap = new Map(
    citations.map((citation) => [
      citation.identifier,
      sourceForCitation(citation, citationSources),
    ]),
  );
  const headingIds = new Map(getArticleHeadings(root).map((heading) => [heading.node, heading.id]));
  const sidebarNodes = root.children.filter((node) => node.type === "mdxJsxFlowElement" && node.name === "Sidebar");
  const mainNodes = root.children.filter((node) => !sidebarNodes.includes(node));
  const showSidebar = !compact && !hideSidebar && sidebarNodes.length > 0;

  return (
    <div className={compact ? "" : showSidebar ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" : "mx-auto max-w-3xl"}>
      <article className="min-w-0">{mainNodes.map((node, index) => renderNode(node, `main-${index}`, definitions, citationMap, citationSourceMap, headingIds, compact, articleLinks))}</article>
      {showSidebar && <aside className="space-y-5 lg:sticky lg:top-20">{sidebarNodes.map((node, index) => renderNode(node, `sidebar-${index}`, definitions, citationMap, citationSourceMap, headingIds, false, articleLinks))}</aside>}
    </div>
  );
}
