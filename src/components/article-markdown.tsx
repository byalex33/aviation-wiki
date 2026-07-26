import Image from "next/image";
import type { ReactNode } from "react";

import { ArticleBlock } from "@/components/article-blocks";
import {
  ArticleChart,
  UnavailableArticleChart,
} from "@/components/article-chart";
import {
  getArticleHeadings,
  getArticleImageShorthandMatches,
  getBlockAttributes,
  parseArticleImageShorthand,
  parseStructuredFieldMarkdown,
  resolveFlagCode,
  type ArticleBlockName,
  type ArticleImage,
  type Citation,
  type MarkdownNode,
  type MarkdownRoot,
} from "@/lib/article-markdown";
import { cn } from "@/lib/utils";

type Definitions = Map<string, { url: string; title?: string | null }>;

type CitationMap = Map<string, Citation>;

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

function renderText(value: string, key: string, compact: boolean) {
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

  for (const [index, token] of tokens.entries()) {
    if (token.index < offset) continue;
    if (token.index > offset) rendered.push(value.slice(offset, token.index));

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

  if (offset < value.length) rendered.push(value.slice(offset));
  return rendered;
}

function renderChildren(node: MarkdownNode, definitions: Definitions, citations: CitationMap, headingIds: Map<MarkdownNode, string>, compact: boolean): ReactNode {
  return node.children?.map((child, index) => renderNode(child, `${child.type}-${index}`, definitions, citations, headingIds, compact));
}

function renderNode(node: MarkdownNode, key: string, definitions: Definitions, citations: CitationMap, headingIds: Map<MarkdownNode, string>, compact = false): ReactNode {
  const children = renderChildren(node, definitions, citations, headingIds, compact);
  switch (node.type) {
    case "text": return renderText(node.value ?? "", key, compact);
    case "paragraph": {
      const onlyChild = node.children?.length === 1 ? node.children[0] : null;
      if (onlyChild?.type === "image") return renderNode(onlyChild, key, definitions, citations, headingIds, compact);
      if (onlyChild?.type === "imageReference") return renderNode(onlyChild, key, definitions, citations, headingIds, compact);
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
      return citation ? <sup key={key} className="ml-0.5 align-super text-[0.72em]"><a href={`#source-${citation.number}`} id={`citation-${citation.number}`} className="font-semibold text-primary hover:underline" aria-label={`Citation ${citation.number}`}>[{citation.number}]</a></sup> : null;
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

export function ArticleMarkdown({ root, citations = [], compact = false, hideSidebar = false }: { root: MarkdownRoot; citations?: Citation[]; compact?: boolean; hideSidebar?: boolean }) {
  const definitions: Definitions = new Map();
  for (const node of root.children) {
    if (node.type === "definition" && node.identifier && node.url) {
      definitions.set(node.identifier.toLowerCase(), { url: node.url, title: node.title });
    }
  }

  const citationMap = new Map(citations.map((citation) => [citation.identifier, citation]));
  const headingIds = new Map(getArticleHeadings(root).map((heading) => [heading.node, heading.id]));
  const sidebarNodes = root.children.filter((node) => node.type === "mdxJsxFlowElement" && node.name === "Sidebar");
  const mainNodes = root.children.filter((node) => !sidebarNodes.includes(node));
  const showSidebar = !compact && !hideSidebar && sidebarNodes.length > 0;

  return (
    <div className={compact ? "" : showSidebar ? "grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" : "mx-auto max-w-3xl"}>
      <article className="min-w-0">{mainNodes.map((node, index) => renderNode(node, `main-${index}`, definitions, citationMap, headingIds, compact))}</article>
      {showSidebar && <aside className="space-y-5 lg:sticky lg:top-20">{sidebarNodes.map((node, index) => renderNode(node, `sidebar-${index}`, definitions, citationMap, headingIds))}</aside>}
    </div>
  );
}
