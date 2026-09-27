"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import { suggestEmail } from "@/lib/auth-ui";
import styles from "./auth.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  passwordAdvice?: boolean;
};

export function AuthField({ label, value, onChange, type = "text", passwordAdvice, ...props }: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const password = type === "password";
  const suggestion = type === "email" && blurred ? suggestEmail(value) : null;
  const strength = value.length === 0 ? 0 : value.length < 8 ? 1 : value.length < 12 ? 2 : value.length < 16 ? 3 : 4;
  return <div>
    <div className={styles.field}>
      <input {...props} id={id} type={password && visible ? "text" : type} value={value} placeholder=" "
        className={`${styles.input} ${password ? styles.password : ""}`}
        onChange={(event) => { onChange(event.target.value); setBlurred(false); }}
        onBlur={() => { setBlurred(true); setCapsLock(false); }}
        onKeyDown={(event) => password && setCapsLock(event.getModifierState("CapsLock"))}
        onKeyUp={(event) => password && setCapsLock(event.getModifierState("CapsLock"))}
        aria-describedby={`${id}-hint`} />
      <label htmlFor={id} className={styles.label}>{label}</label>
      {password && <button className={styles.eye} type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{!visible && <path d="m3 3 18 18"/>}</svg>
      </button>}
    </div>
    <div id={`${id}-hint`}>
      {capsLock && <p className={styles.hint} role="status">Caps Lock is on.</p>}
      {suggestion && <p className={styles.hint}>Did you mean <button type="button" className={styles.link} onClick={() => { onChange(suggestion); setBlurred(false); }}>{suggestion}</button>?</p>}
      {passwordAdvice && <><div className={styles.meter} aria-hidden="true">{[1,2,3,4].map((n) => <span key={n} data-filled={strength >= n}/>)}</div><p className={styles.hint}>Use a long, unique password. Several unrelated words work well. Your password is checked when you continue.</p></>}
    </div>
  </div>;
}
