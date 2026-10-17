import type { RevisionStatus } from "@/lib/wiki-types";

/** Legal revision status changes. Moderators can close a changes-requested revision. */
export const revisionTransitions: Record<RevisionStatus, RevisionStatus[]> = {
  draft: ["verifying", "pending_review"],
  verifying: ["pending_review", "changes_requested", "approved", "rejected"],
  pending_review: ["changes_requested", "approved", "rejected"],
  changes_requested: ["draft", "rejected"],
  approved: [],
  rejected: [],
};

const openReviewStatuses = new Set<RevisionStatus>(["pending_review", "verifying"]);

export function canModerateRevision(status: RevisionStatus, intent: string) {
  if (intent === "reject") return openReviewStatuses.has(status) || status === "changes_requested";
  if (intent === "approve" || intent === "request_changes") return openReviewStatuses.has(status);
  return false;
}
