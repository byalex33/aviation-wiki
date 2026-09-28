import Link from "next/link";
import { GitCompareArrows } from "lucide-react";

import { AssignButton } from "@/components/admin/assign-button";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { RoleUsername } from "@/components/role-username";
import { formatAge, hoursSince } from "@/lib/admin-display";
import { formatDisplayLabel } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { WikiRole } from "@/lib/wiki-roles";

type Revision = Record<string, unknown>;

function ConflictChip({ count, label }: { count: number; label: string }) {
  if (count <= 1) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
      <GitCompareArrows className="size-3" aria-hidden="true" />
      {label}
    </span>
  );
}

function Meta({ revision, role, overdue }: { revision: Revision; role?: WikiRole; overdue?: boolean }) {
  const submitted = revision.submitted_at || revision.updated_at;
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
      <RoleUsername
        name={String(revision.contributor_name)}
        role={role}
        className={cn("font-semibold", !role || role === "contributor" ? "text-foreground" : undefined)}
      />
      <span>{formatDisplayLabel(String(revision.content_type))}</span>
      <time
        dateTime={submitted ? new Date(String(submitted)).toISOString() : undefined}
        className={cn("font-mono", overdue && "text-primary")}
      >
        {formatAge(submitted)}
      </time>
    </p>
  );
}

/** Compact row for the dashboard's "Awaiting review" list. */
export function DashboardRevisionRow({ revision, role }: { revision: Revision; role?: WikiRole }) {
  const conflicts = Number(revision.conflict_count);
  return (
    <Link
      href={`/admin/moderation/${revision.id}`}
      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-3.5 last:border-b-0 hover:bg-muted/60 hover:text-foreground"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{String(revision.title)}</p>
          <ConflictChip count={conflicts} label={`${conflicts} conflicting`} />
        </div>
        <Meta revision={revision} role={role} />
      </div>
      <span className="flex h-8 items-center rounded-lg border px-3 text-[13px] font-medium transition-colors group-hover:border-primary group-hover:text-primary">
        Review
      </span>
    </Link>
  );
}

/** Full row for the moderation queue, with summary, status and assignment. */
export function QueueRevisionRow({ revision, role, viewerId }: { revision: Revision; role?: WikiRole; viewerId: string }) {
  const conflicts = Number(revision.conflict_count);
  const status = String(revision.status);
  const assignedId = revision.assigned_moderator_id ? String(revision.assigned_moderator_id) : null;
  const assignee = assignedId === viewerId ? "You" : String(revision.assigned_moderator_name || "Moderator");
  const overdue = status === "pending_review" && (hoursSince(revision.submitted_at || revision.updated_at) ?? 0) > 48;
  return (
    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b px-5 py-3.5 last:border-b-0 hover:bg-muted/60">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/moderation/${revision.id}`}
            className="text-sm font-semibold after:absolute after:inset-0 after:content-[''] hover:text-foreground"
          >
            {String(revision.title)}
          </Link>
          <RevisionStatusBadge status={status as never} />
          <ConflictChip count={conflicts} label={String(conflicts)} />
        </div>
        <p className="mt-1 truncate text-[13px] text-muted-foreground">
          {String(revision.edit_summary || "No summary")}
        </p>
        <Meta revision={revision} role={role} overdue={overdue} />
      </div>
      <div className="flex justify-end">
        {assignedId ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <span className="grid size-[22px] place-items-center rounded-full bg-secondary text-[10px] font-semibold text-secondary-foreground" aria-hidden="true">
              {assignee[0]?.toUpperCase()}
            </span>
            <span className="sr-only">Assigned to </span>
            {assignee}
          </span>
        ) : (
          <AssignButton revisionId={String(revision.id)} title={String(revision.title)} />
        )}
      </div>
    </div>
  );
}
