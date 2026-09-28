import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowRight,
  ArrowUpRight,
  CodeXml,
  Compass,
  Factory,
  Fan,
  GitCompareArrows,
  Hash,
  MapPin,
  Network,
  Newspaper,
  Package,
  Plane,
  PlaneTakeoff,
  Shield,
} from "lucide-react";

import { HomeSearch } from "@/components/home/home-search";
import { TrackedLink } from "@/components/tracked-actions";
import { AnnotatedText } from "@/components/ui/annotated-text";
import { MotionReveal } from "@/components/ui/home-motion";
import { TextReveal } from "@/components/ui/text-reveal";
import {
  aviationCategories,
  getAviationCategoryCounts,
  type AviationCategoryId,
} from "@/lib/article-categories";
import { aviationDataEnabled } from "@/lib/aviation-data-flags";
import { formatDisplayLabel } from "@/lib/display";
import { featuredArticles } from "@/lib/growth-content";
import { eventsOnDate } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";
import type { SearchDocument } from "@/lib/search-types";
import { cn } from "@/lib/utils";
import { getHomepageActivity, listPublicSearchDocuments } from "@/lib/wiki-public-db";

export const metadata: Metadata = {
  title: "aviation.wiki",
  description:
    "The free encyclopedia of aircraft, engines, airports, and aviation history.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "aviation.wiki",
    title: "aviation.wiki",
    description:
      "The free encyclopedia of aircraft, engines, airports, and aviation history.",
  },
  twitter: {
    card: "summary_large_image",
    title: "aviation.wiki",
    description:
      "The free encyclopedia of aircraft, engines, airports, and aviation history.",
  },
};

const directory: { name: string; items: [AviationCategoryId, typeof Plane][] }[] = [
  {
    name: "Aircraft",
    items: [
      ["commercialAircraft", Plane],
      ["military", Shield],
      ["general", Compass],
      ["engines", Fan],
    ],
  },
  {
    name: "Operators",
    items: [
      ["commercial", PlaneTakeoff],
      ["cargo", Package],
      ["alliances", Network],
    ],
  },
  {
    name: "Places & industry",
    items: [
      ["airports", MapPin],
      ["manufacturers", Factory],
      ["news", Newspaper],
    ],
  },
];

const tools = [
  { href: "/compare", title: "Compare aircraft", body: "Side-by-side specifications", icon: GitCompareArrows },
  { href: "/fleet", title: "Fleet database", body: "Airframes by operator", icon: Plane },
  ...(aviationDataEnabled
    ? [{ href: "/registrations", title: "Registration lookup", body: "Find an airframe by tail number", icon: Hash }]
    : []),
  { href: "/api-docs", title: "Open API", body: "Fleet exports and anniversaries", icon: CodeXml },
];

const number = new Intl.NumberFormat("en-GB");
const plural = (count: number, word: string) => `${number.format(count)} ${word}${count === 1 ? "" : "s"}`;
// Times on the board are UTC, the aviation standard.
const utcDay = (date: Date) => date.toISOString().slice(0, 10);

function boardTime(value: string, now: Date) {
  const date = new Date(value);
  return utcDay(date) === utcDay(now)
    ? date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function featuredLinkProps(article: SearchDocument) {
  return {
    href: article.href,
    eventName: "article_discovery_click",
    eventProperties: { slug: article.slug, contentType: article.contentType, surface: "homepage_featured" },
  } as const;
}

const darkPanel = "bg-[hsl(210_12%_11%)] text-white dark:border dark:bg-card";
const eyebrow = "font-mono text-[10px] font-semibold uppercase tracking-[0.18em]";

export default async function Home() {
  await connection();
  const [documents, datedEvents, activity] = await Promise.all([
    listPublicSearchDocuments(),
    loadDatedAviationEvents(),
    getHomepageActivity(),
  ]);
  const now = new Date();
  const todayEvents = eventsOnDate(datedEvents, now);
  const categoryCounts = getAviationCategoryCounts(documents);
  const [lead, ...rest] = featuredArticles(documents, now);
  const groups = directory.map((group) => {
    const items = group.items.map(([id, icon]) => ({
      ...aviationCategories.find((category) => category.id === id)!,
      icon,
      count: categoryCounts[id],
    }));
    return { ...group, items, total: items.reduce((sum, item) => sum + item.count, 0) };
  });

  return (
    <main className="mx-auto w-full max-w-[1200px] px-5 pb-24 sm:px-6">
      <section className="flex flex-wrap items-center gap-x-14 gap-y-10 pb-14 pt-12 sm:pt-16">
        <div className="min-w-0 flex-[1_1_440px]">
          <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
              {plural(documents.length, "approved article")}
            </span>
            <span className="text-border" aria-hidden="true">/</span>
            <span>{plural(activity.sourceCount, "source")}</span>
          </p>
          <h1 className="mt-[18px] text-balance text-[40px] font-bold leading-none tracking-[-0.055em] sm:text-[60px]">
            <TextReveal text="The free encyclopedia of everything "><AnnotatedText>that flies</AnnotatedText></TextReveal>
          </h1>
          <p className="mt-[22px] max-w-[480px] text-pretty text-base leading-relaxed text-muted-foreground">
            Aircraft, airlines, airports, engines and aviation history. Every article is sourced, reviewed, and has a public revision history.
          </p>
          <HomeSearch />
        </div>

        {activity.recentlyPublished.length > 0 && (
          <section aria-labelledby="recently-published" className={cn("min-w-0 flex-[1_1_400px] overflow-hidden rounded-[18px] shadow-[0_30px_60px_-30px_rgba(0,0,0,.5)]", darkPanel)}>
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
              <h2 id="recently-published" className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                <PlaneTakeoff className="size-3.5 text-[hsl(356_84%_62%)] dark:text-white/70" aria-hidden="true" />
                Recently published
              </h2>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
                <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                Live
              </span>
            </div>
            <div className="grid grid-cols-[52px_minmax(0,1fr)_78px] gap-3 px-5 py-2.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35" aria-hidden="true">
              <span>UTC</span>
              <span>Article</span>
              <span className="text-right">Status</span>
            </div>
            <ol>
              {activity.recentlyPublished.map((article) => (
                <li key={article.href}>
                  <Link
                    href={article.href}
                    className="grid grid-cols-[52px_minmax(0,1fr)_78px] items-center gap-3 border-t border-white/[0.06] px-5 py-[11px] text-white transition-colors hover:bg-white/[0.04] hover:text-white"
                  >
                    <time dateTime={article.publishedAt} className="font-mono text-[13px] text-amber-300">
                      {boardTime(article.publishedAt, now)}
                    </time>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{article.title}</span>
                      <span className="mt-px block font-mono text-[10px] uppercase tracking-[0.12em] text-white/45">
                        {formatDisplayLabel(article.contentType)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "justify-self-end rounded px-[7px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em]",
                        article.isNew ? "bg-primary text-primary-foreground" : "bg-white/10 text-white/80",
                      )}
                    >
                      {article.isNew ? "New" : "Updated"}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </section>

      <section id="browse" aria-labelledby="explore-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={cn(eyebrow, "text-primary")}>Directory</p>
            <h2 id="explore-heading" className="mt-1.5 text-[28px] font-bold tracking-[-0.04em]">Explore aviation</h2>
          </div>
          <Link href="/categories" className="article-link flex min-h-10 items-center gap-1 text-sm font-medium">
            View all categories
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-[18px] grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-4">
          {groups.map((group, index) => (
            <MotionReveal key={group.name} delay={index * 0.06}>
              <div className="h-full rounded-[18px] border bg-card p-2">
                <div className="flex items-baseline justify-between gap-3 px-3 pb-3 pt-3.5">
                  <h3 className="text-lg font-bold tracking-[-0.03em]">{group.name}</h3>
                  <span className="font-mono text-[11px] text-muted-foreground">{plural(group.total, "article")}</span>
                </div>
                <ul>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          className="group grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="grid size-9 place-items-center rounded-[10px] bg-secondary">
                            <Icon className="size-[17px]" aria-hidden="true" />
                          </span>
                          <span className="text-[15px] font-semibold tracking-[-0.015em]">{item.name}</span>
                          <span className="font-mono text-xs text-muted-foreground">{number.format(item.count)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </MotionReveal>
          ))}
        </div>
      </section>

      <section aria-label="Aviation history" className="mt-12 flex flex-wrap gap-4">
        <Link
          href="/on-this-day"
          className="flex min-w-0 flex-[1_1_360px] items-center gap-6 rounded-[18px] border bg-card p-6 transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="w-24 shrink-0 overflow-hidden rounded-xl border text-center" aria-hidden="true">
            <span className="block bg-primary py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
              {/* en-US keeps the three-letter "Sep" (en-GB renders "Sept"). */}
              {now.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}
            </span>
            <span className="block pb-2.5 pt-2 text-[40px] font-bold leading-none tracking-[-0.04em]">{now.getUTCDate()}</span>
          </span>
          <span className="min-w-0">
            <span className={cn(eyebrow, "block tracking-[0.16em] text-muted-foreground")}>Daily history</span>
            <strong className="mt-1.5 block text-xl font-bold tracking-[-0.03em]">On this day in aviation</strong>
            <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
              {todayEvents.length
                ? `${plural(todayEvents.length, "approved event")} happened on this date.`
                : "Explore aviation anniversaries from approved event reports."}
            </span>
          </span>
        </Link>
        <Link
          href="/aviation-news"
          className="flex min-w-0 flex-[1_1_360px] items-center gap-6 rounded-[18px] border bg-card p-6 transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <span className="grid size-24 shrink-0 place-items-center rounded-xl bg-accent text-primary" aria-hidden="true">
            <Newspaper className="size-[30px]" />
          </span>
          <span className="min-w-0">
            <span className={cn(eyebrow, "block tracking-[0.16em] text-muted-foreground")}>
              Past events · {plural(categoryCounts.news, "report")}
            </span>
            <strong className="mt-1.5 block text-xl font-bold tracking-[-0.03em]">Aviation news archive</strong>
            <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">
              Completed events preserved with dates, outcomes, context, and linked sources.
            </span>
          </span>
        </Link>
      </section>

      <section aria-label="Tools" className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-center gap-3 rounded-[14px] bg-secondary px-4 py-3.5 transition-colors hover:bg-muted-foreground/15 hover:text-foreground"
            >
              <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{tool.title}</span>
                <span className="mt-px block text-xs text-muted-foreground">{tool.body}</span>
              </span>
            </Link>
          );
        })}
      </section>

      {lead && (
        <section aria-labelledby="featured-heading" className="render-deferred mt-16">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className={cn(eyebrow, "text-primary")}>Featured</p>
              <h2 id="featured-heading" className="mt-1.5 text-[28px] font-bold tracking-[-0.04em]">Worth reading</h2>
            </div>
            <Link href="/search?q=*" className="article-link flex min-h-10 items-center text-sm font-medium">
              Browse all
            </Link>
          </div>
          <div className="mt-[18px] flex flex-wrap gap-4">
            <TrackedLink
              {...featuredLinkProps(lead)}
              className="relative isolate flex min-h-[440px] min-w-0 flex-[1.3_1_420px] flex-col justify-end overflow-hidden rounded-[18px] bg-[hsl(210_10%_15%)] text-white hover:text-white"
            >
              {lead.imageUrl && (
                <Image
                  src={lead.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1152px) 640px, 100vw"
                  unoptimized
                  className="pointer-events-none -z-10 object-cover"
                />
              )}
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(18,20,25,0)_30%,rgba(18,20,25,.92)_100%)]" />
              <span className="block p-7">
                <span className={cn(eyebrow, "block tracking-[0.16em] text-[hsl(356_84%_70%)] dark:text-white/70")}>
                  {formatDisplayLabel(lead.contentType)}
                </span>
                <strong className="mt-2 block text-[34px] font-bold leading-[1.05] tracking-[-0.045em]">{lead.title}</strong>
                <span className="mt-2.5 block max-w-[460px] text-sm leading-relaxed text-white/75 line-clamp-3">{lead.description}</span>
                <span className="mt-[18px] inline-flex items-center gap-1.5 text-[13px] font-semibold">
                  Read article
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </span>
            </TrackedLink>
            <ul className="flex min-w-0 flex-[1_1_340px] flex-col">
              {rest.slice(0, 5).map((article) => (
                <li key={article.id}>
                  <TrackedLink
                    {...featuredLinkProps(article)}
                    className="grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 border-b py-3 hover:text-primary"
                  >
                    <span className="relative block h-16 overflow-hidden rounded-[10px] bg-secondary">
                      {article.imageUrl && (
                        <Image src={article.imageUrl} alt="" fill sizes="88px" unoptimized className="object-cover" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {formatDisplayLabel(article.contentType)}
                      </span>
                      <span className="mt-[3px] block text-base font-semibold tracking-[-0.02em]">{article.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">{article.description}</span>
                    </span>
                  </TrackedLink>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className={cn("relative mt-16 overflow-hidden rounded-[22px] p-8 sm:p-10", darkPanel)}>
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0 flex-[1_1_420px]">
            <h2 className="text-balance text-[32px] font-bold leading-[1.05] tracking-[-0.045em]">Built by people who know aircraft.</h2>
            <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-white/70">
              Fix a date, add a source, or write an article that doesn&apos;t exist yet. Every edit is reviewed by a moderator before it goes live.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/contribute"
              className="inline-flex h-[46px] items-center rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90 hover:text-primary-foreground"
            >
              Start contributing
            </Link>
            <Link
              href="/contribute"
              className="inline-flex h-[46px] items-center rounded-[10px] border border-white/20 px-5 text-[15px] font-medium text-white transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              How it works
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
