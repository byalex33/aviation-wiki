import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

type SourceStatus = "ok" | "broken" | "unchecked";

export function isPrivateAddress(address: string) {
  const value = address.toLowerCase().replace(/^::ffff:/, "");
  if (isIP(value) === 4) {
    const [a, b] = value.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  return value === "::" || value === "::1" || value.startsWith("fc") ||
    value.startsWith("fd") || /^fe[89ab]/.test(value);
}

async function publicUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
    throw new Error("Unsupported source URL.");
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
    throw new Error("Source URL does not resolve to a public address.");
  return url;
}

async function sourceRequest(value: string, method: "HEAD" | "GET") {
  let url = await publicUrl(value);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    const response = await fetch(url, {
      method,
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "user-agent": "aviation.wiki source health checker",
        ...(method === "GET" ? { range: "bytes=0-0" } : {}),
      },
    });
    if (response.status < 300 || response.status >= 400) return response;
    const location = response.headers.get("location");
    await response.body?.cancel();
    if (!location) return response;
    url = await publicUrl(new URL(location, url).href);
  }
  throw new Error("Too many redirects.");
}

export function classifySourceStatus(status: number): SourceStatus {
  if (status >= 200 && status < 400) return "ok";
  if (status === 404 || status === 410) return "broken";
  return "unchecked";
}

export async function checkSourceUrl(url: string) {
  try {
    let response = await sourceRequest(url, "HEAD");
    if ([403, 405, 501].includes(response.status)) {
      await response.body?.cancel();
      response = await sourceRequest(url, "GET");
    }
    const status = classifySourceStatus(response.status);
    await response.body?.cancel();
    return { status, note: `Automated check returned HTTP ${response.status}.` };
  } catch (error) {
    return {
      status: "unchecked" as const,
      note: `Automated check could not confirm the source: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

export async function runSourceHealthAudit(limit = 20) {
  const database = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const review = await database.listSourceReview();
  const due = review.sources
    .filter((source) => Boolean(source.stale) || !source.status || source.status === "broken")
    .slice(0, Math.max(1, Math.min(limit, 50)));
  const results = await Promise.all(due.map(async (source) => ({
    source,
    result: await checkSourceUrl(String(source.url)),
  })));
  await Promise.all(results.map(({ source, result }) => database.updateSourceCheck({
    url: String(source.url),
    status: result.status,
    strength: String(source.strength || "standard"),
    note: result.note,
    checkedBy: "cron",
  })));
  return {
    checked: results.length,
    broken: results.filter(({ result }) => result.status === "broken").length,
    unchecked: results.filter(({ result }) => result.status === "unchecked").length,
  };
}
