import type { Metadata } from "next";
import { Compass } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import {
  isCommercialAircraft,
  isMilitaryAircraft,
} from "@/lib/article-categories";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "General aviation aircraft",
  description:
    "Browse light aircraft, business jets, helicopters, and specialist civil aircraft on aviation.wiki.",
  alternates: { canonical: "/general-aviation" },
};

export default async function GeneralAviationPage() {
  const articles = (await listPublicSearchDocuments())
    .filter(
      (article) =>
        article.contentType === "aircraft" &&
        !isMilitaryAircraft(article) &&
        !isCommercialAircraft(article),
    )
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / </span>
        <Link href="/categories" className="article-link">
          Categories
        </Link>
        <span> / General aviation</span>
      </nav>
      <ArticleCollection
        articles={articles}
        badge="Civil aircraft"
        title="General aviation"
        description="Explore light aircraft, business jets, helicopters, training aircraft, and specialist civil types."
        icon={Compass}
        contributeHref="/contribute?title=Cessna+172&slug=cessna-172&contentType=aircraft"
        contributeLabel="Add a civil aircraft"
        emptyTitle="Help launch general aviation"
        emptyDescription="Create the first approved light aircraft, helicopter, or business jet article."
      />
    </main>
  );
}
