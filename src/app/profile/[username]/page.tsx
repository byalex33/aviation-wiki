import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  CircleCheck,
  Pencil,
  PlaneTakeoff,
} from "lucide-react";

import {
  ContributionHistory,
  OwnProfileOnly,
  ShareProfileButton,
} from "@/components/public-profile";
import { roleStyles } from "@/components/role-username";
import { formatDisplayLabel } from "@/lib/display";
import { getPublicProfile } from "@/lib/public-profile";
import { jsonLd, siteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { wikiRoleDetails, wikiRoles, type WikiRole } from "@/lib/wiki-roles";

type ProfilePageProps = {
  params: Promise<{ username: string }>;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatDate(value: number | string) {
  return dateFormatter.format(new Date(value));
}

const milestoneSteps = [1, 10, 50, 100, 250, 500, 1000];

const roleBadgeStyles: Record<WikiRole, string> = {
  contributor: "bg-muted text-muted-foreground",
  trusted_contributor:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
  moderator: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
  admin: "bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300",
};

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
    openGraph: {
      type: "profile",
      url: `/profile/${encodeURIComponent(profile.username)}`,
      title: `${profile.displayName} (@${profile.username})`,
      description: `${profile.approvedCount} ${contributionLabel} on aviation.wiki.`,
      images: [{ url: profile.imageUrl, alt: profile.displayName }],
    },
    twitter: {
      card: "summary",
      title: `${profile.displayName} (@${profile.username})`,
      description: `${profile.approvedCount} ${contributionLabel} on aviation.wiki.`,
      images: [profile.imageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();

  const profilePath = `/profile/${encodeURIComponent(profile.username)}`;
  const role = wikiRoleDetails[profile.role];
  const roleLabel = formatDisplayLabel(profile.role);
  const RoleIcon =
    profile.role === "contributor" ? null : roleStyles[profile.role].Icon;

  const approved = profile.approvedCount;
  const nextMilestone = milestoneSteps.find((step) => step > approved);
  const milestoneTarget = nextMilestone ?? milestoneSteps.at(-1)!;
  const remaining = milestoneTarget - approved;
  const progress = Math.min(100, Math.round((approved / milestoneTarget) * 100));

  const stats = [
    { label: "Approved edits", value: approved.toLocaleString("en"), large: true },
    { label: "Articles improved", value: profile.articleCount.toLocaleString("en"), large: true },
    { label: "Member since", value: formatDate(profile.createdAt) },
    {
      label: "First accepted edit",
      value: profile.firstContributionAt ? formatDate(profile.firstContributionAt) : "Not yet",
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "ProfilePage",
            url: new URL(profilePath, siteUrl),
            mainEntity: {
              "@type": "Person",
              name: profile.displayName,
              image: profile.imageUrl,
              description:
                profile.bio ||
                `${profile.displayName} is an aviation.wiki ${roleLabel.toLowerCase()}.`,
            },
          }),
        }}
      />
      <main className="min-h-[70vh]">
        <div className="mx-auto max-w-[1120px] px-5 pb-24 pt-7 sm:px-6">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground"
          >
            <Link href="/" className="transition-colors hover:text-primary">
              aviation.wiki
            </Link>
            <span className="text-foreground/20" aria-hidden="true">/</span>
            <span>Contributors</span>
            <span className="text-foreground/20" aria-hidden="true">/</span>
            <span className="truncate text-foreground" aria-current="page">
              @{profile.username}
            </span>
          </nav>

          <section className="mt-5 overflow-hidden rounded-[20px] border bg-card">
            <div className="flex flex-wrap items-start gap-6 p-6 sm:gap-7 sm:p-9">
              <Image
                src={profile.imageUrl}
                alt={`${profile.displayName}'s profile picture`}
                width={96}
                height={96}
                priority
                className="size-20 shrink-0 rounded-full object-cover ring-1 ring-border sm:size-24"
              />
              <div className="min-w-0 flex-[1_1_360px]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full py-1 pr-2.5 text-xs font-semibold",
                      RoleIcon ? "pl-2" : "pl-2.5",
                      roleBadgeStyles[profile.role],
                    )}
                  >
                    {RoleIcon && <RoleIcon className="size-3.5" aria-hidden="true" />}
                    {role.label}
                  </span>
                  <span className="font-mono text-[13px] text-muted-foreground">
                    @{profile.username}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold leading-[1.05] tracking-[-0.045em] sm:text-[40px]">
                  {profile.displayName}
                </h1>
                <p className="mt-3 max-w-[600px] text-[15px] leading-[1.65] text-foreground/75 [text-wrap:pretty]">
                  {profile.bio ||
                    `${profile.displayName} is part of the aviation.wiki community, helping build a more useful and reliable aviation reference.`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ShareProfileButton url={new URL(profilePath, siteUrl).toString()} />
                <OwnProfileOnly profileId={profile.id}>
                  <Link
                    href="/settings/profile"
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit profile
                  </Link>
                </OwnProfileOnly>
              </div>
            </div>
            <dl className="grid grid-cols-2 border-t bg-muted/60 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className={cn(
                    "px-6 py-5 sm:px-9",
                    index % 2 === 0 && "border-r",
                    index < 2 && "border-b lg:border-b-0",
                    index === 1 && "lg:border-r",
                  )}
                >
                  <dt className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {stat.label}
                  </dt>
                  <dd
                    className={cn(
                      stat.large
                        ? "mt-1.5 text-[30px] font-bold leading-none tracking-[-0.05em]"
                        : "mt-2.5 text-[17px] font-semibold tracking-[-0.02em]",
                    )}
                  >
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <div className="mt-10 flex flex-wrap items-start gap-10">
            <section
              className="min-w-0 flex-[999_1_520px]"
              aria-labelledby="contributions-heading"
            >
              <h2
                id="contributions-heading"
                className="text-2xl font-bold tracking-[-0.035em]"
              >
                Contribution history
              </h2>
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                <CircleCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
                Only moderator-approved, published edits are listed.
              </p>

              {profile.contributions.length ? (
                <ContributionHistory contributions={profile.contributions} />
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed px-6 py-12 text-center">
                  <BookOpenCheck
                    className="mx-auto size-7 text-muted-foreground/70"
                    aria-hidden="true"
                  />
                  <OwnProfileOnly
                    profileId={profile.id}
                    fallback={
                      <>
                        <h3 className="mt-3 font-semibold">
                          No approved contributions yet
                        </h3>
                        <p className="mx-auto mt-1.5 max-w-[380px] text-sm leading-relaxed text-muted-foreground">
                          Published edits will appear here after this
                          contributor’s work has been reviewed.
                        </p>
                      </>
                    }
                  >
                    <h3 className="mt-3 font-semibold">
                      Your first approved edit will land here
                    </h3>
                    <p className="mx-auto mt-1.5 max-w-[380px] text-sm leading-relaxed text-muted-foreground">
                      Fix a date, add a source, or expand a section. Once a
                      moderator approves it, it shows up on your profile.
                    </p>
                    <Link
                      href="/contribute"
                      className="mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Find an article to improve
                    </Link>
                  </OwnProfileOnly>
                </div>
              )}
            </section>

            <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
              <div className="relative overflow-hidden rounded-2xl bg-[hsl(210_10%_15%)] p-6 text-white dark:border dark:bg-card">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[hsl(356_84%_48%)]" />
                <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  <PlaneTakeoff className="size-3.5 text-[hsl(356_84%_60%)]" aria-hidden="true" />
                  {nextMilestone ? "Next milestone" : "Milestones"}
                </p>
                <p className="mt-3.5 flex items-baseline gap-2">
                  <span className="text-[40px] font-bold leading-none tracking-[-0.05em]">
                    {approved.toLocaleString("en")}
                  </span>
                  <span className="font-mono text-sm text-white/50">
                    / {milestoneTarget.toLocaleString("en")}
                  </span>
                </p>
                <div
                  className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.12]"
                  role="progressbar"
                  aria-label="Progress to next milestone"
                  aria-valuemin={0}
                  aria-valuemax={milestoneTarget}
                  aria-valuenow={Math.min(approved, milestoneTarget)}
                >
                  <div
                    className="h-full rounded-full bg-[hsl(356_84%_55%)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-3 text-[13px] leading-[1.55] text-white/70">
                  {!nextMilestone ? (
                    "Every milestone reached."
                  ) : approved === 0 ? (
                    <OwnProfileOnly
                      profileId={profile.id}
                      fallback="Working toward a first approved edit."
                    >
                      Your first approved edit unlocks the first milestone.
                    </OwnProfileOnly>
                  ) : (
                    <OwnProfileOnly
                      profileId={profile.id}
                      fallback={`${remaining.toLocaleString("en")} approved ${remaining === 1 ? "edit" : "edits"} from the ${nextMilestone.toLocaleString("en")} milestone.`}
                    >
                      {remaining.toLocaleString("en")} more approved{" "}
                      {remaining === 1 ? "edit" : "edits"} to reach{" "}
                      {nextMilestone.toLocaleString("en")}.
                    </OwnProfileOnly>
                  )}
                </p>
                <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Milestones">
                  {milestoneSteps.map((step) => {
                    const label = step.toLocaleString("en");
                    if (step <= approved) {
                      return (
                        <li
                          key={step}
                          className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 font-mono text-[11px]"
                        >
                          <Check className="size-3 text-emerald-400" aria-hidden="true" />
                          {label}
                          <span className="sr-only"> reached</span>
                        </li>
                      );
                    }
                    return (
                      <li
                        key={step}
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-[3px] font-mono text-[11px]",
                          step === nextMilestone
                            ? "border-[hsl(356_84%_60%)]"
                            : "border-dashed border-white/20 text-white/45",
                        )}
                      >
                        {label}
                      </li>
                    );
                  })}
                </ul>
                <OwnProfileOnly profileId={profile.id}>
                  <Link
                    href="/contribute"
                    className="mt-5 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-sm font-medium text-[hsl(210_10%_15%)] transition-colors hover:bg-[hsl(356_84%_96%)] hover:text-[hsl(356_84%_30%)]"
                  >
                    Contribute an edit
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Link>
                </OwnProfileOnly>
              </div>

              <div className="rounded-2xl border bg-card p-6">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  About this role
                </p>
                <h3 className="mt-2.5 text-[17px] font-semibold tracking-[-0.02em]">
                  {role.label}
                </h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/70 [text-wrap:pretty]">
                  {role.description}
                </p>
                <ol className="mt-4 flex flex-col gap-0.5 border-t pt-3.5">
                  {wikiRoles.map((item) => {
                    const current = item === profile.role;
                    return (
                      <li
                        key={item}
                        className="flex items-center gap-2.5 py-1.5"
                        aria-current={current ? "true" : undefined}
                      >
                        <span
                          className={cn(
                            "size-2 rounded-full",
                            current
                              ? "bg-primary shadow-[0_0_0_3px_hsl(356_84%_92%)] dark:shadow-none"
                              : "border border-foreground/25",
                          )}
                        />
                        <span
                          className={cn(
                            "text-[13px]",
                            current ? "font-semibold" : "text-muted-foreground",
                          )}
                        >
                          {wikiRoleDetails[item].label}
                        </span>
                        {current && (
                          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-primary">
                            Current
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
