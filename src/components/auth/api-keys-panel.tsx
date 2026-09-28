import Link from "next/link";
import { listApiKeys } from "@/lib/api-keys";
import { CreateKeyForm, RegenerateKeyForm, RevokeKeyForm } from "@/app/settings/api-keys/client";

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function ApiKeysPanel({ userId }: { userId: string }) {
  const keys = await listApiKeys(userId);
  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div>
      <section className="mt-10 border bg-card p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Create a new key</h2>
            <p className="text-sm text-muted-foreground">
              Give the key a name so you can identify it later. You can keep up to five active keys.
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
          <div className="divide-y border bg-card">
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
          <div className="divide-y border bg-card opacity-60">
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

      <section className="mt-10 border bg-muted/40 p-6">
        <h2 className="text-base font-semibold">Using the API</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Submit a draft via{" "}
          <code className="bg-background px-1 py-0.5 font-mono text-xs">
            POST /api/v1/drafts
          </code>{" "}
          with your key in the{" "}
          <code className="bg-background px-1 py-0.5 font-mono text-xs">
            Authorization: Bearer &lt;key&gt;
          </code>{" "}
          header.{" "}
          See the full{" "}
          <Link href="/api-docs" className="text-primary underline underline-offset-4 hover:no-underline">
            API documentation
          </Link>{" "}
          for request format and examples.
        </p>
      </section>
    </div>
  );
}
