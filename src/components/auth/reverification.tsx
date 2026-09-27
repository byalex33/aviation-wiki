"use client";
import { useSession } from "@clerk/nextjs";
import type { SessionVerificationLevel, SessionVerificationResource } from "@clerk/shared/types";
import { useEffect, useState } from "react";
import { AuthField } from "./auth-field";
import { authError } from "@/lib/auth-ui";
import styles from "./auth.module.css";

export type ReverificationRequest = { complete: () => void; cancel: () => void; level?: SessionVerificationLevel };
export function Reverification({ request, onClose }: { request: ReverificationRequest; onClose: () => void }) {
  const { session } = useSession();
  const [verification, setVerification] = useState<SessionVerificationResource | null>(null);
  const [strategy, setStrategy] = useState("password");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function prepare(result: SessionVerificationResource) {
    if (!session) return;
    if (result.status === "complete") { request.complete(); onClose(); return; }
    setVerification(result); setValue("");
    const factors = result.status === "needs_first_factor" ? result.supportedFirstFactors : result.supportedSecondFactors;
    const factor = factors?.find((item) => item.strategy === "email_code") || factors?.find((item) => item.strategy === "totp") || factors?.find((item) => item.strategy === "password") || factors?.find((item) => item.strategy === "phone_code") || factors?.find((item) => item.strategy === "backup_code");
    if (!factor) throw new Error("No supported verification method is available. Sign out and sign in again to continue.");
    setStrategy(factor.strategy);
    if (factor.strategy === "email_code") await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: factor.emailAddressId });
    if (factor.strategy === "phone_code") {
      const params = { strategy: "phone_code" as const, phoneNumberId: factor.phoneNumberId };
      if (result.status === "needs_first_factor") await session.prepareFirstFactorVerification(params);
      else await session.prepareSecondFactorVerification(params);
    }
  }

  useEffect(() => {
    if (!session) return;
    let active = true;
    void session.startVerification({ level: request.level || "first_factor" }).then((result) => { if (active) return prepare(result); }).catch((err) => { if (active) setError(authError(err)); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
    // Start once for each requested verification, not after each input change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, request]);

  return <section className={styles.section} aria-label="Confirm your identity">
    <h2>Confirm your identity</h2><p className={styles.hint}>Before saving this change, {strategy === "password" ? "enter your current password" : strategy === "totp" ? "enter a code from your authenticator" : strategy === "backup_code" ? "enter an unused backup code" : "enter the code sent to you"}.</p>
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); if (!session || !verification || busy) return; setBusy(true); setError(""); void (async () => {
      let result: SessionVerificationResource;
      if (verification.status === "needs_first_factor") {
        if (strategy === "password") result = await session.attemptFirstFactorVerification({ strategy, password: value });
        else if (strategy === "email_code" || strategy === "phone_code") result = await session.attemptFirstFactorVerification({ strategy, code: value });
        else throw new Error("Unsupported verification method.");
      } else {
        if (strategy !== "totp" && strategy !== "phone_code" && strategy !== "backup_code") throw new Error("Unsupported verification method.");
        result = await session.attemptSecondFactorVerification({ strategy, code: value });
      }
      await prepare(result);
    })().catch((err) => setError(authError(err))).finally(() => setBusy(false)); }}>
      <AuthField label={strategy === "password" ? "Current password" : "Verification code"} type={strategy === "password" ? "password" : "text"} autoComplete={strategy === "password" ? "current-password" : "one-time-code"} value={value} onChange={setValue} required disabled={busy}/>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button className={styles.button} disabled={busy}>{busy ? "Please wait…" : "Confirm identity"}</button>
      <button className={styles.link} type="button" onClick={() => { request.cancel(); onClose(); }}>Cancel change</button>
    </form>
  </section>;
}
