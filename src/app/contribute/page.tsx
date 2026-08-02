import type { Metadata } from "next";
import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { FilePlus2, PencilLine } from "lucide-react";

import { startArticleFormAction } from "@/app/contribute/actions";
import { ActionForm } from "@/components/action-form";
import { ContributionMissions } from "@/components/growth-sections";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { contributionMissions } from "@/lib/growth-content";
import {
  listContributorRevisions,
  listPublicSearchDocuments,
} from "@/lib/wiki-public-db";
import {
  contentTypes,
  type ContentType,
} from "@/lib/wiki-types";

export const metadata: Metadata = {
  title: "Contribute",
  description:
    "Choose a focused aviation research mission, create an article, or improve an approved aviation.wiki page.",
  robots: { index: false, follow: true },
};

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const query = await searchParams;
  const documents = await listPublicSearchDocuments();
  const missions = contributionMissions(documents);
  const title = valueOf(query.title).slice(0, 120);
  const slug = valueOf(query.slug).slice(0, 100);
  const requestedType = valueOf(query.contentType);
  const selectedType = contentTypes.includes(requestedType as ContentType)
    ? (requestedType as ContentType)
    : "airline";

  if (!session.isAuthenticated || !session.userId) {
    return (
      <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <PencilLine className="mx-auto size-8 text-primary" />
          <h1 className="mt-5 text-4xl font-bold tracking-tight">
            Contribute to aviation.wiki
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Sign in to create articles, save drafts, and submit revisions for
            moderator review.
          </p>
          <SignInButton>
            <Button className="mt-7" size="lg">
              Log in to contribute
            </Button>
          </SignInButton>
        </div>
        <div className="mt-14 text-left">
          <ContributionMissions missions={missions} />
        </div>
      </main>
    );
  }

  const revisions = await listContributorRevisions(session.userId);
  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">
        Contribute to aviation.wiki
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Choose a focused mission, start a new article, or continue working on a
        saved revision.
      </p>

      <div className="mt-10">
        <ContributionMissions missions={missions} />
      </div>

      <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-semibold">Your revisions</h2>
            <span className="text-sm text-muted-foreground">
              {revisions.length}{" "}
              {revisions.length === 1 ? "revision" : "revisions"}
            </span>
          </div>
          <Card className="mt-4 gap-0 py-0">
            {revisions.length ? (
              revisions.map((revision) => (
                <Link
                  key={revision.id}
                  href={`/contribute/${revision.articleSlug}?type=${revision.contentType}`}
                  className="block border-b px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{revision.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {revision.editSummary || "No edit summary yet"}
                      </p>
                    </div>
                    <RevisionStatusBadge status={revision.status} />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Updated {new Date(revision.updatedAt).toLocaleString()}
                  </p>
                </Link>
              ))
            ) : (
              <CardContent className="py-14 text-center">
                <PencilLine className="mx-auto size-7 text-muted-foreground" />
                <h3 className="mt-3 font-semibold">No revisions yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drafts and submitted changes will appear here.
                </p>
              </CardContent>
            )}
          </Card>
        </section>

        <aside>
          <Card className="gap-0 py-0 lg:sticky lg:top-[76px]">
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <FilePlus2 className="size-5 text-primary" />
                <h2 className="font-semibold">Start a new article</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Search first, then use this form if the article does not exist.
              </p>
              <ActionForm
                action={startArticleFormAction}
                className="mt-6 space-y-4"
              >
                <label className="grid gap-2 text-sm font-medium">
                  Title
                  <Input
                    className="h-10"
                    name="title"
                    required
                    placeholder="Article title"
                    defaultValue={title}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  URL slug
                  <Input
                    className="h-10"
                    name="slug"
                    required
                    placeholder="article-title"
                    pattern="[a-zA-Z0-9-]+"
                    defaultValue={slug}
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Content type
                  <select
                    name="contentType"
                    defaultValue={selectedType}
                    className="h-10 rounded-lg border bg-background px-3 text-sm"
                  >
                    {contentTypes.map((type) => (
                      <option key={type} value={type}>
                        {formatDisplayLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" className="w-full" size="lg">
                  Create article
                </Button>
              </ActionForm>
            </CardContent>
          </Card>
        </aside>
      </div>
    </main>
  );
}
