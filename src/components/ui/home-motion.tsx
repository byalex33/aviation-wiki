"use client";

import { motion, useAnimate, useInView, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";

// Adapted from beUI TextReveal and Button (MIT); see THIRD_PARTY_NOTICES.md.
const REVEAL_SPRING = { type: "spring", stiffness: 140, damping: 26, mass: 1.2 } as const;

/** Animate from visible server HTML, so content also works without JavaScript. */
export function MotionReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const inView = useInView(scope, { once: true, amount: 0.15 });
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!inView || reduce !== false) return;
    const element = scope.current;
    const animation = animate(
      element,
      { y: [12, 0], opacity: [0.65, 1] },
      { ...REVEAL_SPRING, delay },
    );
    return () => {
      animation.stop();
      // Restore the resting state if the motion preference changes mid-reveal.
      element.style.transform = "none";
      element.style.opacity = "1";
    };
  }, [animate, delay, inView, reduce, scope]);

  return <div ref={scope} className={className}>{children}</div>;
}

export function SpringSearchButton({ className }: { className?: string }) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="submit"
      tabIndex={0}
      className={className}
      whileTap={reduce === false ? { scale: 0.95 } : undefined}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      Search
    </motion.button>
  );
}
