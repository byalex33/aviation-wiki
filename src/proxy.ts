import { clerkMiddleware } from "@clerk/nextjs/server";

// Authorization remains in each protected page and Server Action. The proxy's
// responsibilities are to attach Clerk's request context to every application
// route and to emit a Content-Security-Policy alongside it.
//
// The policy runs in non-strict mode: script-src keeps 'unsafe-inline' so the
// inline theme bootstrap and JSON-LD blocks work without a per-request nonce
// (which would force every route to render dynamically). Tightening this to a
// nonce-based 'strict-dynamic' policy is a worthwhile follow-up. img-src is
// pinned to the hosts declared in next.config.ts remotePatterns.
export default clerkMiddleware({
  contentSecurityPolicy: {
    directives: {
      "base-uri": ["'self'"],
      "object-src": ["'none'"],
      "frame-ancestors": ["'none'"],
      "img-src": [
        "'self'",
        "data:",
        "blob:",
        "https://img.clerk.com",
        "https://airhex.com",
        "https://images.kiwi.com",
        "https://flagcdn.com",
        "https://upload.wikimedia.org",
        "https://cdn.jetphotos.com",
      ],
    },
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
