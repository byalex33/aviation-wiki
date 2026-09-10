import "server-only";

import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request as httpRequest, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP, type LookupFunction } from "node:net";

type SourceStatus = "ok" | "broken" | "unchecked";

// IANA special-purpose ranges: https://www.iana.org/assignments/iana-ipv6-special-registry
const nonPublicAddresses = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10],
  ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) nonPublicAddresses.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["::", 96], ["100::", 64], ["2001:db8::", 32],
  ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8],
  ["64:ff9b:1::", 48], ["100:0:0:1::", 64], ["2001:2::", 48],
  ["3fff::", 20], ["5f00::", 16],
] as const) nonPublicAddresses.addSubnet(address, prefix, "ipv6");

export function isPrivateAddress(address: string) {
  const family = isIP(address);
  // BlockList also normalizes IPv4-mapped IPv6, including hexadecimal forms.
  return !family || nonPublicAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

type SourceHeaders = { status: number; location?: string };
type SourceResolver = (hostname: string) => Promise<LookupAddress[]>;
type SourceTransport = (url: URL, options: RequestOptions) => Promise<SourceHeaders>;

function requestHeaders(url: URL, options: RequestOptions): Promise<SourceHeaders> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      url,
      { ...options, agent: false, signal: AbortSignal.timeout(8_000) },
      (response) => {
        resolve({ status: response.statusCode ?? 0, location: response.headers.location });
        // The checker needs only response headers, including for the GET fallback.
        response.destroy();
      },
    );
    request.on("error", reject);
    request.end();
  });
}

export async function requestSourceHeaders(
  value: string,
  method: "HEAD" | "GET",
  dependencies: { resolve: SourceResolver; request: SourceTransport } = {
    resolve: (hostname) => lookup(hostname, { all: true, verbatim: true }),
    request: requestHeaders,
  },
) {
  let url = new URL(value);
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password)
      throw new Error("Unsupported source URL.");
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await dependencies.resolve(hostname);
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address)))
      throw new Error("Source URL does not resolve to a public address.");
    const pinnedLookup: LookupFunction = (_hostname, options, callback) => {
      const candidates = options.family
        ? addresses.filter((address) => address.family === options.family)
        : addresses;
      if (!candidates.length) {
        callback(new Error("No validated address for this address family."), "");
      } else if (options.all) {
        callback(null, candidates);
      } else {
        callback(null, candidates[0].address, candidates[0].family);
      }
    };
    const response = await dependencies.request(url, {
      method,
      lookup: pinnedLookup,
      headers: {
        "user-agent": "aviation.wiki source health checker",
        ...(method === "GET" ? { range: "bytes=0-0" } : {}),
      },
    });
    if (response.status < 300 || response.status >= 400 || !response.location) return response;
    url = new URL(response.location, url);
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
    let response = await requestSourceHeaders(url, "HEAD");
    if ([403, 405, 501].includes(response.status)) {
      response = await requestSourceHeaders(url, "GET");
    }
    const status = classifySourceStatus(response.status);
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
