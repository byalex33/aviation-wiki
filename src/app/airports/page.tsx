import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Airports and airfields",
  description:
    "Browse airport, airfield, hub, and terminal articles on aviation.wiki.",
  alternates: { canonical: "/airports" },
};

export default async function AirportsPage() {
  const articles = (await listPublicSearchDocuments())
    .filter((article) => article.contentType === "airport")
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Airports</span>
      </nav>
      <ArticleCollection
        articles={articles}
        badge="Places"
        title="Airports and airfields"
        description="Explore airport codes, hubs, terminals, runways, operators, and aviation history."
        icon={MapPin}
        contributeHref="/contribute?title=London+Heathrow+Airport&slug=london-heathrow-airport&contentType=airport"
        contributeLabel="Add an airport"
        emptyTitle="Help create the airport directory"
        emptyDescription="Create the first approved airport or airfield article."
      />
      <nav className="mt-10 rounded-xl border bg-muted/30 p-5 text-sm" aria-label="Airports by country"><span className="mr-3 font-semibold">Browse by country</span><Link href="/airports/united-kingdom" className="article-link">United Kingdom airports</Link></nav>
    </main>
  );
}
