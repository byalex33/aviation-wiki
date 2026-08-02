export const contentTypes = [
  "airline",
  "alliance",
  "aircraft",
  "airport",
  "manufacturer",
  "engine",
  "event",
] as const;
export type ContentType = (typeof contentTypes)[number];

export const revisionStatuses = ["draft", "verifying", "pending_review", "changes_requested", "approved", "rejected"] as const;
export type RevisionStatus = (typeof revisionStatuses)[number];

export type StructuredField = { key: string; value: string };
export type ArticleSection = { heading: string; body: string };
export type SourceLink = {
  /** Markdown citation identifier, without the [^ ] markers. */
  identifier?: string;
  /** Retained for backwards compatibility; new records use title. */
  label?: string;
  title?: string;
  publisher?: string;
  url: string;
  accessedAt?: string;
  archiveUrl?: string;
};

export const relationshipTypes = [
  "operates_aircraft",
  "hub_at_airport",
  "manufactured_by",
  "uses_engine",
  "variant_of",
  "produces_aircraft",
  "produces_engine",
] as const;
export type RelationshipType = (typeof relationshipTypes)[number];
export type EntityRelationship = {
  type: RelationshipType;
  targetArticleId: string;
  citationIdentifiers: string[];
};
export type EntityOption = { id: string; title: string; slug: string; contentType: ContentType };

export type RevisionContent = {
  title: string;
  contentType: ContentType;
  markdown: string;
  fields: StructuredField[];
  sections: ArticleSection[];
  sources: SourceLink[];
  relationships: EntityRelationship[];
};

export type VerificationClaim = {
  claim: string;
  assessment: "supported" | "partially_supported" | "unsupported" | "unclear";
  sourceUrl: string | null;
  notes: string;
};

export type VerificationResult = {
  status: "completed" | "unavailable" | "error";
  model: string | null;
  summary: string;
  claims: VerificationClaim[];
  checkedAt: string;
  advisoryOnly: true;
};

export type ArticleRecord = {
  id: string;
  slug: string;
  title: string;
  contentType: ContentType;
  liveRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RevisionRecord = RevisionContent & {
  id: string;
  articleId: string;
  articleSlug: string;
  proposedSlug: string;
  status: RevisionStatus;
  contributorId: string;
  contributorName: string;
  editSummary: string;
  verification: VerificationResult | null;
  moderatorId: string | null;
  moderatorNote: string | null;
  parentRevisionId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type ArticleWithLiveRevision = ArticleRecord & { liveRevision: RevisionRecord | null };
