"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, KeyRound, Link2, LogOut, Mail, Palette, Shield, UserRound, type LucideIcon } from "lucide-react";

import { roleStyles } from "@/components/role-username";
import { StyledName } from "@/components/styled-name";
import type { NameStyle } from "@/lib/name-style";
import { cn } from "@/lib/utils";
import { wikiRoleDetails, wikiRoles, type WikiRole } from "@/lib/wiki-roles";
import { profileSections, type ProfileSection } from "./profile-sections";

export { profileSections, type ProfileSection } from "./profile-sections";

const sectionIcons: Record<ProfileSection, LucideIcon> = {
  profile: UserRound,
  email: Mail,
  security: Shield,
  customise: Palette,
  keys: KeyRound,
  connections: Link2,
};

export function normalizeRole(value: unknown): WikiRole {
  return wikiRoles.includes(value as WikiRole) ? (value as WikiRole) : "contributor";
}

export function RoleLabel({ role, className }: { role: WikiRole; className?: string }) {
  const treatment = role === "contributor" ? null : roleStyles[role];
  const Icon = treatment?.Icon;
  return <span className={cn("inline-flex items-center gap-1 font-semibold", treatment?.className ?? "text-muted-foreground", className)}>
    {Icon && <Icon className="size-[1.1em] shrink-0" aria-hidden="true"/>}
    {wikiRoleDetails[role].label}
  </span>;
}

export function ProfileWorkspace({ section, onSectionChange, name, username, imageUrl, role, nameStyle, busy, onSignOut, children }: {
  section: ProfileSection; onSectionChange: (section: ProfileSection) => void;
  name: string; username: string; imageUrl: string; role: WikiRole; nameStyle?: NameStyle | null;
  busy: boolean; onSignOut: () => void; children: ReactNode;
}) {
  const current = profileSections[section];
  return <main className="mx-auto w-full max-w-[1160px] px-5 pb-24 pt-7 sm:px-6">
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
      <Link href="/" className="transition-colors hover:text-primary">aviation.wiki</Link>
      <span className="text-foreground/20" aria-hidden="true">/</span>
      <span className="text-foreground" aria-current="page">Account settings</span>
    </nav>

    <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
      <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-[84px] lg:w-[240px] lg:shrink-0">
        <div className="flex items-center gap-3">
          {/* Clerk serves the user's uploaded image; a native image supports its signed URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="" width={44} height={44} className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border"/>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.02em]"><StyledName name={name || username || "Your account"} style={nameStyle}/></p>
            <RoleLabel role={role} className="mt-0.5 text-xs"/>
          </div>
        </div>
        <nav aria-label="Account settings" className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-0">
          {(Object.keys(profileSections) as ProfileSection[]).map((key) => {
            const Icon = sectionIcons[key];
            const active = key === section;
            return <button key={key} type="button" aria-current={active ? "page" : undefined} onClick={() => onSectionChange(key)}
              className={cn(
                "flex min-h-10 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-border bg-card font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)]" : "border-transparent font-medium text-foreground/70 hover:bg-muted hover:text-foreground",
              )}>
              <Icon className={cn("size-4 shrink-0", active && "text-primary")} aria-hidden="true"/>
              {profileSections[key].label}
              {"pro" in profileSections[key] && <span className="ml-auto rounded-full border border-primary/30 px-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-primary">Pro</span>}
            </button>;
          })}
        </nav>
        <div className="flex gap-1 border-t pt-4 lg:flex-col lg:gap-0.5">
          {username && <Link href={`/profile/${encodeURIComponent(username)}`} className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-foreground/70 transition-colors hover:bg-muted hover:text-foreground">
            <ArrowUpRight className="size-4" aria-hidden="true"/>View public profile
          </Link>}
          <button type="button" disabled={busy} onClick={onSignOut} className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-400/10">
            <LogOut className="size-4" aria-hidden="true"/>Sign out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Account settings</p>
          <h1 className="mt-2 text-3xl font-bold leading-[1.1] tracking-[-0.045em] sm:text-[34px]">{current.label}</h1>
          <p className="mt-2 max-w-[620px] text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">{current.description}</p>
        </header>
        {children}
      </div>
    </div>
  </main>;
}

export function ProfileSkeleton() {
  return <main className="mx-auto w-full max-w-[1160px] px-5 pb-24 pt-7 sm:px-6" aria-busy="true" aria-label="Loading account settings" role="status">
    <div className="h-3 w-40 rounded bg-muted"/>
    <div className="mt-5 flex flex-col gap-8 lg:flex-row lg:gap-10">
      <div className="flex flex-col gap-3 lg:w-[240px]"><div className="h-11 rounded-full bg-muted lg:w-11"/>{[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 rounded-lg bg-muted"/>)}</div>
      <div className="flex-1"><div className="h-9 w-64 rounded bg-muted"/><div className="mt-3 h-4 w-96 max-w-full rounded bg-muted"/><div className="mt-7 h-80 rounded-2xl bg-muted"/></div>
    </div>
    <span className="sr-only">Loading account settings</span>
  </main>;
}
