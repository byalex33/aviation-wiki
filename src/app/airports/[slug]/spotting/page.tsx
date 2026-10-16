import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

import { PublicArticleRoute } from "@/components/public-article-route";
import { buttonVariants } from "@/components/ui/button";
import { articlePath } from "@/lib/article-routes";
import { publicDatabaseConfigured } from "@/lib/public-page-cache";
import { publicArticleMetadata } from "@/lib/seo";
import {
  getArticleBySlug,
  getArticlePublicationControls,
  normalizeSlug,
} from "@/lib/wiki-public-db";

export const revalidate = 3600;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const slug = normalizeSlug((await params).slug);
  if (!slug || !publicDatabaseConfigured()) {
    return { title: "Plane spotting guide", robots: { index: false, follow: false } };
  }
  const guide = await getArticleBySlug(slug, "spotting_guide");
  if (guide?.liveRevision?.status === "approved") return publicArticleMetadata(params, "spotting_guide");
  const airport = await getArticleBySlug(slug, "airport");
  if (!airport?.liveRevision || airport.liveRevision.status !== "approved") {
    return { title: "Plane spotting guide", robots: { index: false, follow: false } };
  }
  const title = `${airport.title} plane spotting`;
  return {
    title,
    description: `Community plane spotting guide for ${airport.title}. No verified guide has been published yet.`,
    alternates: { canonical: articlePath("spotting_guide", airport.slug) },
    robots: { index: false, follow: true },
  };
}

export default async function AirportSpottingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = normalizeSlug((await params).slug);
  if (!slug) notFound();
  const airportControls = await getArticlePublicationControls("airport", slug);
  if (airportControls?.redirect_to_slug) {
    permanentRedirect(articlePath("spotting_guide", airportControls.redirect_to_slug));
  }
  const guideControls = await getArticlePublicationControls("spotting_guide", slug);
  if (guideControls?.redirect_to_slug) {
    permanentRedirect(articlePath("spotting_guide", guideControls.redirect_to_slug));
  }
  const guide = guideControls?.archived_at ? null : await getArticleBySlug(slug, "spotting_guide");
  if (guide?.liveRevision?.status === "approved") {
    return <PublicArticleRoute params={params} contentType="spotting_guide" />;
  }
  const airport = airportControls?.archived_at ? null : await getArticleBySlug(slug, "airport");
  if (!airport?.liveRevision || airport.liveRevision.status !== "approved") notFound();
  const title = `${airport.title} plane spotting`;
  const contributeHref = `/contribute?title=${encodeURIComponent(title)}&slug=${encodeURIComponent(airport.slug)}&contentType=spotting_guide`;
  return (
    <main className="mx-auto max-w-[900px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-7 text-sm text-muted-foreground">
        <Link href="/" className="article-link">aviation.wiki</Link>
        <span> / </span>
        <Link href="/spotting" className="article-link">Plane spotting</Link>
        <span> / </span>
        <Link href={articlePath("airport", airport.slug)} className="article-link">{airport.title}</Link>
      </nav>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">Not yet verified</p>
      <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        No spotting guide has been published for {airport.title}. Guides are written by contributors and stay unpublished until a moderator approves them.
      </p>
      <ul className="mt-8 space-y-2 text-sm leading-6">
        <li>Spotting locations, with OpenStreetMap pins</li>
        <li>Which runways each spot covers</li>
        <li>Typical runway use by wind direction</li>
        <li>Parking and access</li>
        <li>Legal and security notes</li>
        <li>Best times and light</li>
        <li>Typical traffic</li>
        <li>A last verified date once someone has checked the guide in the field</li>
      </ul>
      <p className="mt-6 max-w-2xl text-sm text-muted-foreground">
        Mark anything you have not checked yourself as PLACEHOLDER. Do not invent viewing spots, parking, or security rules.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={contributeHref} className={buttonVariants()}>Start this guide</Link>
        <Link href={articlePath("airport", airport.slug)} className={buttonVariants({ variant: "outline" })}>
          Airport article
        </Link>
      </div>
    </main>
  );
}
