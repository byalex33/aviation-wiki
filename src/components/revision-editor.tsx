"use client";

import {
  Fragment,
  useActionState,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ChartNoAxesCombined, Plus, Trash2 } from "lucide-react";

import { InformationSidebar } from "@/components/article-information-sidebar";
import { ArticleMarkdown } from "@/components/article-markdown";
import { MarkdownHelpDialog } from "@/components/markdown-help-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CHART_ATTRIBUTES, CHART_TEMPLATE } from "@/lib/article-chart";
import { contentTypes, type EntityOption, type EntityRelationship, type RevisionContent, type SourceLink } from "@/lib/wiki-types";
import { formatDisplayLabel } from "@/lib/display";
import {
  initialFormActionState,
  type FormActionState,
} from "@/lib/form-action-state";
import { parseArticleMarkdown, parseStructuredFieldMarkdown } from "@/lib/article-markdown";
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
  saveAction?: FormStateAction;
  submitAction?: FormStateAction;
  moderatorAction?: FormStateAction;
};

type FormStateAction = (
  previousState: FormActionState,
  formData: FormData,
) => Promise<FormActionState>;

const editorTabs = ["editor", "preview"] as const;
type EditorTab = (typeof editorTabs)[number];

async function unavailableAction(): Promise<FormActionState> {
  return { error: "This action is not available." };
}

function highlightChartTag(line: string) {
  const attributeNames = new Set<string>(CHART_ATTRIBUTES);
  const expression =
    /<\/?Chart\b|\/?>|[A-Za-z][A-Za-z0-9]*|"(?:[^"\\]|\\.)*"/g;
  const output: ReactNode[] = [];
  let offset = 0;
  for (const match of line.matchAll(expression)) {
    const index = match.index ?? 0;
    if (index > offset) output.push(line.slice(offset, index));
    const token = match[0];
    const className =
      token.startsWith("<") || token === ">" || token === "/>"
        ? "font-semibold text-primary"
        : token.startsWith('"')
          ? "text-chart-3"
          : attributeNames.has(token)
            ? "font-medium text-chart-2"
            : "";
    output.push(
      className ? (
        <span key={`${index}-${token}`} className={className}>
          {token}
        </span>
      ) : (
        token
      ),
    );
    offset = index + token.length;
  }
  if (offset < line.length) output.push(line.slice(offset));
  return output;
}

function highlightChartMarkdown(source: string) {
  let insideChart = false;
  let openingTag = false;
  let headerSeen = false;
  const lines = source.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();
    let content: ReactNode = line;
    if (/^<Chart\b/.test(trimmed)) {
      insideChart = true;
      openingTag = !trimmed.includes(">");
      headerSeen = false;
      content = highlightChartTag(line);
    } else if (insideChart && openingTag) {
      content = highlightChartTag(line);
      if (trimmed.includes(">")) openingTag = false;
    } else if (insideChart && /^<\/Chart>/.test(trimmed)) {
      content = highlightChartTag(line);
      insideChart = false;
    } else if (insideChart && trimmed) {
      const cells = trimmed
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((cell) => cell.trim());
      const separator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
      if (!separator) {
        const parts = line.split(/(\|)/g);
        content = parts.map((part, partIndex) => {
          if (part === "|") return part;
          const value = part.trim();
          const className = !headerSeen
            ? "font-semibold text-foreground"
            : value && Number.isFinite(Number(value))
              ? "text-chart-3"
              : "";
          return className ? (
            <span key={partIndex} className={className}>
              {part}
            </span>
          ) : (
            part
          );
        });
        headerSeen = true;
      }
    }
    return (
      <Fragment key={index}>
        {content}
        {index < lines.length - 1 && "\n"}
      </Fragment>
    );
  });
}

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const [title, setTitle] = useState(initialContent.title);
  const [contentType, setContentType] = useState(initialContent.contentType);
  const [activeTab, setActiveTab] = useState<EditorTab>("editor");
  const [markdown, setMarkdown] = useState(() => {
    if (!initialContent.fields.length || parseArticleMarkdown(initialContent.markdown).sidebarFields) return initialContent.markdown;
    const sidebar = initialContent.fields.map((field) => `${field.key}: ${field.value.replace(/\s*\n\s*/g, " ")}`).join("\n");
    return `<Sidebar>\n${sidebar}\n</Sidebar>\n\n${initialContent.markdown}`;
  });
  const [sections] = useState(initialContent.sections);
  const [sources, setSources] = useState<SourceLink[]>(
    initialContent.sources.length
      ? initialContent.sources
      : [{ identifier: "", title: "", publisher: "", url: "", accessedAt: "", archiveUrl: "" }],
  );
  const [relationships, setRelationships] = useState<EntityRelationship[]>(initialContent.relationships || []);
  const [primaryState, primaryAction, primaryPending] = useActionState(
    (mode === "moderator" ? moderatorAction : saveAction) ?? unavailableAction,
    initialFormActionState,
  );
  const [submitState, submitFormAction, submitPending] = useActionState(
    submitAction ?? unavailableAction,
    initialFormActionState,
  );
  const parsed = useMemo(() => parseArticleMarkdown(markdown), [markdown]);
  const fields = useMemo(() => parsed.sidebarFields ?? [], [parsed.sidebarFields]);
  const fieldErrors = useMemo(() => fields.flatMap((field, index) => parseStructuredFieldMarkdown(field.value).errors.map((error) => `Field ${index + 1}: ${error.message}`)), [fields]);
  const unusedMetadata = sources.filter((source) => source.url && !parsed.citations.some((citation) => citation.url === source.url || citation.identifier === source.identifier?.toLowerCase()));
  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: EditorTab,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = editorTabs.indexOf(currentTab);
    const nextTab =
      event.key === "Home"
        ? editorTabs[0]
        : event.key === "End"
          ? editorTabs[editorTabs.length - 1]
          : editorTabs[
              (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + editorTabs.length)
              % editorTabs.length
            ];

    setActiveTab(nextTab);
    document.getElementById(`article-markdown-${nextTab}-tab`)?.focus();
  };
  const insertChart = () => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? markdown.length;
    const end = textarea?.selectionEnd ?? start;
    const before = markdown.slice(0, start);
    const after = markdown.slice(end);
    const leading =
      before && !before.endsWith("\n\n")
        ? before.endsWith("\n")
          ? "\n"
          : "\n\n"
        : "";
    const trailing =
      after && !after.startsWith("\n\n")
        ? after.startsWith("\n")
          ? "\n"
          : "\n\n"
        : "";
    const insertion = `${leading}${CHART_TEMPLATE}${trailing}`;
    setMarkdown(`${before}${insertion}${after}`);
    requestAnimationFrame(() => {
      const titleStart =
        start + leading.length + CHART_TEMPLATE.indexOf("Chart title");
      textarea?.focus();
      textarea?.setSelectionRange(titleStart, titleStart + "Chart title".length);
    });
  };

  return (
    <form
      action={primaryAction}
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
            value={title}
            onChange={(event) => setTitle(event.target.value)}
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
        <div className="flex flex-wrap items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 className="font-semibold">Article Markdown</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The same safe parser and component registry are used for preview and
              publication. Cite sources with <code>[^1]</code> and define them with <code>[^1]: https://example.com</code>. Add flags with <code>f![gr]</code> or <code>f![usa]</code>.
              Add photos with <code>![https://example.com/photo.jpg]</code>, or add a small credit with <code>![https://example.com/photo.jpg | Photo by Jane Smith]</code>.
              Edit the right-hand card inside <code>&lt;Sidebar&gt;</code>, with one image shortcode or <code>Label: value</code> per line.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="tablist"
              aria-label="Article Markdown view"
              className="inline-flex rounded-full border bg-muted/60 p-1"
            >
              {editorTabs.map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    id={`article-markdown-${tab}-tab`}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`article-markdown-${tab}-panel`}
                    tabIndex={isActive ? 0 : -1}
                    onClick={() => setActiveTab(tab)}
                    onKeyDown={(event) => handleTabKeyDown(event, tab)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab === "editor" ? "Editor" : "Preview"}
                  </button>
                );
              })}
            </div>
            {activeTab === "editor" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={insertChart}
              >
                <ChartNoAxesCombined />
                Insert chart
              </Button>
            )}
            <MarkdownHelpDialog />
          </div>
        </div>
        {activeTab === "editor" ? (
          <div
            id="article-markdown-editor-panel"
            role="tabpanel"
            aria-labelledby="article-markdown-editor-tab"
            className="p-5"
          >
            <div className="relative">
              <pre
                ref={highlightRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-px overflow-hidden whitespace-pre-wrap break-words rounded-md px-3 py-2 font-mono text-[13px] leading-6 text-foreground"
              >
                {highlightChartMarkdown(markdown)}
              </pre>
              <Textarea
                ref={textareaRef}
                aria-label="Article Markdown"
                value={markdown}
                onChange={(event) => setMarkdown(event.target.value)}
                onScroll={(event) => {
                  if (!highlightRef.current) return;
                  highlightRef.current.scrollTop =
                    event.currentTarget.scrollTop;
                  highlightRef.current.scrollLeft =
                    event.currentTarget.scrollLeft;
                }}
                className="relative min-h-[640px] resize-y bg-transparent font-mono text-[13px] leading-6 text-transparent caret-foreground selection:bg-primary/20"
                spellCheck={false}
                placeholder="Write the article in Markdown…"
              />
            </div>
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
        ) : (
          <div
            id="article-markdown-preview-panel"
            role="tabpanel"
            aria-labelledby="article-markdown-preview-tab"
            className="min-h-[640px] p-5 sm:p-8"
          >
            {markdown.trim() && !parsed.errors.length ? (
              <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0">
                  <ArticleMarkdown
                    root={parsed.root}
                    citations={parsed.citations}
                    citationSources={sources}
                    hideSidebar
                  />
                </div>
                <aside
                  className="space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
                  aria-label="Article information"
                >
                  <InformationSidebar
                    title={title || "Untitled article"}
                    contentType={contentType}
                    fields={fields}
                    images={parsed.sidebarImages}
                  />
                </aside>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                A valid Markdown preview will appear here.
              </p>
            )}
          </div>
        )}
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

      {fieldErrors.length > 0 && <ul className="space-y-1 text-xs text-destructive">{fieldErrors.map((error) => <li key={error}>{error}</li>)}</ul>}

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
        {(primaryState.error || submitState.error) && (
          <p
            role="alert"
            aria-live="polite"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitState.error || primaryState.error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          {mode === "contributor" ? (
            <>
              <Button
                type="submit"
                variant="outline"
                disabled={parsed.errors.length > 0 || fieldErrors.length > 0 || !saveAction || primaryPending || submitPending}
              >
                {primaryPending ? "Saving…" : "Save draft"}
              </Button>
              <Button
                type="submit"
                formAction={submitFormAction}
                disabled={parsed.errors.length > 0 || fieldErrors.length > 0 || !submitAction || primaryPending || submitPending}
              >
                {submitPending ? "Submitting…" : "Submit"}
              </Button>
            </>
          ) : (
            <Button type="submit" disabled={parsed.errors.length > 0 || fieldErrors.length > 0 || !moderatorAction || primaryPending}>
              {primaryPending ? "Saving and approving…" : "Save edits and approve"}
            </Button>
          )}
        </div>
      </section>
    </form>
  );
}
