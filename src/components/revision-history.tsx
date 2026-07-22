import Link from "next/link";
import { ArrowRightLeft } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { RevisionRecord } from "@/lib/wiki-types";

export function RevisionHistory({ revisions, pathname, selectedFrom, selectedTo }: { revisions: RevisionRecord[]; pathname: string; selectedFrom?: string; selectedTo?: string }) {
  return <div className="space-y-4">{revisions.map((revision) => <Card key={revision.id} className="gap-0 py-0"><CardContent className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold">{revision.editSummary || "Approved revision"}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(revision.reviewedAt || revision.createdAt).toLocaleString()} · {revision.contributorName} · {revision.id.slice(0, 8)}</p></div><div className="flex flex-wrap gap-3 text-sm"><Link className="article-link" href={`${pathname}?from=${revision.id}${selectedTo ? `&to=${selectedTo}` : ""}`}>Select as older</Link><Link className="article-link" href={`${pathname}?${selectedFrom ? `from=${selectedFrom}&` : ""}to=${revision.id}`}>Select as newer</Link></div></CardContent></Card>)}</div>;
}

export function ComparisonPrompt() {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground"><ArrowRightLeft className="mx-auto mb-3 size-5" />Select an older and newer approved revision to compare them.</div>;
}

