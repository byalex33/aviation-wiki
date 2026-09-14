"use client";

import { stagger, useAnimate, useInView } from "motion/react";
import { Fragment, useEffect, useRef, type ReactNode } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";

// Adapted from beUI TextReveal (MIT); see THIRD_PARTY_NOTICES.md.
export function TextReveal({ text, children }: { text: string; children?: ReactNode }) {
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const inView = useInView(scope, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  const finished = useRef(false);

  useEffect(() => {
    if (!inView || reduce || finished.current) return;

    const units = scope.current.querySelectorAll<HTMLElement>("[data-reveal-word]");
    const animation = animate(
      units,
      { y: [6, 0], opacity: [0.65, 1], filter: ["blur(2px)", "blur(0px)"] },
      {
        type: "spring",
        duration: 0.28,
        bounce: 0,
        delay: stagger(0.025),
        onComplete: () => { finished.current = true; },
      },
    );

    return () => {
      animation.stop();
      // Keep the heading readable if reduced motion is enabled mid-animation.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        finished.current = true;
      }
      units.forEach((unit) => {
        unit.style.transform = "none";
        unit.style.opacity = "1";
        unit.style.filter = "none";
      });
    };
  }, [animate, inView, reduce, scope]);

  // Server HTML stays visible. Spaces remain between words for natural wrapping
  // and continuous text when read by assistive technology or copied.
  return (
    <span ref={scope}>
      {(text.match(/\S+\s*|\s+/g) ?? []).map((chunk, index) => {
        const word = chunk.trimEnd();
        return (
          <Fragment key={`${index}-${chunk}`}>
            {word && <span data-reveal-word className="inline-block">{word}</span>}
            {chunk.slice(word.length)}
          </Fragment>
        );
      })}
      {children && <span data-reveal-word className="inline-block">{children}</span>}
    </span>
  );
}
