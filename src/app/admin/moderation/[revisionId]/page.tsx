import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import {
  addPrivateNoteAction,
  adminModerateRevisionAction,
  assignRevisionAction,
} from "@/app/admin/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { ImportedRevisionData } from "@/components/imported-revision-data";
import { RevisionComparison } from "@/components/revision-comparison";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  RevisionContent,
  RevisionStatus,
  VerificationResult,
} from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";
import { sourceTitle } from "@/lib/article-citations";

function content(row: Record<string, unknown>): RevisionContent {
  const sections = JSON.parse(String(row.sections_json));
  return {
    title: String(row.title),
    contentType: row.content_type as RevisionContent["contentType"],
    markdown:
      typeof row.markdown === "string" && row.markdown
        ? row.markdown
        : sections
            .map(
              (section: { heading: string; body: string }) =>
                `## ${section.heading}\n\n${section.body}`,
            )
            .join("\n\n"),
    fields: JSON.parse(String(row.fields_json)),
    sections,
    sources: JSON.parse(String(row.sources_json)),
    relationships: JSON.parse(String(row.relationships_json || "[]")),
  };
}
export default async function AdminReviewPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const {
    getAdminRevision,
    getLiveRevisionForArticle,
    listPrivateRevisionNotes,
  } = process.env.DATABASE_URL
    ? await import("@/lib/wiki-public-db")
    : await import("@/lib/admin-db");
  const revision = await getAdminRevision((await params).revisionId);
  if (!revision) notFound();
  const [live, notes] = await Promise.all([
    getLiveRevisionForArticle(String(revision.article_id)),
    listPrivateRevisionNotes(String(revision.id)),
  ]);
  const proposed = content(revision);
  const verification = revision.verification_json
    ? (JSON.parse(String(revision.verification_json)) as VerificationResult)
    : null;
  return (
    <main>
      <nav className="text-sm text-muted-foreground">
        <Link href="/admin/moderation" className="article-link">
          Moderation
        </Link>
        <span> / {String(revision.title)}</span>
      </nav>
      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-primary">
            Revision {String(revision.id).slice(0, 8)}
          </p>
          <h2 className="mt-2 text-3xl font-bold">Review proposed changes</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Submitted by {String(revision.contributor_name)} ·{" "}
            {String(revision.content_type)}
          </p>
        </div>
        <RevisionStatusBadge status={revision.status as RevisionStatus} />
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-7">
          <RevisionComparison
            current={live ? content(live) : null}
            proposed={proposed}
          />
          <Card>
            <CardHeader>
              <CardTitle>Gemini findings</CardTitle>
            </CardHeader>
            <CardContent>
              {verification ? (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    {verification.status === "completed" ? (
                      <CheckCircle2 className="size-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="size-5 text-amber-600" />
                    )}
                    <div>
                      <p className="text-sm">{verification.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {verification.model || "No model"} ·{" "}
                        {new Date(verification.checkedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {verification.claims.map((claim, index) => (
                    <div key={index} className="rounded-lg border p-4 text-sm">
                      <strong>{formatDisplayLabel(claim.assessment)}</strong>
                      <p className="mt-2">{claim.claim}</p>
                      <p className="mt-2 text-muted-foreground">
                        {claim.notes}
                      </p>
                      {claim.sourceUrl && (
                        <a
                          href={claim.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="article-link mt-2 inline-flex items-center gap-1"
                        >
                          Source
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="size-4" />
                  No Gemini result is attached.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sources</CardTitle>
            </CardHeader>
            <CardContent>
              {proposed.sources.length ? (
                <ul className="space-y-3">
                  {proposed.sources.map((source) => (
                    <li
                      key={source.url}
                      className="rounded-lg border p-3 text-sm"
                    >
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary"
                      >
                        {sourceTitle(source)}
                        <ExternalLink className="ml-1 inline size-3" />
                      </a>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {source.url}
                      </p>
                      {(source.publisher || source.accessedAt) && <p className="mt-1 text-xs text-muted-foreground">{source.publisher || "Publisher not supplied"}{source.accessedAt ? ` · Accessed ${source.accessedAt}` : ""}</p>}
                      {source.archiveUrl && <a href={source.archiveUrl} target="_blank" rel="noreferrer" className="article-link mt-1 inline-block text-xs">Open archived copy</a>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This revision has no sources.
                </p>
              )}
            </CardContent>
          </Card>
          <ImportedRevisionData revisionId={String(revision.id)} />
        </div>
        <aside className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Assignment</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={assignRevisionAction}>
                <input
                  type="hidden"
                  name="revisionId"
                  value={String(revision.id)}
                />
                <Button
                  type="submit"
                  name="assigned"
                  value={revision.assigned_moderator_id ? "none" : "self"}
                  variant="outline"
                  className="w-full"
                >
                  {revision.assigned_moderator_id ? "Unassign" : "Assign to me"}
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Decision</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={adminModerateRevisionAction} className="space-y-3">
                <input
                  type="hidden"
                  name="revisionId"
                  value={String(revision.id)}
                />
                <Textarea
                  name="moderatorNote"
                  placeholder="Decision note, change request, or rejection reason"
                />
                <ConfirmSubmitButton
                  name="intent"
                  value="approve"
                  className="w-full"
                  confirmation="Approve and publish this revision?"
                >
                  Approve
                </ConfirmSubmitButton>
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
                <ConfirmSubmitButton
                  name="intent"
                  value="reject"
                  variant="destructive"
                  className="w-full"
                  confirmation="Reject this revision? The reason entered above will be sent to the contributor."
                >
                  Reject
                </ConfirmSubmitButton>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Private moderator notes</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addPrivateNoteAction} className="space-y-3">
                <input
                  type="hidden"
                  name="revisionId"
                  value={String(revision.id)}
                />
                <Textarea
                  name="note"
                  required
                  placeholder="Visible only to moderators and admins"
                />
                <Button type="submit" variant="outline" className="w-full">
                  Add private note
                </Button>
              </form>
              <div className="mt-4 space-y-3">
                {notes.length ? (
                  notes.map((note) => (
                    <div
                      key={String(note.id)}
                      className="rounded-lg bg-muted p-3 text-sm"
                    >
                      <p>{String(note.note)}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {String(note.moderator_name)} ·{" "}
                        {new Date(String(note.created_at)).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No private notes.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
