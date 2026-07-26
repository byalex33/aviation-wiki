import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  Network,
  Plane,
  PlaneTakeoff,
  Search,
  Shield,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  aviationCategories,
  featuredAviationCategoryIds,
  getAviationCategoryCounts,
  type FeaturedAviationCategoryId,
} from "@/lib/article-categories";
import { cn } from "@/lib/utils";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

const featuredCategoryPresentation = {
  commercial: {
    glyph: "AIR",
    icon: PlaneTakeoff,
    cardClass: "from-sky-500/15 via-card to-card",
    iconClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  alliances: {
    glyph: "ALL",
    icon: Network,
    cardClass: "from-violet-500/15 via-card to-card",
    iconClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  military: {
    glyph: "MIL",
    icon: Shield,
    cardClass: "from-amber-500/15 via-card to-card",
    iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  general: {
    glyph: "GEN",
    icon: Compass,
    cardClass: "from-emerald-500/15 via-card to-card",
    iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
} satisfies Record<
  FeaturedAviationCategoryId,
  {
    glyph: string;
    icon: typeof Compass;
    cardClass: string;
    iconClass: string;
  }
>;

const categories = featuredAviationCategoryIds.map((id) => ({
  ...aviationCategories.find((category) => category.id === id)!,
  ...featuredCategoryPresentation[id],
}));

export default async function Home() {
  const documents = await listPublicSearchDocuments();
  const categoryCounts = getAviationCategoryCounts(documents);
  return (
    <main className="home-background relative overflow-hidden pb-20">
      <div className="pointer-events-none absolute inset-0 text-muted-foreground" aria-hidden="true">
        <Plane className="home-plane absolute left-[3%] top-24 size-6 -rotate-12 opacity-15" />
        <Plane className="home-plane absolute right-[4%] top-36 size-7 rotate-[18deg] opacity-15" />
        <Plane className="home-plane absolute left-[1%] top-[43%] size-5 -rotate-[28deg] opacity-10" />
        <Plane className="home-plane absolute right-[2%] top-[53%] size-8 rotate-12 opacity-10" />
        <Plane className="home-plane absolute bottom-[28%] left-[9%] size-6 rotate-[24deg] opacity-10" />
        <Plane className="home-plane absolute bottom-24 right-[8%] size-5 -rotate-[18deg] opacity-15" />
        <Plane className="home-plane absolute bottom-10 left-[42%] size-7 rotate-[8deg] opacity-10" />
      </div>
      <div className="relative mx-auto max-w-[1200px] px-5 sm:px-6">
        <section className="px-0 py-16 text-center sm:py-20">
        <Badge variant="outline" className="mb-5 h-7 rounded-full bg-card px-3 font-medium text-muted-foreground">
          <span className="mr-1 size-1.5 rounded-full bg-primary" />{documents.length} approved {documents.length === 1 ? "article" : "articles"}
        </Badge>
        <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-[52px]">The free encyclopedia of everything that flies</h1>
        <form className="relative mx-auto mt-8 max-w-[600px]" action="/search">
          <Search className="absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input name="q" className="h-[52px] rounded-xl bg-card pl-12 pr-28 text-base shadow-md" placeholder="Search names, codes, registrations…" aria-label="Search aviation.wiki" />
          <button type="submit" className={cn(buttonVariants({ size: "lg" }), "absolute right-1.5 top-1.5 h-10 px-5")}>Search</button>
        </form>
        </section>

        <section id="browse" className="mb-12">
      <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">Directory</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">Explore aviation</h2>
          </div>
          <Link href="/categories" className="article-link flex shrink-0 items-center gap-1 text-sm font-medium">
            View all categories
            <ArrowUpRight className="size-3.5" />
          </Link>
      </div>
        <div className="grid gap-4 md:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;
            const count = categoryCounts[category.id];
            return (
              <Link key={category.name} href={category.href} className="group block rounded-[22px] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Card className={`relative min-h-[240px] h-full gap-0 overflow-hidden border bg-gradient-to-br py-0 shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:border-primary/35 group-hover:shadow-xl ${category.cardClass}`}>
                  <span className="pointer-events-none absolute -right-3 -top-7 font-mono text-[92px] font-black tracking-[-0.12em] text-foreground/[0.035]" aria-hidden="true">{category.glyph}</span>
                  <CardContent className="relative flex h-full min-h-[240px] flex-col p-6 sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                      <span className={`grid size-12 place-items-center rounded-2xl ring-1 ring-inset ring-current/10 ${category.iconClass}`}>
                        <Icon className="size-5" strokeWidth={1.8} />
                      </span>
                      <span className="rounded-full border bg-background/70 px-3 py-1 font-mono text-[11px] text-muted-foreground backdrop-blur-sm">
                        {count.toLocaleString()} {count === 1 ? "article" : "articles"}
                      </span>
                    </div>
                    <div className="mt-7">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{category.label}</p>
                      <h3 className="mt-1 text-2xl font-bold tracking-tight">{category.name}</h3>
                      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-6 text-sm font-semibold">
                      <span>Browse collection</span>
                      <span className="grid size-9 place-items-center rounded-full border bg-background/70 transition duration-300 group-hover:rotate-45 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
                        <ArrowUpRight className="size-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
        </section>
      </div>
    </main>
  );
}
