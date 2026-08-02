import type { Metadata } from "next";
import { Factory } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Aircraft and engine manufacturers",
  description:
    "Browse aircraft manufacturers, engine makers, design bureaux, and aerospace companies on aviation.wiki.",
  alternates: { canonical: "/manufacturers" },
};

export default async function ManufacturersPage() {
  const articles = (await listPublicSearchDocuments())
    .filter((article) => article.contentType === "manufacturer")
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Manufacturers</span>
      </nav>
      <ArticleCollection
        articles={articles}
        badge="Aviation industry"
        title="Manufacturers"
        description="Explore aircraft manufacturers, engine makers, aerospace companies, and historic design bureaux."
        icon={Factory}
        contributeHref="/contribute?title=Airbus&slug=airbus&contentType=manufacturer"
        contributeLabel="Add a manufacturer"
        emptyTitle="Help create the manufacturer directory"
        emptyDescription="Create the first approved aircraft or engine manufacturer article."
      />
    </main>
  );
}
