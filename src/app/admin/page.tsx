import Link from "next/link";
import {
  ArrowRight,
  BookCheck,
  FileClock,
  Library,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminDashboard } from "@/lib/wiki-public-db";

export default async function AdminDashboardPage() {
  const { totals, queue } = await getAdminDashboard();
  const cards = [
    ["Articles", totals.articles, Library],
    ["Published", totals.published, BookCheck],
    ["Pending review", totals.pending, FileClock],
    ["Contributors", totals.contributors, Users],
    ["Protected pages", totals.protectedPages, ShieldAlert],
    ["Audit events", totals.auditEvents, ScrollText],
  ] as const;
  return (
    <main>
      <div>
        <p className="text-sm text-muted-foreground">
          Real-time database overview
        </p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">
          Admin dashboard
        </h2>
      </div>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm text-muted-foreground">
                {label}
                <Icon className="size-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>Awaiting review</CardTitle>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {queue.length ? (
              queue.map((item) => (
                <Link
                  key={String(item.id)}
                  href={`/admin/moderation/${item.id}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"
                >
                  <div>
                    <p className="font-medium">{String(item.title)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(item.contributor_name)} ·{" "}
                      {String(item.article_slug)}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              ))
            ) : (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No revisions are waiting for review.
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Publication</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Published</span>
              <strong>{totals.published}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Archived</span>
              <strong>{totals.archived}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unique sources</span>
              <strong>{totals.sources}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
