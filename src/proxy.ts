import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

import { contentSecurityPolicy, isStrictCspPath } from "@/lib/csp";

// Authorization stays in each protected page and Server Action. The proxy
// attaches Clerk's request context and emits the Content-Security-Policy.
//
// Account, editing and staff routes get a per-request nonce. Next reads it from
// the request's Content-Security-Policy header and applies it to its own inline
// scripts, which works because those routes always render dynamically. Every
// other route gets the cacheable policy so public pages can be served from the
// ISR cache (see src/lib/csp.ts for what each policy allows).
const withClerk = clerkMiddleware((_auth, request) => {
  if (!isStrictCspPath(request.nextUrl.pathname)) {
    const response = NextResponse.next();
    response.headers.set("Content-Security-Policy", contentSecurityPolicy());
    return response;
  }
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy({ nonce });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", policy);
  requestHeaders.set("x-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
});

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  // Stripe authenticates this public endpoint with its signed raw request body.
  if (request.nextUrl.pathname === "/api/stripe/webhook") return NextResponse.next();
  return withClerk(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
