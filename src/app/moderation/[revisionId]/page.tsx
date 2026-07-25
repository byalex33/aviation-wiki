import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { moderateRevisionFormAction } from "@/app/contribute/actions";
import { ActionForm } from "@/components/action-form";
import { RevisionComparison } from "@/components/revision-comparison";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { sourceTitle } from "@/lib/article-citations";
import { isModerator } from "@/lib/wiki-auth";
import { getArticleBySlug, getRevision } from "@/lib/wiki-public-db";

export default async function ModeratorReviewPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  if (!(await isModerator())) notFound();
  const revision = await getRevision((await params).revisionId);
  if (!revision) notFound();
  const article = await getArticleBySlug(revision.articleSlug, revision.contentType);
  return (
    <main className="mx-auto max-w-[1150px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="text-sm text-muted-foreground">
        <Link href="/moderation" className="article-link">
          Review queue
        </Link>
        <span> / {revision.title}</span>
      </nav>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-primary">
            Revision {revision.id.slice(0, 8)}
          </p>
          <h1 className="mt-2 text-4xl font-bold">Review proposed changes</h1>
        </div>
        <RevisionStatusBadge status={revision.status} />
      </div>
      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_320px]">
        <RevisionComparison
          current={article?.liveRevision || null}
          proposed={revision}
        />
        <aside className="space-y-5 lg:sticky lg:top-[76px]">
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <h2 className="font-semibold">Contributor summary</h2>
              <p className="mt-3 text-sm leading-6">{revision.editSummary}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Submitted by {revision.contributorName}
              </p>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <h2 className="font-semibold">Sources</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {revision.sources.map((source, index) => (
                  <li key={`${source.identifier || source.url}-${index}`}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="article-link"
                    >
                      {sourceTitle(source)}
                      <ExternalLink className="ml-1 inline size-3" />
                    </a>
                    {source.publisher && <p className="mt-1 text-xs text-muted-foreground">{source.publisher}{source.accessedAt ? ` · Accessed ${source.accessedAt}` : ""}</p>}
                    {source.archiveUrl && <a href={source.archiveUrl} target="_blank" rel="noreferrer" className="article-link mt-1 block text-xs">Open archived copy</a>}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="gap-0 py-0">
            <CardContent className="p-5">
              <h2 className="font-semibold">Decision</h2>
              <ActionForm action={moderateRevisionFormAction} className="mt-4 space-y-3">
                <input type="hidden" name="revisionId" value={revision.id} />
                <Textarea
                  name="moderatorNote"
                  className="min-h-24"
                  placeholder="Decision note or requested changes"
                />
                <Button
                  type="submit"
                  name="intent"
                  value="approve"
                  className="w-full"
                >
                  Approve and publish
                </Button>
                <Link
                  href={`/moderation/${revision.id}/edit`}
                  className={`${buttonVariants({ variant: "outline" })} w-full`}
                >
                  Edit and approve
                </Link>
                <Button
                  type="submit"
                  name="intent"
                  value="request_changes"
                  variant="outline"
                  className="w-full"
                >
                  Request changes
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="reject"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive"
                >
                  Reject
                </Button>
              </ActionForm>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
