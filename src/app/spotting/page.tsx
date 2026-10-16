import type { Metadata } from "next";
import Link from "next/link";
import { Binoculars } from "lucide-react";

import { PublicDataPending } from "@/components/public-data-pending";
import { Badge } from "@/components/ui/badge";
import { jsonLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { publicDatabaseConfigured } from "@/lib/public-page-cache";
import { spottingGuidePresentation, type SpottingFreshnessState } from "@/lib/spotting-guide";
import { listPublishedSpottingGuides, listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Plane spotting guides",
  description:
    "Community-edited airport plane spotting guides with map locations, runway coverage, access notes, and a last verified date.",
  alternates: { canonical: "/spotting" },
  openGraph: {
    title: "Plane spotting guides",
    description:
      "Community-edited airport plane spotting guides with map locations and a last verified date.",
    url: "/spotting",
  },
};

export const revalidate = 3600;

const freshnessRank: Record<SpottingFreshnessState, number> = {
  stale: 0,
  aging: 1,
  unverified: 2,
  fresh: 3,
};

export default async function SpottingHubPage() {
  if (!publicDatabaseConfigured()) return <PublicDataPending title="Plane spotting guides" />;
  const [guides, documents] = await Promise.all([
    listPublishedSpottingGuides(),
    listPublicSearchDocuments(),
  ]);
  const presented = guides
    .map((guide) => ({ guide, ...spottingGuidePresentation(guide.fields) }))
    .toSorted((first, second) => freshnessRank[first.freshness.state] - freshnessRank[second.freshness.state] || first.guide.title.localeCompare(second.guide.title));
  const guideSlugs = new Set(guides.map((guide) => guide.slug));
  const airports = documents
    .filter((document) => document.contentType === "airport" && !guideSlugs.has(document.slug))
    .toSorted((first, second) => first.title.localeCompare(second.title));
  const needsCheck = presented.filter((item) => item.freshness.state !== "fresh").length;
  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Plane spotting guides",
    description: metadata.description,
    url: absoluteUrl("/spotting"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: presented.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.guide.title,
        url: absoluteUrl(item.guide.href),
      })),
    },
  };

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(jsonLdGraph) }} />
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">Main</Link>
        <span> / Plane spotting</span>
      </nav>
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10">
          <Binoculars className="size-6 text-primary" />
        </span>
        <div>
          <Badge variant="secondary" className="rounded-full text-primary">Guides</Badge>
          <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Plane spotting guides</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Community-edited notes for watching aircraft at an airport. Each guide shows when it was last verified, so an old page does not pretend to be current.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            {presented.length
              ? `${presented.length} published ${presented.length === 1 ? "guide" : "guides"}${needsCheck ? `, ${needsCheck} needing a field check` : ""}.`
              : "No guides have been published yet."}
          </p>
        </div>
      </div>
      <div className="mt-10 space-y-3">
        {presented.map(({ guide, freshness, placeholder }) => (
          <article key={guide.id} className="rounded-2xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={guide.href} className="text-lg font-semibold text-primary hover:underline">
                {guide.title}
              </Link>
              <Badge variant="outline">{placeholder ? "Placeholder" : freshness.label}</Badge>
            </div>
            {guide.description && <p className="mt-2 text-sm text-muted-foreground">{guide.description}</p>}
          </article>
        ))}
      </div>
      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Airports without a guide</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Start a guide with the airport’s slug. It is reviewed like any other article and appears here after approval.
        </p>
        <ul className="mt-5 divide-y rounded-2xl border">
          {airports.length ? airports.map((airport) => (
            <li key={airport.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <Link href={airport.href} className="article-link font-medium">{airport.title}</Link>
              <Link
                href={`/contribute?title=${encodeURIComponent(`${airport.title} plane spotting`)}&slug=${encodeURIComponent(airport.slug)}&contentType=spotting_guide`}
                className="article-link"
              >
                Start a guide
              </Link>
            </li>
          )) : (
            <li className="px-4 py-6 text-sm text-muted-foreground">Every published airport already has a spotting guide.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
