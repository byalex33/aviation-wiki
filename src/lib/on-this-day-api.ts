import { anniversaryDate, eventsOnDate, sortByAnniversary, type DatedAviationEvent } from "@/lib/on-this-day-data";
import { absoluteUrl } from "@/lib/site";

export const anniversaryHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

export async function onThisDayResponse(
  request: Request,
  loadEvents: () => Promise<DatedAviationEvent[]>,
  now = new Date(),
) {
  const params = new URL(request.url).searchParams;
  const date = anniversaryDate(params.get("date") ?? undefined, now);
  if (!date || params.getAll("date").length > 1) {
    return Response.json({ error: "Use a valid date in MM-DD format, for example 12-17 or 02-29." }, {
      status: 400,
      headers: { ...anniversaryHeaders, "Cache-Control": "no-store" },
    });
  }
  try {
    const events = eventsOnDate(sortByAnniversary(await loadEvents()), date);
    return Response.json({
      date: date.toISOString().slice(5, 10),
      timezone: "UTC",
      count: events.length,
      events: events.map((event) => ({
        id: event.id,
        year: event.year,
        date: `${String(event.year).padStart(4, "0")}-${String(event.month).padStart(2, "0")}-${String(event.day).padStart(2, "0")}`,
        title: event.title,
        summary: event.description,
        url: absoluteUrl(event.href),
        sources: event.sources ?? [],
      })),
    }, {
      // Avoid serving yesterday's default-date response across UTC midnight.
      headers: { ...anniversaryHeaders, "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unable to load aviation anniversaries", error);
    return Response.json({ error: "Aviation history is temporarily unavailable. Please try again later." }, {
      status: 503,
      headers: { ...anniversaryHeaders, "Cache-Control": "no-store", "Retry-After": "60" },
    });
  }
}
