import assert from "node:assert/strict";

import { SITE_CSP } from "../src/lib/csp";

const directives = new Map(
  SITE_CSP.split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [name, ...values] = part.split(/\s+/);
      return [name, values] as const;
    }),
);

// script-src: 'unsafe-inline' is required (Next 16 inline RSC bootstrap on
// static/ISR pages), but nothing looser than that.
const scriptSrc = directives.get("script-src") ?? [];
assert.ok(scriptSrc.includes("'self'"), "script-src must include 'self'");
assert.ok(
  scriptSrc.includes("'unsafe-inline'"),
  "script-src must include 'unsafe-inline' — Next's inline bootstrap needs it and a nonce would force dynamic rendering",
);
for (const forbidden of ["'unsafe-eval'", "'strict-dynamic'", "https:", "http:", "*"]) {
  assert.ok(
    !scriptSrc.includes(forbidden),
    `script-src must not contain ${forbidden}`,
  );
}
assert.ok(
  scriptSrc.some((s) => s.includes("clerk.accounts.dev") || s.includes("clerk.")),
  "script-src must allow the Clerk Frontend API host (ClerkJS loads from it)",
);

// Non-script directives stay locked down.
assert.deepEqual(directives.get("object-src"), ["'none'"]);
assert.deepEqual(directives.get("base-uri"), ["'self'"]);
assert.deepEqual(directives.get("frame-ancestors"), ["'none'"]);
assert.deepEqual(directives.get("default-src"), ["'self'"]);

// Every directive Clerk sets by default is present (snapshot of Clerk's
// DEFAULT_DIRECTIVES — re-verify against
// node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js on
// @clerk/nextjs upgrades).
for (const name of [
  "connect-src",
  "form-action",
  "frame-src",
  "img-src",
  "style-src",
  "worker-src",
]) {
  assert.ok(directives.has(name), `SITE_CSP is missing directive: ${name}`);
}
for (const host of [
  "https://clerk-telemetry.com",
  "https://api.stripe.com",
  "https://*.protect.clerk.com:*",
]) {
  assert.ok(
    (directives.get("connect-src") ?? []).includes(host),
    `connect-src must include ${host}`,
  );
}
// No wildcard hosts anywhere except the two Clerk/Stripe sub-domain patterns.
for (const [name, values] of directives) {
  for (const v of values) {
    if (v === "*" || /^https?:$/.test(v)) {
      assert.fail(`${name} contains an over-broad source: ${v}`);
    }
  }
}

console.log("CSP tests passed");
