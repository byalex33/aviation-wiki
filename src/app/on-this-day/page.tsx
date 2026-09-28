import type { Metadata } from "next";
import Link from "next/link";

import { anniversaryDate } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";
import { OnThisDayExplorer, type OnThisDayEvent } from "./on-this-day-explorer";

export const metadata: Metadata = {
  title: "On This Day in Aviation",
  description: "Aviation history in short bullet points, with links to full articles and a free public API.",
  alternates: { canonical: "/on-this-day" },
};

export default async function OnThisDayPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const query = await searchParams;
  const requested = Array.isArray(query.date) ? undefined : query.date;
  const now = new Date();
  const todayMonth = now.getUTCMonth() + 1;
  const todayDay = now.getUTCDate();
  const parsed = requested ? anniversaryDate(requested, now) : null;
  const initialMonth = parsed ? parsed.getUTCMonth() + 1 : todayMonth;
  const initialDay = parsed ? parsed.getUTCDate() : todayDay;

  const rawEvents = await loadDatedAviationEvents();
  const events: OnThisDayEvent[] = rawEvents.map((event) => ({
    id: event.id,
    title: event.title,
    href: event.href,
    description: event.description,
    year: event.year,
    month: event.month,
    day: event.day,
    location: event.location,
    eventType: event.eventType,
    sourceCount: event.sources?.length ?? 0,
  }));

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 pb-24 pt-8 sm:px-6">
      <nav className="flex gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Main</Link>
        <span>/</span>
        <span className="text-foreground">On this day</span>
      </nav>
      <OnThisDayExplorer
        events={events}
        initialMonth={initialMonth}
        initialDay={initialDay}
        todayMonth={todayMonth}
        todayDay={todayDay}
        currentYear={now.getUTCFullYear()}
      />
    </main>
  );
}
