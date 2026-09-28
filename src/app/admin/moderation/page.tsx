import Link from "next/link";
import { notFound } from "next/navigation";
import { Inbox } from "lucide-react";

import { ModerationFilters } from "@/components/admin/moderation-filters";
import { QueueRevisionRow } from "@/components/admin/revision-row";
import { moderationHref, type ModerationFilterValues } from "@/lib/admin-display";
import { getUserRoles } from "@/lib/admin-users";
import { formatDisplayLabel } from "@/lib/display";
import { getStaffUser } from "@/lib/wiki-auth";
import { contentTypes } from "@/lib/wiki-types";
import { cn } from "@/lib/utils";

type Search = {
  status?: string;
  q?: string;
  contentType?: string;
  conflicting?: string;
  unassigned?: string;
};

// Completed decisions (approved/rejected) live in the audit log, so the queue
// only offers the open statuses.
const tabs = [
  ["pending_review", "Pending review"],
  ["verifying", "Verifying"],
  ["changes_requested", "Changes requested"],
  ["all", "All open"],
] as const;

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const staff = await getStaffUser();
  if (!staff) notFound();
  const { listAdminQueue, countAdminQueueByStatus } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const search = await searchParams;
  const values: ModerationFilterValues = {
    status: tabs.some(([key]) => key === search.status) ? search.status! : "pending_review",
    q: (search.q || "").trim().slice(0, 100),
    contentType: contentTypes.includes(search.contentType as never) ? search.contentType! : "all",
    conflicting: search.conflicting === "1",
    unassigned: search.unassigned === "1",
  };
  const [revisions, counts] = await Promise.all([
    listAdminQueue({
      status: values.status,
      query: values.q,
      contentType: values.contentType,
      conflicting: values.conflicting,
      unassigned: values.unassigned,
    }),
    countAdminQueueByStatus(),
  ]);
  const roles = await getUserRoles(revisions.map((revision) => String(revision.contributor_id)));
  const countFor = (key: string) =>
    key === "all" ? Object.values(counts).reduce((sum, count) => sum + count, 0) : (counts[key] ?? 0);

  return (
    <main>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Review</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.04em]">Moderation queue</h1>
      <p className="mt-1.5 text-[13px] text-muted-foreground">Filter, assign, and decide submitted revisions.</p>

      <nav aria-label="Revision status" className="mt-[22px] flex gap-1 overflow-x-auto border-b">
        {tabs.map(([key, label]) => {
          const active = values.status === key;
          return (
            <Link
              key={key}
              href={moderationHref({ ...values, status: key })}
              aria-current={active ? "page" : undefined}
              scroll={false}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm",
                active
                  ? "border-primary font-semibold hover:text-foreground"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-[7px] py-px font-mono text-[11px] tabular-nums",
                  active ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground",
                )}
              >
                {countFor(key)}
              </span>
            </Link>
          );
        })}
      </nav>

      <ModerationFilters
        values={values}
        contentTypes={contentTypes.map((value) => ({ value, label: formatDisplayLabel(value) }))}
        resultLabel={`${revisions.length} ${revisions.length === 1 ? "revision" : "revisions"}`}
      />

      <div className="mt-3.5 overflow-hidden rounded-2xl border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b bg-muted px-5 py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <span>Revision · oldest first</span>
          <span className="text-right">Assignee</span>
        </div>
        {revisions.length ? (
          revisions.map((revision) => (
            <QueueRevisionRow
              key={String(revision.id)}
              revision={revision}
              role={roles.get(String(revision.contributor_id))}
              viewerId={staff.userId}
            />
          ))
        ) : (
          <div className="px-6 py-14 text-center">
            <Inbox className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <p className="mt-2.5 text-[15px] font-semibold">No revisions match these filters</p>
            <p className="mt-1 text-[13px] text-muted-foreground">Adjust the filters or come back later.</p>
          </div>
        )}
      </div>
    </main>
  );
}
