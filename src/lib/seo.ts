import type { Metadata } from "next";

import { articlePath } from "@/lib/article-routes";
import { ARTICLE_PATH_ALIASES } from "@/lib/article-path-aliases";
import { configuredSiteUrl, firstArticleImage, truncateDescription } from "@/lib/article-summary";
import { getArticleBySlug, getArticlePublicationControls, getSlugRedirect, normalizeSlug } from "@/lib/wiki-public-db";
import { DEFAULT_OG_IMAGE } from "@/lib/site";
import { socialCardImageUrl } from "@/lib/wikimedia-thumbnail";
import type { ContentType } from "@/lib/wiki-types";

export const siteUrl = configuredSiteUrl();

export function articleDescription(markdown: string) {
  return truncateDescription(
    markdown
      .replace(/^#\s+.*(?:\r?\n)+/, "")
      .replace(/<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi, " ")
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
  const requestedPath = articlePath(contentType, slug);
  const aliasTarget = ARTICLE_PATH_ALIASES[requestedPath];
  if (aliasTarget) return movedMetadata(aliasTarget);
  const [controls, article] = await Promise.all([
    getArticlePublicationControls(contentType, slug),
    getArticleBySlug(slug, contentType),
  ]);
  if (controls?.redirect_to_slug) return movedMetadata(articlePath(contentType, controls.redirect_to_slug));
  if (!article) {
    const destination = await getSlugRedirect(contentType, slug);
    if (destination) return movedMetadata(articlePath(contentType, destination));
  }
  const revision = article?.liveRevision;
  if (!article || !revision || revision.status !== "approved")
    return { title: "Article not found", robots: { index: false, follow: false } };

  const url = articlePath(contentType, article.slug);
  const description =
    articleDescription(revision.markdown) ||
    `${revision.title}, an approved aviation reference on aviation.wiki.`;
  const image = articleImageDetails(revision.markdown);
  const imageUrl = image ? socialCardImageUrl(new URL(image.url, siteUrl).href) : undefined;
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

function movedMetadata(canonical: string): Metadata {
  return {
    title: "Moved",
    alternates: { canonical },
    robots: { index: false, follow: true },
  };
}

export function jsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
