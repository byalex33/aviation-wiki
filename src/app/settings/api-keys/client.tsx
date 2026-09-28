"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import {
  createApiKeyAction,
  revokeApiKeyAction,
  regenerateApiKeyAction,
  type CreateKeyState,
  type KeyActionState,
} from "@/app/settings/api-keys/actions";
import { settingsInputClass } from "@/components/auth/settings-field";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  created: string;
  lastUsed: string;
  revoked: string | null;
};

const outlineButton = "inline-flex h-[34px] items-center rounded-lg border px-3 text-[13px] font-medium transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-50";
const dangerButton = "inline-flex h-[34px] items-center rounded-lg px-2.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-400/10";

/** Runs `onToken` once for each new raw token an action returns. */
function useNewToken(token: string | undefined, onToken: (token: string) => void) {
  const previous = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (token && token !== previous.current) {
      previous.current = token;
      onToken(token);
    }
  }, [token, onToken]);
}

function TokenReveal({ token, onDone }: { token: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
    } catch {
      toast.error("Couldn't copy the key. Select it and copy it manually.");
    }
  }
  return (
    <div className="mt-4 rounded-xl bg-[hsl(210_10%_15%)] p-4 text-white dark:border dark:bg-muted" role="status">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <TriangleAlert className="size-3.5 text-[hsl(356_84%_65%)]" aria-hidden="true" />
        Copy this key now. It won&apos;t be shown again.
      </p>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-white/[0.08] py-1.5 pl-3 pr-1.5">
        <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-[13px]">{token}</code>
        <button type="button" onClick={copy} className="inline-flex h-[30px] shrink-0 items-center rounded-md bg-white px-2.5 text-xs font-semibold text-[hsl(210_10%_15%)]">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <button type="button" onClick={onDone} className="mt-2.5 text-xs text-white/70 underline underline-offset-[3px] hover:text-white">
        I&apos;ve saved it
      </button>
    </div>
  );
}

function CreateKeyForm({ activeCount, maxActive, onToken }: { activeCount: number; maxActive: number; onToken: (token: string) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(createApiKeyAction, { error: null });
  useNewToken(state.rawToken, (token) => {
    onToken(token);
    setName("");
    router.refresh();
  });
  const full = activeCount >= maxActive;
  return (
    <>
      <form action={action} className="mt-3.5 flex flex-wrap gap-2">
        <label htmlFor="new-key-name" className="sr-only">Key name</label>
        <input
          id="new-key-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Research notebook"
          maxLength={100}
          required
          disabled={full}
          className={`${settingsInputClass} min-w-0 flex-[1_1_260px]`}
        />
        <button type="submit" disabled={pending || full || !name.trim()} className="inline-flex h-10 items-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>
      {full && <p className="mt-2 text-xs text-muted-foreground">You have {maxActive} active keys. Revoke one to create another.</p>}
      {state.error && <p className="mt-2 text-sm text-red-700 dark:text-red-400" role="alert">{state.error}</p>}
    </>
  );
}

function KeyActions({ keyId, keyName, onToken }: { keyId: string; keyName: string; onToken: (token: string) => void }) {
  const router = useRouter();
  const [regenerated, regenerate, regenerating] = useActionState<KeyActionState, FormData>(regenerateApiKeyAction, { error: null });
  const [revoked, revoke, revoking] = useActionState<KeyActionState, FormData>(revokeApiKeyAction, { error: null });
  useNewToken(regenerated.rawToken, (token) => {
    onToken(token);
    router.refresh();
  });
  const error = regenerated.error || revoked.error;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <form action={regenerate} onSubmit={(event) => { if (!window.confirm(`Regenerate "${keyName}"? Tools using the current key will stop working.`)) event.preventDefault(); }}>
          <input type="hidden" name="keyId" value={keyId} />
          <button type="submit" disabled={regenerating || revoking} className={outlineButton}>{regenerating ? "Regenerating…" : "Regenerate"}</button>
        </form>
        <form action={revoke} onSubmit={(event) => { if (!window.confirm(`Revoke "${keyName}"? This can't be undone.`)) event.preventDefault(); }}>
          <input type="hidden" name="keyId" value={keyId} />
          <button type="submit" disabled={regenerating || revoking} className={dangerButton}>{revoking ? "Revoking…" : "Revoke"}</button>
        </form>
      </div>
      {error && <p className="text-xs text-red-700 dark:text-red-400" role="alert">{error}</p>}
    </div>
  );
}

export function ApiKeysManager({ keys, maxActive }: { keys: ApiKeyRow[]; maxActive: number }) {
  const [reveal, setReveal] = useState<string | null>(null);
  const active = keys.filter((key) => !key.revoked);
  const revoked = keys.filter((key) => key.revoked);
  return (
    <>
      <section className="rounded-2xl border bg-card p-6" aria-labelledby="create-key-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="create-key-heading" className="text-[15px] font-semibold">Create a new key</h2>
          <span className="font-mono text-[11px] text-muted-foreground">{active.length} / {maxActive} active</span>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">Name it after the tool that will use it, so you can recognise it later.</p>
        <CreateKeyForm activeCount={active.length} maxActive={maxActive} onToken={setReveal} />
        {reveal && <TokenReveal token={reveal} onDone={() => setReveal(null)} />}
      </section>

      <section aria-labelledby="active-keys-heading">
        <h2 id="active-keys-heading" className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Active keys</h2>
        {active.length ? (
          <div className="mt-2.5 rounded-2xl border bg-card">
            {active.map((key) => (
              <div key={key.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-5 py-[18px] first:border-t-0">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted"><KeyRound className="size-4 text-muted-foreground" aria-hidden="true" /></span>
                <div className="min-w-0 flex-[1_1_260px]">
                  <p className="text-sm font-semibold [overflow-wrap:anywhere]">{key.name}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-mono">{key.keyPrefix}…</span>
                    <span>Created {key.created}</span>
                    <span>Last used {key.lastUsed}</span>
                  </p>
                </div>
                {key.scopes.map((scope) => (
                  <span key={scope} className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground/75">{scope}</span>
                ))}
                <KeyActions keyId={key.id} keyName={key.name} onToken={setReveal} />
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2.5 rounded-2xl border border-dashed p-6 text-center text-[13px] text-muted-foreground">No active keys. Create one above to get started.</p>
        )}
      </section>

      {revoked.length > 0 && (
        <section aria-labelledby="revoked-keys-heading">
          <h2 id="revoked-keys-heading" className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Revoked</h2>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {revoked.map((key) => (
              <li key={key.id} className="flex flex-wrap gap-x-3.5 gap-y-1 px-1 text-[13px] text-muted-foreground">
                <span className="line-through">{key.name}</span>
                <span className="font-mono text-xs">{key.keyPrefix}…</span>
                <span className="text-xs">Revoked {key.revoked}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
