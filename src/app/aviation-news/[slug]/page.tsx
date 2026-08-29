import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

// ISR — see issue #5. Empty generateStaticParams: prebuild nothing, render each
// slug on first visit, then serve from the ISR cache (Next 16 requires this).
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

type AviationEventPageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: AviationEventPageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "event");
}

export default function Page({ params }: AviationEventPageProps) {
  return <PublicArticleRoute params={params} contentType="event" />;
}
