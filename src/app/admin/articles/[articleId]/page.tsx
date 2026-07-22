import Link from "next/link";
import { notFound } from "next/navigation";

import {
  restoreArticleRevisionAction,
  updateArticleAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAllRevisionHistory, getArticleAdminById } from "@/lib/admin-db";
import { formatDisplayLabel } from "@/lib/display";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const article = getArticleAdminById((await params).articleId);
  if (!article) notFound();
  const history = getAllRevisionHistory(String(article.id));
  return (
    <main>
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/articles" className="article-link">
          Articles
        </Link>
        <span> / {String(article.title)}</span>
      </nav>
      <div className="mt-5">
        <h2 className="text-3xl font-bold">{String(article.title)}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage publishing controls and revision history.
        </p>
      </div>
      <div className="mt-7 grid gap-7 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Page controls</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateArticleAction} className="space-y-5">
              <input
                type="hidden"
                name="articleId"
                value={String(article.id)}
              />
              <label className="grid gap-2 text-sm font-medium">
                Slug
                <Input
                  name="slug"
                  defaultValue={String(article.slug)}
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Editing permission
                <select
                  name="protectionLevel"
                  defaultValue={String(article.protection_level)}
                  className="h-9 rounded-lg border bg-background px-3"
                >
                  <option value="open">All contributors</option>
                  <option value="trusted">Trusted contributors</option>
                  <option value="moderator">Moderators</option>
                  <option value="admin">Admins only</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Redirect target slug
                <Input
                  name="redirectToSlug"
                  defaultValue={String(article.redirect_to_slug || "")}
                  placeholder="Leave empty for no redirect"
                />
              </label>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="locked"
                  defaultChecked={Boolean(article.is_locked)}
                />
                Lock all non-admin editing
              </label>
              <label className="flex items-center gap-3 text-sm text-destructive">
                <input
                  type="checkbox"
                  name="archived"
                  defaultChecked={Boolean(article.archived_at)}
                />
                Archive this article
              </label>
              <ConfirmSubmitButton
                confirmation="Apply these page controls? Archiving, locking, slug changes, and redirects can affect contributor access."
                className="w-full"
              >
                Save page controls
              </ConfirmSubmitButton>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Publication</span>
              <Badge
                variant={article.archived_at ? "destructive" : "secondary"}
              >
                {article.archived_at
                  ? "Archived"
                  : article.live_revision_id
                    ? "Published"
                    : "Unpublished"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Protection</span>
              <strong>
                {formatDisplayLabel(String(article.protection_level))}
              </strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locked</span>
              <strong>{article.is_locked ? "Yes" : "No"}</strong>
            </div>
            <Link
              href={`/history/${article.slug}`}
              className="article-link block pt-2"
            >
              Open public revision history
            </Link>
          </CardContent>
        </Card>
      </div>
      <Card className="mt-7">
        <CardHeader>
          <CardTitle>Complete revision history</CardTitle>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {history.length ? (
            history.map((revision) => (
              <div
                key={String(revision.id)}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {String(revision.edit_summary || "No edit summary")}
                    </p>
                    <Badge variant="outline">
                      {formatDisplayLabel(String(revision.status))}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {String(revision.contributor_name)} ·{" "}
                    {new Date(String(revision.created_at)).toLocaleString()}
                  </p>
                </div>
                {revision.status === "approved" &&
                  revision.id !== article.live_revision_id && (
                    <form action={restoreArticleRevisionAction}>
                      <input
                        type="hidden"
                        name="revisionId"
                        value={String(revision.id)}
                      />
                      <ConfirmSubmitButton
                        variant="outline"
                        size="sm"
                        confirmation="Restore this approved revision as the live article?"
                      >
                        Restore
                      </ConfirmSubmitButton>
                    </form>
                  )}
              </div>
            ))
          ) : (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No revisions exist for this article.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
