import { unified } from "unified";
import remarkGfm from "remark-gfm";
import remarkMdx from "remark-mdx";
import remarkParse from "remark-parse";

export const ARTICLE_BLOCKS = [
  "Infobox",
  "Notice",
  "Sidebar",
  "Sources",
  "FleetTable",
  "Specifications",
  "Timeline",
  "Gallery",
  "RelatedPages",
] as const;

export type ArticleBlockName = (typeof ARTICLE_BLOCKS)[number];

export type MarkdownNode = {
  type: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | null;
  url?: string;
  alt?: string | null;
  title?: string | null;
  identifier?: string;
  name?: string | null;
  attributes?: Array<{ type: string; name?: string; value?: unknown }>;
  children?: MarkdownNode[];
  position?: { start: { line: number; column: number } };
};

export type MarkdownRoot = MarkdownNode & { type: "root"; children: MarkdownNode[] };

export type MarkdownError = {
  line: number;
  column: number;
  message: string;
};

export type Citation = {
  identifier: string;
  number: number;
  url: string;
  occurrences: number;
};

export type MarkdownWarning = MarkdownError;

const allowedNodeTypes = new Set([
  "root", "paragraph", "text", "heading", "blockquote", "list", "listItem",
  "strong", "emphasis", "delete", "inlineCode", "code", "break", "thematicBreak",
  "link", "image", "table", "tableRow", "tableCell", "definition", "linkReference",
  "imageReference", "mdxJsxFlowElement",
  "footnoteReference", "footnoteDefinition",
]);

const allowedAttributes: Record<ArticleBlockName, Set<string>> = {
  Infobox: new Set(["title"]),
  Notice: new Set(["title", "variant"]),
  Sidebar: new Set(["title"]),
  Sources: new Set(["title"]),
  FleetTable: new Set(["title"]),
  Specifications: new Set(["title"]),
  Timeline: new Set(["title"]),
  Gallery: new Set(["title", "columns"]),
  RelatedPages: new Set(["title"]),
};

function location(node: MarkdownNode) {
  return {
    line: node.position?.start.line ?? 1,
    column: node.position?.start.column ?? 1,
  };
}

export function isSafeUrl(value: string) {
  const url = value.trim().toLowerCase();
  return url.startsWith("/") || url.startsWith("#") || url.startsWith("https://") ||
    url.startsWith("http://") || url.startsWith("mailto:");
}

export function isSafeCitationUrl(value: string) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getBlockAttributes(node: MarkdownNode) {
  return Object.fromEntries(
    (node.attributes ?? []).map((attribute) => [attribute.name ?? "", String(attribute.value ?? "")]),
  );
}

export function parseArticleMarkdown(source: string): { root: MarkdownRoot; errors: MarkdownError[]; warnings: MarkdownWarning[]; citations: Citation[] } {
  let root: MarkdownRoot;

  try {
    root = unified().use(remarkParse).use(remarkGfm).use(remarkMdx).parse(source) as unknown as MarkdownRoot;
  } catch (error) {
    const parseError = error as Error & { line?: number; column?: number };
    return {
      root: { type: "root", children: [] },
      errors: [{ line: parseError.line ?? 1, column: parseError.column ?? 1, message: parseError.message }], warnings: [], citations: [],
    };
  }

  const errors: MarkdownError[] = [];
  const warnings: MarkdownWarning[] = [];
  const definitions = new Map<string, { node: MarkdownNode; url: string }>();
  const citationOrder: string[] = [];
  const citationCounts = new Map<string, number>();

  const report = (node: MarkdownNode, message: string) => {
    errors.push({ ...location(node), message });
  };

  const rawDefinitions = new Map<string, { line: number; url: string }>();
  const rawReferences = new Map<string, number>();
  source.split(/\r?\n/).forEach((line, index) => {
    const definition = line.match(/^\s*\[\^([^\]]+)\]:\s*(.*?)\s*$/);
    if (definition) {
      const identifier = definition[1].trim().toLowerCase();
      if (rawDefinitions.has(identifier)) errors.push({ line: index + 1, column: 1, message: `Duplicate citation identifier: ${identifier}.` });
      else rawDefinitions.set(identifier, { line: index + 1, url: definition[2] });
      return;
    }
    for (const match of line.matchAll(/\[\^([^\]]+)\]/g)) {
      const identifier = match[1].trim().toLowerCase();
      rawReferences.set(identifier, rawReferences.get(identifier) ?? index + 1);
    }
  });
  for (const [identifier, line] of rawReferences) {
    if (!rawDefinitions.has(identifier)) errors.push({ line, column: 1, message: `Citation [^${identifier}] has no matching source definition.` });
  }
  for (const [identifier, definition] of rawDefinitions) {
    if (!isSafeCitationUrl(definition.url)) errors.push({ line: definition.line, column: 1, message: `Unsafe or unsupported citation URL: ${definition.url || `[^${identifier}] has no URL`}.` });
  }

  const citationUrl = (node: MarkdownNode) => {
    const paragraph = node.children?.length === 1 ? node.children[0] : null;
    const link = paragraph?.type === "paragraph" && paragraph.children?.length === 1 ? paragraph.children[0] : null;
    return link?.type === "link" && link.url ? link.url.trim() : "";
  };

  // Collect these before validation so forward references and duplicates are deterministic.
  const collect = (node: MarkdownNode) => {
    if (node.type === "footnoteReference") {
      const identifier = (node.identifier ?? "").trim().toLowerCase();
      if (identifier && !citationCounts.has(identifier)) citationOrder.push(identifier);
      citationCounts.set(identifier, (citationCounts.get(identifier) ?? 0) + 1);
    }
    if (node.type === "footnoteDefinition") {
      const identifier = (node.identifier ?? "").trim().toLowerCase();
      if (!identifier) report(node, "Citation definitions require an identifier.");
      else if (definitions.has(identifier)) report(node, `Duplicate citation identifier: ${identifier}.`);
      else definitions.set(identifier, { node, url: citationUrl(node) });
    }
    node.children?.forEach(collect);
  };
  collect(root);

  for (const identifier of citationOrder) {
    if (!definitions.has(identifier)) {
      const reference = (() => {
        let found: MarkdownNode | undefined;
        const find = (node: MarkdownNode) => {
          if (!found && node.type === "footnoteReference" && node.identifier?.toLowerCase() === identifier) found = node;
          node.children?.forEach(find);
        };
        find(root);
        return found ?? root;
      })();
      report(reference, `Citation [^${identifier}] has no matching source definition.`);
    }
  }
  for (const [identifier, definition] of definitions) {
    if (!definition.url) report(definition.node, `Citation [^${identifier}] must contain one direct source URL.`);
    else if (!isSafeCitationUrl(definition.url)) report(definition.node, `Unsafe or unsupported citation URL: ${definition.url}.`);
    if (!citationCounts.has(identifier)) warnings.push({ ...location(definition.node), message: `Source [^${identifier}] is not cited in the article.` });
  }

  const validate = (node: MarkdownNode) => {
    if (!allowedNodeTypes.has(node.type)) {
      const messages: Record<string, string> = {
        html: "Raw HTML is not allowed.",
        mdxjsEsm: "Imports, exports, and JavaScript are not allowed.",
        mdxFlowExpression: "JavaScript expressions are not allowed.",
        mdxTextExpression: "JavaScript expressions are not allowed.",
      };
      if (node.type === "mdxJsxTextElement") {
        const name = node.name ?? "unknown";
        report(node, /^[a-z]/.test(name)
          ? `Raw HTML element <${name}> is not allowed.`
          : ARTICLE_BLOCKS.includes(name as ArticleBlockName)
            ? `Custom component <${name}> must be a standalone block.`
            : `Unsupported component <${name}>. Allowed components: ${ARTICLE_BLOCKS.join(", ")}.`);
      } else {
        report(node, messages[node.type] ?? `Unsupported Markdown syntax: ${node.type}.`);
      }
      return;
    }

    if (node.type === "link" || node.type === "image" || node.type === "definition") {
      if (!node.url || !isSafeUrl(node.url)) report(node, `Unsafe or unsupported URL: ${node.url ?? "empty URL"}.`);
    }

    if (node.type === "mdxJsxFlowElement") {
      if (!node.name || !ARTICLE_BLOCKS.includes(node.name as ArticleBlockName)) {
        report(node, `Unsupported component <${node.name ?? "unknown"}>. Allowed components: ${ARTICLE_BLOCKS.join(", ")}.`);
        return;
      }

      const blockName = node.name as ArticleBlockName;
      for (const attribute of node.attributes ?? []) {
        if (attribute.type !== "mdxJsxAttribute" || !attribute.name) {
          report(node, `Spread attributes and expressions are not allowed on <${blockName}>.`);
          continue;
        }
        const unsafeAttribute = attribute.name.toLowerCase().startsWith("on") || attribute.name === "style" || attribute.name === "className";
        if (unsafeAttribute) report(node, `Unsafe attribute "${attribute.name}" is not allowed.`);
        else if (!allowedAttributes[blockName].has(attribute.name)) report(node, `Unsupported attribute "${attribute.name}" on <${blockName}>.`);
        if (typeof attribute.value !== "string") {
          report(node, `Attribute "${attribute.name}" on <${blockName}> must be a quoted string.`);
        }
        if (blockName === "Notice" && attribute.name === "variant" && !["info", "warning", "critical"].includes(String(attribute.value))) {
          report(node, `Notice variant must be "info", "warning", or "critical".`);
        }
        if (blockName === "Gallery" && attribute.name === "columns" && !["2", "3"].includes(String(attribute.value))) {
          report(node, `Gallery columns must be "2" or "3".`);
        }
      }
    }

    node.children?.forEach(validate);
  };

  validate(root);
  const citations = citationOrder.flatMap((identifier, index) => {
    const definition = definitions.get(identifier);
    return definition?.url && isSafeCitationUrl(definition.url)
      ? [{ identifier, number: index + 1, url: definition.url, occurrences: citationCounts.get(identifier) ?? 1 }]
      : [];
  });
  return { root, errors, warnings, citations };
}
