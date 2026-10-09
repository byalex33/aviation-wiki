// Runs after `next build` (npm postbuild). Routes under the strict CSP rely on a
// per-request nonce, so a prerendered (static or ISR) page there would have its
// scripts blocked in the browser. Fail the build instead of shipping that.
import { readFileSync } from "node:fs";

import { isStrictCspPath } from "../src/lib/csp";

const manifest = JSON.parse(readFileSync(".next/prerender-manifest.json", "utf8")) as {
  routes: Record<string, unknown>;
  dynamicRoutes: Record<string, unknown>;
};

const prerendered = [...Object.keys(manifest.routes), ...Object.keys(manifest.dynamicRoutes)];
const broken = prerendered.filter((route) => isStrictCspPath(route));
if (broken.length) {
  console.error(
    `These routes use the strict, nonce-based CSP but were prerendered, so their scripts would be blocked:\n  ${broken.join("\n  ")}\nAdd \`export const dynamic = "force-dynamic"\` to them (see src/lib/csp.ts).`,
  );
  process.exit(1);
}

const articleRoutes = ["aircraft", "airports", "alliances", "aviation-news", "commercial", "engines", "manufacturers"].map(
  (segment) => `/${segment}/[slug]`,
);
const uncached = articleRoutes.filter((route) => !(route in manifest.dynamicRoutes));
if (uncached.length)
  console.warn(`Warning: these article routes are no longer served from the ISR cache:\n  ${uncached.join("\n  ")}`);

console.log("CSP route check passed: no strict-CSP route is prerendered.");
