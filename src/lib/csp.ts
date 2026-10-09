import { ARTICLE_IMAGE_HOSTS } from "@/lib/image-policy";
import { THEME_BOOTSTRAP_SCRIPT_HASH } from "@/lib/inline-scripts";

// Content-Security-Policy, emitted per request by src/proxy.ts. Two policies
// share one explicit host allowlist and differ only in how inline scripts are
// allowed:
//
// - Strict (account, editing and staff routes): a per-request nonce plus the
//   theme bootstrap hash. No 'unsafe-inline'. These routes always render
//   dynamically, so Next applies the nonce to its own inline scripts.
// - Cacheable (every other route): 'unsafe-inline' instead of a nonce. Next 16
//   streams its inline RSC bootstrap scripts without a nonce or hash, so a
//   static / ISR page cannot hydrate under a nonce- or hash-only script-src,
//   and a per-request nonce cannot appear in a cached page anyway.
//
// Both keep everything else locked down: no bare https:/http:, no
// 'strict-dynamic', object-src 'none', base-uri 'self', frame-ancestors 'none'.
// The external hosts mirror what Clerk's own middleware emitted in production
// (Clerk Frontend API, Turnstile, Stripe, Maps); re-check them on @clerk/nextjs
// upgrades. scripts/test-csp.ts guards the shape.

/** Path prefixes that always get the strict, nonce-based policy. */
export const STRICT_CSP_PREFIXES = [
  "/admin",
  "/contribute",
  "/editor",
  "/moderation",
  "/notifications",
  "/pro",
  "/saved",
  "/settings",
  "/sign-in",
  "/sign-up",
  "/sso-callback",
] as const;

export function isStrictCspPath(pathname: string) {
  return STRICT_CSP_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** The Frontend API host encoded in a Clerk publishable key (pk_<env>_<base64 "host$">). */
export function clerkFrontendApi(publishableKey: string | undefined) {
  const encoded = /^pk_(?:test|live)_([A-Za-z0-9+/=_-]+)$/.exec(publishableKey ?? "")?.[1];
  if (!encoded) return null;
  const host = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "");
  return /^[a-z0-9.-]+$/i.test(host) ? host : null;
}

function sources(...values: (string | null | false | undefined)[]) {
  return values.filter(Boolean).join(" ");
}

export function contentSecurityPolicy({
  nonce,
  publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  development = process.env.NODE_ENV === "development",
}: {
  nonce?: string;
  publishableKey?: string;
  development?: boolean;
} = {}) {
  const frontendApi = clerkFrontendApi(publishableKey);
  const clerk = frontendApi && `https://${frontendApi}`;
  const inlineScripts = nonce
    ? `'nonce-${nonce}' '${THEME_BOOTSTRAP_SCRIPT_HASH}'`
    : "'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${sources(
      "'self'",
      inlineScripts,
      // React's dev tooling evaluates code; never in production.
      development && "'unsafe-eval'",
      clerk,
      "https://challenges.cloudflare.com",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://maps.googleapis.com",
      "https://*.protect.clerk.com",
    )}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${sources("'self'", "data:", "blob:", ...ARTICLE_IMAGE_HOSTS.map((host) => `https://${host}`))}`,
    `connect-src ${sources(
      "'self'",
      clerk,
      "https://clerk-telemetry.com",
      "https://*.clerk-telemetry.com",
      "https://api.stripe.com",
      "https://maps.googleapis.com",
      "https://img.clerk.com",
      "https://*.protect.clerk.com:*",
      "https://collect.tracwell.app",
    )}`,
    `frame-src ${sources(
      "'self'",
      clerk,
      "https://challenges.cloudflare.com",
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://hooks.stripe.com",
      "https://*.protect.clerk.com",
    )}`,
    "worker-src 'self' blob:",
  ].join("; ");
}
