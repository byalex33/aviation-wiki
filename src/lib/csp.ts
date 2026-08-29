import { parsePublishableKey } from "@clerk/shared/keys";

// One Content-Security-Policy for every route, emitted by src/proxy.ts.
//
// script-src keeps 'unsafe-inline': Next.js 16's App Router streams inline RSC
// bootstrap scripts (`self.__next_f.push(...)`) with no nonce or hash, so React
// will not hydrate a statically-generated / ISR page without it — and a
// per-request nonce (the alternative) forces every route to render dynamically,
// which defeats ISR for article pages (issue #5). 'unsafe-inline' is scoped as
// tightly as it can be: no bare `https:` / `http:`, no `'strict-dynamic'`, and
// an explicit allowlist of the only external script origins the app loads
// (Clerk Frontend API, Cloudflare Turnstile, Stripe, Google Maps). Every other
// directive is locked down — object-src 'none', base-uri 'self',
// frame-ancestors 'none', and narrow frame-src / connect-src / img-src lists.
//
// The non-script directives mirror Clerk's default set
// (@clerk/nextjs/dist/esm/server/content-security-policy.js). Re-check those on
// @clerk/nextjs upgrades; scripts/test-csp.ts guards the shape.

const frontendApi =
  parsePublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
    ?.frontendApi ?? "";

const clerkFrontendApiSource = frontendApi ? `https://${frontendApi}` : "";

// img-src hosts, kept in sync with next.config.ts remotePatterns.
export const IMG_SRC = [
  "'self'",
  "data:",
  "blob:",
  "https://img.clerk.com",
  "https://airhex.com",
  "https://images.kiwi.com",
  "https://flagcdn.com",
  "https://upload.wikimedia.org",
  "https://cdn.jetphotos.com",
];

export const SITE_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  [
    "script-src 'self' 'unsafe-inline'",
    clerkFrontendApiSource,
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://maps.googleapis.com",
    "https://*.protect.clerk.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  `img-src ${IMG_SRC.join(" ")}`,
  [
    "connect-src 'self'",
    clerkFrontendApiSource,
    "https://clerk-telemetry.com",
    "https://*.clerk-telemetry.com",
    "https://api.stripe.com",
    "https://maps.googleapis.com",
    "https://img.clerk.com",
    "https://*.protect.clerk.com:*",
  ]
    .filter(Boolean)
    .join(" "),
  [
    "frame-src 'self'",
    clerkFrontendApiSource, // Clerk account-portal / dev-handshake iframe
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
    "https://*.js.stripe.com",
    "https://hooks.stripe.com",
    "https://*.protect.clerk.com",
  ]
    .filter(Boolean)
    .join(" "),
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");
