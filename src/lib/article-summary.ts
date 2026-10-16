import {
  getArticleImageShorthandMatches,
  isSafeImageUrl,
  parseArticleImageShorthand,
  parseArticleMarkdown,
  type ArticleImage,
  type MarkdownNode,
} from "@/lib/article-markdown";
import { SITE_URL } from "@/lib/site";

// Cuts on a space so a 160-character meta description does not end mid-word.
export function truncateDescription(value: string, limit = 160) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= limit) return text;
  const boundary = text.slice(0, limit + 1).lastIndexOf(" ");
  if (boundary <= 0) return text.slice(0, limit).trim();
  return text.slice(0, boundary).trim();
}

export function configuredSiteUrl(value = process.env.NEXT_PUBLIC_APP_URL) {
  return new URL(value || SITE_URL);
}

type ImageDefinition = { url: string; title?: string | null };

function collectImages(node: MarkdownNode, definitions: Map<string, ImageDefinition>, found: Array<{ offset: number; image: ArticleImage }>) {
  const offset = node.position?.start.offset ?? Number.POSITIVE_INFINITY;
  if (node.type === "image" && node.url && isSafeImageUrl(node.url)) {
    found.push({ offset, image: { url: node.url, credit: node.title ?? null } });
  }
  if (node.type === "imageReference") {
    const definition = definitions.get(node.identifier?.toLowerCase() ?? "");
    if (definition && isSafeImageUrl(definition.url)) {
      found.push({ offset, image: { url: definition.url, credit: definition.title ?? null } });
    }
  }
  node.children?.forEach((child) => collectImages(child, definitions, found));
}

// Sidebar shorthand wins, then the first safe lead, body, or gallery image.
export function firstArticleImage(markdown: string): ArticleImage | undefined {
  const parsed = parseArticleMarkdown(markdown);
  const sidebar = parsed.sidebarImages.find((image) => isSafeImageUrl(image.url));
  if (sidebar) return { url: sidebar.url, credit: sidebar.credit };

  const sidebarRanges = [...markdown.matchAll(/<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi)].flatMap((match) =>
    match.index === undefined ? [] : [[match.index, match.index + match[0].length] as const],
  );
  const insideSidebar = (offset: number) => sidebarRanges.some(([start, end]) => offset >= start && offset < end);
  const candidates: Array<{ offset: number; image: ArticleImage }> = [];

  for (const match of getArticleImageShorthandMatches(markdown)) {
    if (insideSidebar(match.index)) continue;
    const image = parseArticleImageShorthand(match.value);
    if (image && isSafeImageUrl(image.url)) candidates.push({ offset: match.index, image });
  }

  const definitions = new Map<string, ImageDefinition>();
  for (const node of parsed.root.children) {
    if (node.type === "definition" && node.identifier && node.url) {
      definitions.set(node.identifier.toLowerCase(), { url: node.url, title: node.title });
    }
  }
  collectImages(parsed.root, definitions, candidates);
  return candidates
    .filter((candidate) => !insideSidebar(candidate.offset))
    .sort((left, right) => left.offset - right.offset)[0]?.image;
}
