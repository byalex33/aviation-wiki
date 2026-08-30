import type { Metadata } from "next";
import { Dices, Plane } from "lucide-react";
import Link from "next/link";

import { ArticleCollection } from "@/components/article-collection";
import { buttonVariants } from "@/components/ui/button";
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
      {articles.length > 0 && (
        <section className="mt-10 flex flex-col items-start justify-between gap-4 rounded-xl border bg-muted/30 p-5 sm:flex-row sm:items-center sm:p-6">
          <div>
            <h2 className="font-semibold">Not sure where to start?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Jump to a different approved aircraft article every time.
            </p>
          </div>
          <Link href="/aircraft/random" className={buttonVariants()} prefetch={false}>
            <Dices />
            Random aircraft
          </Link>
        </section>
      )}
    </main>
  );
}
