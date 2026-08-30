import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArticleBlock } from "@/components/article-blocks";
import {
  ArticleChart,
  UnavailableArticleChart,
} from "@/components/article-chart";
import {
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
      <Image
        src={image.url}
        alt={alt}
        width={1200}
        height={800}
        sizes="(min-width: 1280px) 760px, (min-width: 1024px) 60vw, 100vw"
        unoptimized
        className="h-auto w-full"
      />
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
            className="font-medium text-primary underline-offset-4 hover:underline"
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
          <Image
            key={`${key}-${index}`}
            src={`https://flagcdn.com/w40/${flagCode}.png`}
            alt={`Flag of ${regionNames.of(flagCode.toUpperCase()) ?? flagCode.toUpperCase()}`}
            width={40}
            height={30}
            unoptimized
            className={`${compact ? "w-6" : "w-10"} mr-1 inline-block h-auto rounded-xs align-middle`}
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

function renderNode(node: MarkdownNode, key: string, definitions: Definitions, citations: CitationMap, citationSources: CitationSourceMap, headingIds: Map<MarkdownNode, string>, compact = false, articleLinks: ArticleMentionLink[] = []): ReactNode {
  const children = renderChildren(
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
      return <p key={key} className={compact ? "leading-normal" : "mb-4 leading-7 text-foreground/80"}>{children}</p>;
    }
    case "heading": {
      const Heading = `h${node.depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
      return <Heading key={key} id={headingIds.get(node)} className={cn(
        "mb-3 mt-8 scroll-mt-24 font-bold tracking-tight first:mt-0",
        node.depth === 1 && "text-3xl",
        node.depth === 2 && "text-2xl",
        node.depth === 3 && "text-xl",
        (node.depth ?? 0) >= 4 && "text-base",
      )}>{children}</Heading>;
    }
    case "strong": return <strong key={key} className="font-semibold text-foreground">{children}</strong>;
    case "emphasis": return <em key={key}>{children}</em>;
    case "delete": return <del key={key}>{children}</del>;
    case "inlineCode": return <code key={key} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]">{node.value}</code>;
    case "code": return <pre key={key} className="my-5 overflow-x-auto rounded-lg border bg-muted p-4 text-sm"><code>{node.value}</code></pre>;
    case "break": return <br key={key} />;
    case "thematicBreak": return <hr key={key} className="my-8" />;
    case "blockquote": return <blockquote key={key} className="my-5 border-l-4 border-primary/30 pl-4 italic text-muted-foreground">{children}</blockquote>;
    case "list": {
      const List = node.ordered ? "ol" : "ul";
      return <List key={key} start={node.ordered ? node.start ?? undefined : undefined} className={node.ordered ? "mb-4 list-decimal space-y-1 pl-6" : "mb-4 list-disc space-y-1 pl-6"}>{children}</List>;
    }
    case "listItem": return <li key={key} className="pl-1">{children}</li>;
    case "link": return <a key={key} href={node.url} className="font-medium text-primary underline-offset-4 hover:underline" rel={node.url?.startsWith("http") ? "noreferrer" : undefined}>{children}</a>;
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
        <sup key={key} className="group/citation relative ml-0.5 inline-block align-super text-[0.72em]">
          <a
            href={`#source-${citation.number}`}
            id={`citation-${occurrenceId}`}
            className="rounded-sm font-semibold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Citation ${citation.number}: ${sourceTitle(source)}`}
            aria-describedby={`citation-preview-${occurrenceId}`}
          >
            [{citation.number}]
          </a>
          <span
            id={`citation-preview-${occurrenceId}`}
            role="tooltip"
            className="pointer-events-none fixed inset-x-4 bottom-4 z-50 hidden rounded-lg border bg-popover p-3 text-left font-sans text-xs font-normal leading-5 text-popover-foreground shadow-xl group-focus-within/citation:block group-hover/citation:block sm:absolute sm:inset-x-auto sm:bottom-full sm:left-1/2 sm:mb-2 sm:w-72 sm:-translate-x-1/2"
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
    case "table": return <div key={key} className="my-5 overflow-x-auto rounded-lg border"><table className="w-full border-collapse text-left text-sm"><tbody>{children}</tbody></table></div>;
    case "tableRow": return <tr key={key} className="border-b last:border-0">{children}</tr>;
    case "tableCell": return <td key={key} className="border-r px-3 py-2.5 align-top last:border-0 first:font-medium">{children}</td>;
    case "mdxJsxFlowElement":
      if (node.name === "Chart")
        return node.chartDefinition ? (
          <ArticleChart key={key} definition={node.chartDefinition} />
        ) : (
          <UnavailableArticleChart key={key} />
        );
      return (
        <ArticleBlock
          key={key}
          name={node.name as Exclude<ArticleBlockName, "Chart">}
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
