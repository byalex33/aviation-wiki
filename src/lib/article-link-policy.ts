import { contentTypePaths } from "@/lib/article-routes";
import type { MarkdownError, MarkdownNode, MarkdownRoot } from "@/lib/article-markdown";

import { ARTICLE_PATH_ALIASES } from "@/lib/article-path-aliases";

const namespaces: Record<string, string> = { airline: "commercial", airlines: "commercial", airport: "airports" };
const articleNamespaces = new Set([...Object.values(contentTypePaths), ...Object.keys(namespaces)]);
const siteHosts = new Set(["aviation.wiki", "www.aviation.wiki"]);

/** Only article URLs are checked here; navigation, sources and fragment links stay intact. */
export function resolveInternalArticleLink(href: string, availablePaths: Iterable<string>) {
  let url: URL;
  try {
    url = new URL(href, "https://www.aviation.wiki");
  } catch { return undefined; }
  if (!siteHosts.has(url.hostname) || !["http:", "https:"].includes(url.protocol)) return undefined;
  const segments = url.pathname.split("/").filter(Boolean);
  if (segments.length !== 2 || !articleNamespaces.has(segments[0])) return undefined;
  const available = availablePaths instanceof Set ? availablePaths : new Set(availablePaths);
  const canonical = `/${namespaces[segments[0]] || segments[0]}/${segments[1]}`;
  const alias = ARTICLE_PATH_ALIASES[canonical];
  if (alias && available.has(alias)) return alias + url.search + url.hash;
  if (available.has(canonical)) return canonical + url.search + url.hash;
  // A unique published slug in another content type is an unambiguous route correction.
  const matches = [...available].filter((path) => path.split("/").at(-1) === segments[1]);
  return matches.length === 1 ? matches[0] + url.search + url.hash : null;
}

export function validateInternalArticleLinks(root: MarkdownRoot, availablePaths: Iterable<string>): MarkdownError[] {
  const paths = new Set(availablePaths);
  const errors: MarkdownError[] = [];
  const visit = (node: MarkdownNode) => {
    if ((node.type === "link" || node.type === "definition") && node.url) {
      const resolved = resolveInternalArticleLink(node.url, paths);
      if (resolved === null) errors.push({ line: node.position?.start.line ?? 1, column: node.position?.start.column ?? 1, message: `No published article exists at ${node.url}. Remove the link or choose an existing article.` });
      else if (resolved !== undefined && resolved !== node.url) errors.push({ line: node.position?.start.line ?? 1, column: node.position?.start.column ?? 1, message: `Use the canonical article link ${resolved} instead of ${node.url}.` });
    }
    node.children?.forEach(visit);
  };
  visit(root);
  return errors;
}

/** Repair legacy route spellings at display time without changing approved editorial records. */
export function canonicalizeArticleLinks(root: MarkdownRoot, availablePaths: Iterable<string>): MarkdownRoot {
  const paths = new Set(availablePaths);
  const visit = (node: MarkdownNode): MarkdownNode => {
    const copy = { ...node, ...(node.children ? { children: node.children.map(visit) } : {}) };
    if ((node.type === "link" || node.type === "definition") && node.url) {
      const resolved = resolveInternalArticleLink(node.url, paths);
      if (resolved === null) {
        if (node.type === "link") copy.type = "emphasis";
        copy.url = undefined;
      } else if (resolved !== undefined) copy.url = resolved;
    }
    return copy;
  };
  return { ...root, children: root.children.map(visit) };
}
