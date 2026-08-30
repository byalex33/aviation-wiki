import { redirect } from "next/navigation";

import { ensureAviationDataEnabled } from "@/lib/aviation-data-flags";

export function GET(request: Request) {
  ensureAviationDataEnabled();
  const value = new URL(request.url).searchParams.get("registration")?.trim().toLowerCase();
  redirect(value ? `/registrations/${encodeURIComponent(value)}` : "/registrations");
}
