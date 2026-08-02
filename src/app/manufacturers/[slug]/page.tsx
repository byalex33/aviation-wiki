import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type ManufacturerPageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: ManufacturerPageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "manufacturer");
}

export default function Page({ params }: ManufacturerPageProps) {
  return <PublicArticleRoute params={params} contentType="manufacturer" />;
}
