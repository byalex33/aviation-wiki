import Image from "next/image";
import { ExternalLink, Images, TableProperties } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getRevisionImportFieldSources, getRevisionImportImages } from "@/lib/wiki-public-db";

export async function ImportedRevisionData({ revisionId }: { revisionId: string }) {
  const [fields, images] = await Promise.all([getRevisionImportFieldSources(revisionId), getRevisionImportImages(revisionId)]);
  if (!fields.length && !images.length) return null;
  return <section className="mt-10 space-y-5">
    {images.length > 0 && <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b py-4"><CardTitle className="flex items-center gap-2"><Images className="size-4 text-primary"/>Licensed media</CardTitle></CardHeader><CardContent className="grid gap-4 p-5 sm:grid-cols-2">{images.map((image) => <figure key={image.source_page} className="overflow-hidden rounded-lg border"><Image src={image.thumbnail_url} alt="" width={900} height={600} className="aspect-[3/2] w-full object-cover"/><figcaption className="p-3 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">{image.file_name}</strong><br/>{image.attribution} · <a href={image.license_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{image.license}</a><br/><a href={image.source_page} target="_blank" rel="noreferrer" className="text-primary hover:underline">Original file page <ExternalLink className="inline size-3"/></a> · Retrieved {image.retrieved_at}</figcaption></figure>)}</CardContent></Card>}
    {fields.length > 0 && <Card className="gap-0 overflow-hidden py-0"><CardHeader className="border-b py-4"><CardTitle className="flex items-center gap-2"><TableProperties className="size-4 text-primary"/>Imported field provenance</CardTitle></CardHeader><CardContent className="divide-y p-0">{fields.map((field) => <div key={field.field_key} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[180px_1fr]"><strong>{field.field_key}</strong><div><p>{field.field_value}</p><p className="mt-1 text-xs text-muted-foreground">{field.provider} · {field.source_identifier} · {(JSON.parse(field.source_urls_json) as string[]).map((url, index) => <span key={url}>{index > 0 && " · "}<a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Source {index + 1}</a></span>)}</p></div></div>)}</CardContent></Card>}
  </section>;
}
