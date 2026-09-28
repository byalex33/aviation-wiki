import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookCheck,
  CircleCheck,
  FileClock,
  Library,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";

import { DashboardRevisionRow } from "@/components/admin/revision-row";
import { describeAuditEvent, formatActivityTime, formatAge } from "@/lib/admin-display";
import { getUserRoles } from "@/lib/admin-users";
import { getStaffUser } from "@/lib/wiki-auth";
import { getAdminDashboard } from "@/lib/wiki-public-db";

const number = new Intl.NumberFormat("en-GB");
const panel = "rounded-2xl border bg-card";

export default async function AdminDashboardPage() {
  // AdminLayout also guards this route, but layouts and pages render
  // concurrently, so the dashboard queries must not run until the caller is
  // confirmed to be staff.
  const staff = await getStaffUser();
  if (!staff) notFound();
  const isAdmin = staff.role === "admin";
  const { totals, review, queue, activity } = await getAdminDashboard({ includeActivity: isAdmin });
  const roles = await getUserRoles(queue.map((item) => String(item.contributor_id)));
  const pending = Number(review?.pending ?? 0);
  const publishedShare = totals.articles ? Math.round((totals.published / totals.articles) * 100) : 0;
  const publicationTotal = totals.published + totals.archived;
  const publishedWidth = publicationTotal ? (totals.published / publicationTotal) * 100 : 0;
  const stats = [
    ["Articles", totals.articles, Library, `+${number.format(totals.articlesThisWeek)} this week`],
    ["Published", totals.published, BookCheck, `${publishedShare}% of articles`],
    ["Contributors", totals.contributors, Users, `+${number.format(totals.contributorsThisWeek)} this week`],
    ["Protected pages", totals.protectedPages, ShieldAlert, "Edits need moderator"],
    ["Audit events", totals.auditEvents, ScrollText, `${number.format(totals.auditEventsThisWeek)} in last 7 days`],
  ] as const;

  return (
    <main>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
      </p>
      <h1 className="mt-2 text-3xl font-bold leading-tight tracking-[-0.04em]">Dashboard</h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        Live database overview
      </p>

      <div className="mt-6 flex flex-wrap gap-4">
        <section
          aria-label="Pending review"
          className="relative flex-[1_1_320px] overflow-hidden rounded-2xl bg-[hsl(210_10%_15%)] p-6 text-white dark:border dark:bg-card"
        >
          <div className="absolute inset-x-0 top-0 h-[3px] bg-primary" aria-hidden="true" />
          <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
            <FileClock className="size-3.5 text-[hsl(356_84%_62%)] dark:text-white/70" aria-hidden="true" />
            Pending review
          </p>
          <p className="mt-3 text-[56px] font-bold leading-none tracking-[-0.05em] tabular-nums">{number.format(pending)}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-white/10 pt-3.5">
            <div>
              <dt className="text-[11px] text-white/55">Oldest</dt>
              <dd className="mt-0.5 text-[15px] font-semibold">{pending ? formatAge(review?.oldest, { suffix: false }) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/55">Unassigned</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{number.format(review?.unassigned ?? 0)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-white/55">Conflicts</dt>
              <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-amber-300">{number.format(review?.conflicting ?? 0)}</dd>
            </div>
          </dl>
          <Link
            href="/admin/moderation"
            className="mt-[18px] flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-semibold text-[hsl(210_10%_15%)] transition-colors hover:bg-[hsl(356_84%_96%)] hover:text-[hsl(210_10%_15%)] dark:hover:bg-white/85"
          >
            Start reviewing
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </section>

        <div className={`${panel} grid flex-[2_1_480px] grid-cols-[repeat(auto-fit,minmax(150px,1fr))] overflow-hidden`}>
          {stats.map(([label, value, Icon, note]) => (
            <div key={label} className="px-[22px] py-5 shadow-[inset_-1px_0_0_var(--border),inset_0_-1px_0_var(--border)]">
              <p className="flex items-center justify-between gap-2 text-[13px] font-medium text-muted-foreground">
                {label}
                <Icon className="size-[15px] opacity-70" aria-hidden="true" />
              </p>
              <p className="mt-2.5 text-[28px] font-bold leading-none tracking-[-0.04em] tabular-nums">{number.format(value)}</p>
              <p className="mt-1.5 text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start gap-4">
        <section className={`${panel} min-w-0 flex-[999_1_520px] overflow-hidden`}>
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <h2 className="text-[15px] font-semibold">
              Awaiting review <span className="font-normal text-muted-foreground">· oldest first</span>
            </h2>
            <Link href="/admin/moderation" className="text-[13px] font-medium text-primary">
              View queue
            </Link>
          </div>
          {queue.length ? (
            queue.map((item) => (
              <DashboardRevisionRow key={String(item.id)} revision={item} role={roles.get(String(item.contributor_id))} />
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <CircleCheck className="mx-auto size-7 text-emerald-500" aria-hidden="true" />
              <p className="mt-2.5 text-[15px] font-semibold">Queue is clear</p>
              <p className="mt-1 text-[13px] text-muted-foreground">No revisions are waiting for review.</p>
            </div>
          )}
        </section>

        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <section className={`${panel} p-5`}>
            <h2 className="text-[15px] font-semibold">Publication</h2>
            <div className="mt-3.5 flex h-2 gap-0.5 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <span className="bg-foreground/85" style={{ width: `${publishedWidth}%` }} />
              <span className="flex-1 bg-muted-foreground/40" />
            </div>
            <dl className="mt-3.5 flex flex-col gap-2.5 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-[2px] bg-foreground/85" aria-hidden="true" />
                <dt className="flex-1 text-muted-foreground">Published</dt>
                <dd className="font-semibold tabular-nums">{number.format(totals.published)}</dd>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-[2px] bg-muted-foreground/40" aria-hidden="true" />
                <dt className="flex-1 text-muted-foreground">Archived</dt>
                <dd className="font-semibold tabular-nums">{number.format(totals.archived)}</dd>
              </div>
              <div className="flex items-center gap-2 border-t pt-2.5">
                <span className="w-2" aria-hidden="true" />
                <dt className="flex-1 text-muted-foreground">Unique sources</dt>
                <dd className="font-semibold tabular-nums">{number.format(totals.sources)}</dd>
              </div>
            </dl>
          </section>

          {isAdmin && (
            <section className={`${panel} p-5`}>
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Recent activity</h2>
                <Link href="/admin/audit" className="text-[13px] font-medium text-primary">
                  Audit log
                </Link>
              </div>
              {activity.length ? (
                <ol className="mt-3.5 flex flex-col">
                  {activity.map((event) => (
                    <li key={String(event.id)} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2.5 border-t py-2">
                      <time
                        dateTime={new Date(String(event.created_at)).toISOString()}
                        className="pt-px font-mono text-[11px] text-muted-foreground"
                      >
                        {formatActivityTime(event.created_at)}
                      </time>
                      <p className="text-[13px] leading-[1.45] text-muted-foreground">
                        <strong className="font-semibold text-foreground">
                          {event.actor_id === staff.userId ? "You" : String(event.actor_name)}
                        </strong>{" "}
                        {describeAuditEvent(String(event.action), event.article_title)}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-3.5 text-[13px] text-muted-foreground">No admin actions have been recorded yet.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
