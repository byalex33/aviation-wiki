import Link from "next/link";
import { Compass, Plane } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { articlePath } from "@/lib/article-routes";
import { getPublicDiscoverySections } from "@/lib/wiki-db";
import type { ArticleRecord, EntityOption } from "@/lib/wiki-types";

function EntityLink({ entity }: { entity: EntityOption }) {
  return <Link href={articlePath(entity.contentType, entity.slug)} className="font-medium text-primary hover:underline">{entity.title}</Link>;
}

function RelationshipList({ title, icon: Icon, entities }: { title: string; icon: typeof Plane; entities: EntityOption[] }) {
  if (!entities.length) return null;
  return <Card className="gap-0 py-0"><CardHeader className="border-b py-4"><CardTitle className="flex items-center gap-2 text-base"><Icon className="size-4 text-primary" />{title}</CardTitle></CardHeader><CardContent className="divide-y p-0">{entities.map((entity) => <div key={entity.id} className="px-5 py-3 text-sm"><EntityLink entity={entity} /><p className="mt-0.5 text-xs capitalize text-muted-foreground">{entity.contentType}</p></div>)}</CardContent></Card>;
}

export function ApprovedRelationships({ article }: { article: ArticleRecord }) {
  const sections = getPublicDiscoverySections(article.id);
  if (!sections.length) return null;
  return <section className="mt-12 border-t pt-8"><h2 className="flex items-center gap-2 text-2xl font-bold"><Compass className="size-5 text-primary" />Discover more</h2><p className="mt-2 text-sm text-muted-foreground">Related approved articles from verified structured data.</p><div className="mt-5 grid gap-5 md:grid-cols-2">{sections.map((section) => <RelationshipList key={section.title} title={section.title} icon={Plane} entities={section.entities} />)}</div></section>;
}
