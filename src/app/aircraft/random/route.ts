import { NextResponse } from "next/server";

import { pickRandomAircraft } from "@/lib/random-aircraft";
import { listPublicSearchDocuments } from "@/lib/wiki-public-db";

export async function GET(request: Request) {
  const aircraft = pickRandomAircraft(await listPublicSearchDocuments());
  const destination = aircraft?.href ?? "/aircraft";
  const response = NextResponse.redirect(new URL(destination, request.url), 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
