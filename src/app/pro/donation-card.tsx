"use client";

import { useActionState, useState } from "react";
import { initialFormActionState } from "@/lib/form-action-state";
import { donateAction } from "./actions";

import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [5, 15, 30, 50] as const;
const MINIMUM_DONATION = 3;

export function DonationCard({ enabled, testMode }: { enabled: boolean; testMode: boolean }) {
  const [state, action, pending] = useActionState(donateAction, initialFormActionState);
  const [amount, setAmount] = useState<number>(15);
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const customValue = Number.parseInt(custom, 10);
  const total = useCustom ? (Number.isNaN(customValue) ? 0 : customValue) : amount;
  const customTooLow = useCustom && custom !== "" && total < MINIMUM_DONATION;
  const totalLabel = total >= 1 ? `£${total.toLocaleString("en-GB")}` : "£—";

  return (
    <aside
      aria-labelledby="donation-heading"
      className="relative w-full min-w-0 overflow-hidden rounded-[22px] border border-primary/35 bg-card shadow-[0_30px_60px_-30px_color-mix(in_oklch,var(--primary)_45%,transparent)] lg:max-w-[480px] lg:flex-[1_1_380px]"
    >
      <div className="h-1 bg-primary" />
      <div className="p-6 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 id="donation-heading" className="text-[22px] font-bold tracking-[-0.035em]">Become a supporter</h2>
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">One-time</span>
        </div>
        <p className="mt-1.5 text-sm leading-[1.55] text-muted-foreground">Choose any amount. Every level unlocks the same Pro tools.</p>

        <div role="group" aria-label="Donation amount" className="mt-5 grid grid-cols-4 gap-2">
          {PRESET_AMOUNTS.map((preset) => {
            const active = !useCustom && amount === preset;
            return (
              <button
                key={preset}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setAmount(preset);
                  setUseCustom(false);
                  setCustom("");
                }}
                className={cn(
                  "h-[52px] rounded-xl text-lg tracking-[-0.02em] transition-colors",
                  active
                    ? "border-2 border-primary bg-primary/[0.06] font-bold text-accent-foreground dark:text-primary"
                    : "border bg-card font-semibold hover:border-foreground/30",
                )}
              >
                £{preset}
              </button>
            );
          })}
        </div>

        <label
          className={cn(
            "mt-2 flex h-11 items-center overflow-hidden rounded-xl border bg-card transition-colors focus-within:ring-3 focus-within:ring-ring/20",
            useCustom ? "border-primary" : "border-input",
          )}
        >
          <span className="flex h-full items-center border-r bg-muted px-3 text-sm font-semibold text-muted-foreground">£</span>
          <span className="sr-only">Other amount in pounds</span>
          <input
            value={custom}
            onChange={(event) => {
              setCustom(event.target.value.replace(/\D/g, "").slice(0, 5));
              setUseCustom(true);
            }}
            onFocus={() => setUseCustom(true)}
            inputMode="numeric"
            placeholder="Other amount"
            aria-invalid={customTooLow || undefined}
            aria-describedby={customTooLow ? "donation-minimum" : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>
        {customTooLow && (
          <p id="donation-minimum" className="mt-1.5 text-xs text-destructive">The minimum donation is £{MINIMUM_DONATION}.</p>
        )}

        <div className="mt-5 rounded-xl bg-muted px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm text-muted-foreground">Your donation</span>
            <span className="text-2xl font-bold tracking-[-0.04em]" aria-live="polite">{totalLabel}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Charged once. Pro stays on your account permanently.</p>
        </div>

        <form action={action}>
          <input type="hidden" name="amount" value={total} />
          <button
            type="submit"
            disabled={!enabled || pending || total < MINIMUM_DONATION}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-xl bg-primary text-[15px] font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:bg-secondary disabled:text-muted-foreground"
          >
            {!enabled ? "Donations open soon" : pending ? "Opening Stripe…" : testMode ? "Try test checkout" : `Donate ${totalLabel}`}
          </button>
          {state.error && <p role="alert" className="mt-2 text-sm text-destructive">{state.error}</p>}
        </form>
        <p className="mt-2.5 text-xs leading-normal text-muted-foreground">
          {!enabled ? "Checkout isn't live yet. Nothing here collects money or turns on Pro." : testMode ? "Test mode: no real money is collected. Test donations do not grant live Pro access." : "Secure checkout with Stripe. Sign in to attach Pro to your account."}
        </p>
      </div>
    </aside>
  );
}
