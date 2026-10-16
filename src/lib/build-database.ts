import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";

// Next sets this for the `next build` process and the static workers it forks.
export const PHASE_PRODUCTION_BUILD = "phase-production-build";

// Written during a production build when Postgres cannot take another
// connection. The postbuild check allows those routes to be absent from the
// prerender manifest. A build that never hits the database does not write it,
// so dropping `revalidate` still fails the check.
export const PRERENDER_DEFERRED_LOG = ".next/prerender-database-deferred.txt";

const CONNECTION_SQLSTATES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08007",
  "53300",
  "57P01",
  "57P02",
  "57P03",
]);

const CONNECTION_CLIENT_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EPIPE",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
]);

const CONNECTION_MESSAGE =
  /remaining connection slots|too many clients|connection terminated|timeout exceeded when trying to connect|could not connect|ECONNREFUSED|ENOTFOUND|getaddrinfo/i;

export function isProductionBuild(env: { NEXT_PHASE?: string } = { NEXT_PHASE: process.env.NEXT_PHASE }) {
  return env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}

export function postgresPoolSettings(
  env: { NEXT_PHASE?: string; DATABASE_POOL_SIZE?: string } = {
    NEXT_PHASE: process.env.NEXT_PHASE,
    DATABASE_POOL_SIZE: process.env.DATABASE_POOL_SIZE,
  },
) {
  const configured = Number.parseInt(env.DATABASE_POOL_SIZE ?? "1", 10);
  const size = Number.isFinite(configured) ? Math.min(5, Math.max(1, configured)) : 1;
  const build = isProductionBuild(env);
  return {
    // Three static workers each prerender several database pages at once.
    // One shared connection per process is enough; a larger pool multiplies
    // by the live deployment and trips `remaining connection slots`.
    max: build ? 1 : size,
    idle_timeout: build ? 1 : 20,
    connect_timeout: 15,
    prepare: false as const,
  };
}

function errorNodes(error: unknown, seen: Set<unknown> = new Set()): unknown[] {
  if (typeof error === "string") return [error];
  if (typeof error !== "object" || error === null) return [];
  if (seen.has(error)) return [];
  seen.add(error);
  const nodes: unknown[] = [error];
  if ("cause" in error) nodes.push(...errorNodes(Reflect.get(error, "cause"), seen));
  if (error instanceof AggregateError) {
    for (const item of error.errors) nodes.push(...errorNodes(item, seen));
  }
  return nodes;
}

function nodeCode(error: unknown) {
  if (typeof error !== "object" || error == null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" || typeof code === "number" ? String(code) : undefined;
}

function nodeMessage(error: unknown) {
  if (typeof error === "string") return error;
  if (typeof error === "object" && error != null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "";
}

// Connection and capacity failures only. A bad query should still fail the build.
export function isDatabaseConnectionError(error: unknown) {
  return errorNodes(error).some((node) => {
    const code = nodeCode(node);
    if (code && (CONNECTION_SQLSTATES.has(code) || CONNECTION_CLIENT_CODES.has(code))) return true;
    return CONNECTION_MESSAGE.test(nodeMessage(node));
  });
}

export function describeDatabaseError(error: unknown) {
  for (const node of errorNodes(error)) {
    const code = nodeCode(node);
    const message = nodeMessage(node);
    if (code || message) return [code, message].filter(Boolean).join(": ");
  }
  return "unknown database error";
}

export function routeFromDynamicBailout(error: unknown) {
  if (!(error instanceof Error)) return undefined;
  const match = /Route (\S+) couldn't be rendered statically/.exec(error.message);
  return match?.[1].replace(/\/route$/, "");
}

export function recordDeferredPrerender(route: string) {
  mkdirSync(dirname(PRERENDER_DEFERRED_LOG), { recursive: true });
  appendFileSync(PRERENDER_DEFERRED_LOG, `${route}\n`);
}

export function deferredRoutesFromLog(contents: string, known: readonly string[]) {
  const lines = contents.split("\n").map((line) => line.trim()).filter(Boolean);
  const routes = new Set(
    lines.filter((line) => line.startsWith("/")).map((line) => line.replace(/\/route$/, "")),
  );
  if (lines.includes("unscoped")) for (const route of known) routes.add(route);
  return routes;
}

export function readDeferredPrerenderRoutes(known: readonly string[]) {
  if (!existsSync(PRERENDER_DEFERRED_LOG)) return new Set<string>();
  return deferredRoutesFromLog(readFileSync(PRERENDER_DEFERRED_LOG, "utf8"), known);
}

export function unexpectedMissingPrerenderRoutes(
  required: readonly string[],
  prerendered: Iterable<string>,
  deferred: ReadonlySet<string>,
) {
  const done = new Set(prerendered);
  return required.filter((route) => !done.has(route) && !deferred.has(route));
}
