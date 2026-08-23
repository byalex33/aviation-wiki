import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { auth } from "@clerk/nextjs/server";

import { listApiKeys } from "@/lib/api-keys";
import { CreateKeyForm, RegenerateKeyForm, RevokeKeyForm } from "@/app/settings/api-keys/client";

export const metadata: Metadata = {
  title: "API Keys",
  alternates: { canonical: "/settings/api-keys" },
};

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ApiKeysPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const keys = await listApiKeys(userId);
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <main className="mx-auto max-w-[760px] px-5 py-14 sm:px-6 sm:py-20">
      <header>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Developer access
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-[-0.04em] sm:text-5xl">API Keys</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          API keys let external tools create article drafts on your behalf. Drafts enter the
          standard review workflow and are never auto-published.
        </p>
      </header>

      <section className="mt-10 rounded-xl border bg-card p-6 shadow-xs sm:p-8">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent text-primary">
            <KeyRound className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Create a new key</h2>
            <p className="text-sm text-muted-foreground">
              Give the key a name so you can identify it later.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <CreateKeyForm />
        </div>
      </section>

      {activeKeys.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Active keys</h2>
          <div className="divide-y rounded-xl border bg-card">
            {activeKeys.map((key) => (
              <div key={key.id} className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {key.keyPrefix}…
                    <span className="ml-3 not-mono">Created {formatDate(key.createdAt)}</span>
                    <span className="ml-3">Last used: {formatDate(key.lastUsedAt)}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Scopes: {key.scopes.join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RegenerateKeyForm keyId={key.id} />
                  <RevokeKeyForm keyId={key.id} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeKeys.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          No active API keys. Create one above to get started.
        </p>
      )}

      {revokedKeys.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Revoked keys</h2>
          <div className="divide-y rounded-xl border bg-card opacity-60">
            {revokedKeys.map((key) => (
              <div key={key.id} className="px-5 py-4">
                <p className="text-sm font-medium line-through">{key.name}</p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {key.keyPrefix}…
                  <span className="ml-3 not-mono">Revoked {formatDate(key.revokedAt)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10 rounded-xl border bg-muted/40 p-6">
        <h2 className="text-base font-semibold">Using the API</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Submit a draft via{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
            POST /api/v1/drafts
          </code>{" "}
          with your key in the{" "}
          <code className="rounded bg-background px-1 py-0.5 font-mono text-xs">
            Authorization: Bearer &lt;key&gt;
          </code>{" "}
          header.{" "}
          See the full{" "}
          <a href="/api-docs" className="text-primary underline underline-offset-4 hover:no-underline">
            API documentation
          </a>{" "}
          for request format and examples.
        </p>
      </section>
    </main>
  );
}
