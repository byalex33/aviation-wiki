import assert from "node:assert/strict";

import { eventsOnDate, parseExactEventDate, sortByAnniversary, type DatedAviationEvent } from "../src/lib/on-this-day-data";

assert.deepEqual(parseExactEventDate("2026-08-02"), { year: 2026, month: 8, day: 2 });
assert.deepEqual(parseExactEventDate("2 August 2026"), { year: 2026, month: 8, day: 2 });
assert.equal(parseExactEventDate("January–June 2026"), null);
assert.equal(parseExactEventDate("2026-02-30"), null);

const event = (id: string, year: number, month: number, day: number): DatedAviationEvent => ({ id, title: id, href: `/aviation-news/${id}`, description: "", eventDate: `${year}-01-01`, year, month, day });
const events = [event("august", 2026, 8, 2), event("january", 2000, 1, 3), event("older-august", 1990, 8, 2)];
assert.deepEqual(sortByAnniversary(events).map((item) => item.id), ["january", "older-august", "august"]);
assert.deepEqual(eventsOnDate(events, new Date("2026-08-02T12:00:00Z")).map((item) => item.id), ["august", "older-august"]);

console.log("On This Day tests passed");
