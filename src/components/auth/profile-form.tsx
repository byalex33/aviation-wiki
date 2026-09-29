"use client";
import { useClerk, useReverification, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import type { EmailAddressResource } from "@clerk/shared/types";
import { Lock, Mail, Upload } from "lucide-react";
import { toast } from "sonner";
import { AuthField } from "./auth-field";
import { ProfileWorkspace, ProfileSkeleton, RoleLabel, normalizeRole, type ProfileSection } from "./profile-workspace";
import { Reverification, type ReverificationRequest } from "./reverification";
import { SettingsInput, SettingsRow } from "./settings-field";
import { NameStylePanel } from "./name-style-panel";
import { StyledName } from "@/components/styled-name";
import { nameStyleFromMetadata } from "@/lib/name-style";
import { hasPro } from "@/lib/pro";
import { authError } from "@/lib/auth-ui";
import { cn } from "@/lib/utils";
import styles from "./auth.module.css";
import { closeAccountAction } from "@/app/settings/profile/actions";

type ContributionStats = { approvedCount: number; articleCount: number } | null;
type ProfileFormProps = { initialSection?: ProfileSection; apiKeys?: ReactNode; stats?: ContributionStats };

const card = "rounded-2xl border bg-card";
const primaryButton = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50";
const darkButton = "inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/85 disabled:cursor-not-allowed disabled:opacity-50";
const outlineButton = "inline-flex h-[34px] items-center rounded-lg border px-3 text-[13px] font-medium transition-colors hover:bg-muted";
const dangerButton = "inline-flex h-[34px] items-center rounded-lg px-2.5 text-[13px] font-medium text-red-700 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-400/10";
const quietButton = "inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const collapseSpaces = (value: string) => value.replace(/\s+/g, " ").trim();

export function ProfileForm({ initialSection = "profile", apiKeys, stats = null }: ProfileFormProps = {}) {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <ProfileSkeleton/>;
  if (!user) return <Link href="/sign-in?redirect_url=%2Fsettings%2Fprofile" className={styles.link}>Sign in to manage your account</Link>;
  return <ProfileEditor key={`${user.id}:${initialSection}`} initialSection={initialSection} apiKeys={apiKeys} stats={stats}/>;
}
function ProfileEditor({ initialSection = "profile", apiKeys, stats = null }: ProfileFormProps = {}) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const savedName = user?.fullName || "";
  const savedUsername = user?.username || "";
  const [section, setSection] = useState<ProfileSection>(initialSection);
  const [name, setName] = useState(savedName);
  const [username, setUsername] = useState(savedUsername);
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<EmailAddressResource | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accountAction, setAccountAction] = useState<"deactivate" | "delete" | null>(null);
  const [accountConfirmation, setAccountConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [reverification, setReverification] = useState<ReverificationRequest | null>(null);
  const protectedAction = useReverification((action: () => Promise<unknown>) => action(), { onNeedsReverification: setReverification });
  const createEmail = useReverification((email: string) => user!.createEmailAddress({ email }), { onNeedsReverification: setReverification });
  const closeAccount = useReverification(closeAccountAction, { onNeedsReverification: setReverification });
  const fileInput = useRef<HTMLInputElement>(null);
  const resendAt = useRef(0);

  async function run(action: () => Promise<void>, success: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try { await action(); toast.success(success); }
    catch (err) { setError(authError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  function changeSection(next: ProfileSection) {
    setSection(next); setError("");
    if (typeof window !== "undefined") window.history.replaceState(null, "", next === "profile" ? "/settings/profile" : `/settings/profile?section=${next}`);
  }
  if (!user) return null;

  const trimmedUsername = username.trim();
  const usernameError = trimmedUsername.length < 4 || trimmedUsername.length > 64;
  const nameChanged = collapseSpaces(name) !== collapseSpaces(savedName);
  const usernameChanged = trimmedUsername !== savedUsername;
  const dirty = nameChanged || usernameChanged;
  const role = normalizeRole(user.publicMetadata?.role);
  const previewName = collapseSpaces(name) || trimmedUsername || "Your name";
  const nameStyle = nameStyleFromMetadata(user.publicMetadata);

  return <ProfileWorkspace section={section} onSectionChange={changeSection} name={savedName} username={savedUsername} imageUrl={user.imageUrl} role={role} nameStyle={nameStyle} busy={busy} onSignOut={() => void run(async () => { await signOut({ redirectUrl: "/" }); }, "Signed out.")}>
    {error && <p className="mt-6 max-w-[720px] rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-300" role="alert">{error}</p>}
    {reverification && <div className={cn(card, "mt-6 max-w-[520px] p-6")}><Reverification request={reverification} onClose={() => setReverification(null)}/></div>}
    <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0" aria-busy={busy}>
      <div className="mt-7" hidden={section !== "profile"}>
      <form onSubmit={(event) => { event.preventDefault(); if (!dirty || usernameError) return; void run(async () => {
        const updates: { username?: string; firstName?: string; lastName?: string } = {};
        if (usernameChanged) updates.username = trimmedUsername;
        if (nameChanged) { const [firstName = "", ...rest] = collapseSpaces(name).split(" "); updates.firstName = firstName; updates.lastName = rest.join(" "); }
        if (Object.keys(updates).length) await protectedAction(() => user.update(updates));
        setName(collapseSpaces(name)); setUsername(trimmedUsername);
      }, "Profile saved."); }}>
        <div className="flex flex-wrap items-start gap-6">
          <div className={cn(card, "min-w-0 flex-[999_1_420px]")}>
            <SettingsRow title="Photo" hint="Shown next to your contributions.">
              <div className="flex flex-wrap items-center gap-4">
                {/* Clerk serves the user's uploaded image; a native image supports its signed URL. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.imageUrl} alt="Your profile photo" width={64} height={64} className="size-16 rounded-full object-cover ring-1 ring-border"/>
                <div>
                  <div className="flex gap-2">
                    <label className={cn(outlineButton, "h-9 cursor-pointer gap-1.5 bg-card focus-within:ring-2 focus-within:ring-ring")}>
                      <Upload className="size-3.5" aria-hidden="true"/>Upload new
                      <input aria-label="Upload a photo" ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        void run(async () => {
                          if (fileInput.current) fileInput.current.value = "";
                          if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
                          await protectedAction(() => user.setProfileImage({ file }));
                        }, "Profile photo updated.");
                      }}/>
                    </label>
                    {user.hasImage && <button type="button" className={quietButton} onClick={() => void run(async () => { await protectedAction(() => user.setProfileImage({ file: null })); }, "Profile photo removed.")}>Remove</button>}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">JPG, PNG, or WebP. Up to 5 MB.</p>
                </div>
              </div>
            </SettingsRow>
            <SettingsRow title="Display name" hint="The name at the top of your profile.">
              <SettingsInput label="Display name" hideLabel autoComplete="name" value={name} onChange={setName} maxLength={128}/>
            </SettingsRow>
            <SettingsRow title="Username" hint="Credited on every edit and used in your profile link.">
              <SettingsInput label="Username" hideLabel prefix="aviation.wiki/profile/" autoComplete="username" autoCapitalize="off" spellCheck={false} value={username} onChange={(value) => setUsername(value.replace(/\s/g, ""))} required minLength={4} maxLength={64}
                aria-invalid={usernameError || undefined}
                hint={usernameError ? <span className="text-red-700 dark:text-red-400">Usernames need 4–64 characters.</span> : usernameChanged ? "Changing it updates your profile link. Old links stop working." : null}/>
            </SettingsRow>
          </div>
          <aside className="min-w-0 flex-[1_1_260px] lg:sticky lg:top-[84px]" aria-label="Public profile preview">
            <p className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500"/>Live preview</p>
            <div className={cn(card, "mt-3 overflow-hidden")}>
              <div className="p-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={user.imageUrl} alt="" width={56} height={56} className="size-14 rounded-full object-cover ring-1 ring-border"/>
                <RoleLabel role={role} className="mt-3.5 rounded-full bg-muted px-2 py-0.5 text-[11px]"/>
                <p className="mt-2 text-[22px] font-bold leading-[1.15] tracking-[-0.04em] [overflow-wrap:anywhere]"><StyledName name={previewName} style={nameStyle}/></p>
                <p className="mt-1 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">@{trimmedUsername || "username"}</p>
              </div>
              {stats && <dl className="grid grid-cols-2 border-t bg-muted/60">
                <div className="border-r px-5 py-3"><dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Approved</dt><dd className="mt-1 text-lg font-bold tracking-[-0.04em]">{stats.approvedCount.toLocaleString("en")}</dd></div>
                <div className="px-5 py-3"><dt className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Articles</dt><dd className="mt-1 text-lg font-bold tracking-[-0.04em]">{stats.articleCount.toLocaleString("en")}</dd></div>
              </dl>}
            </div>
            <p className="mt-3 flex gap-2 text-xs leading-normal text-muted-foreground"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true"/>Photo, name and username are public. Email addresses always stay private.</p>
          </aside>
        </div>
        {dirty && <div className="sticky bottom-5 z-20 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[hsl(210_10%_15%)] py-2.5 pl-[18px] pr-2.5 text-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)] dark:border dark:bg-card">
          <p className="flex items-center gap-2 text-sm"><span className="size-[7px] rounded-full bg-[hsl(356_84%_60%)]"/>You have unsaved changes</p>
          <div className="flex gap-2">
            <button type="button" className="h-9 rounded-lg px-3.5 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10" onClick={() => { setName(savedName); setUsername(savedUsername); }}>Discard</button>
            <button type="submit" disabled={usernameError} className="h-9 rounded-lg bg-[hsl(356_84%_48%)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[hsl(356_84%_42%)] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </div>}
      </form>
      <section aria-labelledby="danger-zone-heading" className="mt-7 max-w-[720px] rounded-2xl border border-red-300 dark:border-red-400/30">
        <div className="border-b border-red-200 p-6 dark:border-red-400/20">
          <h2 id="danger-zone-heading" className="text-[15px] font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Both actions sign you out on all devices and revoke your API keys. Published contributions and their attribution remain.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div className="flex-[1_1_300px]"><h3 className="text-sm font-semibold">Deactivate account</h3><p className="mt-1 text-[13px] text-muted-foreground">Hide your profile and disable sign-in. Your account is kept. Contact <a href="mailto:contact@aviation.wiki" className="underline underline-offset-2">contact@aviation.wiki</a> to reactivate it.</p></div>
          <button type="button" className={cn(outlineButton, "text-red-700 dark:text-red-400")} onClick={() => { setAccountAction("deactivate"); setAccountConfirmation(""); }}>Deactivate account</button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-red-200 p-6 dark:border-red-400/20">
          <div className="flex-[1_1_300px]"><h3 className="text-sm font-semibold">Delete account</h3><p className="mt-1 text-[13px] text-muted-foreground">Permanently remove your login account and public profile. This cannot be undone. This does not erase retained contribution or transaction records.</p></div>
          <button type="button" className={dangerButton} onClick={() => { setAccountAction("delete"); setAccountConfirmation(""); }}>Delete account</button>
        </div>
        {accountAction && <form className="border-t border-red-200 p-6 dark:border-red-400/20" onSubmit={(event) => {
          event.preventDefault();
          if (accountConfirmation !== accountAction.toUpperCase()) return;
          void run(async () => {
            const result = await closeAccount(accountAction, accountConfirmation);
            if (!result) throw new Error("Account change cancelled.");
            if (result.error) throw new Error(result.error);
            await signOut({ redirectUrl: "/" });
          }, accountAction === "delete" ? "Account deleted." : "Account deactivated.");
        }}>
          <SettingsInput label={`Type ${accountAction.toUpperCase()} to confirm`} value={accountConfirmation} onChange={setAccountConfirmation} autoComplete="off" spellCheck={false} required/>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" disabled={accountConfirmation !== accountAction.toUpperCase()} className={cn(primaryButton, "bg-red-700 text-white hover:bg-red-800")}>{busy ? "Working…" : accountAction === "delete" ? "Permanently delete account" : "Confirm deactivation"}</button>
            <button type="button" className={quietButton} onClick={() => { setAccountAction(null); setAccountConfirmation(""); }}>Cancel</button>
          </div>
        </form>}
      </section>
      </div>

      <div className="mt-7 flex max-w-[720px] flex-col gap-5" hidden={section !== "email"}>
        <div className={card}>
          {user.emailAddresses.map((address) => {
            const primary = address.id === user.primaryEmailAddressId;
            const verified = address.verification.status === "verified";
            return <div key={address.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-5 py-[18px] first:border-t-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted"><Mail className="size-4 text-muted-foreground" aria-hidden="true"/></span>
              <div className="min-w-0 flex-[1_1_220px]">
                <p className="text-sm font-medium [overflow-wrap:anywhere]">{address.emailAddress}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {primary && <span className="rounded-md bg-primary/10 px-[7px] py-0.5 text-[11px] font-semibold text-primary">Primary</span>}
                  {verified
                    ? <span className="rounded-md bg-emerald-50 px-[7px] py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300">Verified</span>
                    : <span className="rounded-md bg-amber-50 px-[7px] py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">Not verified</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                {!primary && verified && <button type="button" className={outlineButton} onClick={() => void run(async () => { await protectedAction(() => user.update({ primaryEmailAddressId: address.id })); }, "Primary email updated.")}>Make primary</button>}
                {!verified && <button type="button" className={outlineButton} onClick={() => void run(async () => { setPendingEmail(address); setCode(""); await address.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000; }, "Verification code sent.")}>Verify</button>}
                {!primary && <button type="button" className={dangerButton} onClick={() => void run(async () => { await protectedAction(() => address.destroy()); if (pendingEmail?.id === address.id) { setPendingEmail(null); setCode(""); } await user.reload(); }, "Email address removed.")}>Remove</button>}
              </div>
            </div>;
          })}
        </div>
        <div className={cn(card, "p-6")}>
          <h2 className="text-[15px] font-semibold">Add an email address</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">{pendingEmail ? <>Enter the code sent to <strong className="font-semibold text-foreground">{pendingEmail.emailAddress}</strong>.</> : "We'll send a 6-digit code to confirm it belongs to you."}</p>
          <form className="mt-3.5" onSubmit={(event) => { event.preventDefault(); void run(async () => {
            if (pendingEmail) {
              const verified = await pendingEmail.attemptVerification({ code });
              if (verified.verification.status !== "verified") throw new Error("Email verification is not complete. Please try again.");
              await user.reload(); setPendingEmail(null); setEmail(""); setCode("");
            } else {
              const address = await createEmail(email.trim());
              setPendingEmail(address); await address.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000;
            }
          }, pendingEmail ? "Email verified. You can now make it your primary address." : "Verification code sent."); }}>
            {pendingEmail ? <>
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40"><SettingsInput label="Verification code" hideLabel autoComplete="one-time-code" inputMode="numeric" placeholder="000000" value={code} onChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))} required maxLength={6} className="font-mono text-base tracking-[0.3em]"/></div>
                <button type="submit" className={primaryButton} disabled={code.length !== 6}>Verify email</button>
                <button type="button" className={cn(quietButton, "h-10")} onClick={() => { setPendingEmail(null); setCode(""); }}>Cancel</button>
              </div>
              <button type="button" className="mt-2.5 text-xs text-muted-foreground underline underline-offset-[3px] hover:text-foreground" onClick={() => void run(async () => { if (Date.now() < resendAt.current) throw new Error("Please wait 30 seconds between code requests."); await pendingEmail.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000; }, "A new code has been sent.")}>Send a new code</button>
            </> : <div className="flex flex-wrap items-end gap-2">
              <div className="flex-[1_1_260px]"><SettingsInput label="New email address" hideLabel type="email" autoComplete="email" placeholder="name@example.com" value={email} onChange={setEmail} required/></div>
              <button type="submit" className={darkButton}>Send code</button>
            </div>}
          </form>
        </div>
      </div>

      <div className={cn(card, "mt-7 max-w-[720px]")} hidden={section !== "security"}>
        <div className="border-b p-6">
          <h2 className="text-[15px] font-semibold">{user.passwordEnabled ? "Change password" : "Set a password"}</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Saving a new password signs you out on every other device.</p>
        </div>
        <form className="flex max-w-[460px] flex-col gap-[18px] p-6" onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (newPassword !== confirmation) throw new Error("The new passwords do not match.");
          await protectedAction(() => user.updatePassword({ currentPassword: user.passwordEnabled ? currentPassword : undefined, newPassword, signOutOfOtherSessions: true }));
          setCurrentPassword(""); setNewPassword(""); setConfirmation("");
        }, "Password updated. Other devices have been signed out."); }}>
          {user.passwordEnabled && <AuthField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} required/>}
          <AuthField label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} required passwordAdvice/>
          <div>
            <AuthField label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} required/>
            {confirmation && confirmation !== newPassword && <p className="mt-1.5 text-xs text-red-700 dark:text-red-400">Passwords don&apos;t match yet.</p>}
          </div>
          <button type="submit" className={cn(primaryButton, "self-start")}>Save password</button>
        </form>
      </div>

      <div className="mt-7 flex max-w-[720px] flex-col gap-3" hidden={section !== "connections"}>
        {user.externalAccounts.length ? <div className={card}>
          {user.externalAccounts.map((account) => {
            const provider = account.provider.replaceAll("_", " ");
            return <div key={account.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t px-5 py-[18px] first:border-t-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold uppercase text-foreground/70" aria-hidden="true">{provider.slice(0, 1)}</span>
              <div className="min-w-0 flex-[1_1_220px]"><p className="text-sm font-semibold capitalize">{provider}</p><p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">{account.emailAddress}</p></div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-500"/>Connected</span>
            </div>;
          })}
        </div> : <p className="rounded-2xl border border-dashed p-6 text-center text-[13px] text-muted-foreground">No connected accounts yet.</p>}
        <p className="text-[13px] text-muted-foreground">You can always sign in with your primary email address as well.</p>
      </div>
    </fieldset>
    <div className="mt-7" hidden={section !== "customise"}><NameStylePanel user={user} name={savedName} username={savedUsername} role={role} pro={hasPro(user.publicMetadata)}/></div>
    <div className="mt-7" hidden={section !== "keys"}>{apiKeys}</div>
  </ProfileWorkspace>;
}
