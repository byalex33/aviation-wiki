import { ARTICLE_IMAGE_HOSTS } from "@/lib/image-policy";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";

// Authorization stays in each protected page and Server Action. The proxy
// attaches Clerk's request context and emits the Content-Security-Policy.
//
// Strict mode: script-src becomes a per-request nonce plus 'strict-dynamic' —
// no 'unsafe-inline', no host allowlist. Clerk generates the nonce and exposes
// it as the `x-nonce` request header; Next applies it to framework and page
// scripts automatically, and the root layout applies it to the inline theme
// script. style-src keeps 'unsafe-inline': component libraries (Tailwind,
// Recharts, Base UI, sonner) emit inline styles and CSS injection is far lower
// risk than script injection.
//
// A per-request nonce forces every route to render dynamically. The app is
// already fully dynamic, so this costs nothing today, but it is incompatible
// with static / ISR article pages (issue #5) until the nonce is removed from
// the shared layout.
const withClerk = clerkMiddleware({
  contentSecurityPolicy: {
    strict: true,
    directives: {
      "connect-src": ["https://collect.tracwell.app"],
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        ...ARTICLE_IMAGE_HOSTS.map((host) => `https://${host}`),
      ],
    },
  },
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
