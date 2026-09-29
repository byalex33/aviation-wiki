"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

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
import { cn } from "@/lib/utils";
import type { ContentType, StructuredField } from "@/lib/wiki-types";

const COLLAPSED_FIELD_COUNT = 6;

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
  const [expanded, setExpanded] = useState(false);
  const hasMore = fields.length > COLLAPSED_FIELD_COUNT;
  const visibleFields = expanded ? fields : fields.slice(0, COLLAPSED_FIELD_COUNT);

  return (
    <Card className="min-w-0 gap-0 overflow-hidden rounded-2xl py-0">
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
          {visibleFields.length ? (
            visibleFields.map((field, index) => {
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
        {hasMore && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="flex h-11 w-full items-center justify-center gap-1.5 border-t text-[13px] font-semibold text-foreground/70 transition-colors hover:bg-muted/60"
          >
            {expanded ? "Show fewer details" : `Show all ${fields.length} details`}
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
