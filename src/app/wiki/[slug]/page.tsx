import { permanentRedirect } from "next/navigation";

import { MissingArticleState } from "@/components/public-article";
import { articlePath } from "@/lib/article-routes";
import { getArticleBySlug, normalizeSlug } from "@/lib/wiki-public-db";

export default async function LegacyWikiArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const slug = normalizeSlug((await params).slug);
  const article = await getArticleBySlug(slug);
  if (article?.liveRevision?.status === "approved") permanentRedirect(articlePath(article.contentType, article.slug));
  return <MissingArticleState slug={slug} contentType={article?.contentType || "aircraft"} />;
}
