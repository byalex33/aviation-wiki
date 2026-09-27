"use client";

// Adapted from xevrion/ui-lab PasswordField (MIT). See THIRD_PARTY_NOTICES.md.
import { useEffect, useState, type CSSProperties } from "react";
import { passwordStrength } from "@/lib/auth-ui";
import styles from "./auth.module.css";

const WORDS = ["", "Weak", "Good", "Good", "Strong"];
const GUIDANCE = [
  { label: "8 or more characters", test: (value: string) => value.length >= 8 },
  { label: "A number", test: (value: string) => /\d/.test(value) },
  { label: "A symbol", test: (value: string) => /[^A-Za-z0-9\s]/.test(value) },
];

export function PasswordAdvice({ value }: { value: string }) {
  const score = passwordStrength(value);
  const word = WORDS[score];
  const [current, setCurrent] = useState(score);
  const [from, setFrom] = useState(score);
  const [announced, setAnnounced] = useState("");
  if (score !== current) { setFrom(current); setCurrent(score); }
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(word ? `Estimated password strength: ${word}` : ""), 900);
    return () => clearTimeout(timer);
  }, [word]);
  return <>
    <div className={styles.strengthRow} aria-hidden="true">
      <div className={styles.meter}>{[1,2,3,4].map((segment) => {
        const order = score > from ? segment - from - 1 : segment > score ? from - segment : 0;
        return <span key={segment} className={styles.meterTrack}><span className={styles.meterFill} data-filled={segment <= score} data-score={score} style={{ "--segment-delay": `${Math.max(0, order) * 40}ms` } as CSSProperties}/></span>;
      })}</div>
      <span className={styles.verdict}>{["Weak", "Good", "Strong"].map((verdict) => <span key={verdict} data-active={verdict === word} data-weak={verdict === "Weak"}>{verdict}</span>)}</span>
    </div>
    <ul className={styles.passwordGuidance} aria-label="Password suggestions">
      {GUIDANCE.map((rule) => <li key={rule.label} data-met={rule.test(value)}><span className={styles.ruleIndicator} aria-hidden="true"/>{rule.label}<span className="sr-only">{rule.test(value) ? ", met" : ", not met"}</span></li>)}
    </ul>
    <p className={styles.hint}>These are suggestions. Use a unique password; your password is checked when you continue.</p>
    <span className="sr-only" aria-live="polite">{announced}</span>
  </>;
}
