import type { Metadata } from "next";
import Link from "next/link";

import { anniversaryDate } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";
import { onThisDayEvents, toIndexEntry } from "./events";
import { OnThisDayExplorer } from "./on-this-day-explorer";

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

  // Only the selected date ships with descriptions and sources; the explorer
  // loads other dates on demand, which keeps ~1,500 descriptions off the page.
  const rawEvents = await loadDatedAviationEvents();
  const initialEvents = (await onThisDayEvents(initialMonth, initialDay, rawEvents)) ?? [];

  return (
    <main className="mx-auto w-full max-w-[960px] px-5 pb-24 pt-8 sm:px-6">
      <nav className="flex gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Main</Link>
        <span>/</span>
        <span className="text-foreground">On this day</span>
      </nav>
      <OnThisDayExplorer
        index={rawEvents.map(toIndexEntry)}
        initialEvents={initialEvents}
        initialMonth={initialMonth}
        initialDay={initialDay}
        todayMonth={todayMonth}
        todayDay={todayDay}
        currentYear={now.getUTCFullYear()}
      />
    </main>
  );
}
