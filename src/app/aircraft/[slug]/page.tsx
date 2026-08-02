import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type AircraftPageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: AircraftPageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "aircraft");
}

export default function Page({ params }: AircraftPageProps) {
  return <PublicArticleRoute params={params} contentType="aircraft" />;
}
