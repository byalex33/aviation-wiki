import type { Metadata } from "next";
import Link from "next/link";
import { anniversaryDate, eventsOnDate } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";

export const metadata: Metadata = {
  title: "On This Day in Aviation",
  description: "Aviation history in short bullet points, with links to full articles and a free public API.",
  alternates: { canonical: "/on-this-day" },
};

const dateLabel = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function OnThisDayPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const query = await searchParams;
  const date = Array.isArray(query.date) ? null : anniversaryDate(query.date);
  const events = await loadDatedAviationEvents();
  const selectedEvents = date ? eventsOnDate(events, date) : [];
  const label = date ? dateLabel.format(date) : "Invalid date";
  const selected = date?.toISOString().slice(5, 10) ?? "";

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">Main</Link>
        <span> / On This Day</span>
      </nav>
      <h1 className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl">On This Day in Aviation</h1>
      <p className="mt-4 text-lg text-muted-foreground">Aviation history, one day at a time. Follow each link to read the full story.</p>

      <form action="/on-this-day" className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="anniversary-date" className="block text-sm font-medium">Month and day</label>
          <input key={selected} id="anniversary-date" name="date" defaultValue={selected} placeholder="12-17" pattern="[0-9]{2}-[0-9]{2}" required aria-describedby="date-hint" className="mt-2 w-32 rounded-md border bg-background px-3 py-2" />
          <p id="date-hint" className="mt-1 text-xs text-muted-foreground">MM-DD, e.g. 12-17</p>
        </div>
        <button type="submit" className="mb-5 rounded-md bg-primary px-4 py-2 text-primary-foreground">Show events</button>
        <Link href="/on-this-day" className="article-link mb-7 text-sm">Today</Link>
      </form>

      <section className="mt-8" aria-labelledby="events-heading">
        <h2 id="events-heading" className="text-2xl font-bold">{label}</h2>
        {!date ? <p role="alert" className="mt-4">Enter a valid month and day in MM-DD format. February 29 is supported.</p> : selectedEvents.length ? (
          <ul className="mt-5 list-disc space-y-4 pl-6 leading-7">
            {selectedEvents.map((event) => (
              <li key={event.id}>
                <span className="font-semibold">{event.year}</span>{" · "}
                <Link href={event.href} className="article-link">{event.title}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-muted-foreground">No published events for this date yet. Try another date or browse the history articles below.</p>}
      </section>

      <section className="mt-12" aria-labelledby="articles-heading">
        <h2 id="articles-heading" className="text-2xl font-bold">History articles</h2>
        {events.length ? (
          <ul className="mt-5 list-disc space-y-3 pl-6 leading-7">
            {events.map((event) => (
              <li key={event.id}>
                <span className="text-muted-foreground">{dateLabel.format(new Date(Date.UTC(2000, event.month - 1, event.day)))}, {event.year}</span>{" · "}
                <Link href={event.href} className="article-link">{event.title}</Link>
              </li>
            ))}
          </ul>
        ) : <p className="mt-4 text-muted-foreground">History articles will appear here as they are published with an exact event date.</p>}
        <Link href="/aviation-news" className="article-link mt-5 inline-block text-sm">Browse the article archive</Link>
      </section>

      <section className="mt-12 border-t pt-6" aria-labelledby="api-heading">
        <h2 id="api-heading" className="text-xl font-bold">Use the free API</h2>
        <p className="mt-3 leading-7 text-muted-foreground">Use these events on your own website or app. No API key is needed. The default date follows UTC.</p>
        <Link href={`/api/v1/on-this-day${date ? `?date=${selected}` : ""}`} className="article-link mt-3 inline-block break-all font-mono text-sm">/api/v1/on-this-day{date ? `?date=${selected}` : ""}</Link>
        <p className="mt-3"><Link href="/api-docs#on-this-day" className="article-link text-sm">API documentation and sources</Link></p>
      </section>
    </main>
  );
}
