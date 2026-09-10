import { anniversaryHeaders, onThisDayResponse } from "@/lib/on-this-day-api";
import { loadDatedAviationEvents } from "@/lib/public-events";

export function GET(request: Request) {
  return onThisDayResponse(request, loadDatedAviationEvents);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: anniversaryHeaders });
}
