"use client";

import { useMemo, useRef } from "react";
import { BookOpen, X } from "lucide-react";

import { ArticleMarkdown } from "@/components/article-markdown";
import { Button } from "@/components/ui/button";
import { CHART_TEMPLATE } from "@/lib/article-chart";
import { parseArticleMarkdown } from "@/lib/article-markdown";

const examples = [
  {
    title: "Text and structure",
    description: "Use headings to organise an article, and blank lines to separate paragraphs.",
    source: `## Aircraft overview

The **Boeing 747** is a *wide-body* airliner.

- Four engines
- Two passenger decks

Read the [manufacturer website](https://www.boeing.com).

> Keep paragraphs focused on one subject.`,
  },
  {
    title: "Citations",
    description: "Add a citation after the claim, then define its direct source URL anywhere in the article.",
    source: `The type entered commercial service in 1970.[^service]

[^service]: https://example.com/aircraft-history`,
  },
  {
    title: "Tables and flags",
    description: "Tables are useful for compact facts. Flags use a two-letter country code (or usa).",
    source: `| Country | Operator |
| --- | --- |
| f![gr] Greece | Olympic Airways |
| f![us] United States | Pan Am |`,
  },
  {
    title: "Article blocks",
    description: "Use an approved block as a standalone section. Attribute values must be in quotes.",
    source: `<Notice title="Important" variant="warning">

This information may change as new sources become available.

</Notice>`,
  },
  {
    title: "Sidebar card",
    description: "Put the article’s key facts in one Sidebar block. Each line becomes a row in the published sidebar card.",
    source: `<Sidebar>
IATA code: A3
ICAO code: AEE
Callsign: AEGEAN
Country: f![gr] Greece
Status: Active
</Sidebar>`,
  },
  {
    title: "Charts and graphs",
    description:
      "Insert a safe local dataset. The first column supplies categories and every remaining column is numeric.",
    source: CHART_TEMPLATE,
  },
] as const;

function MarkdownExample({ example }: { example: (typeof examples)[number] }) {
  const parsed = useMemo(() => parseArticleMarkdown(example.source), [example.source]);

  return (
    <section className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">{example.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{example.description}</p>
      </div>
      <div className="grid md:grid-cols-2">
        <div className="border-b bg-muted/45 p-4 md:border-b-0 md:border-r">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Write this</p>
          <pre className="overflow-x-auto whitespace-pre-wrap text-xs leading-6"><code>{example.source}</code></pre>
        </div>
        <div className="p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</p>
          <ArticleMarkdown root={parsed.root} citations={parsed.citations} compact />
        </div>
      </div>
    </section>
  );
}

export function MarkdownHelpDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => dialogRef.current?.showModal()}>
        <BookOpen />
        Markdown help
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="markdown-help-title"
        className="m-auto max-h-[88vh] w-[min(1100px,calc(100%-2rem))] max-w-none overflow-hidden rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/45 backdrop:backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="flex max-h-[88vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b bg-background px-5 py-4 sm:px-6">
            <div>
              <h2 id="markdown-help-title" className="text-xl font-bold">How to write with Markdown</h2>
              <p className="mt-1 text-sm text-muted-foreground">Compare each example with the preview readers will see.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close Markdown help" onClick={() => dialogRef.current?.close()}>
              <X />
            </Button>
          </header>
          <div className="overflow-y-auto p-5 sm:p-6">
            <div className="space-y-5">
              {examples.map((example) => <MarkdownExample key={example.title} example={example} />)}
            </div>
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              Raw HTML and JavaScript are not supported. Structured field values support inline formatting such as <strong>bold</strong>, <em>italics</em>, links, and inline code, but not headings, lists, tables, images, or article blocks.
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
