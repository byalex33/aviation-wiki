import Link from "next/link";
import { listApiKeys, MAX_ACTIVE_API_KEYS } from "@/lib/api-keys";
import { ApiKeysManager } from "@/app/settings/api-keys/client";

// Dates are formatted here, on the server, so the client never re-renders them
// in a different time zone.
function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export async function ApiKeysPanel({ userId }: { userId: string }) {
  const keys = await listApiKeys(userId);

  return (
    <div className="flex max-w-[760px] flex-col gap-5">
      <ApiKeysManager
        maxActive={MAX_ACTIVE_API_KEYS}
        keys={keys.map((key) => ({
          id: key.id,
          name: key.name,
          keyPrefix: key.keyPrefix,
          scopes: key.scopes,
          created: formatDate(key.createdAt),
          lastUsed: formatDate(key.lastUsedAt),
          revoked: key.revokedAt ? formatDate(key.revokedAt) : null,
        }))}
      />
      <section className="rounded-2xl bg-muted px-6 py-5">
        <h2 className="text-sm font-semibold">Using the API</h2>
        <p className="mt-1.5 text-[13px] leading-[1.7] text-foreground/70">
          Send drafts to{" "}
          <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">POST /api/v1/drafts</code>{" "}
          with{" "}
          <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>.
          Drafts go through the normal review process.{" "}
          <Link href="/api-docs" className="text-primary underline underline-offset-[3px] hover:no-underline">
            API documentation
          </Link>
        </p>
      </section>
    </div>
  );
}
