"use client";

// Adapted from xevrion/ui-lab PasswordField (MIT). See THIRD_PARTY_NOTICES.md.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import styles from "./auth.module.css";

const CHARACTER_MS = 200;
const WAVE_MS = 160;
type Morph = { id: number; reveal: boolean; value: string; chars: string[]; letterX: number[]; dotX: number[] };
let canvas: HTMLCanvasElement | null = null;

function measure(input: HTMLInputElement, chars: string[]) {
  canvas ??= document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return null;
  const style = getComputedStyle(input);
  context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  const spacing = Number.parseFloat(style.letterSpacing) || 0;
  const dot = context.measureText("•").width + spacing;
  let prefix = "";
  const letterX = chars.map((char, index) => {
    const x = context.measureText(prefix).width + index * spacing;
    prefix += char;
    return x;
  });
  return { letterX, dotX: chars.map((_, index) => index * dot) };
}

export function usePasswordReveal(value: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const selection = useRef<[number, number] | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const sequence = useRef(0);
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const [morph, setMorph] = useState<Morph | null>(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && selection.current && document.activeElement === input) input.setSelectionRange(...selection.current);
    selection.current = null;
  }, [visible]);

  function cancel() { clearTimeout(timer.current); setMorph(null); }
  function toggle() {
    const input = inputRef.current;
    if (input?.selectionStart != null && input.selectionEnd != null) selection.current = [input.selectionStart, input.selectionEnd];
    const reveal = !visible;
    setVisible(reveal);
    cancel();
    const chars = Array.from(value);
    // Overflow and horizontal scrolling use the native toggle. The overlay is
    // decorative; it must never displace editing or draw outside the input.
    if (!input || reduceMotion || !chars.length || input.scrollWidth > input.clientWidth || input.scrollLeft > 0) return;
    const positions = measure(input, chars);
    if (!positions) return;
    setMorph({ id: ++sequence.current, reveal, value, chars, ...positions });
    timer.current = setTimeout(() => setMorph(null), CHARACTER_MS + WAVE_MS);
  }
  // A parent reset, autofill, or edit immediately invalidates the old overlay.
  return { inputRef, visible, toggle, cancel, morph: !reduceMotion && morph?.value === value ? morph : null };
}

export function PasswordReveal({ morph }: { morph: Morph }) {
  const step = Math.min(24, WAVE_MS / Math.max(morph.chars.length - 1, 1));
  return <span key={morph.id} className={styles.passwordReveal} aria-hidden="true">
    {morph.chars.map((char, index) => {
      const order = morph.reveal ? index : morph.chars.length - 1 - index;
      const timing = `${CHARACTER_MS}ms cubic-bezier(.23,1,.32,1) ${order * step}ms both`;
      return <span key={index} className={styles.morphCharacter} style={{
        "--pw-from": `${morph.reveal ? morph.dotX[index] : morph.letterX[index]}px`,
        "--pw-to": `${morph.reveal ? morph.letterX[index] : morph.dotX[index]}px`,
        animation: `${styles.passwordSlide} ${timing}`,
      } as CSSProperties}>
        <span style={{ animation: `${morph.reveal ? styles.passwordShow : styles.passwordHide} ${timing}` }}>{char}</span>
        <span style={{ animation: `${morph.reveal ? styles.passwordHide : styles.passwordShow} ${timing}` }}>•</span>
      </span>;
    })}
  </span>;
}
