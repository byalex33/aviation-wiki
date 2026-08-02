import type { Metadata } from "next";
import { Gauge } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Aircraft engines",
  description:
    "Browse piston, turboprop, turbojet, and turbofan engine articles on aviation.wiki.",
  alternates: { canonical: "/engines" },
};

export default async function EnginesPage() {
  const articles = (await listPublicSearchDocuments())
    .filter((article) => article.contentType === "engine")
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Engines</span>
      </nav>
      <ArticleCollection
        articles={articles}
        badge="Propulsion"
        title="Aircraft engines"
        description="Explore piston engines, turboprops, turbojets, turbofans, applications, specifications, and variants."
        icon={Gauge}
        contributeHref="/contribute?title=Rolls-Royce+Trent+1000&slug=rolls-royce-trent-1000&contentType=engine"
        contributeLabel="Add an engine"
        emptyTitle="Help create the engine directory"
        emptyDescription="Create the first approved aircraft engine article."
      />
    </main>
  );
}
