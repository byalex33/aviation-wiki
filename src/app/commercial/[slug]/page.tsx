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
  searchParams: Promise<{ iata?: string | string[]; icao?: string | string[] }>;
};

function iataFrom(value: string | string[] | undefined) {
  const code = typeof value === "string" ? value.toUpperCase() : "";
  return /^[A-Z0-9]{2}$/.test(code) ? code : null;
}

export async function generateMetadata({
  params,
}: AirlinePageProps): Promise<Metadata> {
  return publicArticleMetadata(params, "airline");
}

export default async function Page({ params, searchParams }: AirlinePageProps) {
  const slug = normalizeSlug((await params).slug);
  let article = await getArticleBySlug(slug, "airline");
  if (!article?.liveRevision || article.liveRevision.status !== "approved") {
    const identity = airlineDirectory.find((entry) => normalizeSlug(directoryArticleName(entry.name)) === slug);
    const query = await searchParams;
    const iata = iataFrom(query.iata);
    const icao = typeof query.icao === "string" && /^[A-Z0-9]{3}$/.test(query.icao) ? query.icao : undefined;
    if (!identity || (iata && iata !== identity.iata) || (icao && icao !== identity.icao)) notFound();
    const airline = (await getOpenFlightsAirlines([identity])).get(identity.iata);
    if (!airline) notFound();
    article = await ensureDirectoryAirlineArticle({ ...airline, name: directoryArticleName(identity.name), country: identity.country, active: identity.status === "Active" });
  }
  if (!article?.liveRevision || article.liveRevision.status !== "approved")
    notFound();
  return <PublicArticleRoute params={params} contentType="airline" />;
}
