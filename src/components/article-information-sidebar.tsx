import {
  ArticleImageDisplay,
  ArticleMarkdown,
} from "@/components/article-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  parseStructuredFieldMarkdown,
  type ArticleImage,
  type ArticleMentionLink,
} from "@/lib/article-markdown";
import { formatDisplayLabel } from "@/lib/display";
import type { ContentType, StructuredField } from "@/lib/wiki-types";

export function InformationSidebar({
  title,
  contentType,
  fields,
  images = [],
  articleLinks = [],
}: {
  title: string;
  contentType: ContentType;
  fields: StructuredField[];
  images?: ArticleImage[];
  articleLinks?: ArticleMentionLink[];
}) {
  return (
    <Card className="min-w-0 gap-0 overflow-hidden py-0 shadow-md">
      {images.map((image, index) => (
        <ArticleImageDisplay
          key={`${image.url}-${index}`}
          image={image}
          alt={title}
          flush
        />
      ))}
      <CardHeader className="border-b bg-primary/5 py-5">
        <CardTitle>{title}</CardTitle>
        <p className="text-xs font-medium uppercase tracking-wider text-primary">
          {formatDisplayLabel(contentType)}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <dl className="divide-y">
          {fields.length ? (
            fields.map((field, index) => {
              const parsed = parseStructuredFieldMarkdown(field.value);
              return (
                <div
                  key={`${field.key}-${index}`}
                  className="grid grid-cols-[42%_1fr] gap-3 px-5 py-3 text-sm"
                >
                  <dt className="min-w-0 break-words font-medium text-muted-foreground">
                    {field.key}
                  </dt>
                  <dd className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {parsed.errors.length ? field.value : <ArticleMarkdown root={parsed.root} compact articleLinks={articleLinks} />}
                  </dd>
                </div>
              );
            })
          ) : (
            <p className="px-5 py-4 text-sm text-muted-foreground">
              No structured information has been added.
            </p>
          )}
        </dl>
      </CardContent>
    </Card>
  );
}
