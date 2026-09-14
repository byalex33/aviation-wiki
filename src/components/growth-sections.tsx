import {
  ArrowUpRight,
  ClipboardCheck,
  FilePlus2,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { ArticleCardBackdrop } from "@/components/article-card-backdrop";
import { TrackedLink } from "@/components/tracked-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ContributionMission } from "@/lib/growth-content";
import type { SearchDocument } from "@/lib/search-types";

import type { ContentType } from "@/lib/wiki-types";

const contentTypeLabel: Record<ContentType, string> = {
  aircraft: "Aircraft",
  airline: "Airline",
  airport: "Airport",
  manufacturer: "Manufacturer",
  engine: "Engine",
  alliance: "Alliance",
  event: "Aviation news",
};

export function FeaturedArticles({
  articles,
}: {
  articles: SearchDocument[];
}) {
  if (!articles.length) return null;
  return (
    <section
      className="render-deferred mb-14"
      aria-label="Featured articles"
    >
      <div className="mb-5 flex justify-end">
        <Link
          href="/search?q=*"
          className="article-link flex min-h-10 shrink-0 items-center gap-1 text-sm font-medium"
        >
          Browse all
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <TrackedLink
            key={article.id}
            href={article.href}
            eventName="article_discovery_click"
            eventProperties={{
              slug: article.slug,
              contentType: article.contentType,
              surface: "homepage_featured",
            }}
            className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {/* MuseumPlacardCard layout adapted from OpenSourceUI (MIT); see THIRD_PARTY_NOTICES.md. */}
            <Card className="h-full gap-0 overflow-hidden rounded-xl py-0 shadow-sm transition-[border-color,box-shadow] group-hover:border-primary/35 group-hover:shadow-md motion-reduce:transition-none">
              <div className="relative isolate flex h-36 items-center justify-center overflow-hidden border-b bg-muted/40" aria-hidden="true">
                <Sparkles className="size-10 text-primary/20" strokeWidth={1} />
                <ArticleCardBackdrop imageUrl={article.imageUrl} />
              </div>
              <CardContent className="flex flex-1 flex-col p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {contentTypeLabel[article.contentType]}
                </p>
                <h3 className="mt-3 font-serif text-xl leading-snug italic group-hover:text-primary">
                  {article.title}
                </h3>
                <p className="mb-5 mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {article.description}
                </p>
                <span className="mt-auto flex items-center justify-between gap-2 border-t pt-3 text-xs font-medium">
                  Read article
                  <ArrowUpRight className="size-3.5" />
                </span>
              </CardContent>
            </Card>
          </TrackedLink>
        ))}
      </div>
    </section>
  );
}

export function ContributionMissions({
  missions,
  compact = false,
}: {
  missions: ContributionMission[];
  compact?: boolean;
}) {
  if (!missions.length) return null;
  const visible = compact ? missions.slice(0, 4) : missions;

  return (
    <section
      className={compact ? "render-deferred mb-4" : ""}
      aria-label={compact ? "Contribution missions" : undefined}
      aria-labelledby={compact ? undefined : "missions-heading"}
    >
      {compact ? (
        <div className="mb-5 flex justify-end">
          <Link
            href="/contribute"
            className="article-link flex min-h-10 items-center gap-1 text-sm font-semibold"
          >
            See every mission
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mb-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Contribution missions
          </p>
          <h2 id="missions-heading" className="mt-1 text-2xl font-bold">
            Choose a useful next task
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each mission fills a visible gap or improves an article readers are
            already discovering.
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((mission) => (
          <TrackedLink
            key={mission.id}
            href={mission.href}
            eventName="contribution_mission_click"
            eventProperties={{
              mission: mission.id,
              surface: compact ? "homepage" : "contribute",
            }}
            className="group rounded-xl border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {mission.id.startsWith("create-") ? (
                  <FilePlus2 className="size-5" />
                ) : (
                  <ClipboardCheck className="size-5" />
                )}
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <Badge variant="outline" className="mt-5">
              {mission.label}
            </Badge>
            <h3 className="mt-3 font-semibold group-hover:text-primary">
              {mission.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mission.description}
            </p>
          </TrackedLink>
        ))}
      </div>
      {compact && (
        <p className="mt-4 text-sm text-muted-foreground">
          Pick a focused task, add sources, and submit it for moderator review.
        </p>
      )}
    </section>
  );
}
