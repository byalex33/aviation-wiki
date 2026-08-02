import type { Metadata } from "next";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";

type AirportPageProps = { params: Promise<{ slug: string }> };

export function generateMetadata({
  params,
}: AirportPageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "airport");
}

export default function Page({ params }: AirportPageProps) {
  return <PublicArticleRoute params={params} contentType="airport" />;
}
