import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type AviationEventPageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: AviationEventPageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "event");
}

export default function Page({ params }: AviationEventPageProps) {
  return <PublicArticleRoute params={params} contentType="event" />;
}

// Cached for every reader (ISR). Approvals and edits revalidate the path
// immediately; the hour bounds staleness of cross-article links. Nothing is
// prerendered at build, so preview builds without a database still succeed.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}
