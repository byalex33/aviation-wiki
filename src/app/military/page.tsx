import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Shield } from "lucide-react";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isMilitaryAircraft } from "@/lib/article-categories";
import { cn } from "@/lib/utils";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

// Reads the database at render time; the project builds without DB env, so
// this page is not prerendered (it was dynamic via the layout before #5).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Military aircraft",
  alternates: { canonical: "/military" },
  description:
    "Browse approved military aircraft articles on aviation.wiki.",
};

export default async function MilitaryAircraftPage() {
  const aircraft = (await listPublicSearchDocuments())
    .filter(isMilitaryAircraft)
    .toSorted((first, second) => first.title.localeCompare(second.title));

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Military aircraft</span>
      </nav>

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Badge
            variant="secondary"
            className="rounded-full text-amber-700 dark:text-amber-300"
          >
            Defence aviation
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Military aircraft
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Explore fighters, bombers, military transports, trainers,
            reconnaissance platforms, and unmanned aircraft.
          </p>
        </div>
        <Link
          href="/contribute"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "shrink-0",
          )}
        >
          Add an aircraft
        </Link>
      </section>

      {aircraft.length ? (
        <section
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Military aircraft"
        >
          {aircraft.map((article) => (
            <Link
              key={article.id}
              href={article.href}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="relative h-full gap-0 overflow-hidden py-0 shadow-xs transition-all group-hover:-translate-y-0.5 group-hover:border-amber-500/35 group-hover:shadow-md">
                <ArticleCardBackdrop imageUrl={article.imageUrl} />
                <CardContent className="relative z-10 flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      <Shield className="size-5" />
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight group-hover:text-primary">
                    {article.title}
                  </h2>
                  {article.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {article.description}
                    </p>
                  )}
                  {article.countries.length > 0 && (
                    <p className="mt-auto pt-5 text-xs text-muted-foreground">
                      {article.countries.join(" · ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <Shield className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">
            No approved military aircraft articles yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contributors can create the first one.
          </p>
        </div>
      )}
    </main>
  );
}
