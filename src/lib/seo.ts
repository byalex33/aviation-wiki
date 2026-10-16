import type { Metadata } from "next";

import { articlePath } from "@/lib/article-routes";
import { configuredSiteUrl, firstArticleImage, truncateDescription } from "@/lib/article-summary";
import { getArticleBySlug, normalizeSlug } from "@/lib/wiki-public-db";
import { DEFAULT_OG_IMAGE } from "@/lib/site";
import type { ContentType } from "@/lib/wiki-types";

export const siteUrl = configuredSiteUrl();

export function articleDescription(markdown: string) {
  return truncateDescription(
    markdown
      .replace(/^#\s+.*(?:\r?\n)+/, "")
      .replace(/<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi, " ")
    .replace(/<SpottingLocations(?:\s[^>]*)?>[\s\S]*?<\/SpottingLocations>/gi, " ")
      .replace(/\[\^[^\]]+\]/g, "")
      .replace(/[#*_>`\[\]()]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

export function articleImageDetails(markdown: string) {
  return firstArticleImage(markdown);
}

export function articleImage(markdown: string) {
  return articleImageDetails(markdown)?.url;
}

export async function publicArticleMetadata(
  params: Promise<{ slug: string }>,
  contentType: ContentType,
): Promise<Metadata> {
  const slug = normalizeSlug((await params).slug);
  const article = await getArticleBySlug(slug, contentType);
  const revision = article?.liveRevision;
  if (!article || !revision || revision.status !== "approved")
    return { title: "Article not found", robots: { index: false, follow: false } };

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
      images: [imageUrl ? { url: imageUrl, alt: revision.title } : DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: revision.title,
      description,
      images: [imageUrl || DEFAULT_OG_IMAGE.url],
    },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
