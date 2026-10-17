import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { adminModerationEditPath, moderationEditPath } from "@/lib/moderation-routes";

export function EditAndApproveLink({
  revisionId,
  area,
}: {
  revisionId: string;
  area: "admin" | "public";
}) {
  const href = area === "admin" ? adminModerationEditPath(revisionId) : moderationEditPath(revisionId);
  return (
    <Link href={href} className={`${buttonVariants({ variant: "outline" })} w-full`}>
      Edit and approve
    </Link>
  );
}
