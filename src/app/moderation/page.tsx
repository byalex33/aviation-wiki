import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { isModerator } from "@/lib/wiki-auth";
import { listReviewQueue } from "@/lib/wiki-public-db";

export default async function ModerationPage() {
  if (!(await isModerator())) notFound();
  const revisions = await listReviewQueue();
  return <main className="mx-auto max-w-[1000px] px-5 pb-20 pt-8 sm:px-6"><div className="flex items-center gap-3"><ShieldCheck className="size-7 text-primary" /><div><p className="font-mono text-xs uppercase tracking-wide text-primary">Moderator workspace</p><h1 className="mt-1 text-4xl font-bold">Review queue</h1></div></div><p className="mt-4 text-muted-foreground">Every publication decision is made by a moderator.</p><div className="mt-9 space-y-3">{revisions.length ? revisions.map((revision) => <Link key={revision.id} href={`/moderation/${revision.id}`} className="block rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"><div className="flex items-start justify-between gap-4"><div><h2 className="font-semibold">{revision.title}</h2><p className="mt-1 text-sm text-muted-foreground">{revision.editSummary}</p><p className="mt-3 text-xs text-muted-foreground">{revision.contributorName} · {revision.articleSlug}</p></div><RevisionStatusBadge status={revision.status} /></div></Link>) : <Card><CardContent className="p-10 text-center text-muted-foreground">The review queue is empty.</CardContent></Card>}</div></main>;
}
