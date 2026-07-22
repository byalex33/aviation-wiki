import { AlertTriangle, MailCheck, Send } from "lucide-react";
import { notFound } from "next/navigation";

import { sendCustomNotificationAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listAdminUsers } from "@/lib/admin-users";
import { formatDisplayLabel } from "@/lib/display";
import { listFailedEmailDeliveries } from "@/lib/notification-db";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminNotificationDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const [failures, users, params] = await Promise.all([
    Promise.resolve(listFailedEmailDeliveries()),
    listAdminUsers(),
    searchParams,
  ]);
  return (
    <main>
      <p className="text-sm text-muted-foreground">Admin communications</p>
      <h2 className="mt-1 text-3xl font-bold">Notifications</h2>
      <Card className="mt-7">
        <CardContent>
          <div className="flex items-center gap-2">
            <Send className="size-5 text-primary" />
            <h3 className="text-lg font-semibold">Send a custom notification</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The recipient will always receive this in-app. Email delivery follows
            their notification preferences.
          </p>
          {params.sent === "1" && (
            <p className="mt-4 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">
              Notification sent.
            </p>
          )}
          <form action={sendCustomNotificationAction} className="mt-5 grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Recipient
              <select
                name="recipientId"
                required
                className="h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              >
                <option value="">Select a user</option>
                <option value="all">All users ({users.length})</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email}) · {formatDisplayLabel(user.role)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Title
              <Input name="title" required maxLength={160} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Message
              <Textarea name="message" required maxLength={1000} rows={4} />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Destination path
              <Input name="href" defaultValue="/notifications" maxLength={500} />
              <span className="font-normal text-muted-foreground">
                Must be a local path, such as /wiki/f-15-eagle.
              </span>
            </label>
            <Button type="submit" className="w-fit">
              <Send className="size-4" /> Send notification
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="mt-10 text-sm text-muted-foreground">
        Transactional email delivery health
      </p>
      <h3 className="mt-1 text-2xl font-bold">Delivery diagnostics</h3>
      <div className="mt-7 space-y-3">
        {failures.length ? (
          failures.map((failure) => (
            <Card key={String(failure.id)}>
              <CardContent className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-destructive" />
                    <Badge variant="outline">
                      {formatDisplayLabel(String(failure.type))}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm">
                    {String(
                      failure.failure_reason ||
                        "Delivery failed without a provider reason.",
                    )}
                  </p>
                  <p className="mt-2 font-mono text-xs text-muted-foreground">
                    Notification {String(failure.notification_id).slice(0, 8)} ·{" "}
                    {Number(failure.retry_count)} retries
                  </p>
                  {Boolean(failure.article_id || failure.revision_id) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Affected{" "}
                      {failure.revision_id
                        ? `revision ${String(failure.revision_id).slice(0, 8)}`
                        : `article ${String(failure.article_id).slice(0, 8)}`}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground">
                  {new Date(String(failure.updated_at)).toLocaleString()}
                </time>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <MailCheck className="mx-auto size-8 text-emerald-600" />
              <p className="mt-3 font-medium">No failed email deliveries</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Delivery failures will appear here without exposing recipients
                or email contents.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
