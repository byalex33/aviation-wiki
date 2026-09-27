"use client";

import { useId, useState, type CSSProperties, type InputHTMLAttributes } from "react";
import { suggestEmail } from "@/lib/auth-ui";
import { PasswordReveal, usePasswordReveal } from "./password-reveal";
import { PasswordAdvice } from "./password-advice";
import styles from "./auth.module.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  passwordAdvice?: boolean;
};

export function AuthField({ label, value, onChange, type = "text", passwordAdvice, ...props }: Props) {
  const id = useId();
  const { inputRef, visible, toggle, cancel, morph } = usePasswordReveal(value);
  const [capsLock, setCapsLock] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const password = type === "password";
  const suggestion = type === "email" && blurred ? suggestEmail(value) : null;
  const letters = Array.from(label);
  return <div>
    <div className={styles.field}>
      <input {...props} ref={inputRef} id={id} type={password && visible ? "text" : type} value={value} placeholder=" "
        autoCapitalize={password ? "off" : props.autoCapitalize} spellCheck={password ? false : props.spellCheck}
        data-morphing={password && !!morph}
        className={`${styles.input} ${password ? styles.password : ""}`}
        onChange={(event) => { cancel(); onChange(event.target.value); setBlurred(false); }}
        onBlur={() => { setBlurred(true); setCapsLock(false); }}
        onKeyDown={(event) => password && setCapsLock(event.getModifierState("CapsLock"))}
        onKeyUp={(event) => password && setCapsLock(event.getModifierState("CapsLock"))}
        aria-describedby={`${id}-hint`} />
      <label htmlFor={id} className={styles.label}>
        <span className="sr-only">{label}</span><span aria-hidden="true">{letters.map((letter, index) => <span key={index} className={styles.labelLetter} style={{
          "--rise-delay": `${Math.min(index, 8) * 14}ms`,
          "--settle-delay": `${Math.min(letters.length - 1 - index, 8) * 8}ms`,
        } as CSSProperties}>{letter}</span>)}</span>
      </label>
      {password && morph && <PasswordReveal morph={morph}/>}
      {password && <button className={styles.eye} type="button" aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`} aria-pressed={visible} aria-controls={id} onPointerDown={(event) => { if (event.pointerType === "mouse") event.preventDefault(); }} onClick={toggle}>
        <span className={styles.eyeIcons} aria-hidden="true">
          <svg data-active={!visible} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.75 8S4 3.75 8 3.75 14.25 8 14.25 8 12 12.25 8 12.25 1.75 8 1.75 8Z"/><circle cx="8" cy="8" r="2"/></svg>
          <svg data-active={visible} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6.5 3.9A6 6 0 0 1 8 3.75c4 0 6.25 4.25 6.25 4.25a11 11 0 0 1-1.6 2.2M9.4 9.45a2 2 0 0 1-2.85-2.85M11.6 11.3A6.3 6.3 0 0 1 8 12.25C4 12.25 1.75 8 1.75 8a11 11 0 0 1 2.7-3.2M2.25 2.25l11.5 11.5"/></svg>
        </span>
      </button>}
    </div>
    <div id={`${id}-hint`}>
      {capsLock && <p className={styles.hint} role="status">Caps Lock is on.</p>}
      {suggestion && <p className={styles.hint}>Did you mean <button type="button" className={styles.link} onClick={() => { onChange(suggestion); setBlurred(false); }}>{suggestion}</button>?</p>}
      {passwordAdvice && <PasswordAdvice value={value}/>}
    </div>
  </div>;
}
