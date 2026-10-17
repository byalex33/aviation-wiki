import { notFound } from "next/navigation";

import { ModeratorEditScreen } from "@/components/moderator-edit-screen";
import { moderationReviewPath } from "@/lib/moderation-routes";
import { isModerator } from "@/lib/wiki-auth";

export const dynamic = "force-dynamic";

export default async function ModeratorEditPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  if (!(await isModerator())) notFound();
  const { revisionId } = await params;
  return (
    <ModeratorEditScreen
      revisionId={revisionId}
      reviewHref={moderationReviewPath(revisionId)}
      framed
    />
  );
}
