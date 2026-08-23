import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, KeyRound, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "API Documentation",
  alternates: { canonical: "/api-docs" },
  description: "aviation.wiki external API reference for creating article drafts programmatically.",
};

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/60 p-4 font-mono text-xs leading-6">
      {children}
    </pre>
  );
}

function Field({
  name,
  type,
  required,
  description,
}: {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b py-3.5 last:border-b-0 sm:flex-row sm:items-start sm:gap-4">
      <div className="w-48 shrink-0">
        <code className="font-mono text-sm font-semibold">{name}</code>
        {required && (
          <span className="ml-2 text-xs font-medium text-destructive">required</span>
        )}
      </div>
      <div className="flex-1">
        <span className="font-mono text-xs text-muted-foreground">{type}</span>
        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <main className="mx-auto max-w-[820px] px-5 py-14 sm:px-6 sm:py-20">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Developer reference
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">
          API Documentation
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
          The aviation.wiki API lets authorised external tools create article drafts on your
          behalf. All drafts go through the standard contributor review workflow.
        </p>
      </header>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, label: "Authenticated", text: "Bearer token per user account" },
          { icon: BookOpen, label: "Draft-only", text: "Never bypasses editorial review" },
          { icon: Zap, label: "Rate limited", text: "10 requests per minute per key" },
        ].map(({ icon: Icon, label, text }) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <Icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Authentication</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          All API requests require an API key attached to your aviation.wiki account. Generate
          one in{" "}
          <Link href="/settings/api-keys" className="text-primary underline underline-offset-4 hover:no-underline">
            Settings → API Keys
          </Link>
          . Include the key as a Bearer token in every request:
        </p>
        <div className="mt-4">
          <CodeBlock>{`Authorization: Bearer aw_<your_key>`}</CodeBlock>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Keys are tied to your account. Drafts submitted via the API are attributed to you and
          appear in your contributions list. Keep keys private — anyone with a key can create
          drafts as you.
        </p>
      </section>

      <section className="mt-12">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-primary px-2.5 py-1 font-mono text-xs font-bold text-primary-foreground">
            POST
          </span>
          <code className="font-mono text-base">/api/v1/drafts</code>
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Creates a new article draft. The draft enters the standard review queue with
          status <code className="rounded bg-muted px-1 font-mono text-xs">draft</code> and
          is never auto-published.
        </p>

        <h3 className="mt-8 text-base font-semibold">Request body</h3>
        <p className="mt-1 text-xs text-muted-foreground">Content-Type: application/json</p>
        <div className="mt-4 divide-y rounded-xl border bg-card">
          <Field name="title" type="string" required description="Article title. Maximum 160 characters. Used to derive the article slug." />
          <Field
            name="type"
            type="string"
            required
            description={`Content type. One of: airline, alliance, aircraft, airport, manufacturer, engine, event.`}
          />
          <Field name="content" type="string" description="Article body in aviation.wiki Markdown. Maximum 250,000 characters." />
          <Field name="summary" type="string" description="Short edit summary describing this draft. Maximum 500 characters." />
          <Field
            name="sources"
            type="array"
            description="Citation sources referenced in the article body. Each source is an object with url (required), title, publisher, accessedAt (YYYY-MM-DD), and archiveUrl."
          />
        </div>

        <h3 className="mt-8 text-base font-semibold">Example request</h3>
        <div className="mt-4">
          <CodeBlock>{`curl -X POST https://aviation.wiki/api/v1/drafts \\
  -H "Authorization: Bearer aw_<your_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Airbus A320neo",
    "type": "aircraft",
    "summary": "Initial draft from public sources",
    "content": "The **Airbus A320neo** is a narrow-body airliner...",
    "sources": [
      {
        "url": "https://www.airbus.com/en/products-services/commercial-aircraft/a320-family/a320neo",
        "title": "A320neo – Airbus",
        "publisher": "Airbus",
        "accessedAt": "2026-08-23"
      }
    ]
  }'`}</CodeBlock>
        </div>

        <h3 className="mt-8 text-base font-semibold">Success response</h3>
        <p className="mt-1 text-xs text-muted-foreground">HTTP 201</p>
        <div className="mt-3">
          <CodeBlock>{`{
  "success": true,
  "draftId": "rev_01j...",
  "articleId": "art_01j...",
  "slug": "airbus-a320neo",
  "url": "https://aviation.wiki/contribute/airbus-a320neo"
}`}</CodeBlock>
        </div>

        <h3 className="mt-8 text-base font-semibold">Error responses</h3>
        <div className="mt-4 divide-y rounded-xl border bg-card text-sm">
          {[
            ["401", "Missing or invalid API key"],
            ["403", "Key lacks required scope, or account is suspended"],
            ["400", "Validation error — see the error field for details"],
            ["409", "Slug conflict with a different content type"],
            ["422", "Business logic error (e.g. article is locked)"],
            ["429", "Rate limit exceeded — up to 10 drafts per minute"],
            ["500", "Unexpected server error"],
          ].map(([code, message]) => (
            <div key={code} className="flex items-start gap-4 px-4 py-3">
              <code className="w-10 shrink-0 font-mono font-semibold">{code}</code>
              <span className="text-muted-foreground">{message}</span>
            </div>
          ))}
        </div>

        <h3 className="mt-8 text-base font-semibold">Rate limit headers</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Every response includes standard rate-limit headers:
        </p>
        <div className="mt-3">
          <CodeBlock>{`X-RateLimit-Limit: 10
X-RateLimit-Remaining: 9
X-RateLimit-Reset: 1724437260`}</CodeBlock>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-bold tracking-tight">Scopes</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Each API key is granted one or more scopes that control what actions it can perform.
        </p>
        <div className="mt-4 divide-y rounded-xl border bg-card">
          <div className="flex items-start gap-4 px-4 py-4">
            <code className="w-40 shrink-0 font-mono text-sm font-semibold">articles:draft</code>
            <p className="text-sm leading-6 text-muted-foreground">
              Create draft revisions via <code className="rounded bg-muted px-1 font-mono text-xs">POST /api/v1/drafts</code>.
              The only scope currently available.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-12 rounded-xl border bg-muted/40 p-6">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-primary" />
          <h2 className="text-base font-semibold">Get started</h2>
        </div>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Create your first API key in{" "}
          <Link
            href="/settings/api-keys"
            className="text-primary underline underline-offset-4 hover:no-underline"
          >
            Settings → API Keys
          </Link>
          . Keys are shown only once on creation.
        </p>
      </section>
    </main>
  );
}
