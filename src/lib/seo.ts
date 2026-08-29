import type { Metadata } from "next";

import { articlePath } from "@/lib/article-routes";
import {
  isSafeImageUrl,
  parseArticleImageShorthand,
} from "@/lib/article-markdown";
import { getPublicArticleView } from "@/lib/wiki-public-db";
import type { ContentType } from "@/lib/wiki-types";

export const siteUrl = new URL(
  process.env.NEXT_PUBLIC_APP_URL || "https://aviation.wiki",
);

export function articleDescription(markdown: string) {
  return markdown
    .replace(/<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi, " ")
    .replace(/\[\^[^\]]+\]/g, "")
    .replace(/[#*_>`\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function articleImageDetails(markdown: string) {
  const sidebar = markdown.match(/<Sidebar(?:\s[^>]*)?>([\s\S]*?)<\/Sidebar>/i);
  if (!sidebar) return;
  for (const line of sidebar[1].split(/\r?\n/)) {
    const image = parseArticleImageShorthand(line.trim().replace(/^-\s+/, ""));
    if (image && isSafeImageUrl(image.url)) return image;
  }
}

export function articleImage(markdown: string) {
  return articleImageDetails(markdown)?.url;
}

export async function publicArticleMetadata(
  params: Promise<{ slug: string }>,
  contentType: ContentType,
): Promise<Metadata> {
  // Shares the cached, reader-agnostic article read with the page render.
  const view = await getPublicArticleView(contentType, (await params).slug);
  if (view.kind !== "ok")
    return { title: "Article not found", robots: { index: false, follow: false } };
  const { article, revision } = view;

  const url = articlePath(contentType, article.slug);
  const description =
    articleDescription(revision.markdown) ||
    `${revision.title}, an approved aviation reference on aviation.wiki.`;
  const image = articleImageDetails(revision.markdown);
  const imageUrl = image ? new URL(image.url, siteUrl).href : undefined;
  const modifiedTime = revision.reviewedAt || revision.updatedAt;
  return {
    title: revision.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: "aviation.wiki",
      title: revision.title,
      description,
      publishedTime: article.createdAt,
      modifiedTime,
      images: imageUrl ? [{ url: imageUrl, alt: revision.title }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: revision.title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
