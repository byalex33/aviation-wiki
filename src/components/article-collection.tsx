import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { SearchDocument } from "@/lib/search-types";
import { cn } from "@/lib/utils";

export function ArticleCollection({
  articles,
  badge,
  title,
  description,
  icon: Icon,
  contributeHref,
  contributeLabel,
  emptyTitle,
  emptyDescription,
}: {
  articles: SearchDocument[];
  badge: string;
  title: string;
  description: string;
  icon: LucideIcon;
  contributeHref: string;
  contributeLabel: string;
  emptyTitle: string;
  emptyDescription: string;
}) {
  return (
    <>
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="rounded-full text-primary">
            {badge}
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            {title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {description}
          </p>
        </div>
        <Link
          href={contributeHref}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "shrink-0",
          )}
        >
          {contributeLabel}
        </Link>
      </section>

      {articles.length ? (
        <section
          className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          aria-label={title}
        >
          {articles.map((article) => (
            <Link
              key={article.id}
              href={article.href}
              className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Card className="relative h-full gap-0 overflow-hidden py-0 shadow-xs transition-all group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-md">
                <ArticleCardBackdrop imageUrl={article.imageUrl} />
                <CardContent className="relative z-10 flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
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
          <Icon className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">{emptyTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {emptyDescription}
          </p>
          <Link href={contributeHref} className={`${buttonVariants()} mt-5`}>
            {contributeLabel}
          </Link>
        </div>
      )}
    </>
  );
}
