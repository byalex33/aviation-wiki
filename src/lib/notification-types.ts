export const notificationTypes = [
  "revision_approved",
  "changes_requested",
  "revision_rejected",
  "moderator_feedback",
  "article_restored",
  "article_superseded",
  "watched_article_edited",
  "source_accepted",
  "source_removed",
  "relationship_accepted",
  "relationship_removed",
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type EmailFrequency = "immediate" | "daily" | "in_app";

export type NotificationRecord = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string;
  articleId: string | null;
  revisionId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPreferences = {
  frequency: EmailFrequency;
  enabledTypes: Record<NotificationType, boolean>;
};
