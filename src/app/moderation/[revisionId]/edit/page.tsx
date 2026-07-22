import Link from "next/link";
import { notFound } from "next/navigation";

import { RevisionEditor } from "@/components/revision-editor";
import { editAndApproveAction } from "@/app/contribute/actions";
import { isModerator } from "@/lib/wiki-auth";
import { getRevision, listApprovedEntityOptions } from "@/lib/wiki-db";

export default async function ModeratorEditPage({ params }: { params: Promise<{ revisionId: string }> }) {
  if (!(await isModerator())) notFound();
  const revision = getRevision((await params).revisionId);
  if (!revision || !["pending_review", "verifying"].includes(revision.status)) notFound();
  return <main className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-6"><nav className="text-sm text-muted-foreground"><Link href={`/moderation/${revision.id}`} className="article-link">Review</Link><span> / Edit and approve</span></nav><p className="mt-7 font-mono text-xs uppercase tracking-wide text-primary">Moderator edit</p><h1 className="mt-2 text-4xl font-bold">Edit before publishing</h1><p className="mt-3 text-muted-foreground">Saving this form approves the exact content shown here and makes it live. The original contributor and revision remain in the audit trail.</p><div className="mt-8"><RevisionEditor slug={revision.proposedSlug} revisionId={revision.id} articleId={revision.articleId} initialContent={revision} relationshipTargets={listApprovedEntityOptions()} initialSummary={revision.editSummary} mode="moderator" moderatorAction={editAndApproveAction} /></div></main>;
}
