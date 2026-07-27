import Link from "next/link";
import {
  BellRing,
  CheckCircle2,
  GitBranch,
  MessageSquareText,
  RotateCcw,
  BookOpenCheck,
  XCircle,
} from "lucide-react";

import { markNotificationReadAction } from "@/app/notifications/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NotificationRecord } from "@/lib/notification-types";

const iconByType = {
  custom: BellRing,
  revision_approved: CheckCircle2,
  changes_requested: MessageSquareText,
  revision_rejected: XCircle,
  moderator_feedback: MessageSquareText,
  article_restored: RotateCcw,
  article_superseded: GitBranch,
  watched_article_edited: BellRing,
  source_accepted: BookOpenCheck,
  source_removed: BookOpenCheck,
  relationship_accepted: GitBranch,
  relationship_removed: GitBranch,
};

const accentByType: Record<NotificationRecord["type"], string> = {
  custom: "text-primary bg-primary/10",
  revision_approved: "text-emerald-600 bg-emerald-500/10",
  changes_requested: "text-amber-600 bg-amber-500/10",
  revision_rejected: "text-red-600 bg-red-500/10",
  moderator_feedback: "text-blue-600 bg-blue-500/10",
  article_restored: "text-violet-600 bg-violet-500/10",
  article_superseded: "text-violet-600 bg-violet-500/10",
  watched_article_edited: "text-primary bg-primary/10",
  source_accepted: "text-emerald-600 bg-emerald-500/10",
  source_removed: "text-red-600 bg-red-500/10",
  relationship_accepted: "text-emerald-600 bg-emerald-500/10",
  relationship_removed: "text-red-600 bg-red-500/10",
};

export function NotificationItem({
  notification,
  compact = false,
}: {
  notification: NotificationRecord;
  compact?: boolean;
}) {
  const Icon = iconByType[notification.type];
  return (
    <div
      className={cn(
        "flex gap-3 border-b p-4 last:border-b-0",
        !notification.readAt && "bg-primary/[0.035]",
      )}
    >
      <span
        className={cn(
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
          accentByType[notification.type],
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <Link href={notification.href} className="font-medium hover:underline">
          {notification.title}
        </Link>
        <p
          className={cn(
            "mt-1 text-sm text-muted-foreground",
            compact && "line-clamp-2",
          )}
        >
          {notification.message}
        </p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <time
            className="text-xs text-muted-foreground"
            dateTime={notification.createdAt}
          >
            {new Date(notification.createdAt).toLocaleString()}
          </time>
          {!notification.readAt && (
            <form action={markNotificationReadAction}>
              <input
                type="hidden"
                name="notificationId"
                value={notification.id}
              />
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="min-h-10 px-3 text-xs"
              >
                Mark as read
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
