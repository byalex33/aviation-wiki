import "server-only";

import type * as Local from "@/lib/notification-db";

async function storage() {
  return process.env.DATABASE_URL
    ? import("@/lib/postgres-notification-db")
    : import("@/lib/notification-db");
}

export async function createNotification(...args: Parameters<typeof Local.createNotification>) {
  return (await storage()).createNotification(...args);
}

export async function getNotificationForUser(...args: Parameters<typeof Local.getNotificationForUser>) {
  return (await storage()).getNotificationForUser(...args);
}

export async function listNotifications(...args: Parameters<typeof Local.listNotifications>) {
  return (await storage()).listNotifications(...args);
}

export async function getUnreadCount(...args: Parameters<typeof Local.getUnreadCount>) {
  return (await storage()).getUnreadCount(...args);
}

export async function markNotificationRead(...args: Parameters<typeof Local.markNotificationRead>) {
  return (await storage()).markNotificationRead(...args);
}

export async function markAllNotificationsRead(...args: Parameters<typeof Local.markAllNotificationsRead>) {
  return (await storage()).markAllNotificationsRead(...args);
}

export async function getNotificationPreferences(...args: Parameters<typeof Local.getNotificationPreferences>) {
  return (await storage()).getNotificationPreferences(...args);
}

export async function saveNotificationPreferences(...args: Parameters<typeof Local.saveNotificationPreferences>) {
  return (await storage()).saveNotificationPreferences(...args);
}

export async function setArticleWatch(...args: Parameters<typeof Local.setArticleWatch>) {
  return (await storage()).setArticleWatch(...args);
}

export async function isWatchingArticle(...args: Parameters<typeof Local.isWatchingArticle>) {
  return (await storage()).isWatchingArticle(...args);
}

export async function listArticleWatcherIds(...args: Parameters<typeof Local.listArticleWatcherIds>) {
  return (await storage()).listArticleWatcherIds(...args);
}

export async function listArticleWatchAlerts(articleId: string) {
  return (await storage()).listArticleWatchAlerts(articleId);
}

export async function queueEmailDelivery(...args: Parameters<typeof Local.queueEmailDelivery>) {
  return (await storage()).queueEmailDelivery(...args);
}

export async function updateEmailDelivery(...args: Parameters<typeof Local.updateEmailDelivery>) {
  return (await storage()).updateEmailDelivery(...args);
}

export async function listFailedEmailDeliveries(...args: Parameters<typeof Local.listFailedEmailDeliveries>) {
  return (await storage()).listFailedEmailDeliveries(...args);
}

export async function listPendingDigestNotifications(...args: Parameters<typeof Local.listPendingDigestNotifications>) {
  return (await storage()).listPendingDigestNotifications(...args);
}

export async function getNotificationById(...args: Parameters<typeof Local.getNotificationById>) {
  return (await storage()).getNotificationById(...args);
}
