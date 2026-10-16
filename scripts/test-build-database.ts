import assert from "node:assert/strict";

import {
  deferredRoutesFromLog,
  describeDatabaseError,
  isDatabaseConnectionError,
  isProductionBuild,
  postgresPoolSettings,
  routeFromDynamicBailout,
  unexpectedMissingPrerenderRoutes,
} from "../src/lib/build-database";

assert.equal(isProductionBuild({ NEXT_PHASE: "phase-production-build" }), true);
assert.equal(isProductionBuild({ NEXT_PHASE: "phase-production-server" }), false);
assert.equal(isProductionBuild({}), false);

const buildPool = postgresPoolSettings({
  NEXT_PHASE: "phase-production-build",
  DATABASE_POOL_SIZE: "5",
});
assert.equal(buildPool.max, 1, "a production build keeps one connection per worker");
assert.equal(buildPool.idle_timeout, 1, "build workers release idle connections quickly");

const runtimePool = postgresPoolSettings({ DATABASE_POOL_SIZE: "4" });
assert.equal(runtimePool.max, 4);
assert.equal(runtimePool.idle_timeout, 20);
assert.equal(postgresPoolSettings({ DATABASE_POOL_SIZE: "9" }).max, 5);
assert.equal(postgresPoolSettings({ DATABASE_POOL_SIZE: "0" }).max, 1);
assert.equal(postgresPoolSettings({ DATABASE_POOL_SIZE: "nope" }).max, 1);

const slots = Object.assign(new Error("remaining connection slots are reserved for roles with the SUPERUSER attribute"), {
  code: "53300",
});
assert.equal(isDatabaseConnectionError(slots), true);
assert.equal(isDatabaseConnectionError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })), true);
assert.equal(isDatabaseConnectionError(Object.assign(new Error("timeout"), { code: "CONNECT_TIMEOUT" })), true);
assert.equal(isDatabaseConnectionError(new AggregateError([slots], "query failed")), true);
assert.equal(isDatabaseConnectionError(new Error("wrapped", { cause: slots })), true);
assert.equal(isDatabaseConnectionError(Object.assign(new Error("syntax error"), { code: "42601" })), false);
assert.equal(isDatabaseConnectionError(Object.assign(new Error("permission denied"), { code: "42501" })), false);
assert.equal(isDatabaseConnectionError(new Error("article not found")), false);
assert.match(describeDatabaseError(slots), /53300/);

const bailout = new Error("Route /sitemap.xml couldn't be rendered statically because it used `connection`.");
assert.equal(routeFromDynamicBailout(bailout), "/sitemap.xml");
assert.equal(
  routeFromDynamicBailout(new Error("Route /sitemap.xml/route couldn't be rendered statically because it used `connection`.")),
  "/sitemap.xml",
);
assert.equal(routeFromDynamicBailout(new Error("something else")), undefined);

const known = ["/", "/commercial", "/sitemap.xml"];
const deferred = deferredRoutesFromLog("/\n/sitemap.xml/route\n", known);
assert.equal(deferred.has("/"), true);
assert.equal(deferred.has("/sitemap.xml"), true);
assert.deepEqual(
  unexpectedMissingPrerenderRoutes(known, ["/", "/commercial"], deferred),
  [],
);
assert.deepEqual(
  unexpectedMissingPrerenderRoutes(known, ["/", "/commercial"], new Set()),
  ["/sitemap.xml"],
);
assert.equal(deferredRoutesFromLog("unscoped\n", known).size, known.length);

console.log("Build database tests passed");
