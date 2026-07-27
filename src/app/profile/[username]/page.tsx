import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plane,
} from "lucide-react";

import { articlePath } from "@/lib/article-routes";
import { formatDisplayLabel } from "@/lib/display";
import { getPublicProfile } from "@/lib/public-profile";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const compactDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: number | string) {
  return dateFormatter.format(new Date(value));
}

function formatCompactDate(value: number | string) {
  return compactDateFormatter.format(new Date(value));
}

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) return { title: "Profile not found" };

  const contributionLabel =
    profile.approvedCount === 1 ? "approved edit" : "approved edits";
  return {
    title: `${profile.username}'s profile`,
    description: `${profile.displayName} is an aviation.wiki ${formatDisplayLabel(profile.role).toLowerCase()} with ${profile.approvedCount} ${contributionLabel}.`,
    alternates: {
      canonical: `/profile/${encodeURIComponent(profile.username)}`,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const joinedAt = formatDate(profile.createdAt);
  const firstContributionAt = profile.firstContributionAt
    ? formatDate(profile.firstContributionAt)
    : null;
  const roleLabel = formatDisplayLabel(profile.role);

  return (
    <main className="min-h-[70vh]">
      <div className="mx-auto max-w-[1040px] px-5 pb-24 pt-7 sm:px-6 sm:pt-9">
        <nav aria-label="Breadcrumb">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to aviation.wiki
          </Link>
        </nav>

        <section className="relative mt-7 overflow-hidden rounded-[28px] bg-[#121419] text-white shadow-[0_24px_70px_-36px_rgba(0,0,0,0.65)]">
          <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:32px_32px]"
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute -right-14 top-10 size-64 rounded-full border border-white/[0.06]" />
          <div className="pointer-events-none absolute -right-4 top-20 size-44 rounded-full border border-white/[0.05]" />

          <div className="relative grid lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
            <div className="p-6 sm:p-9 lg:p-11">
              <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                <Plane className="size-3.5 text-primary" aria-hidden="true" />
                Contributor flight log
              </p>

              <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="relative w-fit shrink-0">
                  <Image
                    src={profile.imageUrl}
                    alt={`${profile.displayName}'s profile picture`}
                    width={112}
                    height={112}
                    priority
                    className="size-24 rounded-full object-cover ring-4 ring-white/10 sm:size-28"
                  />
                  <span
                    className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-primary text-white ring-4 ring-[#121419]"
                    title={roleLabel}
                  >
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    <span className="sr-only">{roleLabel}</span>
                  </span>
                </div>

                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-white/70">
                    {roleLabel}
                  </span>
                  <h1 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-white sm:text-[42px] sm:leading-none">
                    {profile.displayName}
                  </h1>
                  <p className="mt-2 font-mono text-sm text-white/45">
                    @{profile.username}
                  </p>
                </div>
              </div>

              <p className="mt-7 max-w-xl text-[15px] leading-7 text-white/65">
                {profile.bio ||
                  `${profile.displayName} is part of the aviation.wiki community, helping build a more useful and reliable aviation reference.`}
              </p>

              <div className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:gap-7">
                <span className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 text-white/65" aria-hidden="true" />
                  Member since {joinedAt}
                </span>
                {firstContributionAt && (
                  <span className="flex items-center gap-2">
                    <Clock3 className="size-3.5 text-white/65" aria-hidden="true" />
                    First accepted edit {firstContributionAt}
                  </span>
                )}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-white/[0.035] p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-10">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                Contribution record
              </p>
              <dl className="mt-8 grid grid-cols-2 divide-x divide-white/10">
                <div className="pr-5">
                  <dt className="text-xs leading-5 text-white/40">
                    Approved edits
                  </dt>
                  <dd className="mt-2 text-4xl font-bold tracking-[-0.05em] text-white">
                    {profile.approvedCount.toLocaleString()}
                  </dd>
                </div>
                <div className="pl-5">
                  <dt className="text-xs leading-5 text-white/40">
                    Articles improved
                  </dt>
                  <dd className="mt-2 text-4xl font-bold tracking-[-0.05em] text-white">
                    {profile.articleCount.toLocaleString()}
                  </dd>
                </div>
              </dl>

              <div className="mt-9 border-t border-white/10 pt-6">
                <p className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <CheckCircle2 className="size-4 text-emerald-400" aria-hidden="true" />
                  Public contribution record
                </p>
                <p className="mt-2 text-xs leading-5 text-white/40">
                  Only moderator-approved edits are shown on this profile.
                </p>
              </div>

              <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-6">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.07]">
                  <BookOpenCheck className="size-4 text-white/60" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-xs text-white/35">Status</p>
                  <p className="mt-0.5 text-sm font-medium text-white/75">
                    Community member
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-14" aria-labelledby="contributions-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                Accepted activity
              </p>
              <h2
                id="contributions-heading"
                className="mt-2 text-3xl font-bold tracking-[-0.035em]"
              >
                Contribution history
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Recent edits that have been reviewed and published.
              </p>
            </div>
            {profile.contributions.length > 0 && (
              <span className="rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Showing {profile.contributions.length}
              </span>
            )}
          </div>

          {profile.contributions.length ? (
            <ol className="mt-7 border-y">
              {profile.contributions.map((contribution) => (
                <li key={contribution.id} className="border-b last:border-b-0">
                  <Link
                    href={articlePath(
                      contribution.contentType,
                      contribution.articleSlug,
                    )}
                    className="group grid gap-3 px-1 py-5 outline-none transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 sm:grid-cols-[120px_minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-3 sm:py-6"
                  >
                    <time
                      dateTime={contribution.contributedAt}
                      className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
                    >
                      {formatCompactDate(contribution.contributedAt)}
                    </time>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Approved
                        </span>
                        <span className="text-border" aria-hidden="true">
                          /
                        </span>
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatDisplayLabel(contribution.contentType)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-base font-semibold tracking-tight transition-colors group-hover:text-primary">
                        {contribution.title}
                      </h3>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {contribution.editSummary || "Approved revision"}
                      </p>
                    </div>

                    <span className="hidden size-9 place-items-center rounded-full border text-muted-foreground transition-all group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground sm:grid">
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="mt-7 border-y py-16 text-center">
              <BookOpenCheck className="mx-auto size-7 text-muted-foreground" />
              <h3 className="mt-3 font-semibold">
                No approved contributions yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                Published edits will appear here after this contributor’s work
                has been reviewed.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
