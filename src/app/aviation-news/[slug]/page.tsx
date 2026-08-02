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
