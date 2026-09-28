import {
  ArrowUpRight,
  ClipboardCheck,
  FilePlus2,
} from "lucide-react";
import Link from "next/link";

import { TrackedLink } from "@/components/tracked-actions";
import { Badge } from "@/components/ui/badge";
import type { ContributionMission } from "@/lib/growth-content";

export function ContributionMissions({
  missions,
  compact = false,
}: {
  missions: ContributionMission[];
  compact?: boolean;
}) {
  if (!missions.length) return null;
  const visible = compact ? missions.slice(0, 4) : missions;

  return (
    <section
      className={compact ? "render-deferred mb-4" : ""}
      aria-label={compact ? "Contribution missions" : undefined}
      aria-labelledby={compact ? undefined : "missions-heading"}
    >
      {compact ? (
        <div className="mb-5 flex justify-end">
          <Link
            href="/contribute"
            className="article-link flex min-h-10 items-center gap-1 text-sm font-semibold"
          >
            See every mission
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mb-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Contribution missions
          </p>
          <h2 id="missions-heading" className="mt-1 text-2xl font-bold">
            Choose a useful next task
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Each mission fills a visible gap or improves an article readers are
            already discovering.
          </p>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((mission) => (
          <TrackedLink
            key={mission.id}
            href={mission.href}
            eventName="contribution_mission_click"
            eventProperties={{
              mission: mission.id,
              surface: compact ? "homepage" : "contribute",
            }}
            className="group rounded-xl border bg-card p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                {mission.id.startsWith("create-") ? (
                  <FilePlus2 className="size-5" />
                ) : (
                  <ClipboardCheck className="size-5" />
                )}
              </span>
              <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-primary" />
            </div>
            <Badge variant="outline" className="mt-5">
              {mission.label}
            </Badge>
            <h3 className="mt-3 font-semibold group-hover:text-primary">
              {mission.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mission.description}
            </p>
          </TrackedLink>
        ))}
      </div>
      {compact && (
        <p className="mt-4 text-sm text-muted-foreground">
          Pick a focused task, add sources, and submit it for moderator review.
        </p>
      )}
    </section>
  );
}
