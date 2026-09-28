import Link from "next/link";
import { notFound } from "next/navigation";
import { getStaffUser } from "@/lib/wiki-auth";

import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { contentTypes } from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";

type Search = {
  view?: string;
  status?: string;
  contentType?: string;
  contributor?: string;
  submittedFrom?: string;
  conflicting?: string;
};
export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  if (!(await getStaffUser())) notFound();
  const { listAdminQueue } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const search = await searchParams;
  const history = search.view === "history";
  const statuses = history ? ["approved", "rejected"] : ["verifying", "pending_review", "changes_requested"];
  const status = statuses.includes(search.status || "") ? search.status : "all";
  const revisions = await listAdminQueue({
    ...search,
    view: history ? "history" : "queue",
    status,
    conflicting: search.conflicting === "1",
  });
  return (
    <main>
      <div>
        <p className="text-sm text-muted-foreground">
          {history ? "Completed moderation decisions. Open a revision to see its review details." : "Submitted revisions awaiting review or changes."}
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          {history ? "Moderation history" : "Moderation queue"}
        </h2>
      </div>
      <nav aria-label="Moderation views" className="mt-6 flex gap-6 border-b pb-3 text-sm">
        <Link href="/admin/moderation" aria-current={!history ? "page" : undefined} className={!history ? "font-semibold underline underline-offset-8" : "text-muted-foreground"}>Queue</Link>
        <Link href="/admin/moderation?view=history" aria-current={history ? "page" : undefined} className={history ? "font-semibold underline underline-offset-8" : "text-muted-foreground"}>History</Link>
      </nav>
      <Card className="mt-6 rounded-none shadow-none">
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {history && <input type="hidden" name="view" value="history" />}
            <select
              aria-label="Revision status"
              name="status"
              defaultValue={status}
              className="h-9 rounded-none border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              {statuses.map((value) => (
                <option key={value} value={value}>
                  {formatDisplayLabel(value)}
                </option>
              ))}
            </select>
            <select
              aria-label="Content type"
              name="contentType"
              defaultValue={search.contentType || "all"}
              className="h-9 rounded-none border bg-background px-3 text-sm"
            >
              <option value="all">All content types</option>
              {contentTypes.map((value) => (
                <option key={value} value={value}>{formatDisplayLabel(value)}</option>
              ))}
            </select>
            <Input
              aria-label="Contributor"
              name="contributor"
              defaultValue={search.contributor}
              placeholder="Contributor"
            />
            <Input
              aria-label="Submitted from"
              name="submittedFrom"
              type="date"
              defaultValue={search.submittedFrom}
            />
            <div className="flex gap-2">
              <label className="flex items-center gap-2 whitespace-nowrap rounded-none border px-3 text-xs">
                <input
                  type="checkbox"
                  name="conflicting"
                  value="1"
                  defaultChecked={search.conflicting === "1"}
                />
                Conflicts
              </label>
              <Button type="submit" variant="outline">
                Filter
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
              className="grid gap-4 border bg-muted/20 p-5 md:grid-cols-[1fr_auto]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{String(revision.title)}</h3>
                  <RevisionStatusBadge status={revision.status as never} />
                  {Number(revision.conflict_count) > 1 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-700">
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
          <Card className="rounded-none shadow-none">
            <CardContent className="p-12 text-center">
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
