import Link from "next/link";
import { notFound } from "next/navigation";

import { editAndApproveFormAction } from "@/app/contribute/actions";
import { RevisionEditor } from "@/components/revision-editor";
import { getRevision, listApprovedEntityOptions } from "@/lib/wiki-public-db";
import { canModerateRevision } from "@/lib/revision-transitions";

export async function ModeratorEditScreen({
  revisionId,
  reviewHref,
  framed = false,
}: {
  revisionId: string;
  reviewHref: string;
  framed?: boolean;
}) {
  const revision = await getRevision(revisionId);
  if (!revision) notFound();
  const editable = canModerateRevision(revision.status, "approve");
  const relationshipTargets = editable ? await listApprovedEntityOptions() : [];
  return (
    <main className={framed ? "mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-6" : undefined}>
      <nav className="text-sm text-muted-foreground">
        <Link href={reviewHref} className="article-link">
          Review
        </Link>
        <span> / Edit and approve</span>
      </nav>
      <p className="mt-7 font-mono text-xs uppercase tracking-wide text-primary">Moderator edit</p>
      {framed ? (
        <h1 className="mt-2 text-4xl font-bold">Edit before publishing</h1>
      ) : (
        <h2 className="mt-2 text-3xl font-bold">Edit before publishing</h2>
      )}
      {editable ? (
        <>
          <p className="mt-3 text-muted-foreground">
            Saving this form approves the exact content shown here and makes it live. The original contributor and revision remain in the audit trail.
          </p>
          <div className="mt-8">
            <RevisionEditor
              slug={revision.proposedSlug}
              revisionId={revision.id}
              articleId={revision.articleId}
              initialContent={revision}
              relationshipTargets={relationshipTargets}
              initialSummary={revision.editSummary}
              mode="moderator"
              moderatorAction={editAndApproveFormAction}
            />
          </div>
        </>
      ) : (
        <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This revision is not awaiting approval. Return to the review page to reject it, or leave it for the contributor to resume.
        </p>
      )}
    </main>
  );
}
