import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowUpRight,
  Compass,
  Factory,
  Gauge,
  MapPin,
  Network,
  Newspaper,
  Package,
  Plane,
  PlaneTakeoff,
  Shield,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  aviationCategories,
  getAviationCategoryCounts,
  type AviationCategoryId,
} from "@/lib/article-categories";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "Aviation categories",
  description:
    "Browse every aviation.wiki category, from passenger and cargo airlines to aircraft, airports, manufacturers, engines, and past aviation events.",
};

const categoryPresentation = {
  commercial: {
    icon: PlaneTakeoff,
    color: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  cargo: {
    icon: Package,
    color: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  alliances: {
    icon: Network,
    color: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  military: {
    icon: Shield,
    color: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  commercialAircraft: {
    icon: Plane,
    color: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  },
  general: {
    icon: Compass,
    color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  news: {
    icon: Newspaper,
    color: "bg-red-500/15 text-red-700 dark:text-red-300",
  },
  airports: {
    icon: MapPin,
    color: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  manufacturers: {
    icon: Factory,
    color: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300",
  },
  engines: {
    icon: Gauge,
    color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  },
} satisfies Record<
  AviationCategoryId,
  { icon: typeof Compass; color: string }
>;

export default async function CategoriesPage() {
  const { isAuthenticated } = await auth();
  const documents = await listPublicSearchDocuments();
  const counts = getAviationCategoryCounts(documents);

  return (
    <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / Categories</span>
      </nav>

      <section className="grid items-end gap-7 lg:grid-cols-[minmax(0,48rem)_auto] lg:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Directory
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            All aviation categories
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Browse passenger and cargo operators, aircraft, airports,
            manufacturers, engines, past events, and the networks connecting
            them.
          </p>
        </div>
        <aside
          className="border-l-2 border-primary/25 pl-4 text-sm lg:mb-1 lg:max-w-52"
          aria-label="Contribute a category"
        >
          <p className="font-semibold">Missing a category?</p>
          <Link
            href={
              isAuthenticated
                ? "/contribute"
                : `/sign-in?redirect_url=${encodeURIComponent("/contribute")}`
            }
            className="article-link mt-1 inline-block"
          >
            {isAuthenticated
              ? "Contribute now."
              : "Sign in to contribute."}
          </Link>
        </aside>
      </section>

      <section
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Aviation categories"
      >
        {aviationCategories.map((category) => {
          const { icon: Icon, color } = categoryPresentation[category.id];
          const count = counts[category.id];
          return (
            <Link
              key={category.name}
              href={category.href}
              className="group block rounded-[20px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="h-full gap-0 overflow-hidden py-0 shadow-xs transition-all group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-md">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`grid size-11 place-items-center rounded-2xl ${color}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="rounded-full border bg-muted/40 px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                      {count} {count === 1 ? "article" : "articles"}
                    </span>
                  </div>
                  <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {category.label}
                  </p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight group-hover:text-primary">
                    {category.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {category.description}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-6 text-sm font-semibold">
                    <span>Browse category</span>
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
