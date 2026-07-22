import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { RevisionEditor } from "@/components/revision-editor";
import { saveDraftAction, submitRevisionAction } from "@/app/contribute/actions";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { getArticleBySlug, getEditableRevision, listApprovedEntityOptions, normalizeSlug } from "@/lib/wiki-public-db";
import { contentTypes, type ContentType, type RevisionContent } from "@/lib/wiki-types";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ title?: string; type?: string; saved?: string; submitted?: string }> };

export default async function ContributionEditorPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) notFound();
  const { slug: rawSlug } = await params;
  const query = await searchParams;
  const slug = normalizeSlug(rawSlug);
  const requestedType = contentTypes.includes(query.type as ContentType) ? query.type as ContentType : undefined;
  const article = await getArticleBySlug(slug, requestedType);
  const draft = article ? await getEditableRevision(article.id, session.userId) : null;
  const relationshipTargets = await listApprovedEntityOptions();
  const contentType = contentTypes.includes(query.type as ContentType) ? query.type as ContentType : article?.contentType || "aircraft";
  const initialContent: RevisionContent = draft || article?.liveRevision || { title: query.title || slug.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" "), contentType, markdown: "", fields: [], sections: [], sources: [], relationships: [] };
  const latestOwn = !draft && article ? null : draft;

  return (
    <main className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-7 flex gap-2 text-sm text-muted-foreground"><Link href="/contribute" className="article-link">Contributions</Link><span>/</span><span>{initialContent.title}</span></nav>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-wide text-primary">{article?.liveRevision ? "Propose an edit" : "Create this article"}</p><h1 className="mt-2 text-4xl font-bold tracking-tight">{initialContent.title}</h1><p className="mt-3 text-muted-foreground">Your work remains private until submitted. Submissions never change the live article directly.</p></div>{latestOwn && <RevisionStatusBadge status={latestOwn.status} />}</div>
      {query.saved && <p className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Draft saved.</p>}
      {query.submitted && <p className="mt-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Revision submitted for moderator review.</p>}
      {draft?.moderatorNote && <Card className="mt-6 border-amber-200 bg-amber-50"><CardContent className="p-5"><h2 className="font-semibold text-amber-900">Moderator requested changes</h2><p className="mt-2 text-sm text-amber-900/80">{draft.moderatorNote}</p></CardContent></Card>}
      <div className="mt-8"><RevisionEditor slug={slug} revisionId={draft?.id} articleId={article?.id} initialContent={initialContent} relationshipTargets={relationshipTargets} initialSummary={draft?.editSummary} saveAction={saveDraftAction} submitAction={submitRevisionAction} /></div>
    </main>
  );
}
