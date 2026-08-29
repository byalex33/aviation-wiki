import "server-only";

import type { Metadata } from "next";

import { articlePath } from "@/lib/article-routes";
import { SITE_NAME } from "@/lib/site";
import { getPublicArticleView, normalizeSlug } from "@/lib/wiki-public-db";
import type {
  ArticleWithLiveRevision,
  ContentType,
  RevisionRecord,
} from "@/lib/wiki-types";

const descriptionLimit = 158;

function cleanInlineMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/\[\^[^\]]+]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/[*_~`>#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function proseParagraphs(markdown: string) {
  const withoutSidebar = markdown.replace(
    /<Sidebar(?:\s[^>]*)?>[\s\S]*?<\/Sidebar>/gi,
    " ",
  );

  return withoutSidebar
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(
      (block) =>
        block.length > 0 &&
        !/^(?:#{1,6}\s|\||[-*+]\s|<|\[\^[^\]]+]:)/.test(block),
    )
    .map(cleanInlineMarkdown)
    .filter((block) => block.length >= 35);
}

function truncateSentence(value: string, limit = descriptionLimit) {
  if (value.length <= limit) return value;
  const shortened = value.slice(0, limit - 1);
  const boundary = Math.max(
    shortened.lastIndexOf(". "),
    shortened.lastIndexOf("; "),
    shortened.lastIndexOf(", "),
    shortened.lastIndexOf(" "),
  );
  return `${shortened.slice(0, boundary > 90 ? boundary : limit - 1).trim()}…`;
}

function fieldValue(revision: RevisionRecord, ...keys: string[]) {
  const expected = new Set(keys.map((key) => key.toLowerCase()));
  return revision.fields.find((field) =>
    expected.has(field.key.trim().toLowerCase()),
  )?.value;
}

export function articleDescription(revision: RevisionRecord) {
  if (revision.contentType === "alliance") {
    const memberCount = fieldValue(revision, "Member airlines");
    const countText =
      memberCount && /^\d+$/.test(memberCount.trim())
        ? `${memberCount.trim()} member airlines, `
        : "member airlines, ";
    return truncateSentence(
      `Explore ${revision.title} ${countText}former members, partners, founding history, and cited aviation data.`,
    );
  }

  const paragraph = proseParagraphs(revision.markdown)[0];
  if (paragraph) return truncateSentence(paragraph);

  const fallbacks: Record<ContentType, string> = {
    aircraft: `Explore ${revision.title} specifications, variants, operators, engines, history, and cited aviation data.`,
    airline: `Explore the ${revision.title} fleet, hubs, airline codes, history, and cited aviation data.`,
    airport: `Explore ${revision.title} codes, location, airlines, facilities, history, and cited aviation data.`,
    manufacturer: `Explore ${revision.title} aircraft, engines, company history, and cited aviation data.`,
    engine: `Explore ${revision.title} specifications, applications, variants, history, and cited aviation data.`,
    alliance: `Explore ${revision.title} members, partners, history, and cited aviation data.`,
    event: `Read a sourced account of ${revision.title}, including when it happened, what changed, and its aviation significance.`,
  };
  return truncateSentence(fallbacks[revision.contentType]);
}

function searchTitle(revision: RevisionRecord) {
  const suffixes: Record<ContentType, string> = {
    aircraft: "specifications, variants and operators",
    airline: "fleet, hubs and airline profile",
    alliance: "members, airlines and history",
    airport: "codes, airlines and airport guide",
    manufacturer: "aircraft, engines and company history",
    engine: "specifications, applications and variants",
    event: "what happened, timeline and aviation impact",
  };
  return `${revision.title}: ${suffixes[revision.contentType]}`;
}

export function metadataForArticle(
  article: ArticleWithLiveRevision,
): Metadata {
  const revision = article.liveRevision;
  if (!revision || revision.status !== "approved") {
    return {
      title: article.title,
      robots: { index: false, follow: false },
    };
  }

  const path = articlePath(revision.contentType, article.slug);
  const description = articleDescription(revision);
  const title = searchTitle(revision);
  const publishedTime = revision.reviewedAt || revision.createdAt;
  const modifiedTime = revision.updatedAt;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "article",
      publishedTime,
      modifiedTime,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export async function generateArticleMetadata(
  params: Promise<{ slug: string }>,
  contentType: ContentType,
): Promise<Metadata> {
  const rawSlug = (await params).slug;
  // Shares the cached, reader-agnostic article read with the page render.
  const view = await getPublicArticleView(contentType, rawSlug);

  if (view.kind !== "ok") {
    return {
      title: normalizeSlug(rawSlug).replaceAll("-", " "),
      description: `This ${contentType} article is not available on ${SITE_NAME}.`,
      robots: { index: false, follow: false },
    };
  }

  return metadataForArticle(view.article);
}
