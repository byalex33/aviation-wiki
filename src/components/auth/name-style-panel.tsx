"use client";

import Link from "next/link";
import { useId, useState, useTransition, type ReactNode } from "react";
import type { UserResource } from "@clerk/shared/types";
import { Ban, Crown, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { saveNameStyleAction } from "@/app/settings/profile/actions";
import { NameStyleIcon, StyledName, nameTextClassName } from "@/components/styled-name";
import {
  defaultNameStyle, isDefaultNameStyle, nameEffects, nameFonts, nameIcons, sameNameStyle, savedNameStyle,
  type NameEffect, type NameFont, type NameIcon, type NameStyle,
} from "@/lib/name-style";
import { cn } from "@/lib/utils";
import type { WikiRole } from "@/lib/wiki-roles";
import { RoleLabel } from "./profile-workspace";

const card = "rounded-2xl border bg-card";
const tile = "relative cursor-pointer rounded-xl border bg-card transition-[border-color,background-color,box-shadow] duration-150 hover:border-foreground/30 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.05] has-[:checked]:shadow-[inset_0_0_0_1px_var(--primary)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background";
const kicker = "flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

function entries<T extends string, V>(catalog: Record<T, V>) {
  return Object.entries(catalog) as [T, V][];
}

function PickerCard({ title, hint, children }: { title: string; hint: string; children: (labelId: string) => ReactNode }) {
  const labelId = useId();
  return <section className={cn(card, "p-5 sm:p-6")}>
    <h2 id={labelId} className="text-[15px] font-semibold">{title}</h2>
    <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>
    {children(labelId)}
  </section>;
}

function Group({ label, animated, children }: { label: string; animated?: boolean; children: ReactNode }) {
  return <div className="mt-4">
    <p className={kicker}>{animated && <Sparkles className="size-3 text-primary" aria-hidden="true"/>}{label}</p>
    {children}
  </div>;
}

export function NameStylePanel({ user, name, username, role, pro }: {
  user: UserResource; name: string; username: string; role: WikiRole; pro: boolean;
}) {
  const saved = savedNameStyle(user.publicMetadata);
  const [draft, setDraft] = useState<NameStyle>(saved);
  const [error, setError] = useState("");
  const [saving, startSaving] = useTransition();
  const dirty = !sameNameStyle(draft, saved);
  const sample = name.split(" ")[0] || username || "Your name";
  const set = (patch: Partial<NameStyle>) => { setDraft((current) => ({ ...current, ...patch })); setError(""); };

  function save() {
    startSaving(async () => {
      const result = await saveNameStyleAction(draft);
      if (result.error) { setError(result.error); return; }
      await user.reload();
      toast.success(isDefaultNameStyle(draft) ? "Name style reset." : "Name style saved.");
    });
  }

  const iconGroups = [
    { label: "Classic", keys: entries(nameIcons).filter(([, icon]) => !icon.animated) },
    { label: "Animated", animated: true, keys: entries(nameIcons).filter(([, icon]) => icon.animated) },
  ];
  const effectGroups = [
    { label: "Classic", keys: entries(nameEffects).filter(([, effect]) => !effect.animated) },
    { label: "Animated", animated: true, keys: entries(nameEffects).filter(([, effect]) => effect.animated) },
  ];

  return <div>
    {!pro && <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Crown className="size-5" aria-hidden="true"/></span>
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
          Customisation is Pro only
          <span className="rounded-full bg-primary px-2 py-px text-[10px] font-bold uppercase tracking-[0.08em] text-primary-foreground">Pro</span>
        </p>
        <p className="mt-1 text-[13px] leading-normal text-muted-foreground">Try any combination below to preview it. Saving a style to your name needs Pro, which comes with a one-time donation.</p>
      </div>
      <Link href="/pro" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
        <Crown className="size-4" aria-hidden="true"/>See Pro
      </Link>
    </div>}

    {error && <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300" role="alert">{error}</p>}

    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[999_1_420px] flex-col gap-5">
        <PickerCard title="Icon" hint="Sits after your name wherever it's styled.">
          {(labelId) => <div role="radiogroup" aria-labelledby={labelId}>
            {iconGroups.map((group) => <Group key={group.label} label={group.label} animated={group.animated}>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.keys.map(([key, icon]) => <label key={key} title={icon.label} className={cn(tile, "grid size-11 place-items-center text-xl")}>
                  <input type="radio" name="name-icon" value={key} checked={draft.icon === key} onChange={() => set({ icon: key as NameIcon })} className="sr-only"/>
                  {key === "none" ? <Ban className="size-[18px] text-muted-foreground" aria-hidden="true"/> : <NameStyleIcon icon={key} className="m-0 align-middle"/>}
                  <span className="sr-only">{icon.label}</span>
                </label>)}
              </div>
            </Group>)}
          </div>}
        </PickerCard>

        <PickerCard title="Font" hint="Changes the lettering of your display name.">
          {(labelId) => <div role="radiogroup" aria-labelledby={labelId} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {entries(nameFonts).map(([key, font]) => <label key={key} className={cn(tile, "px-3.5 pb-2.5 pt-3")}>
              <input type="radio" name="name-font" value={key} checked={draft.font === key} onChange={() => set({ font: key as NameFont })} className="sr-only"/>
              <span className="block truncate text-lg font-bold leading-tight tracking-[-0.02em]"><span className={nameTextClassName({ font: key as NameFont, effect: draft.effect })}>{sample}</span></span>
              <span className="mt-1 block text-xs text-muted-foreground">{font.label}</span>
            </label>)}
          </div>}
        </PickerCard>

        <PickerCard title="Effect" hint="Colour and motion for your name. Animations stay still if your device asks for reduced motion.">
          {(labelId) => <div role="radiogroup" aria-labelledby={labelId}>
            {effectGroups.map((group) => <Group key={group.label} label={group.label} animated={group.animated}>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.keys.map(([key, effect]) => <label key={key} className={cn(tile, "px-3.5 pb-2.5 pt-3")}>
                  <input type="radio" name="name-effect" value={key} checked={draft.effect === key} onChange={() => set({ effect: key as NameEffect })} className="sr-only"/>
                  <span className="block truncate text-lg font-bold leading-tight tracking-[-0.02em]"><span className={nameTextClassName({ font: draft.font, effect: key as NameEffect })}>{sample}</span></span>
                  <span className="mt-1 block text-xs text-muted-foreground">{effect.label}</span>
                </label>)}
              </div>
            </Group>)}
          </div>}
        </PickerCard>
      </div>

      <aside className="min-w-0 flex-[1_1_260px] lg:sticky lg:top-[84px]" aria-label="Name style preview">
        <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500"/>Live preview</p>
        <div className={cn(card, "mt-3 overflow-hidden")}>
          <div className="p-5">
            {/* Clerk serves the user's uploaded image; a native image supports its signed URL. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.imageUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover ring-1 ring-border"/>
            <RoleLabel role={role} className="mt-3.5 rounded-full bg-muted px-2 py-0.5 text-[11px]"/>
            <p className="mt-2 text-[26px] font-bold leading-[1.15] tracking-[-0.04em] [overflow-wrap:anywhere]"><StyledName name={name || username || "Your name"} style={draft}/></p>
            <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">@{username || "username"}</p>
          </div>
          <div className="border-t bg-muted/60 px-5 py-3">
            <p className={kicker}>Account menu</p>
            <p className="mt-1.5 truncate text-sm font-semibold"><StyledName name={username || name || "Your name"} style={draft}/></p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-normal text-muted-foreground">Shown on your public profile and in your account menu.</p>
        {!isDefaultNameStyle(draft) && <button type="button" onClick={() => set(defaultNameStyle)} className="mt-2 inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Reset to standard</button>}
      </aside>
    </div>

    {dirty && <div className="sticky bottom-5 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[hsl(210_10%_15%)] py-2.5 pl-[18px] pr-2.5 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)] dark:border dark:bg-card">
      <p className="flex items-center gap-2 text-sm"><span className="size-[7px] rounded-full bg-[hsl(356_84%_60%)]"/>{pro ? "You have unsaved changes" : "Preview only. Saving needs Pro."}</p>
      <div className="flex gap-2">
        <button type="button" disabled={saving} className="h-9 rounded-lg px-3.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10" onClick={() => { setDraft(saved); setError(""); }}>Discard</button>
        {pro
          ? <button type="button" disabled={saving} onClick={save} className="h-9 rounded-lg bg-[hsl(356_84%_48%)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[hsl(356_84%_42%)] disabled:cursor-wait disabled:opacity-60">{saving ? "Saving…" : "Save style"}</button>
          : <Link href="/pro" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[hsl(356_84%_48%)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[hsl(356_84%_42%)]"><Crown className="size-3.5" aria-hidden="true"/>Get Pro</Link>}
      </div>
    </div>}
  </div>;
}
