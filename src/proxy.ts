import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { SITE_CSP } from "@/lib/csp";

// Authorization stays in each protected page and Server Action. The proxy
// attaches Clerk's request context and emits the Content-Security-Policy.
//
// One nonce-free policy for every route (see src/lib/csp.ts). Not emitted
// through Clerk's `contentSecurityPolicy` option: strict mode there forces a
// per-request nonce (incompatible with static / ISR pages), and non-strict mode
// adds a blanket `https:`/`http:` to script-src on top of 'unsafe-inline', which
// we do not want — SITE_CSP keeps 'unsafe-inline' but an explicit host allowlist.
export default clerkMiddleware((_auth, request) => {
  const response = NextResponse.next({ request });
  response.headers.set("Content-Security-Policy", SITE_CSP);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
