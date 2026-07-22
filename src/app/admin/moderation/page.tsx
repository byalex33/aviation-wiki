import Link from "next/link";
import { Filter, GitCompareArrows, Inbox } from "lucide-react";

import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contentTypes } from "@/lib/wiki-types";
import { listAdminQueue } from "@/lib/admin-db";
import { formatDisplayLabel } from "@/lib/display";

type Search = {
  status?: string;
  contentType?: string;
  contributor?: string;
  submittedFrom?: string;
  verification?: string;
  conflicting?: string;
};
export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const search = await searchParams;
  const revisions = listAdminQueue({
    ...search,
    conflicting: search.conflicting === "1",
  });
  return (
    <main>
      <div>
        <p className="text-sm text-muted-foreground">
          Filter, assign, and decide submitted revisions
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Moderation queue
        </h2>
      </div>
      <Card className="mt-6">
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <select
              name="status"
              defaultValue={search.status || "pending_review"}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              {[
                "verifying",
                "pending_review",
                "changes_requested",
                "approved",
                "rejected",
              ].map((value) => (
                <option key={value} value={value}>
                  {formatDisplayLabel(value)}
                </option>
              ))}
            </select>
            <select
              name="contentType"
              defaultValue={search.contentType || "all"}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All content types</option>
              {contentTypes.map((value) => (
                <option key={value}>{formatDisplayLabel(value)}</option>
              ))}
            </select>
            <Input
              name="contributor"
              defaultValue={search.contributor}
              placeholder="Contributor"
            />
            <Input
              name="submittedFrom"
              type="date"
              defaultValue={search.submittedFrom}
            />
            <select
              name="verification"
              defaultValue={search.verification || "all"}
              className="h-9 rounded-lg border bg-background px-3 text-sm"
            >
              <option value="all">All Gemini results</option>
              <option value="completed">Completed</option>
              <option value="unavailable">Unavailable</option>
              <option value="error">Error</option>
              <option value="missing">Missing</option>
            </select>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-xs">
                <input
                  type="checkbox"
                  name="conflicting"
                  value="1"
                  defaultChecked={search.conflicting === "1"}
                />
                Conflicts
              </label>
              <Button type="submit" variant="outline">
                <Filter />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="mt-6 space-y-3">
        {revisions.length ? (
          revisions.map((revision) => (
            <Link
              key={String(revision.id)}
              href={`/admin/moderation/${revision.id}`}
              className="grid gap-4 rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{String(revision.title)}</h3>
                  <RevisionStatusBadge status={revision.status as never} />
                  {Number(revision.conflict_count) > 1 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
                      <GitCompareArrows className="size-3.5" />
                      {Number(revision.conflict_count)} conflicting revisions
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {String(revision.edit_summary || "No summary")}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {String(revision.contributor_name)} ·{" "}
                  {String(revision.content_type)} ·{" "}
                  {revision.submitted_at
                    ? new Date(String(revision.submitted_at)).toLocaleString()
                    : "Not submitted"}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {revision.assigned_moderator_id ? "Assigned" : "Unassigned"}
              </div>
            </Link>
          ))
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <Inbox className="mx-auto size-8 text-muted-foreground" />
              <p className="mt-4 font-medium">
                No revisions match these filters.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Adjust the filters or return later.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
