import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FilePenLine, LockKeyhole } from "lucide-react";

import { RevisionEditor } from "@/components/revision-editor";
import { saveDraftFormAction, submitRevisionFormAction } from "@/app/contribute/actions";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requireContributor } from "@/lib/wiki-auth";
import { assertArticleEditable, getArticleBySlug, getContributorRestriction, getEditableRevision, listApprovedEntityOptions, normalizeSlug } from "@/lib/wiki-public-db";
import { contentTypes, type ContentType, type RevisionContent } from "@/lib/wiki-types";

export const metadata: Metadata = { title: "Article editor", description: "Write and preview reviewed aviation.wiki revisions." };

export default async function EditorPage({ searchParams }: { searchParams: Promise<{ type?: string; slug?: string; correction?: string; saved?: string; submitted?: string }> }) {
  const query = await searchParams;
  const contentType = contentTypes.includes(query.type as ContentType) ? query.type as ContentType : null;
  const slug = normalizeSlug(query.slug || "");
  if (!contentType || !slug) return <main className="mx-auto max-w-2xl px-5 py-20 text-center"><FilePenLine className="mx-auto size-9 text-primary" /><h1 className="mt-5 text-4xl font-bold">Choose an article to edit</h1><p className="mt-4 text-muted-foreground">Open an article’s Edit action, or start a new sourced article from the contribution page.</p><Link href="/contribute" className={`${buttonVariants()} mt-7`}>Contribution centre</Link></main>;

  const session = await auth();
  if (!session.isAuthenticated || !session.userId) return <main className="mx-auto max-w-2xl px-5 py-20 text-center"><LockKeyhole className="mx-auto size-9 text-primary" /><h1 className="mt-5 text-4xl font-bold">Sign in to contribute</h1><p className="mt-4 text-muted-foreground">Article revisions are tied to a Clerk account and must pass moderator review before publication.</p><Link href={`/sign-in?redirect_url=${encodeURIComponent(`/editor?type=${contentType}&slug=${slug}`)}`} className={`${buttonVariants()} mt-7`}>Sign in</Link></main>;

  const article = await getArticleBySlug(slug, contentType);
  const contributor = await requireContributor();
  if (article) {
    try {
      await assertArticleEditable(article.id, contributor.role, await getContributorRestriction(contributor.userId));
    } catch (error) {
      return <main className="mx-auto max-w-2xl px-5 py-20 text-center"><LockKeyhole className="mx-auto size-9 text-primary" /><h1 className="mt-5 text-4xl font-bold">Editing is unavailable</h1><p className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : "This article cannot currently be edited."}</p></main>;
    }
  }
  const draft = article ? await getEditableRevision(article.id, session.userId) : null;
  const relationshipTargets = await listApprovedEntityOptions();
  const title = article?.title || slug.split("-").map((part) => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
  const initialContent: RevisionContent = draft || article?.liveRevision || { title, contentType, markdown: "", fields: [], sections: [], sources: [], relationships: [] };
  return <main className="mx-auto max-w-[1200px] px-5 pb-20 pt-8 sm:px-6"><div className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><Badge variant="outline">{article?.liveRevision ? query.correction ? "Suggest a correction" : "Edit approved article" : "Create this article"}</Badge><h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{initialContent.title}</h1><p className="mt-3 max-w-3xl leading-7 text-muted-foreground">The approved Markdown is preloaded below. Your changes remain private until submitted and can only become public after moderator approval.</p></div>{draft && <RevisionStatusBadge status={draft.status} />}</div>{query.saved && <p className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Draft saved.</p>}{query.submitted && <p className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">Revision submitted for moderator review.</p>}<RevisionEditor slug={slug} revisionId={draft?.id} articleId={article?.id} initialContent={initialContent} relationshipTargets={relationshipTargets} initialSummary={draft?.editSummary} returnTo={`/editor?type=${contentType}&slug=${slug}`} saveAction={saveDraftFormAction} submitAction={submitRevisionFormAction} /></main>;
}
