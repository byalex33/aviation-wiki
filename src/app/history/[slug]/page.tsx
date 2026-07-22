import { notFound, permanentRedirect } from "next/navigation";

import { articleHistoryPath } from "@/lib/article-routes";
import { getArticleBySlug, normalizeSlug } from "@/lib/wiki-db";

export default async function LegacyHistoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = normalizeSlug((await params).slug);
  const article = getArticleBySlug(slug);
  if (!article?.liveRevision || article.liveRevision.status !== "approved") notFound();
  permanentRedirect(articleHistoryPath(article.contentType, article.slug));
}
