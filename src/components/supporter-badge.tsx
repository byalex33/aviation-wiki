import { Crown } from "lucide-react";

export function SupporterBadge() {
  return <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-2 py-0.5 text-xs font-semibold text-primary"><Crown className="size-3" aria-hidden="true" />Pro supporter</span>;
}
