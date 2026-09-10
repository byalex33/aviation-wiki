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

async function checkApi() {
  const { onThisDayResponse } = await import("../src/lib/on-this-day-api");
  const load = async () => events;
  const request = (query = "") => new Request(`https://www.aviation.wiki/api/v1/on-this-day${query}`);
  const response = await onThisDayResponse(request("?date=08-02"), load);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const data = await response.json();
  assert.deepEqual(data.events.map((item: { id: string }) => item.id), ["older-august", "august"]);
  assert.equal(data.events[0].url, "https://www.aviation.wiki/aviation-news/older-august");
  assert.equal(data.events[0].date, "1990-08-02");
  for (const value of ["", "02-30", "13-01", "00-01", "1-01", "2026-01-01", "12-17&date=01-01"]) {
    const invalid = await onThisDayResponse(request(`?date=${value}`), async () => { throw new Error("Invalid requests must not load data"); });
    assert.equal(invalid.status, 400, value);
  }
  const leap = await onThisDayResponse(request("?date=02-29"), async () => [event("leap", 2000, 2, 29)]);
  assert.equal((await leap.json()).count, 1);
  const empty = await onThisDayResponse(request("?date=12-17"), load);
  assert.deepEqual((await empty.json()).events, []);
  const before = await onThisDayResponse(request(), load, new Date("2026-08-02T23:59:59Z"));
  const after = await onThisDayResponse(request(), load, new Date("2026-08-03T00:00:00Z"));
  assert.equal((await before.json()).count, 2);
  assert.equal((await after.json()).count, 0);
  const cited = await onThisDayResponse(request("?date=08-02"), async () => [{ ...events[0], sources: [{ url: "https://www.nasa.gov/history/", title: "NASA History" }] }]);
  assert.equal((await cited.json()).events[0].sources[0].title, "NASA History");
  const unavailable = await onThisDayResponse(request(), async () => { throw new Error("Simulated database outage"); });
  assert.equal(unavailable.status, 503);
  assert.equal(unavailable.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(unavailable.headers.get("Retry-After"), "60");
  assert.ok(!(await unavailable.text()).includes("Simulated"));
  console.log("On This Day API tests passed");
}
checkApi().catch((error) => { console.error(error); process.exitCode = 1; });
