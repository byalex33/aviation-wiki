import { diffWords } from "diff";

import { Card } from "@/components/ui/card";
import type { RevisionContent } from "@/lib/wiki-types";
import { parseArticleMarkdown } from "@/lib/article-markdown";
import { sourceForCitation, sourceTitle } from "@/lib/article-citations";
import { listEntityOptions } from "@/lib/wiki-public-db";
import { relationshipKey, relationshipLabels } from "@/lib/relationship-rules";

export async function RevisionComparison({ current, proposed }: { current: RevisionContent | null; proposed: RevisionContent }) {
  const currentFields = new Map((current?.fields || []).map((field) => [field.key, field.value]));
  const proposedFields = new Map(proposed.fields.map((field) => [field.key, field.value]));
  const fieldKeys = [...new Set([...currentFields.keys(), ...proposedFields.keys()])];
  const currentText = current?.markdown || "";
  const proposedText = proposed.markdown;
  const textDiff = diffWords(currentText, proposedText);
  const currentCitations = parseArticleMarkdown(currentText).citations;
  const proposedCitations = parseArticleMarkdown(proposedText).citations;
  const currentIds = new Set(currentCitations.map((citation) => citation.identifier));
  const proposedIds = new Set(proposedCitations.map((citation) => citation.identifier));
  const citationChanges = [
    ...proposedCitations.filter((citation) => !currentIds.has(citation.identifier)).map((citation) => ({ kind: "added" as const, citation, source: sourceForCitation(citation, proposed.sources) })),
    ...currentCitations.filter((citation) => !proposedIds.has(citation.identifier)).map((citation) => ({ kind: "removed" as const, citation, source: sourceForCitation(citation, current?.sources || []) })),
  ];
  const entityNames = new Map((await listEntityOptions()).map((entity) => [entity.id, entity.title]));
  const currentRelationships = new Map((current?.relationships || []).map((relationship) => [relationshipKey(relationship), relationship]));
  const proposedRelationships = new Map(proposed.relationships.map((relationship) => [relationshipKey(relationship), relationship]));
  const relationshipKeys = [...new Set([...currentRelationships.keys(), ...proposedRelationships.keys()])];

  return (
    <div className="space-y-6">
      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Changed fields</h2></div>
        <div className="divide-y">{fieldKeys.length ? fieldKeys.map((key) => {
          const before = currentFields.get(key);
          const after = proposedFields.get(key);
          const changed = before !== after;
          return <div key={key} className={`grid gap-3 px-5 py-3 text-sm sm:grid-cols-[180px_1fr_1fr] ${changed ? "bg-amber-50/50" : ""}`}><strong>{key}</strong><span className={before && changed ? "text-red-700 line-through" : "text-muted-foreground"}>{before || "Not present"}</span><span className={after && changed ? "text-emerald-700" : "text-muted-foreground"}>{after || "Removed"}</span></div>;
        }) : <p className="px-5 py-4 text-sm text-muted-foreground">No structured fields.</p>}</div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Relationship changes</h2><p className="mt-1 text-xs text-muted-foreground">Only these proposed structured links will be published with approval.</p></div>
        <div className="divide-y">{relationshipKeys.length ? relationshipKeys.map((key) => { const before = currentRelationships.get(key); const after = proposedRelationships.get(key); const relationship = after || before!; const changedCitations = before && after && before.citationIdentifiers.join(",") !== after.citationIdentifiers.join(","); const state = !before ? "Added" : !after ? "Removed" : changedCitations ? "Updated citations" : "Unchanged"; return <div key={key} className={`grid gap-2 px-5 py-3 text-sm sm:grid-cols-[150px_1fr_1fr] ${state === "Added" ? "bg-emerald-50" : state === "Removed" ? "bg-red-50" : changedCitations ? "bg-amber-50" : ""}`}><strong>{state}</strong><span>{relationshipLabels[relationship.type]} <strong>{entityNames.get(relationship.targetArticleId) || relationship.targetArticleId}</strong></span><span className="text-muted-foreground">{relationship.citationIdentifiers.length ? `Citations: ${relationship.citationIdentifiers.map((id) => `[^${id}]`).join(", ")}` : "No supporting citations selected"}</span></div>; }) : <p className="px-5 py-4 text-sm text-muted-foreground">No structured relationships.</p>}</div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Citation changes</h2><p className="mt-1 text-xs text-muted-foreground">Citation identifiers remain visible in the text diff; source additions and removals are listed here.</p></div>
        <div className="divide-y">{citationChanges.length ? citationChanges.map(({ kind, citation, source }) => <div key={`${kind}-${citation.identifier}`} className={`px-5 py-3 text-sm ${kind === "added" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}><strong>{kind === "added" ? "Added" : "Removed"} [^{citation.identifier}]</strong><span className="ml-2">{sourceTitle(source)}</span><span className="ml-2 break-all text-xs opacity-75">{citation.url}</span></div>) : <p className="px-5 py-4 text-sm text-muted-foreground">No citation additions or removals.</p>}</div>
      </Card>

      <Card className="gap-0 overflow-hidden py-0 shadow-xs">
        <div className="border-b px-5 py-4"><h2 className="font-semibold">Article text changes</h2><p className="mt-1 text-xs text-muted-foreground">Removed text is red; added text is green.</p></div>
        <div className="whitespace-pre-wrap px-5 py-5 text-sm leading-7">{textDiff.map((part, index) => <span key={index} className={part.added ? "rounded bg-emerald-100 text-emerald-900" : part.removed ? "rounded bg-red-100 text-red-800 line-through" : ""}>{part.value}</span>)}</div>
      </Card>
    </div>
  );
}
