export function moderationReviewPath(revisionId: string) {
  return `/moderation/${revisionId}`;
}

export function moderationEditPath(revisionId: string) {
  return `/moderation/${revisionId}/edit`;
}

export function adminModerationReviewPath(revisionId: string) {
  return `/admin/moderation/${revisionId}`;
}

export function adminModerationEditPath(revisionId: string) {
  return `/admin/moderation/${revisionId}/edit`;
}
