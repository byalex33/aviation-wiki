"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronLeft, ChevronRight, MapPin } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { loadOnThisDayEventsAction } from "./actions";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3));
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const WEEK_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];

const dateHeadingFormatter = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", timeZone: "UTC" });

/** Every event, without details: enough for counts, the calendar and the month list. */
export type OnThisDayIndexEntry = {
  title: string;
  href: string;
  year: number;
  month: number;
  day: number;
};

export type OnThisDayEvent = OnThisDayIndexEntry & {
  description: string;
  location?: string;
  eventType?: string;
  sourceCount: number;
};

type SelectedEvent = OnThisDayIndexEntry & Partial<OnThisDayEvent>;

type OnThisDayExplorerProps = {
  index: OnThisDayIndexEntry[];
  initialEvents: OnThisDayEvent[];
  initialMonth: number;
  initialDay: number;
  todayMonth: number;
  todayDay: number;
  currentYear: number;
};

const dateKey = (month: number, day: number) => `${month}-${day}`;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

/** Walks (month, day) by `offset` days using a leap year so 29 February stays reachable. */
function shiftDate(month: number, day: number, offset: number): [number, number] {
  const shifted = new Date(Date.UTC(2000, month - 1, day + offset));
  return [shifted.getUTCMonth() + 1, shifted.getUTCDate()];
}

export function OnThisDayExplorer({ index, initialEvents, initialMonth, initialDay, todayMonth, todayDay, currentYear }: OnThisDayExplorerProps) {
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [browseMonth, setBrowseMonth] = useState(initialMonth);
  const [copied, setCopied] = useState(false);
  const [details, setDetails] = useState<Record<string, OnThisDayEvent[]>>({
    [dateKey(initialMonth, initialDay)]: initialEvents,
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, OnThisDayIndexEntry[]>();
    for (const event of index) {
      const key = dateKey(event.month, event.day);
      const bucket = map.get(key);
      if (bucket) bucket.push(event);
      else map.set(key, [event]);
    }
    return map;
  }, [index]);

  const browseCounts = useMemo(() => {
    const counts = new Array(12).fill(0);
    for (const event of index) counts[event.month - 1] += 1;
    return counts;
  }, [index]);

  function eventsOn(m: number, d: number) {
    return eventsByDate.get(dateKey(m, d)) ?? [];
  }

  const selectedKey = dateKey(month, day);
  const needsDetails = !(selectedKey in details) && eventsOn(month, day).length > 0;
  useEffect(() => {
    if (!needsDetails) return;
    let current = true;
    loadOnThisDayEventsAction(month, day)
      .then((loaded) => {
        if (current && loaded) setDetails((previous) => ({ ...previous, [dateKey(month, day)]: loaded }));
      })
      // Titles, years and links from the index still render without details.
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [needsDetails, month, day]);

  function goTo(nextMonth: number, nextDay: number, options: { closePicker?: boolean } = {}) {
    setMonth(nextMonth);
    setDay(nextDay);
    setBrowseMonth(nextMonth);
    setCopied(false);
    if (options.closePicker) setPickerOpen(false);
  }

  const selectedEvents: SelectedEvent[] = details[selectedKey] ?? eventsOn(month, day);
  const dateLabel = dateHeadingFormatter.format(new Date(Date.UTC(2000, month - 1, day)));
  const notToday = month !== todayMonth || day !== todayDay;

  let nearest: [number, number] | null = null;
  if (!selectedEvents.length) {
    for (let offset = 1; offset < 366 && !nearest; offset++) {
      for (const candidate of [offset, -offset]) {
        const [nm, nd] = shiftDate(month, day, candidate);
        if (eventsOn(nm, nd).length) {
          nearest = [nm, nd];
          break;
        }
      }
    }
  }

  const iso = `${pad(month)}-${pad(day)}`;
  const apiUrl = `/api/v1/on-this-day?date=${iso}`;
  const sample = selectedEvents.length
    ? JSON.stringify({ date: iso, timezone: "UTC", count: selectedEvents.length, events: [{ year: selectedEvents[0].year, title: selectedEvents[0].title, url: selectedEvents[0].href }] }, null, 2)
    : JSON.stringify({ date: iso, timezone: "UTC", count: 0, events: [] }, null, 2);

  function copyApiUrl() {
    navigator.clipboard?.writeText(`${window.location.origin}${apiUrl}`).catch(() => {});
    setCopied(true);
  }

  const browseEvents = index.filter((event) => event.month === browseMonth);

  return (
    <>
      <section className="mt-7">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">On this day in aviation</p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-[clamp(40px,7vw,64px)] font-bold leading-none tracking-[-0.055em]">{dateLabel}</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => goTo(...shiftDate(month, day, -1))} aria-label="Previous day" className="grid size-10 place-items-center rounded-[10px] border bg-card hover:bg-secondary">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen} className="inline-flex h-10 items-center gap-2 rounded-[10px] border bg-card px-3.5 text-sm font-semibold hover:bg-secondary">
              <Calendar className="size-[15px]" aria-hidden="true" />Pick a date
            </button>
            <button type="button" onClick={() => goTo(...shiftDate(month, day, 1))} aria-label="Next day" className="grid size-10 place-items-center rounded-[10px] border bg-card hover:bg-secondary">
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            {notToday && (
              <button type="button" onClick={() => goTo(todayMonth, todayDay)} className="h-10 rounded-[10px] px-3 text-sm font-semibold text-primary hover:bg-accent">
                Today
              </button>
            )}
          </div>
        </div>

        {pickerOpen && (
          <div className="mt-4 flex flex-col gap-3.5 rounded-2xl border bg-card p-4">
            <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
              {SHORT_MONTHS.map((label, index) => {
                const monthNumber = index + 1;
                const active = monthNumber === month;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => goTo(monthNumber, Math.min(day, DAYS_IN_MONTH[index]))}
                    className={cn("h-[34px] rounded-lg text-[13px] font-semibold", active ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:outline hover:outline-1 hover:outline-border")}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(40px,1fr))] gap-1">
              {Array.from({ length: DAYS_IN_MONTH[month - 1] }, (_, index) => index + 1).map((dayNumber) => {
                const active = dayNumber === day;
                const hasEvents = eventsOn(month, dayNumber).length > 0;
                return (
                  <button
                    key={dayNumber}
                    type="button"
                    onClick={() => goTo(month, dayNumber, { closePicker: true })}
                    className={cn("relative h-10 rounded-lg font-mono text-[13px]", active ? "bg-primary text-primary-foreground" : "hover:outline hover:outline-1 hover:outline-border")}
                  >
                    {dayNumber}
                    {hasEvents && <span className={cn("absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full", active ? "bg-primary-foreground" : "bg-primary")} />}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Dots mark dates with published events. 29 February is included.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-7 gap-1.5">
          {WEEK_OFFSETS.map((offset) => {
            const [wm, wd] = shiftDate(month, day, offset);
            const count = eventsOn(wm, wd).length;
            const active = offset === 0;
            return (
              <button
                key={offset}
                type="button"
                onClick={() => goTo(wm, wd)}
                className={cn("flex flex-col items-center gap-1 rounded-xl border py-2.5", active ? "border-foreground bg-foreground text-background" : "bg-card hover:border-foreground/30")}
              >
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] opacity-70">{SHORT_MONTHS[wm - 1]}</span>
                <span className="text-xl font-bold tracking-[-0.03em]">{wd}</span>
                <span className="text-[11px] opacity-75">{count ? `${count} event${count === 1 ? "" : "s"}` : "—"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-9">
        {selectedEvents.length ? (
          <>
            <p className="text-sm text-muted-foreground">{selectedEvents.length === 1 ? "1 event on this date" : `${selectedEvents.length} events on this date`}</p>
            <ol className="mt-3.5 flex flex-col gap-3">
              {selectedEvents.map((event, position) => (
                <li key={`${event.href}-${event.year}-${position}`} className="grid grid-cols-[minmax(88px,120px)_minmax(0,1fr)] gap-5 rounded-[18px] border bg-card p-5 sm:p-[22px]">
                  <div>
                    <p className="font-mono text-[28px] font-semibold leading-none tracking-[-0.04em] sm:text-[30px]">{event.year}</p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{currentYear - event.year} years ago</p>
                  </div>
                  <div className="min-w-0">
                    <Link href={event.href} className="text-pretty text-[19px] font-semibold leading-[1.3] tracking-[-0.02em] hover:underline">{event.title}</Link>
                    {event.description && <p className="mt-2 text-pretty text-sm leading-[1.6] text-muted-foreground">{event.description}</p>}
                    <div className="mt-3.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {event.eventType && <span className="rounded-full bg-accent px-2.5 py-0.5 font-semibold text-accent-foreground">{event.eventType}</span>}
                      {event.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" aria-hidden="true" />{event.location}
                        </span>
                      )}
                      {!!event.sourceCount && (
                        <>
                          <span>·</span>
                          <span>{event.sourceCount} source{event.sourceCount === 1 ? "" : "s"}</span>
                        </>
                      )}
                      <Link href={event.href} className="ml-auto font-semibold text-foreground hover:underline">Read the article →</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="flex flex-col gap-3.5 rounded-[18px] border border-dashed p-7">
            <h2 className="text-xl font-bold tracking-[-0.03em]">Nothing recorded for {dateLabel} yet</h2>
            <p className="max-w-[520px] text-pretty text-sm leading-[1.6] text-muted-foreground">Events appear here when an article has an exact event date. Know something that happened today? Add the date to an article and it shows up once reviewed.</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/contribute?contentType=event" className={cn(buttonVariants(), "h-10 px-4")}>Contribute an event</Link>
              {nearest && (
                <button type="button" onClick={() => goTo(nearest![0], nearest![1])} className="h-10 rounded-[10px] border px-4 text-sm font-medium hover:bg-secondary">
                  Nearest date with events: {nearest[1]} {MONTHS[nearest[0] - 1]}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Browse the calendar</p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-[-0.04em]">Every dated event, by month</h2>
          </div>
          <Link href="/aviation-news" className="text-[13px] font-medium underline underline-offset-[3px]">Browse the article archive</Link>
        </div>
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1">
          {SHORT_MONTHS.map((label, index) => {
            const monthNumber = index + 1;
            const active = monthNumber === browseMonth;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setBrowseMonth(monthNumber)}
                className={cn("inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold", active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary")}
              >
                {label}<span className="font-mono text-[11px] opacity-60">{browseCounts[index]}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3.5 border-t border-foreground">
          {browseEvents.length ? (
            browseEvents.map((event, position) => (
              <button
                key={`${event.day}-${event.href}-${position}`}
                type="button"
                onClick={() => goTo(event.month, event.day)}
                className="grid w-full grid-cols-[72px_56px_minmax(0,1fr)] items-baseline gap-3 border-b py-3.5 text-left hover:bg-secondary"
              >
                <span className="text-sm font-semibold">{event.day} {SHORT_MONTHS[event.month - 1]}</span>
                <span className="font-mono text-[13px] text-muted-foreground">{event.year}</span>
                <span className="text-sm leading-[1.45]">{event.title}</span>
              </button>
            ))
          ) : (
            <p className="px-0.5 py-4 text-sm text-muted-foreground">No dated events for this month yet.</p>
          )}
        </div>
      </section>

      <section className="mt-14 overflow-hidden rounded-[18px] border bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="flex flex-col gap-2.5 p-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Free API</p>
            <h2 className="text-xl font-bold tracking-[-0.03em]">Put these events on your site</h2>
            <p className="text-sm leading-[1.6] text-muted-foreground">No API key needed. Defaults to today in UTC.</p>
            <Link href="/api-docs#on-this-day" className="mt-auto text-[13px] font-medium underline underline-offset-[3px]">API documentation and sources</Link>
          </div>
          <div className="min-w-0 bg-[hsl(210_12%_12%)] p-5 font-mono text-xs leading-[1.7] text-[hsl(210_10%_85%)]">
            <div className="flex items-center gap-2 rounded-lg bg-white/10 py-2 pl-3 pr-2">
              <span className="font-semibold text-emerald-400">GET</span>
              <span className="min-w-0 flex-1 break-all text-white">{apiUrl}</span>
              <button type="button" onClick={copyApiUrl} className="h-[26px] shrink-0 rounded-md bg-white/15 px-2.5 font-sans text-xs font-semibold text-white hover:bg-white/25">
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-3.5 whitespace-pre-wrap break-words text-[hsl(210_10%_70%)]">{sample}</pre>
          </div>
        </div>
      </section>
    </>
  );
}
