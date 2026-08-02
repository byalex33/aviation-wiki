import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type EnginePageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: EnginePageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "engine");
}

export default function Page({ params }: EnginePageProps) {
  return <PublicArticleRoute params={params} contentType="engine" />;
}
