import { ModeratorEditScreen } from "@/components/moderator-edit-screen";
import { adminModerationReviewPath } from "@/lib/moderation-routes";

export const dynamic = "force-dynamic";

export default async function AdminModeratorEditPage({
  params,
}: {
  params: Promise<{ revisionId: string }>;
}) {
  const { revisionId } = await params;
  return (
    <ModeratorEditScreen
      revisionId={revisionId}
      reviewHref={adminModerationReviewPath(revisionId)}
    />
  );
}
