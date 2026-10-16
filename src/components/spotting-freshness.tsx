import type { SpottingFreshnessState } from "@/lib/spotting-guide";
import { cn } from "@/lib/utils";

const tone: Record<SpottingFreshnessState | "placeholder", string> = {
  fresh: "border-emerald-200 bg-emerald-50 text-emerald-950",
  aging: "border-amber-200 bg-amber-50 text-amber-950",
  stale: "border-red-200 bg-red-50 text-red-950",
  unverified: "border-amber-300 bg-amber-50 text-amber-950",
  placeholder: "border-amber-300 bg-amber-50 text-amber-950",
};

export function SpottingFreshnessBanner({
  placeholder,
  state,
  label,
}: {
  placeholder: boolean;
  state: SpottingFreshnessState;
  label: string;
}) {
  const appearance = placeholder ? "placeholder" : state;
  return (
    <aside className={cn("rounded-2xl border px-4 py-4 sm:px-5", tone[appearance])} aria-label="Guide freshness">
      <p className="text-xs font-semibold uppercase tracking-[0.14em]">
        {placeholder ? "Placeholder" : "Last verified"}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight">
        {placeholder ? "Not yet verified" : label}
      </p>
      <p className="mt-1 max-w-3xl text-sm leading-6">
        {placeholder
          ? "This guide has not been checked in the field. Moderator approval does not make the notes true. Last verified stays empty until a contributor confirms them on site."
          : state === "stale"
            ? "This date is the last in-person check. The guide is stale and may no longer match the airport."
            : state === "aging"
              ? "This date is the last in-person check. The guide is due for another visit."
              : state === "unverified"
                ? "No contributor has confirmed this guide in the field."
                : "This date is the last time a contributor confirmed the guide in the field."}
      </p>
    </aside>
  );
}
