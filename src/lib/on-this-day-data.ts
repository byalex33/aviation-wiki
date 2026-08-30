import type { StructuredField } from "@/lib/wiki-types";

export type DatedAviationEvent = {
  id: string;
  title: string;
  href: string;
  description: string;
  eventDate: string;
  year: number;
  month: number;
  day: number;
  location?: string;
  eventType?: string;
};

const monthNumbers = new Map(
  [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].map((month, index) => [month, index + 1]),
);

function validDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export function parseExactEventDate(value: string | undefined) {
  const date = value?.trim();
  if (!date) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const written = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(date);
  const year = iso ? Number(iso[1]) : written ? Number(written[3]) : 0;
  const month = iso
    ? Number(iso[2])
    : written
      ? monthNumbers.get(written[2].toLowerCase()) ?? 0
      : 0;
  const day = iso ? Number(iso[3]) : written ? Number(written[1]) : 0;

  return validDate(year, month, day) ? { year, month, day } : null;
}

export function fieldValue(fields: StructuredField[], ...keys: string[]) {
  const expected = new Set(keys.map((key) => key.toLowerCase()));
  return fields.find((field) =>
    expected.has(field.key.trim().toLowerCase()),
  )?.value;
}

export function eventsOnDate(events: DatedAviationEvent[], date: Date) {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return events.filter((event) => event.month === month && event.day === day);
}

export function sortByAnniversary(events: DatedAviationEvent[]) {
  return events.toSorted(
    (first, second) =>
      first.month - second.month ||
      first.day - second.day ||
      first.year - second.year ||
      first.title.localeCompare(second.title),
  );
}
