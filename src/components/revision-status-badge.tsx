import { Badge } from "@/components/ui/badge";
import type { RevisionStatus } from "@/lib/wiki-types";

const labels: Record<RevisionStatus, string> = {
  draft: "Draft",
  verifying: "Verifying",
  pending_review: "Pending review",
  changes_requested: "Changes requested",
  approved: "Approved",
  rejected: "Rejected",
};

export function RevisionStatusBadge({ status }: { status: RevisionStatus }) {
  const style = status === "approved" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : status === "rejected" ? "border-red-200 bg-red-50 text-red-700" : status === "changes_requested" ? "border-amber-200 bg-amber-50 text-amber-800" : "";
  return <Badge variant="outline" className={style}>{labels[status]}</Badge>;
}
