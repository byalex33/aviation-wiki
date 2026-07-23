import { AlertTriangle, BookCheck, Copy, Link2Off } from "lucide-react";

import { updateSourceCheckAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";

export default async function AdminSourcesPage() {
  const { listSourceReview } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const review = await listSourceReview();
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Citation health from real revision records
      </p>
      <h2 className="mt-1 text-3xl font-bold">Source review</h2>
      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent>
            <Link2Off className="size-5 text-destructive" />
            <p className="mt-3 text-2xl font-bold">
              {review.sources.filter((s) => s.status === "broken").length}
            </p>
            <p className="text-sm text-muted-foreground">Broken URLs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Copy className="size-5 text-amber-600" />
            <p className="mt-3 text-2xl font-bold">
              {review.sources.filter((s) => Number(s.usage_count) > 1).length}
            </p>
            <p className="text-sm text-muted-foreground">
              Duplicate source URLs
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <AlertTriangle className="size-5 text-amber-600" />
            <p className="mt-3 text-2xl font-bold">{review.missing.length}</p>
            <p className="text-sm text-muted-foreground">
              Revisions missing citations
            </p>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {review.sources.length ? (
            review.sources.map((source) => {
              const stale = Boolean(source.stale);
              return (
                <div key={String(source.url)} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <a
                        href={String(source.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all font-medium text-primary"
                      >
                        {String(source.label || source.url)}
                      </a>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Used {Number(source.usage_count)} times ·{" "}
                        {stale
                          ? "Not checked recently"
                          : `Checked ${new Date(String(source.checked_at)).toLocaleDateString()}`}{" "}
                        ·{" "}
                        {formatDisplayLabel(
                          String(source.status || "unchecked"),
                        )}{" "}
                        ·{" "}
                        {formatDisplayLabel(
                          String(source.strength || "unrated"),
                        )}
                      </p>
                    </div>
                  </div>
                  <form
                    action={updateSourceCheckAction}
                    className="mt-3 grid gap-2 md:grid-cols-[120px_120px_1fr_auto]"
                  >
                    <input
                      type="hidden"
                      name="url"
                      value={String(source.url)}
                    />
                    <select
                      name="status"
                      defaultValue={String(source.status || "unchecked")}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="unchecked">Unchecked</option>
                      <option value="ok">OK</option>
                      <option value="broken">Broken</option>
                    </select>
                    <select
                      name="strength"
                      defaultValue={String(source.strength || "standard")}
                      className="h-8 rounded-md border bg-background px-2 text-xs"
                    >
                      <option value="strong">Strong</option>
                      <option value="standard">Standard</option>
                      <option value="weak">Weak</option>
                    </select>
                    <Input
                      name="note"
                      defaultValue={String(source.note || "")}
                      placeholder="Review note"
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      Save review
                    </Button>
                  </form>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <BookCheck className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No source URLs exist in revision records.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      {review.missing.length > 0 && (
        <Card className="mt-7">
          <CardHeader>
            <CardTitle>Missing citations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {review.missing.map((revision) => (
              <div
                key={String(revision.id)}
                className="flex justify-between rounded-lg border px-4 py-3 text-sm"
              >
                <span>{String(revision.title)}</span>
                <span className="text-muted-foreground">
                  {formatDisplayLabel(String(revision.status))}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  );
}
