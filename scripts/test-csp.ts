import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { clerkFrontendApi, contentSecurityPolicy, isStrictCspPath } from "../src/lib/csp";
import { THEME_BOOTSTRAP_SCRIPT, THEME_BOOTSTRAP_SCRIPT_HASH } from "../src/lib/inline-scripts";

const publishableKey = `pk_live_${Buffer.from("clerk.aviation.wiki$").toString("base64")}`;
assert.equal(clerkFrontendApi(publishableKey), "clerk.aviation.wiki");
assert.equal(clerkFrontendApi(undefined), null);
assert.equal(clerkFrontendApi(`pk_live_${Buffer.from("evil.com; script-src *$").toString("base64")}`), null);

for (const path of ["/admin", "/admin/users", "/editor", "/sign-in", "/sign-in/factor-one", "/settings/profile", "/pro", "/pro/success"])
  assert.ok(isStrictCspPath(path), `${path} is strict`);
for (const path of ["/", "/aircraft/boeing-747", "/commercial/british-airways", "/profile/alex", "/production-lists", "/administration", "/settings-guide"])
  assert.ok(!isStrictCspPath(path), `${path} is cacheable`);

const directive = (policy: string, name: string) =>
  policy.split("; ").find((part) => part.startsWith(`${name} `))?.split(" ").slice(1) ?? [];

const cacheable = contentSecurityPolicy({ publishableKey, development: false });
const strict = contentSecurityPolicy({ nonce: "abc123", publishableKey, development: false });

for (const policy of [cacheable, strict]) {
  const scripts = directive(policy, "script-src");
  assert.ok(scripts.includes("'self'"));
  assert.ok(scripts.includes("https://clerk.aviation.wiki"), "Clerk's script host is allowlisted");
  for (const forbidden of ["https:", "http:", "*", "'strict-dynamic'", "'unsafe-eval'", "data:"])
    assert.ok(!scripts.includes(forbidden), `script-src must not allow ${forbidden}`);
  assert.deepEqual(directive(policy, "object-src"), ["'none'"]);
  assert.deepEqual(directive(policy, "base-uri"), ["'self'"]);
  assert.deepEqual(directive(policy, "frame-ancestors"), ["'none'"]);
  assert.deepEqual(directive(policy, "form-action"), ["'self'"]);
  assert.deepEqual(directive(policy, "default-src"), ["'self'"]);
}

// Cacheable pages allow inline scripts and carry no nonce or hash (either would
// make browsers ignore 'unsafe-inline').
assert.ok(directive(cacheable, "script-src").includes("'unsafe-inline'"));
assert.ok(!directive(cacheable, "script-src").some((source) => source.startsWith("'nonce-") || source.startsWith("'sha256-")));

// Strict pages allow only the nonce and the theme bootstrap hash.
const strictScripts = directive(strict, "script-src");
assert.ok(!strictScripts.includes("'unsafe-inline'"));
assert.ok(strictScripts.includes("'nonce-abc123'"));
assert.ok(strictScripts.includes(`'${THEME_BOOTSTRAP_SCRIPT_HASH}'`));
assert.equal(
  THEME_BOOTSTRAP_SCRIPT_HASH,
  `sha256-${createHash("sha256").update(THEME_BOOTSTRAP_SCRIPT).digest("base64")}`,
);

assert.ok(directive(contentSecurityPolicy({ publishableKey, development: true }), "script-src").includes("'unsafe-eval'"));

console.log("CSP tests passed");
