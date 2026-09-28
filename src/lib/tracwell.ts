"use client";

import { createTracwell, type TracwellClient } from "tracwell";

let analytics: TracwellClient | undefined;

export function syncTracwellIdentity(userId: string | null) {
  if (typeof document === "undefined" || process.env.NODE_ENV !== "production") return;

  analytics ??= createTracwell({
    projectKey: "tw_live_b7fdd00a4c83432eb660cca47c68abb3",
    collectionMode: "product",
    consent: "granted",
    respectDoNotTrack: true,
  });

  const previousUserId = analytics.getSession()?.userId;
  if (previousUserId === (userId ?? undefined)) return;
  if (previousUserId) analytics.reset();
  if (userId) analytics.identify(userId);
}

export function trackArticleWatch(watching: boolean, articleId: string) {
  analytics?.track(watching ? "article_watch_added" : "article_watch_removed", {
    article_id: articleId,
  });
}
