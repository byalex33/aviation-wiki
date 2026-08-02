import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type AlliancePageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: AlliancePageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "alliance");
}

export default function Page({ params }: AlliancePageProps) {
  return <PublicArticleRoute params={params} contentType="alliance" />;
}
