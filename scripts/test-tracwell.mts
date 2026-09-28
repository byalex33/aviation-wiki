import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const scenario = process.argv[2];
if (!scenario) {
  for (const mode of ["server", "development", "dnt", "production"]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", import.meta.filename, mode], {
      env: { ...process.env, NODE_ENV: mode === "development" ? "development" : "production" },
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
  }
  console.log("Tracwell: server/development guards, DNT, singleton, routing, outcomes and identity passed.");
} else {
  const { syncTracwellIdentity, trackArticleWatch } = await import("../src/lib/tracwell");
  if (scenario === "server") {
    syncTracwellIdentity(null);
  } else {
    const windowEvents = new EventTarget();
    const storage = new Map<string, string>();
    const batches: { events: { event_name: string; user_id?: string; properties?: unknown; context: { path: string } }[] }[] = [];
    const location = { href: "https://aviation.wiki/articles/test" };
    const history = {
      pushState(_state: unknown, _unused: string, url: string) { location.href = new URL(url, location.href).href; },
      replaceState(_state: unknown, _unused: string, url: string) { location.href = new URL(url, location.href).href; },
    };
    Object.assign(globalThis, {
      window: {
        location,
        localStorage: {
          getItem: (key: string) => storage.get(key) ?? null,
          setItem: (key: string, value: string) => storage.set(key, value),
          removeItem: (key: string) => storage.delete(key),
        },
        addEventListener: windowEvents.addEventListener.bind(windowEvents),
        removeEventListener: windowEvents.removeEventListener.bind(windowEvents),
        setInterval: () => 1,
        clearInterval: () => {},
      },
      document: Object.assign(new EventTarget(), { title: "Test article", referrer: "", visibilityState: "visible" }),
      history,
    });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: {
      doNotTrack: scenario === "dnt" ? "1" : "0",
      sendBeacon: (_url: string, body: string) => { batches.push(JSON.parse(body)); return true; },
    } });
    syncTracwellIdentity(null);
    syncTracwellIdentity(null);
    syncTracwellIdentity("user_opaque_a");
    syncTracwellIdentity("user_opaque_a");
    trackArticleWatch(true, "article_123");
    history.pushState(null, "", "/fleet");
    await Promise.resolve();
    history.replaceState(null, "", "/fleet");
    await Promise.resolve();
    syncTracwellIdentity(null);
    trackArticleWatch(false, "article_123");
    syncTracwellIdentity("user_opaque_b");
    trackArticleWatch(true, "article_456");
    windowEvents.dispatchEvent(new Event("pagehide"));
    const events = batches.flatMap((batch) => batch.events);
    if (scenario !== "production") {
      assert.equal(events.length, 0);
      assert.equal(storage.size, 0);
    } else {
      assert.deepEqual(events.filter((event) => event.event_name === "page_view").map((event) => event.context.path), ["/articles/test", "/fleet"]);
      assert.equal(events.filter((event) => event.event_name === "identify").length, 2);
      const outcomes = events.filter((event) => event.event_name.startsWith("article_watch_"));
      assert.deepEqual(outcomes.map((event) => [event.event_name, event.user_id, event.properties]), [
        ["article_watch_added", "user_opaque_a", { article_id: "article_123" }],
        ["article_watch_removed", undefined, { article_id: "article_123" }],
        ["article_watch_added", "user_opaque_b", { article_id: "article_456" }],
      ]);
    }
  }
}
