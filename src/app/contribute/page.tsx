import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SignInButton } from "@clerk/nextjs";
import { FilePlus2, PencilLine } from "lucide-react";

import { startArticleAction } from "@/app/contribute/actions";
import { RevisionStatusBadge } from "@/components/revision-status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatDisplayLabel } from "@/lib/display";
import { listContributorRevisions } from "@/lib/wiki-db";
import { contentTypes } from "@/lib/wiki-types";

export default async function ContributePage() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20">
        <Card>
          <CardContent className="p-8 text-center">
            <PencilLine className="mx-auto size-8 text-primary" />
            <h1 className="mt-4 text-3xl font-bold">
              Contribute to aviation.wiki
            </h1>
            <p className="mt-3 text-muted-foreground">
              Sign in to create articles, save drafts, and submit revisions for
              moderator review.
            </p>
            <SignInButton>
              <Button className="mt-6">Log in to contribute</Button>
            </SignInButton>
          </CardContent>
        </Card>
      </main>
    );
  }

  const revisions = listContributorRevisions(session.userId);
  return (
    <main className="mx-auto max-w-[1100px] px-5 pb-20 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-wide text-primary">
            Contribution workspace
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            Your revisions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Draft privately, cite sources, then submit changes for independent
            review.
          </p>
        </div>
        <Link
          href="/wiki/article-title"
          className={buttonVariants({ variant: "outline" })}
        >
          Find or create by URL
        </Link>
      </div>

      <div className="mt-9 grid items-start gap-7 lg:grid-cols-[1fr_340px]">
        <section className="space-y-3">
          {revisions.length ? (
            revisions.map((revision) => (
              <Link
                key={revision.id}
                href={`/contribute/${revision.articleSlug}?type=${revision.contentType}`}
                className="block rounded-xl border bg-card p-5 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">{revision.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {revision.editSummary || "No edit summary yet"}
                    </p>
                  </div>
                  <RevisionStatusBadge status={revision.status} />
                </div>
                <p className="mt-4 font-mono text-xs text-muted-foreground">
                  Updated {new Date(revision.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                You have not created any revisions yet.
              </CardContent>
            </Card>
          )}
        </section>

        <Card className="gap-0 py-0 shadow-xs">
          <CardContent className="p-5">
            <FilePlus2 className="size-5 text-primary" />
            <h2 className="mt-3 font-semibold">Start a new article</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this only when an article does not already exist.
            </p>
            <form action={startArticleAction} className="mt-5 space-y-4">
              <label className="grid gap-2 text-sm font-medium">
                Title
                <Input name="title" required placeholder="Article title" />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                URL slug
                <Input
                  name="slug"
                  required
                  placeholder="article-title"
                  pattern="[a-zA-Z0-9-]+"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Content type
                <select
                  name="contentType"
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                >
                  {contentTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatDisplayLabel(type)}
                    </option>
                  ))}
                </select>
              </label>
              <Button type="submit" className="w-full">
                Create this article
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
