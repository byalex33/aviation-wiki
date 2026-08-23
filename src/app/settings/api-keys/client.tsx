"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, KeyRound, RefreshCw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createApiKeyAction,
  revokeApiKeyAction,
  regenerateApiKeyAction,
  type CreateKeyState,
  type KeyActionState,
} from "@/app/settings/api-keys/actions";

function TokenReveal({ token, onDone }: { token: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
        <Eye className="size-4" />
        Your API key — copy it now. It will not be shown again.
      </div>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border bg-background px-3 py-2 font-mono text-xs">
          {token}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}

export function CreateKeyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CreateKeyState, FormData>(
    createApiKeyAction,
    { error: null },
  );
  const [showReveal, setShowReveal] = useState(false);
  const prevToken = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.rawToken && state.rawToken !== prevToken.current) {
      prevToken.current = state.rawToken;
      setShowReveal(true);
      router.refresh();
      formRef.current?.reset();
    }
  }, [state.rawToken, router]);

  return (
    <div>
      {showReveal && state.rawToken ? (
        <div className="mb-6">
          <TokenReveal
            token={state.rawToken}
            onDone={() => setShowReveal(false)}
          />
        </div>
      ) : null}

      <form ref={formRef} action={action} className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="new-key-name" className="mb-1.5 block text-sm font-medium">
            Key name
          </label>
          <Input
            id="new-key-name"
            name="name"
            placeholder="e.g. ChatGPT integration"
            maxLength={100}
            required
            className="h-9"
          />
        </div>
        <Button type="submit" size="sm" disabled={pending} className="h-9 shrink-0">
          <KeyRound className="size-4" />
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>

      {state.error && !showReveal ? (
        <p className="mt-2 text-sm text-destructive">{state.error}</p>
      ) : null}
    </div>
  );
}

export function RegenerateKeyForm({ keyId }: { keyId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<KeyActionState, FormData>(
    regenerateApiKeyAction,
    { error: null },
  );
  const [showReveal, setShowReveal] = useState(false);
  const prevToken = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.rawToken && state.rawToken !== prevToken.current) {
      prevToken.current = state.rawToken;
      setShowReveal(true);
      router.refresh();
    }
  }, [state.rawToken, router]);

  if (showReveal && state.rawToken) {
    return (
      <TokenReveal
        token={state.rawToken}
        onDone={() => setShowReveal(false)}
      />
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="keyId" value={keyId} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <RefreshCw className="size-3.5" />
        {pending ? "Regenerating…" : "Regenerate"}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}

export function RevokeKeyForm({ keyId }: { keyId: string }) {
  const [state, action, pending] = useActionState<KeyActionState, FormData>(
    revokeApiKeyAction,
    { error: null },
  );

  return (
    <form action={action}>
      <input type="hidden" name="keyId" value={keyId} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pending}
        className="text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
      >
        <Trash2 className="size-3.5" />
        {pending ? "Revoking…" : "Revoke"}
      </Button>
      {state.error ? <p className="mt-1 text-xs text-destructive">{state.error}</p> : null}
    </form>
  );
}
