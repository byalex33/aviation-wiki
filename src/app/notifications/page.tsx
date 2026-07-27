import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Bell, Mail } from "lucide-react";

import {
  markAllNotificationsReadAction,
  updateNotificationPreferencesAction,
} from "@/app/notifications/actions";
import { NotificationItem } from "@/components/notification-item";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayLabel } from "@/lib/display";
import {
  getNotificationPreferences,
  getUnreadCount,
  listNotifications,
} from "@/lib/notification-db";
import { notificationTypes } from "@/lib/notification-types";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId)
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/notifications")}`);
  const page = Math.max(1, Number((await searchParams).page) || 1);
  const notifications = listNotifications(session.userId, page, 20);
  const unreadCount = getUnreadCount(session.userId);
  const preferences = getNotificationPreferences(session.userId);

  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <Bell className="size-5" />
            <p className="text-sm font-medium">Notification centre</p>
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Notifications
          </h1>
          <p className="mt-3 text-muted-foreground">
            {unreadCount
              ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`
              : "You are all caught up."}
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_350px]">
        <Card className="gap-0 overflow-hidden py-0">
          {notifications.items.length ? (
            notifications.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))
          ) : (
            <CardContent className="py-16 text-center">
              <Bell className="mx-auto size-8 text-muted-foreground" />
              <h2 className="mt-4 font-semibold">No notifications</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Updates about your revisions and watched articles will appear
                here.
              </p>
            </CardContent>
          )}
        </Card>

        <Card className="gap-0 py-0 lg:sticky lg:top-[76px]">
          <CardContent className="p-5">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-primary" />
              <h2 className="font-semibold">Notification preferences</h2>
            </div>
            <form
              action={updateNotificationPreferencesAction}
              className="mt-5 space-y-5"
            >
              <fieldset>
                <legend className="text-sm font-medium">Email frequency</legend>
                <div className="mt-3 space-y-2">
                  {[
                    ["immediate", "Immediate emails"],
                    ["daily", "Daily digest"],
                    ["in_app", "In-app only"],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className="flex min-h-10 items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="radio"
                        name="frequency"
                        value={value}
                        defaultChecked={preferences.frequency === value}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium">
                  Notification types
                </legend>
                <div className="mt-3 space-y-2">
                  {notificationTypes.map((type) => (
                    <label
                      key={type}
                      className="flex min-h-10 items-center gap-2 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        name={`type:${type}`}
                        defaultChecked={preferences.enabledTypes[type]}
                        className="mt-0.5"
                      />
                      {formatDisplayLabel(type)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Button type="submit" className="w-full">
                Save preferences
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">
                Emails are sent only to your verified primary Clerk email
                address. In-app notifications remain available regardless of
                email settings.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {notifications.pages > 1 && (
        <nav
          className="mt-6 flex items-center justify-center gap-3"
          aria-label="Notification pages"
        >
          {page > 1 && (
            <Link
              href={`/notifications?page=${page - 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {notifications.pages}
          </span>
          {page < notifications.pages && (
            <Link
              href={`/notifications?page=${page + 1}`}
              className={buttonVariants({ variant: "outline" })}
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
