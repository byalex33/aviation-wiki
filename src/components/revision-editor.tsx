"use client";

import { useMemo, useState } from "react";
import { Eye, Plus, Trash2 } from "lucide-react";

import { ArticleMarkdown } from "@/components/article-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { contentTypes, type EntityOption, type EntityRelationship, type RevisionContent, type SourceLink } from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";
import { parseArticleMarkdown } from "@/lib/article-markdown";
import { allowedRelationshipTypes, relationshipLabels, relationshipTargetType } from "@/lib/relationship-rules";

type RevisionEditorProps = {
  slug: string;
  revisionId?: string;
  articleId?: string;
  initialContent: RevisionContent;
  relationshipTargets: EntityOption[];
  initialSummary?: string;
  mode?: "contributor" | "moderator";
  returnTo?: string;
  saveAction?: (formData: FormData) => void | Promise<void>;
  submitAction?: (formData: FormData) => void | Promise<void>;
  moderatorAction?: (formData: FormData) => void | Promise<void>;
};

export function RevisionEditor({
  slug,
  revisionId,
  articleId,
  initialContent,
  relationshipTargets,
  initialSummary = "",
  mode = "contributor",
  returnTo = `/contribute/${slug}`,
  saveAction,
  submitAction,
  moderatorAction,
}: RevisionEditorProps) {
  const [contentType, setContentType] = useState(initialContent.contentType);
  const [markdown, setMarkdown] = useState(initialContent.markdown);
  const [fields, setFields] = useState(
    initialContent.fields.length
      ? initialContent.fields
      : [{ key: "", value: "" }],
  );
  const [sections] = useState(initialContent.sections);
  const [sources, setSources] = useState<SourceLink[]>(
    initialContent.sources.length
      ? initialContent.sources
      : [{ identifier: "", title: "", publisher: "", url: "", accessedAt: "", archiveUrl: "" }],
  );
  const [relationships, setRelationships] = useState<EntityRelationship[]>(initialContent.relationships || []);
  const parsed = useMemo(() => parseArticleMarkdown(markdown), [markdown]);
  const unusedMetadata = sources.filter((source) => source.url && !parsed.citations.some((citation) => citation.url === source.url || citation.identifier === source.identifier?.toLowerCase()));

  return (
    <form
      action={mode === "moderator" ? moderatorAction : saveAction}
      className="space-y-8"
    >
      <input type="hidden" name="markdown" value={markdown} />
      <input type="hidden" name="revisionId" value={revisionId || ""} />
      <input type="hidden" name="articleId" value={articleId || ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="fields" value={JSON.stringify(fields)} />
      <input type="hidden" name="sections" value={JSON.stringify(sections)} />
      <input type="hidden" name="sources" value={JSON.stringify(sources)} />
      <input type="hidden" name="relationships" value={JSON.stringify(relationships)} />

      <section className="grid gap-5 rounded-xl border bg-card p-5 shadow-xs sm:grid-cols-2 lg:grid-cols-[1fr_240px_220px]">
        <label className="grid gap-2 text-sm font-medium">
          Article title
          <Input
            name="title"
            defaultValue={initialContent.title}
            required
            maxLength={160}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Article slug
          <Input
            name="slug"
            defaultValue={slug}
            required
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            maxLength={100}
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Content type
          <select
            name="contentType"
            value={contentType}
            onChange={(event) =>
              setContentType(event.target.value as typeof contentType)
            }
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            {contentTypes.map((type) => (
              <option key={type} value={type}>
                {formatDisplayLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
        <div className="border-b p-5">
          <h2 className="font-semibold">Article Markdown</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The same safe parser and component registry are used for preview and
            publication. Cite sources with <code>[^1]</code> and define them with <code>[^1]: https://example.com</code>.
          </p>
        </div>
        <div className="grid lg:grid-cols-2">
          <div className="border-b p-5 lg:border-b-0 lg:border-r">
            <Textarea
              aria-label="Article Markdown"
              value={markdown}
              onChange={(event) => setMarkdown(event.target.value)}
              className="min-h-[520px] resize-y font-mono text-[13px] leading-6"
              spellCheck={false}
              placeholder="Write the article in Markdown…"
            />
            {parsed.errors.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-destructive">
                {parsed.errors.map((error, index) => (
                  <li key={`${error.line}-${error.column}-${index}`}>
                    Line {error.line}, column {error.column}: {error.message}
                  </li>
                ))}
              </ul>
            )}
            {parsed.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-amber-700">
                {parsed.warnings.map((warning, index) => (
                  <li key={`${warning.line}-${warning.column}-${index}`}>Line {warning.line}: {warning.message}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="min-h-[520px] p-5">
            <h3 className="mb-5 flex items-center gap-2 text-sm font-semibold">
              <Eye className="size-4 text-primary" />
              Preview
            </h3>
            {markdown.trim() && !parsed.errors.length ? (
              <ArticleMarkdown root={parsed.root} citations={parsed.citations} />
            ) : (
              <p className="text-sm text-muted-foreground">
                A valid Markdown preview will appear here.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div><h2 className="font-semibold">Verified entity relationships</h2><p className="mt-1 text-sm text-muted-foreground">Propose links to existing approved entities. Changes remain part of this revision until approved.</p></div>
          <Button type="button" variant="outline" size="sm" disabled={!allowedRelationshipTypes(contentType).length} onClick={() => { const type = allowedRelationshipTypes(contentType)[0]; if (type) setRelationships([...relationships, { type, targetArticleId: "", citationIdentifiers: [] }]); }}><Plus />Add relationship</Button>
        </div>
        <div className="mt-4 space-y-3">
          {relationships.length ? relationships.map((relationship, index) => {
            const targetType = relationshipTargetType(relationship.type);
            const targets = relationshipTargets.filter((target) => target.contentType === targetType && target.id !== articleId);
            return <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1.4fr_1fr_auto]">
              <select aria-label={`Relationship ${index + 1} type`} value={relationship.type} onChange={(event) => { const type = event.target.value as EntityRelationship["type"]; setRelationships(relationships.map((item, itemIndex) => itemIndex === index ? { ...item, type, targetArticleId: "" } : item)); }} className="h-10 rounded-md border bg-background px-3 text-sm">{allowedRelationshipTypes(contentType).map((type) => <option key={type} value={type}>{relationshipLabels[type]}</option>)}</select>
              <select aria-label={`Relationship ${index + 1} target`} value={relationship.targetArticleId} onChange={(event) => setRelationships(relationships.map((item, itemIndex) => itemIndex === index ? { ...item, targetArticleId: event.target.value } : item))} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">Select approved {formatDisplayLabel(targetType)}</option>{targets.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}</select>
              <Input aria-label={`Relationship ${index + 1} citations`} placeholder="Citation IDs: 1, 2" value={relationship.citationIdentifiers.join(", ")} onChange={(event) => setRelationships(relationships.map((item, itemIndex) => itemIndex === index ? { ...item, citationIdentifiers: event.target.value.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean) } : item))} />
              <Button type="button" variant="ghost" size="icon" aria-label={`Remove relationship ${index + 1}`} onClick={() => setRelationships(relationships.filter((_, itemIndex) => itemIndex !== index))}><Trash2 /></Button>
            </div>;
          }) : <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No structured relationships are proposed.</p>}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Structured fields</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Key facts appropriate to this {formatDisplayLabel(contentType)}{" "}
              article.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFields([...fields, { key: "", value: "" }])}
          >
            <Plus />
            Add field
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[220px_1fr_auto]"
            >
              <Input
                aria-label={`Field ${index + 1} name`}
                placeholder="Field name"
                value={field.key}
                onChange={(event) =>
                  setFields(
                    fields.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, key: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <Input
                aria-label={`Field ${index + 1} value`}
                placeholder="Value"
                value={field.value}
                onChange={(event) =>
                  setFields(
                    fields.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove field"
                onClick={() =>
                  setFields(
                    fields.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Source links</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use direct, reliable sources that support the proposed claims.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSources([...sources, { identifier: "", title: "", publisher: "", url: "", accessedAt: "", archiveUrl: "" }])}
          >
            <Plus />
            Add source
          </Button>
        </div>
        <div className="mt-4 space-y-3">
          {sources.map((source, index) => (
            <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-2">
              <Input
                aria-label={`Source ${index + 1} citation identifier`}
                placeholder="Citation ID (for example 1)"
                value={source.identifier || ""}
                onChange={(event) => setSources(sources.map((item, itemIndex) => itemIndex === index ? { ...item, identifier: event.target.value } : item))}
              />
              <Input
                aria-label={`Source ${index + 1} title`}
                placeholder="Source title"
                value={source.title || source.label || ""}
                onChange={(event) =>
                  setSources(
                    sources.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, title: event.target.value, label: undefined }
                        : item,
                    ),
                  )
                }
              />
              <Input aria-label={`Source ${index + 1} publisher`} placeholder="Publisher (optional)" value={source.publisher || ""} onChange={(event) => setSources(sources.map((item, itemIndex) => itemIndex === index ? { ...item, publisher: event.target.value } : item))} />
              <Input
                aria-label={`Source ${index + 1} URL`}
                placeholder="https://…"
                type="url"
                value={source.url}
                onChange={(event) =>
                  setSources(
                    sources.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, url: event.target.value }
                        : item,
                    ),
                  )
                }
              />
              <label className="grid gap-1 text-xs text-muted-foreground">Access date<Input aria-label={`Source ${index + 1} access date`} type="date" value={source.accessedAt || ""} onChange={(event) => setSources(sources.map((item, itemIndex) => itemIndex === index ? { ...item, accessedAt: event.target.value } : item))} /></label>
              <Input aria-label={`Source ${index + 1} archive URL`} placeholder="Archive URL (optional)" type="url" value={source.archiveUrl || ""} onChange={(event) => setSources(sources.map((item, itemIndex) => itemIndex === index ? { ...item, archiveUrl: event.target.value } : item))} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sm:col-span-2 sm:justify-self-end"
                aria-label="Remove source"
                onClick={() =>
                  setSources(
                    sources.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 /> Remove source
              </Button>
            </div>
          ))}
        </div>
        {unusedMetadata.length > 0 && <p className="mt-3 text-xs text-amber-700">{unusedMetadata.length} source {unusedMetadata.length === 1 ? "record is" : "records are"} not referenced by an inline citation.</p>}
      </section>

      <section className="rounded-xl border bg-card p-5 shadow-xs">
        <label className="grid gap-2 text-sm font-medium">
          Edit summary
          <Textarea
            name="editSummary"
            defaultValue={initialSummary}
            className="min-h-24"
            placeholder="Briefly explain what changed and why."
            required={mode === "moderator"}
            maxLength={500}
          />
        </label>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {mode === "contributor" ? (
            <>
              <Button
                type="submit"
                variant="outline"
                disabled={parsed.errors.length > 0 || !saveAction}
              >
                Save draft
              </Button>
              <Button
                type="submit"
                formAction={submitAction}
                disabled={parsed.errors.length > 0 || !submitAction}
              >
                Submit for review
              </Button>
            </>
          ) : (
            <Button type="submit" disabled={parsed.errors.length > 0 || !moderatorAction}>
              Save edits and approve
            </Button>
          )}
        </div>
      </section>
    </form>
  );
}
