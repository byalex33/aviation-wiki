import { airlineDirectory, directoryArticleName } from "@/lib/airline-directory";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicArticleRoute } from "@/components/public-article-route";
import { getOpenFlightsAirlines } from "@/lib/openflights";
import { publicArticleMetadata } from "@/lib/seo";
import {
  ensureDirectoryAirlineArticle,
  getArticleBySlug,
  normalizeSlug,
} from "@/lib/wiki-public-db";

type AirlinePageProps = {
  params: Promise<{ slug: string }>;
};

// Cached for every reader (ISR), like the other article routes. Reading
// searchParams would make the route dynamic, so directory airlines are
// provisioned from the slug alone.
export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: AirlinePageProps): Promise<Metadata> {
  return publicArticleMetadata(params, "airline");
}

export default async function Page({ params }: AirlinePageProps) {
  const slug = normalizeSlug((await params).slug);
  let article = await getArticleBySlug(slug, "airline");
  if (!article?.liveRevision || article.liveRevision.status !== "approved") {
    const identity = airlineDirectory.find((entry) => normalizeSlug(directoryArticleName(entry.name)) === slug);
    if (!identity) notFound();
    const airline = (await getOpenFlightsAirlines([identity])).get(identity.iata);
    if (!airline) notFound();
    article = await ensureDirectoryAirlineArticle({ ...airline, name: directoryArticleName(identity.name), country: identity.country, active: identity.status === "Active" });
  }
  if (!article?.liveRevision || article.liveRevision.status !== "approved")
    notFound();
  return <PublicArticleRoute params={params} contentType="airline" />;
}
