import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy, Library } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { getStaffUser } from "@/lib/wiki-auth";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const { findDuplicateArticles, listAdminArticles } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const q = (await searchParams).q || "";
  const [articles, duplicates] = await Promise.all([
    listAdminArticles(q),
    findDuplicateArticles(),
  ]);
  return (
    <main>
      <p className="text-sm text-muted-foreground">
        Publication, protection, redirects, and history
      </p>
      <h2 className="mt-1 text-3xl font-bold tracking-tight">
        Article management
      </h2>
      <form className="mt-6 max-w-xl">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search by title or slug"
        />
      </form>
      {duplicates.length > 0 && (
        <Card className="mt-6 border-amber-200 bg-amber-50">
          <CardContent>
            <div className="flex gap-3">
              <Copy className="size-5 text-amber-700" />
              <div>
                <h3 className="font-semibold text-amber-900">
                  Potential duplicate pages
                </h3>
                {duplicates.map((item) => (
                  <p
                    key={item.normalized_title}
                    className="mt-1 text-sm text-amber-900/80"
                  >
                    {item.slugs}
                  </p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="mt-6 overflow-hidden rounded-xl border bg-card">
        <div className="grid grid-cols-[minmax(0,1fr)_120px_120px_100px] gap-3 border-b bg-muted/40 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Article</span>
          <span>Publication</span>
          <span>Verification</span>
          <span></span>
        </div>
        {articles.length ? (
          articles.map((article) => {
            const verification = article.verification_json
              ? JSON.parse(String(article.verification_json))
              : null;
            return (
              <Link
                key={String(article.id)}
                href={`/admin/articles/${article.id}`}
                className="grid grid-cols-[minmax(0,1fr)_120px_120px_100px] items-center gap-3 border-b px-5 py-4 text-sm last:border-0 hover:bg-muted/30"
              >
                <div>
                  <p className="font-medium">{String(article.title)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    /{String(article.slug)} · {Number(article.revision_count)}{" "}
                    revisions
                  </p>
                </div>
                <Badge
                  variant={article.archived_at ? "destructive" : "secondary"}
                >
                  {article.archived_at
                    ? "Archived"
                    : article.live_revision_id
                      ? "Published"
                      : "Unpublished"}
                </Badge>
                <span className="text-muted-foreground">
                  {verification?.status
                    ? formatDisplayLabel(verification.status)
                    : "Not checked"}
                </span>
                <span className="text-right text-primary">Manage</span>
              </Link>
            );
          })
        ) : (
          <div className="p-12 text-center">
            <Library className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No articles match this search.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
