import "server-only";

import { anniversaryDate, eventsOnDate, type DatedAviationEvent } from "@/lib/on-this-day-data";
import { loadDatedAviationEvents } from "@/lib/public-events";

import type { OnThisDayEvent, OnThisDayIndexEntry } from "./on-this-day-explorer";

export function toIndexEntry({ title, href, year, month, day }: DatedAviationEvent): OnThisDayIndexEntry {
  return { title, href, year, month, day };
}

export function toOnThisDayEvent(event: DatedAviationEvent): OnThisDayEvent {
  return {
    ...toIndexEntry(event),
    description: event.description,
    location: event.location,
    eventType: event.eventType,
    sourceCount: event.sources?.length ?? 0,
  };
}

/** Full event details for one calendar date, or null for an invalid date. */
export async function onThisDayEvents(month: number, day: number, events?: DatedAviationEvent[]) {
  const date = Number.isInteger(month) && Number.isInteger(day)
    ? anniversaryDate(`${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`)
    : null;
  if (!date) return null;
  return eventsOnDate(events ?? await loadDatedAviationEvents(), date).map(toOnThisDayEvent);
}
