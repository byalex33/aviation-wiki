import { AlertTriangle, MailCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayLabel } from "@/lib/display";
import { listFailedEmailDeliveries } from "@/lib/notification-db";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminNotificationDiagnosticsPage() {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const failures = listFailedEmailDeliveries();
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Transactional email delivery health
      </p>
      <h2 className="mt-1 text-3xl font-bold">Notification diagnostics</h2>
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
