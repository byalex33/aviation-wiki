import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Newspaper,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getArticleBySlug, listPublicSearchDocuments } from "@/lib/wiki-public-db";
import { cn } from "@/lib/utils";

// Reads the database at render time; the project builds without DB env, so
// this page is not prerendered (it was dynamic via the layout before #5).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aviation news archive",
  description:
    "Browse sourced reports about completed aviation events, ordered by when they happened and preserved as a permanent reference archive.",
  alternates: { canonical: "/aviation-news" },
  openGraph: {
    title: "Aviation news archive",
    description:
      "Past aviation events, documented with dates, context, outcomes, and linked sources.",
    url: "/aviation-news",
    type: "website",
  },
};

function fieldValue(
  fields: Array<{ key: string; value: string }>,
  ...keys: string[]
) {
  const expected = new Set(keys.map((key) => key.toLowerCase()));
  return fields.find((field) =>
    expected.has(field.key.trim().toLowerCase()),
  )?.value;
}

function sortableDate(value: string | undefined, fallback: string | undefined) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  if (Number.isFinite(parsed)) return parsed;
  const fallbackParsed = fallback ? Date.parse(fallback) : Number.NaN;
  return Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
}

export default async function AviationNewsPage() {
  const documents = (await listPublicSearchDocuments()).filter(
    (document) => document.contentType === "event",
  );
  const events = (
    await Promise.all(
      documents.map(async (document) => {
        const article = await getArticleBySlug(document.slug, "event");
        if (
          !article?.liveRevision ||
          article.liveRevision.status !== "approved"
        )
          return null;
        const fields = article.liveRevision.fields;
        const eventDate = fieldValue(
          fields,
          "Event date",
          "Date",
          "Date of event",
        );
        return {
          ...document,
          eventDate,
          location: fieldValue(fields, "Location", "Place"),
          eventType: fieldValue(fields, "Event type", "Type"),
          sortDate: sortableDate(eventDate, document.updatedAt),
        };
      }),
    )
  )
    .filter((event): event is NonNullable<typeof event> => Boolean(event))
    .toSorted(
      (first, second) =>
        second.sortDate - first.sortDate ||
        first.title.localeCompare(second.title),
    );

  return (
    <main className="mx-auto w-full max-w-[1120px] px-5 pb-20 pt-8 sm:px-6">
      <nav className="mb-8 text-sm text-muted-foreground">
        <Link href="/" className="article-link">
          Main
        </Link>
        <span> / </span>
        <Link href="/categories" className="article-link">
          Categories
        </Link>
        <span> / Aviation news</span>
      </nav>

      <section className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_310px]">
        <div className="max-w-3xl">
          <Badge variant="secondary" className="rounded-full text-primary">
            Past events
          </Badge>
          <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
            Aviation news archive
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            Sourced reports about aviation events that have already happened.
            Each article records the date, context, outcome, and significance
            without mixing developing claims into the evergreen encyclopedia.
          </p>
        </div>
        <aside className="rounded-xl border bg-muted/35 p-5">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="size-5 text-primary" />
            Archive standard
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Events must be complete enough to describe in retrospect and every
            factual claim must be supported by reliable sources.
          </p>
        </aside>
      </section>

      <section className="mt-10" aria-label="Aviation news archive">
        {events.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {events.map((event) => (
              <Link key={event.id} href={event.href} className="group block">
                <Card className="h-full gap-0 py-0 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardHeader className="p-6 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {event.eventType || "Aviation event"}
                      </Badge>
                      {event.eventDate && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          {event.eventDate}
                        </span>
                      )}
                    </div>
                    <CardTitle className="mt-4 text-xl font-semibold tracking-tight group-hover:text-primary">
                      {event.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-6 pb-5">
                    <p className="line-clamp-3 leading-6 text-muted-foreground">
                      {event.description}
                    </p>
                    {event.location && (
                      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {event.location}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="mt-auto justify-between px-6 py-4 font-medium">
                    Read archived report
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-6 py-14 text-center">
            <Newspaper className="mx-auto size-9 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">
              Build the first event report
            </h2>
            <p className="mx-auto mt-2 max-w-xl leading-7 text-muted-foreground">
              Start with a completed aviation event, then document what
              happened, when and where it occurred, the verified outcome, and
              why it matters.
            </p>
            <Link
              href="/contribute?title=US+Airways+Flight+1549+ditching&slug=us-airways-flight-1549-ditching&contentType=event"
              className={cn(buttonVariants(), "mt-6")}
            >
              Create an event report
            </Link>
          </div>
        )}
      </section>

      <section className="mt-12 grid gap-5 rounded-2xl bg-foreground p-7 text-background sm:grid-cols-3 sm:p-9">
        {[
          [
            "Past, not developing",
            "Wait until the central event and immediate outcome can be described accurately.",
          ],
          [
            "Date-led structure",
            "Record the event date, location, participants, timeline, and confirmed outcome.",
          ],
          [
            "Evidence first",
            "Prefer official reports, operators, authorities, and strong contemporary reporting.",
          ],
        ].map(([title, body]) => (
          <div key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-background/60">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
