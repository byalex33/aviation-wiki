"use client";

import { TaskChooseOrganization, TaskResetPassword, TaskSetupMFA, useClerk, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authDestination, authError, checked } from "@/lib/auth-ui";
import { AuthField } from "./auth-field";
import { AuthSkeleton } from "./auth-shell";
import styles from "./auth.module.css";

type Step = "credentials" | "email" | "signup-email" | "recovery" | "reset-code" | "new-password" | "mfa" | "welcome";
type Factor = "totp" | "backup_code" | "email_code" | "phone_code";

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const router = useRouter();
  const params = useSearchParams();
  const requestedDestination = params.get("redirect_url") || params.get("redirect");
  const destination = authDestination(requestedDestination, mode === "sign-up" ? "/?welcome=signup" : "/");
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [factor, setFactor] = useState<Factor>("totp");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const resumed = useRef(false);
  const signup = mode === "sign-up";

  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => {
    if (isLoaded && isSignedIn && !clerk.session?.currentTask && step !== "welcome") router.replace(destination);
  }, [isLoaded, isSignedIn, clerk.session, router, destination, step]);

  useEffect(() => {
    if (!isLoaded || resumed.current || isSignedIn) return;
    resumed.current = true;
    if (!signup && ["complete", "needs_second_factor", "needs_client_trust", "needs_new_password"].includes(signIn.status || "")) {
      void run(advanceSignIn);
    } else if (!signup && signIn.firstFactorVerification.strategy === "email_code") {
      // SDK hydration restores an external, in-progress verification.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep("email");
    } else if (!signup && signIn.firstFactorVerification.strategy === "reset_password_email_code") {
      setStep("reset-code");
    } else if (signup && signUp.status === "complete") {
      void run(() => finalize(signUp, { celebrate: true }));
    } else if (signup && !!signUp.id && signUp.status === "missing_requirements" && signUp.missingFields.length === 0) {
      void run(advanceSignUp);
    }
    // Resume a pending OAuth or verification attempt once the SDK has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (err) { setError(authError(err)); }
    finally { lock.current = false; setBusy(false); }
  }

  async function finalize(resource: typeof signIn | typeof signUp, options: { celebrate?: boolean } = {}) {
    await checked(resource.finalize({ navigate: ({ session, decorateUrl }) => {
      if (session.currentTask) {
        setError("Your account needs an additional security step. Continue to finish setting up your account.");
        return;
      }
      if (options.celebrate) { setStep("welcome"); return; }
      window.location.assign(decorateUrl(destination));
    }}));
  }

  async function selectFactor(next: Factor) {
    setFactor(next); setCode("");
    if (next === "email_code") await checked(signIn.mfa.sendEmailCode());
    if (next === "phone_code") await checked(signIn.mfa.sendPhoneCode());
    setResendAt(Date.now() + 30000);
  }

  async function advanceSignIn() {
    setPassword(""); setCode("");
    if (signIn.status === "complete") return finalize(signIn);
    if (signIn.status === "needs_new_password") { setStep("new-password"); return; }
    if (signIn.status === "needs_second_factor" || signIn.status === "needs_client_trust") {
      setStep("mfa");
      const next = signIn.supportedSecondFactors.find((item) => item.strategy === "totp") || signIn.supportedSecondFactors[0];
      if (next && ["totp", "backup_code", "email_code", "phone_code"].includes(next.strategy)) await selectFactor(next.strategy as Factor);
      else throw new Error("This account requires a verification method that is not available here. Please contact support.");
      return;
    }
    throw new Error("Sign-in is not complete. Please try another sign-in method.");
  }

  async function advanceSignUp() {
    setPassword(""); setCode("");
    if (signUp.status === "complete") return finalize(signUp, { celebrate: true });
    if (signUp.unverifiedFields.includes("email_address")) {
      setStep("signup-email");
      await checked(signUp.verifications.sendEmailCode()); setResendAt(Date.now() + 30000); return;
    }
    throw new Error(`Please complete these account details: ${signUp.missingFields.join(", ").replaceAll("_", " ") || "required verification"}.`);
  }

  async function submit() {
    if (step === "signup-email") { await checked(signUp.verifications.verifyEmailCode({ code })); await advanceSignUp(); }
    else if (step === "email") { await checked(signIn.emailCode.verifyCode({ code })); await advanceSignIn(); }
    else if (step === "recovery") {
      await checked(signIn.create({ identifier: email.trim() }));
      await checked(signIn.resetPasswordEmailCode.sendCode()); setStep("reset-code"); setResendAt(Date.now() + 30000);
    } else if (step === "reset-code") {
      await checked(signIn.resetPasswordEmailCode.verifyCode({ code })); setCode(""); setStep("new-password");
    } else if (step === "new-password") {
      await checked(signIn.resetPasswordEmailCode.submitPassword({ password })); await advanceSignIn();
    } else if (step === "mfa") {
      if (factor === "totp") await checked(signIn.mfa.verifyTOTP({ code }));
      if (factor === "backup_code") await checked(signIn.mfa.verifyBackupCode({ code }));
      if (factor === "email_code") await checked(signIn.mfa.verifyEmailCode({ code }));
      if (factor === "phone_code") await checked(signIn.mfa.verifyPhoneCode({ code }));
      await advanceSignIn();
    } else if (signup) {
      // OAuth may return here with a verified email and a missing username.
      if (signUp.id && signUp.status === "missing_requirements") {
        await checked(signUp.update({ username: username.trim() || signUp.username || undefined, ...(password ? { password } : {}), legalAccepted: true }));
      } else await checked(signUp.password({ emailAddress: email.trim(), username: username.trim(), password, legalAccepted: true }));
      await advanceSignUp();
    } else { await checked(signIn.password({ identifier: email.trim(), password })); await advanceSignIn(); }
  }

  async function resend() {
    if (Date.now() < resendAt) { setNotice("Please wait 30 seconds between code requests."); return; }
    if (step === "signup-email") await checked(signUp.verifications.sendEmailCode());
    if (step === "email") await checked(signIn.emailCode.sendCode());
    if (step === "reset-code") await checked(signIn.resetPasswordEmailCode.sendCode());
    if (step === "mfa") await selectFactor(factor);
    setResendAt(Date.now() + 30000); setNotice("A new code has been sent.");
  }

  if (!isLoaded) return <AuthSkeleton/>;
  // Required session tasks remain a Clerk-managed safety fallback during the UI migration.
  // Rendering them here avoids redirecting back into this catch-all route indefinitely.
  if (clerk.session?.currentTask) {
    const task = clerk.session.currentTask.key;
    if (task === "reset-password") return <TaskResetPassword redirectUrlComplete={destination}/>;
    if (task === "setup-mfa") return <TaskSetupMFA redirectUrlComplete={destination}/>;
    if (task === "choose-organization") return <TaskChooseOrganization redirectUrlComplete={destination}/>;
  }
  if (isSignedIn && step !== "welcome") return <AuthSkeleton/>;
  const otherUrl = `${signup ? "/sign-in" : "/sign-up"}${requestedDestination ? `?redirect_url=${encodeURIComponent(destination)}` : ""}`;

  if (step === "welcome") {
    return <>
      <h2 ref={heading} tabIndex={-1} className={styles.heading}>You&apos;re in. Welcome aboard.</h2>
      <p className={`${styles.hint} mb-6`}>Every contributor starts at zero — here&apos;s your first milestone.</p>
      <div className={styles.milestone}>
        <div className={styles.milestoneRow}><span>Next milestone: first edit</span><span className={styles.milestoneCount}>0 / 1</span></div>
        <div className={styles.milestoneTrack}><div className={styles.milestoneFill} style={{ width: "4%" }}/></div>
      </div>
      <div className={`${styles.form} mt-5`}>
        <Link href="/contribute" className={styles.button}>Make your first edit</Link>
        <Link href="/" className={`${styles.button} ${styles.secondary}`}>Go to the homepage</Link>
      </div>
    </>;
  }

  const verifying = ["email", "signup-email", "reset-code", "mfa"].includes(step);
  const title = verifying ? "Verify your identity" : step === "recovery" ? "Reset your password" : step === "new-password" ? "Choose a new password" : signup ? "Create your account" : "Sign in";
  const continuingSignup = signup && !!signUp.id && signUp.status === "missing_requirements";
  const needsPassword = !continuingSignup || signUp.missingFields.includes("password");

  return <>
    {step === "credentials" && !continuingSignup && (
      <div role="tablist" className={styles.tabs}>
        {signup
          ? <Link href={otherUrl} role="tab" aria-selected="false" className={styles.tab}>Sign in</Link>
          : <span role="tab" aria-selected="true" className={`${styles.tab} ${styles.tabActive}`}>Sign in</span>}
        {signup
          ? <span role="tab" aria-selected="true" className={`${styles.tab} ${styles.tabActive}`}>Create account</span>
          : <Link href={otherUrl} role="tab" aria-selected="false" className={styles.tab}>Create account</Link>}
      </div>
    )}
    {step !== "credentials" && !continuingSignup && <button disabled={busy} className={styles.back} onClick={() => void run(async () => { await checked((signup ? signUp : signIn).reset()); setPassword(""); setCode(""); setStep("credentials"); })}><ArrowLeft className="size-3.5" aria-hidden="true"/>Start again</button>}
    <h2 ref={heading} tabIndex={-1} className={styles.heading}>{title}</h2>
    <p className={`${styles.hint} mb-6`}>{verifying ? step === "mfa" && factor === "totp" ? "Enter the code from your authenticator app." : step === "mfa" && factor === "backup_code" ? "Enter one of your unused backup codes." : "Enter the verification code sent to you." : signup ? "Save your research and contribute to the encyclopedia." : "Welcome back to aviation.wiki."}</p>
    {step === "credentials" && !continuingSignup && <><button disabled={busy} className={`${styles.button} ${styles.secondary}`} onClick={() => void run(async () => {
      await checked((signup ? signUp : signIn).sso({ strategy: "oauth_google", redirectCallbackUrl: `/sso-callback?redirect_url=${encodeURIComponent(destination)}`, redirectUrl: destination }));
    })}><span className={styles.googleBadge} aria-hidden="true">G</span>Continue with Google</button><div className={styles.divider}>or use your email</div></>}
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void run(submit); }}>
      <fieldset disabled={busy} className={styles.form}>
        {(step === "credentials" || step === "recovery") && !continuingSignup && <AuthField label={signup || step === "recovery" ? "Email address" : "Email address or username"} name="email" type={signup || step === "recovery" ? "email" : "text"} autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={setEmail} required/>}
        {step === "credentials" && signup && <AuthField label="Username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username || (continuingSignup ? signUp.username || "" : "")} onChange={setUsername} required minLength={4} maxLength={64}/>}
        {((step === "credentials" && needsPassword) || step === "new-password") && <AuthField key={step} label={step === "new-password" ? "New password" : "Password"} name="password" type="password" autoComplete={signup || step === "new-password" ? "new-password" : "current-password"} value={password} onChange={setPassword} required passwordAdvice={signup || step === "new-password"}/>}
        {verifying && <AuthField label={factor === "backup_code" && step === "mfa" ? "Backup code" : "Verification code"} name="code" autoComplete="one-time-code" inputMode={factor === "backup_code" && step === "mfa" ? "text" : "numeric"} value={code} onChange={setCode} required/>}
        {signup && step === "credentials" && <p className={styles.hint}>By creating an account, you agree to our <Link href="/terms" className={styles.link}>terms of service</Link> and acknowledge our <Link href="/privacy" className={styles.link}>privacy policy</Link>.</p>}
        <button className={styles.button} type="submit">{busy ? "Please wait…" : verifying ? "Verify and continue" : step === "recovery" ? "Send reset code" : step === "new-password" ? "Save new password" : signup ? "Create account" : "Sign in"}</button>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </form>
    <div className={`${styles.form} mt-5`}>
      {step === "credentials" && !signup && <><button type="button" disabled={busy} className={styles.link} onClick={() => { setPassword(""); setError(""); setStep("recovery"); }}>Forgot password?</button><button type="button" disabled={busy || !email.trim()} className={styles.link} onClick={() => void run(async () => {
        await checked(signIn.create({ identifier: email.trim() })); await checked(signIn.emailCode.sendCode()); setPassword(""); setStep("email"); setResendAt(Date.now() + 30000);
      })}>Email me a sign-in code</button></>}
      {verifying && (step !== "mfa" || ["email_code", "phone_code"].includes(factor)) && <button disabled={busy} className={styles.link} onClick={() => void run(resend)}>Send a new code</button>}
      {step === "mfa" && signIn.supportedSecondFactors.map((item) => item.strategy !== factor && <button key={item.strategy} disabled={busy} className={styles.link} onClick={() => void run(() => selectFactor(item.strategy as Factor))}>Use {item.strategy.replaceAll("_", " ")}</button>)}
    </div>
    <div id="clerk-captcha"/>
  </>;
}
