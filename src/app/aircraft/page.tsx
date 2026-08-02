import type { Metadata } from "next";
import { Plane } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Aircraft encyclopedia",
  description:
    "Browse every approved civil, commercial, and military aircraft article on aviation.wiki.",
  alternates: { canonical: "/aircraft" },
};

export default async function AircraftIndexPage() {
  const articles = (await listPublicSearchDocuments())
    .filter((article) => article.contentType === "aircraft")
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Aircraft</span>
      </nav>
      <ArticleCollection
        articles={articles}
        badge="Aircraft directory"
        title="Aircraft encyclopedia"
        description="Explore civil, commercial, and military aircraft with specifications, variants, operators, engines, and cited history."
        icon={Plane}
        contributeHref="/contribute?contentType=aircraft"
        contributeLabel="Add an aircraft"
        emptyTitle="No approved aircraft articles yet"
        emptyDescription="Contributors can create the first aircraft article."
      />
    </main>
  );
}
