import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Plane,
} from "lucide-react";

import { RoleUsername } from "@/components/role-username";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

function formatDate(value: number | string) {
  return dateFormatter.format(new Date(value));
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

  return (
    <main className="home-background min-h-[70vh]">
      <div className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
        <nav className="mb-8 text-sm text-muted-foreground">
          <Link href="/" className="article-link">
            Main
          </Link>
          <span> / Profile / {profile.username}</span>
        </nav>

        <Card className="relative gap-0 overflow-hidden bg-gradient-to-br from-primary/12 via-card to-card py-0 shadow-sm">
          <span
            className="pointer-events-none absolute -right-8 -top-12 text-primary/[0.06]"
            aria-hidden="true"
          >
            <Plane className="size-56 -rotate-12" strokeWidth={1.2} />
          </span>
          <CardContent className="relative p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <Image
                src={profile.imageUrl}
                alt={`${profile.displayName}'s profile picture`}
                width={112}
                height={112}
                priority
                className="size-24 rounded-3xl object-cover ring-4 ring-background shadow-lg sm:size-28"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {formatDisplayLabel(profile.role)}
                  </Badge>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    Joined {joinedAt}
                  </span>
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">
                  <RoleUsername
                    name={profile.displayName}
                    role={profile.role}
                    className="normal-case"
                  />
                </h1>
                <p className="mt-1 font-mono text-sm text-muted-foreground">
                  @{profile.username}
                </p>
                {profile.bio && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-foreground/80 sm:text-base">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section aria-labelledby="contributions-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Activity
                </p>
                <h2
                  id="contributions-heading"
                  className="mt-1 text-2xl font-bold tracking-tight"
                >
                  Recent contributions
                </h2>
              </div>
              {profile.contributions.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Latest {profile.contributions.length}
                </span>
              )}
            </div>

            <Card className="mt-5 gap-0 py-0 shadow-xs">
              {profile.contributions.length ? (
                profile.contributions.map((contribution) => (
                  <Link
                    key={contribution.id}
                    href={articlePath(
                      contribution.contentType,
                      contribution.articleSlug,
                    )}
                    className="group block border-b px-5 py-5 transition-colors last:border-b-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                  >
                    <div className="flex items-start gap-4">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/12 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2
                          className="size-4"
                          aria-hidden="true"
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold group-hover:text-primary">
                            {contribution.title}
                          </h3>
                          <Badge variant="outline">
                            {formatDisplayLabel(contribution.contentType)}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {contribution.editSummary || "Approved revision"}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Accepted {formatDate(contribution.contributedAt)}
                        </p>
                      </div>
                      <ArrowUpRight
                        className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))
              ) : (
                <CardContent className="py-14 text-center">
                  <FileCheck2 className="mx-auto size-7 text-muted-foreground" />
                  <h3 className="mt-3 font-semibold">
                    No approved contributions yet
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                    Accepted edits will appear here once this contributor has
                    helped improve an article.
                  </p>
                </CardContent>
              )}
            </Card>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-[76px]">
            <Card className="gap-0 py-0 shadow-xs">
              <CardContent className="p-6">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                  Contribution record
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-1">
                  <div className="rounded-xl bg-muted/60 p-4">
                    <dt className="text-xs text-muted-foreground">
                      Approved edits
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight">
                      {profile.approvedCount.toLocaleString()}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-muted/60 p-4">
                    <dt className="text-xs text-muted-foreground">
                      Articles improved
                    </dt>
                    <dd className="mt-1 text-2xl font-bold tracking-tight">
                      {profile.articleCount.toLocaleString()}
                    </dd>
                  </div>
                </dl>
                <div className="mt-5 border-t pt-5 text-sm">
                  <p className="flex items-center gap-2 font-medium">
                    <CheckCircle2
                      className="size-4 text-emerald-600 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    Community member
                  </p>
                  <p className="mt-2 leading-6 text-muted-foreground">
                    {profile.firstContributionAt
                      ? `First accepted contribution on ${formatDate(profile.firstContributionAt)}.`
                      : `Member of aviation.wiki since ${joinedAt}.`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}
