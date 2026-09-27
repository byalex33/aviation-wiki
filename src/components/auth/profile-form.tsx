"use client";
import { useClerk, useReverification, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRef, useState } from "react";
import type { EmailAddressResource } from "@clerk/shared/types";
import { AuthField } from "./auth-field";
import { ProfileWorkspace, ProfileSkeleton, type ProfileSection } from "./profile-workspace";
import profile from "./profile.module.css";
import { Reverification, type ReverificationRequest } from "./reverification";
import { authError } from "@/lib/auth-ui";
import styles from "./auth.module.css";

export function ProfileForm() {
  const { user, isLoaded } = useUser();
  if (!isLoaded) return <ProfileSkeleton/>;
  if (!user) return <Link href="/sign-in?redirect_url=%2Fsettings%2Fprofile" className={styles.link}>Sign in to manage your account</Link>;
  return <ProfileEditor key={user.id}/>;
}
function ProfileEditor() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [section, setSection] = useState<ProfileSection>("profile");
  const [username, setUsername] = useState(user?.username || "");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState<EmailAddressResource | null>(null);
  const [code, setCode] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reverification, setReverification] = useState<ReverificationRequest | null>(null);
  const protectedAction = useReverification((action: () => Promise<unknown>) => action(), { onNeedsReverification: setReverification });
  const createEmail = useReverification((email: string) => user!.createEmailAddress({ email }), { onNeedsReverification: setReverification });
  const fileInput = useRef<HTMLInputElement>(null);
  const resendAt = useRef(0);

  async function run(action: () => Promise<void>, success: string) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setMessage("");
    try { await action(); setMessage(success); }
    catch (err) { setError(authError(err)); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!user) return null;
  return <ProfileWorkspace section={section} onSectionChange={setSection} username={user.username || ""} imageUrl={user.imageUrl} busy={busy} onSignOut={() => void run(async () => { await signOut({ redirectUrl: "/" }); }, "Signed out.")}>
    <div aria-live="polite">{message && <p className={`${styles.notice} mt-4`}>{message}</p>}</div>
    {error && <p className={`${styles.error} mt-4`} role="alert">{error}</p>}
    {reverification && <Reverification request={reverification} onClose={() => setReverification(null)}/>}
    <fieldset disabled={busy} className={profile.editor} aria-busy={busy}>
      <div className={profile.panel} hidden={section !== "profile"}><div className={profile.profileGrid}><div>
      <section className={profile.section}>
        <h2>Profile photo</h2><p className={styles.hint}>A familiar face next to your contributions.</p><div className={profile.photo}>
          {/* Clerk serves the user's uploaded image; a native image supports its signed URL. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.imageUrl} alt="Your profile photo" width={64} height={64} className="size-16 object-cover"/>
          <label className={profile.upload}>Change photo<input aria-label="Upload a photo" ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void run(async () => {
              if (file.size > 5 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
              await protectedAction(() => user.setProfileImage({ file }));
              if (fileInput.current) fileInput.current.value = "";
            }, "Profile photo updated.");
          }}/></label>
        </div><p className={styles.hint}>JPG, PNG, or WebP. Up to 5 MB.</p>
      </section>
      <form className={`${profile.form} ${profile.section}`} onSubmit={(event) => { event.preventDefault(); void run(async () => { await protectedAction(() => user.update({ username: username.trim() })); }, "Username saved."); }}>
        <div><h2>Username</h2><p className={styles.hint}>Your name on your public profile and contributions.</p></div>
        <AuthField label="Username" autoComplete="username" value={username} onChange={setUsername} required minLength={4} maxLength={64}/>
        <button type="submit" className={styles.button}>{busy ? "Saving…" : "Save username"}</button>
        {user.username && <Link className={styles.link} href={`/profile/${encodeURIComponent(user.username)}`}>View public profile</Link>}
      </form>
      </div><aside className={profile.preview} aria-label="Public profile preview"><p className={profile.eyebrow}>Public profile preview</p><div className={profile.previewBody}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.imageUrl} alt="" width={56} height={56}/><h2>{username.trim() || "Your username"}</h2><p>Aviation.wiki member</p><p className={profile.previewNote}>Your photo and username are public. Your email addresses stay private.</p>
      </div></aside></div></div>
      <div className={profile.panel} hidden={section !== "email"}>
      <section className={profile.section}>
        <h2>Your email addresses</h2>
        {user.emailAddresses.map((address) => <div key={address.id} className={profile.address}>
          <div><p className="break-all text-sm">{address.emailAddress}</p>
          <p className={profile.badge}>{address.id === user.primaryEmailAddressId ? "Primary email" : address.verification.status === "verified" ? "Verified" : "Not verified"}</p></div>
          {address.id !== user.primaryEmailAddressId && address.verification.status === "verified" && <button className={styles.link} onClick={() => void run(async () => { await protectedAction(() => user.update({ primaryEmailAddressId: address.id })); }, "Primary email updated.")}>Make primary</button>}
          {address.verification.status !== "verified" && <button className={styles.link} onClick={() => void run(async () => { setPendingEmail(address); await address.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000; }, "Verification code sent.")}>Verify email</button>}
        </div>)}
      </section><section className={profile.section}><h2>Add an email address</h2><p className={`${styles.hint} mb-5`}>We will send a code to confirm it belongs to you.</p>
        <form className={profile.form} onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (pendingEmail) {
            const verified = await pendingEmail.attemptVerification({ code });
            if (verified.verification.status !== "verified") throw new Error("Email verification is not complete. Please try again.");
            await user.reload(); setPendingEmail(null); setEmail(""); setCode("");
          } else {
            const address = await createEmail(email.trim());
            setPendingEmail(address); await address.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000;
          }
        }, pendingEmail ? "Email verified. You can now make it your primary address." : "Verification code sent."); }}>
          {pendingEmail ? <><p className={styles.hint}>Enter the code sent to {pendingEmail.emailAddress}.</p><AuthField label="Verification code" autoComplete="one-time-code" inputMode="numeric" value={code} onChange={setCode} required/></> : <AuthField label="New email address" type="email" autoComplete="email" value={email} onChange={setEmail} required/>}
          <button type="submit" className={`${styles.button} ${styles.secondary}`}>{pendingEmail ? "Verify email" : "Add email address"}</button>
          {pendingEmail && <><button className={styles.link} type="button" onClick={() => void run(async () => { if (Date.now() < resendAt.current) throw new Error("Please wait 30 seconds between code requests."); await pendingEmail.prepareVerification({ strategy: "email_code" }); resendAt.current = Date.now() + 30000; }, "A new code has been sent.")}>Send a new code</button><button className={styles.link} type="button" onClick={() => { setPendingEmail(null); setCode(""); }}>Cancel verification</button></>}
        </form>
      </section>
      </div><div className={profile.panel} hidden={section !== "security"}>
      <section className={profile.section}>
        <h2>{user.passwordEnabled ? "Change password" : "Set a password"}</h2>
        <form className={profile.form} onSubmit={(event) => { event.preventDefault(); void run(async () => {
          if (newPassword !== confirmation) throw new Error("The new passwords do not match.");
          await protectedAction(() => user.updatePassword({ currentPassword: user.passwordEnabled ? currentPassword : undefined, newPassword, signOutOfOtherSessions: true }));
          setCurrentPassword(""); setNewPassword(""); setConfirmation("");
        }, "Password updated. Other sessions have been signed out."); }}>
          {user.passwordEnabled && <AuthField label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} required/>}
          <AuthField label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={setNewPassword} required passwordAdvice/>
          <AuthField label="Confirm new password" type="password" autoComplete="new-password" value={confirmation} onChange={setConfirmation} required/>
          <p className={styles.hint}>Saving a password signs you out on other devices.</p>
          <button type="submit" className={`${styles.button} ${styles.secondary}`}>Save password</button>
        </form>
      </section>
      </div><div className={profile.panel} hidden={section !== "connections"}>
      <section className={profile.section}>
        <h2>Sign-in providers</h2>
        {user.externalAccounts.length ? user.externalAccounts.map((account) => <p key={account.id} className={profile.address}>{account.provider.replaceAll("_", " ")} · {account.emailAddress}</p>) : <p className={styles.hint}>You have no connected accounts. You can sign in with your email address.</p>}
      </section>
      </div>
    </fieldset>
  </ProfileWorkspace>;
}
