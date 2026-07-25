import { ScrollText } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplayLabel } from "@/lib/display";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminAuditPage() {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const { listAuditLog } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const events = await listAuditLog();
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Append-only moderation and administration history
      </p>
      <h2 className="mt-1 text-3xl font-bold">Audit log</h2>
      <div className="mt-7 space-y-3">
        {events.length ? (
          events.map((event) => (
            <Card key={String(event.id)}>
              <CardContent>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {formatDisplayLabel(String(event.entity_type))}
                      </Badge>
                      <h3 className="font-semibold">
                        {formatDisplayLabel(String(event.action))}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {String(event.actor_name)} · {String(event.actor_id)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      Affected {String(event.entity_id)}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground">
                    {new Date(String(event.created_at)).toLocaleString()}
                  </time>
                </div>
                {Boolean(event.before_json || event.after_json) && (
                  <details className="mt-4 rounded-lg bg-muted/50 p-3 text-xs">
                    <summary className="cursor-pointer font-medium">
                      View recorded change
                    </summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <pre className="overflow-auto whitespace-pre-wrap">
                        Before\n
                        {event.before_json
                          ? JSON.stringify(
                              JSON.parse(String(event.before_json)),
                              null,
                              2,
                            )
                          : "Not available"}
                      </pre>
                      <pre className="overflow-auto whitespace-pre-wrap">
                        After\n
                        {event.after_json
                          ? JSON.stringify(
                              JSON.parse(String(event.after_json)),
                              null,
                              2,
                            )
                          : "Not available"}
                      </pre>
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <ScrollText className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">
                No admin actions have been recorded.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Audit events will appear after moderation or administration
                changes.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
