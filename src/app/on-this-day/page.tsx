import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { eventsOnDate } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "On This Day in Aviation",
  description:
    "Explore aviation events that happened on this date, backed by approved aviation.wiki articles and sources.",
  alternates: { canonical: "/on-this-day" },
};

const monthName = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
});

export default async function OnThisDayPage() {
  const today = new Date();
  const events = await loadDatedAviationEvents();
  const todayEvents = eventsOnDate(events, today);
  const todayLabel = new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(today);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">Main</Link>
        <span> / On This Day</span>
      </nav>
      <section className="max-w-3xl">
        <Badge variant="secondary" className="rounded-full text-primary">
          <CalendarDays /> {todayLabel}
        </Badge>
        <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          On This Day in Aviation
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          Anniversaries drawn from approved, cited aviation event reports.
          Dates without a precise day stay in the news archive instead of being
          assigned a guessed anniversary.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="today-heading">
        <h2 id="today-heading" className="text-2xl font-bold">
          {todayEvents.length ? `Events on ${todayLabel}` : `No recorded event for ${todayLabel} yet`}
        </h2>
        {todayEvents.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {todayEvents.map((event) => <EventCard key={event.id} event={event} />)}
          </div>
        ) : (
          <p className="mt-3 max-w-2xl text-muted-foreground">
            The calendar only includes precise dates from approved event articles.
            Browse the archive below or help document a sourced aviation event.
          </p>
        )}
      </section>

      <section className="mt-12" aria-labelledby="calendar-heading">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Anniversary calendar</p>
            <h2 id="calendar-heading" className="mt-1 text-2xl font-bold">All dated events</h2>
          </div>
          <Link href="/aviation-news" className="article-link text-sm">Browse every archived event</Link>
        </div>
        {events.length ? (
          <div className="mt-5 divide-y overflow-hidden rounded-xl border bg-card">
            {events.map((event) => (
              <Link key={event.id} href={event.href} className="grid gap-2 p-5 transition hover:bg-muted/35 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                <time dateTime={event.eventDate} className="font-mono text-sm font-semibold text-primary">
                  {monthName.format(new Date(Date.UTC(2024, event.month - 1, 1)))} {event.day}, {event.year}
                </time>
                <span>
                  <strong className="block">{event.title}</strong>
                  {event.location && <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{event.location}</span>}
                </span>
                <Badge variant="outline" className="w-fit">{event.eventType || "Aviation event"}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No approved event article has a precise calendar date yet.
          </div>
        )}
      </section>
    </main>
  );
}

function EventCard({ event }: { event: Awaited<ReturnType<typeof loadDatedAviationEvents>>[number] }) {
  return (
    <Link href={event.href} className="group block">
      <Card className="h-full gap-0 py-0 transition group-hover:border-primary/35 group-hover:shadow-md">
        <CardHeader className="p-5 pb-3">
          <Badge variant="outline" className="w-fit">{event.year}</Badge>
          <CardTitle className="mt-3 text-xl group-hover:text-primary">{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">{event.description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
