import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicArticleRoute } from "@/components/public-article-route";
import { generateArticleMetadata } from "@/lib/article-seo";
import { getOpenFlightsAirlines } from "@/lib/openflights";
import {
  ensureDirectoryAirlineArticle,
  getArticleBySlug,
  normalizeSlug,
} from "@/lib/wiki-public-db";

type AirlinePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ iata?: string | string[] }>;
};

function iataFrom(value: string | string[] | undefined) {
  const code = typeof value === "string" ? value.toUpperCase() : "";
  return /^[A-Z0-9]{2}$/.test(code) ? code : null;
}

export async function generateMetadata({
  params,
}: AirlinePageProps): Promise<Metadata> {
  return generateArticleMetadata(params, "airline");
}

export default async function Page({ params, searchParams }: AirlinePageProps) {
  const slug = normalizeSlug((await params).slug);
  let article = await getArticleBySlug(slug, "airline");
  if (!article?.liveRevision || article.liveRevision.status !== "approved") {
    const iata = iataFrom((await searchParams).iata);
    if (!iata) notFound();
    const airline = (await getOpenFlightsAirlines([iata])).get(iata);
    if (!airline || normalizeSlug(airline.name) !== slug) notFound();
    article = await ensureDirectoryAirlineArticle(airline);
  }
  if (!article?.liveRevision || article.liveRevision.status !== "approved")
    notFound();
  return <PublicArticleRoute params={params} contentType="airline" />;
}
