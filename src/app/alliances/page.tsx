import type { Metadata } from "next";
import Link from "next/link";
import { Network } from "lucide-react";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

// Reads the database at render time; the project builds without DB env, so
// this page is not prerendered (it was dynamic via the layout before #5).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Airline alliances",
  alternates: { canonical: "/alliances" },
  description: "Browse airline alliance articles on aviation.wiki.",
};

export default async function AlliancesPage() {
  const alliances = (await listPublicSearchDocuments()).filter(
    (article) => article.contentType === "alliance",
  );

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">Main</Link>
        <span> / Alliances</span>
      </nav>
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="rounded-full text-primary">Commercial aviation</Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">Airline alliances</h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Explore global airline networks, their history, benefits, and member carriers.
          </p>
        </div>
        <Link href="/contribute" className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}>
          Add an alliance
        </Link>
      </section>

      {alliances.length ? (
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Airline alliances">
          {alliances.map((alliance) => (
            <Link key={alliance.id} href={alliance.href} className="group block">
              <Card className="relative h-full gap-0 overflow-hidden py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                <ArticleCardBackdrop imageUrl={alliance.imageUrl} />
                <CardContent className="relative z-10 p-5">
                  <Network className="size-6 text-primary" />
                  <h2 className="mt-4 text-lg font-semibold">{alliance.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">View alliance article</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <Network className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No approved alliance articles yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Contributors can create the first one.</p>
        </div>
      )}
    </main>
  );
}
