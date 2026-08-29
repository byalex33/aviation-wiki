import { clerkMiddleware } from "@clerk/nextjs/server";

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
export default clerkMiddleware({
  contentSecurityPolicy: {
    strict: true,
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
