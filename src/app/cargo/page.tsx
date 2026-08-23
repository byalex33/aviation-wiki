import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Package } from "lucide-react";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isCargoAirline } from "@/lib/article-categories";
import { cn } from "@/lib/utils";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Cargo airlines and logistics",
  alternates: { canonical: "/cargo" },
  description:
    "Browse approved air cargo, freight, parcel, and logistics operator articles on aviation.wiki.",
};

export default async function CargoAirlinesPage() {
  const operators = (await listPublicSearchDocuments())
    .filter(isCargoAirline)
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
        <span> / Cargo &amp; logistics</span>
      </nav>

      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Badge
            variant="secondary"
            className="rounded-full text-orange-700 dark:text-orange-300"
          >
            Freight aviation
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Cargo &amp; logistics
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Explore dedicated cargo airlines, express parcel fleets, freight
            carriers, and aviation logistics operators including DHL.
          </p>
        </div>
        <Link
          href="/contribute"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "shrink-0",
          )}
        >
          Add an operator
        </Link>
      </section>

      {operators.length ? (
        <section
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Cargo airlines and logistics operators"
        >
          {operators.map((operator) => (
            <Link
              key={operator.id}
              href={operator.href}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="relative h-full gap-0 overflow-hidden py-0 shadow-xs transition-all group-hover:-translate-y-0.5 group-hover:border-orange-500/35 group-hover:shadow-md">
                <ArticleCardBackdrop imageUrl={operator.imageUrl} />
                <CardContent className="relative z-10 flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-10 place-items-center rounded-xl bg-orange-500/15 text-orange-700 dark:text-orange-300">
                      <Package className="size-5" />
                    </span>
                    <ArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
                  </div>
                  <h2 className="mt-5 text-lg font-semibold tracking-tight group-hover:text-primary">
                    {operator.title}
                  </h2>
                  {operator.description && (
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                      {operator.description}
                    </p>
                  )}
                  {operator.countries.length > 0 && (
                    <p className="mt-auto pt-5 text-xs text-muted-foreground">
                      {operator.countries.join(" · ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed p-10 text-center">
          <Package className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium">
            No approved cargo operator articles yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Contributors can add DHL or create the first cargo collection.
          </p>
        </div>
      )}
    </main>
  );
}
