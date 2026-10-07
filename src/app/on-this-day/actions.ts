"use server";

import { onThisDayEvents } from "./events";

// Read-only: the page ships a compact index and fetches one date's details on demand.
export async function loadOnThisDayEventsAction(month: unknown, day: unknown) {
  if (typeof month !== "number" || typeof day !== "number") return null;
  return onThisDayEvents(month, day);
}
