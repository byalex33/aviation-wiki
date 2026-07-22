import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileWarning, Images } from "lucide-react";
import { notFound } from "next/navigation";

import { importAviationDataAction } from "@/app/admin/import/actions";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assessImportPreview } from "@/lib/admin-db";
import { formatDisplayLabel } from "@/lib/display";
import { getImportProvider } from "@/lib/import-providers";
import { searchPublicArticles } from "@/lib/wiki-search";
import { getStaffUser } from "@/lib/wiki-auth";
import { contentTypes, type ContentType } from "@/lib/wiki-types";

function one(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] || "" : value || ""; }

export default async function ImportPreviewPage({ params, searchParams }: { params: Promise<{ provider: string; sourceId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if ((await getStaffUser())?.role !== "admin") notFound();
  const route = await params;
  const rawType = one((await searchParams).type);
  if (!contentTypes.includes(rawType as ContentType)) notFound();
  const contentType = rawType as ContentType;
  let preview;
  try { preview = await getImportProvider(route.provider).preview(route.sourceId, contentType); } catch { notFound(); }
  const assessment = assessImportPreview(preview);
  const fuzzy = (await searchPublicArticles({ query: preview.title, contentType, pageSize: 5 })).hits;
  const candidateMap = new Map<string, { id: string; title: string; detail: string }>();
  for (const item of [...assessment.titleMatches, ...assessment.aliasMatches, ...assessment.identifierCollisions]) candidateMap.set(String(item.id), { id: String(item.id), title: String(item.title), detail: [item.archived_at ? "Archived" : "", item.redirect_to_slug ? "Redirect" : "", item.field_key ? `${item.field_key}: ${item.field_value}` : ""].filter(Boolean).join(" · ") || "Existing article" });
  if (assessment.externalMapping) candidateMap.set(String(assessment.externalMapping.article_id), { id: String(assessment.externalMapping.article_id), title: String(assessment.externalMapping.title), detail: "Already linked to this source identifier" });
  for (const hit of fuzzy) candidateMap.set(hit.id, { id: hit.id, title: hit.title, detail: `Possible ${formatDisplayLabel(hit.contentType)} match` });
  const candidates = [...candidateMap.values()];
  const hasHardConflict = Boolean(assessment.externalMapping || assessment.identifierCollisions.length || assessment.titleMatches.length || assessment.aliasMatches.length);
  return <main>
    <Link href={`/admin/import?type=${contentType}`} className="text-sm text-primary hover:underline">← Back to import search</Link>
    <div className="mt-4 flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Badge>{formatDisplayLabel(contentType)}</Badge><Badge variant="outline">{preview.sourceId}</Badge></div><h2 className="mt-3 text-3xl font-bold">{preview.title}</h2>{preview.description && <p className="mt-2 max-w-3xl text-muted-foreground">Source description: {preview.description}</p>}</div><a href={preview.sourceUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>Open source <ExternalLink /></a></div>
    <div className="mt-7 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>No automatic publication.</strong> Importing creates a private draft. It must follow the normal Gemini verification, submission, moderator review, and approval workflow.</div>
    <form action={importAviationDataAction} className="mt-7 space-y-6">
      <input type="hidden" name="provider" value={preview.provider}/><input type="hidden" name="sourceId" value={preview.sourceId}/><input type="hidden" name="contentType" value={contentType}/>
      <Card><CardHeader><CardTitle>Existing matches and conflicts</CardTitle></CardHeader><CardContent>{candidates.length ? <div className="space-y-3">{hasHardConflict && <p className="flex items-center gap-2 text-sm text-amber-800"><AlertTriangle className="size-4"/>A matching article or identifier exists. Select the correct target before importing.</p>}<label className="grid gap-2 text-sm font-medium">Import into an existing article<select name="targetArticleId" className="h-10 rounded-md border bg-background px-3"><option value="">Create a new draft article</option>{candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} — {candidate.detail}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-2">{candidates.map((candidate) => <div key={candidate.id} className="rounded-lg border p-3 text-sm"><strong>{candidate.title}</strong><p className="mt-1 text-xs text-muted-foreground">{candidate.detail}</p></div>)}</div></div> : <p className="flex items-center gap-2 text-sm text-emerald-800"><CheckCircle2 className="size-4"/>No existing article, alias, redirect, or identifier collision was detected.</p>}</CardContent></Card>
      <Card><CardHeader><CardTitle>Verified structured fields</CardTitle></CardHeader><CardContent><div className="space-y-3">{preview.fields.length ? preview.fields.map((field) => <label key={field.id} className="grid cursor-pointer grid-cols-[auto_180px_1fr] gap-3 rounded-lg border p-3 text-sm"><input type="checkbox" name="fieldId" value={field.id} className="mt-1 size-4"/><strong>{field.key}</strong><span>{field.value}<span className="mt-1 block text-xs text-muted-foreground">Source: {field.sourceLabel} · {field.sourceUrls.length} source {field.sourceUrls.length === 1 ? "page" : "pages"}</span></span></label>) : <p className="text-sm text-muted-foreground">This provider returned no mapped, verifiable fields for the selected content type.</p>}</div>{preview.unverifiedFields.length > 0 && <div className="mt-5 rounded-lg border border-dashed p-4"><p className="flex items-center gap-2 text-sm font-medium"><FileWarning className="size-4 text-amber-600"/>Fields that could not be verified</p><p className="mt-2 text-sm text-muted-foreground">{preview.unverifiedFields.join(", ")}. Missing values are not filled or inferred.</p></div>}</CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Images className="size-5"/>Available Wikimedia Commons images</CardTitle></CardHeader><CardContent>{preview.images.length ? <div className="grid gap-4 lg:grid-cols-2">{preview.images.map((image) => <label key={image.id} className={`overflow-hidden rounded-lg border ${image.compatible ? "cursor-pointer" : "opacity-65"}`}><Image src={image.thumbnailUrl} alt="" width={900} height={600} className="aspect-[3/2] w-full object-cover"/><div className="p-4 text-sm"><div className="flex items-start gap-2"><input type="checkbox" name="imageId" value={image.id} disabled={!image.compatible} className="mt-1 size-4"/><strong>{image.fileName}</strong></div><dl className="mt-3 grid grid-cols-[90px_1fr] gap-1 text-xs"><dt className="text-muted-foreground">Creator</dt><dd>{image.creator || "Unavailable"}</dd><dt className="text-muted-foreground">Licence</dt><dd>{image.license || "Unavailable"}</dd><dt className="text-muted-foreground">Attribution</dt><dd>{image.attribution || "Unavailable"}</dd><dt className="text-muted-foreground">Retrieved</dt><dd>{image.retrievedAt}</dd></dl><a href={image.sourcePage} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-primary hover:underline">Original file page</a>{!image.compatible && <p className="mt-2 text-xs text-destructive">{image.incompatibilityReason}</p>}</div></label>)}</div> : <p className="text-sm text-muted-foreground">No Commons images were linked from this source item.</p>}</CardContent></Card>
      <div className="flex justify-end"><button className={buttonVariants({ size: "lg" })}>Create private draft from selected data</button></div>
    </form>
  </main>;
}
