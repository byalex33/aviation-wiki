"use client";

import { X } from "lucide-react";
import { useAnimate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Adapted from beUI Center Morph Modal (MIT). Native dialog supplies the focus
// trap, background inertness and focus restoration throughout the exit motion.
const FOLDED_CLIP = "inset(48% 48% 48% 48% round 30px)";
const OPEN_CLIP = "inset(0% 0% 0% 0% round 30px)";
const UNFOLD_EASE = [0.2, 0, 0.2, 1] as const;

export function CenterMorphModal({
  open,
  onOpenChange,
  ariaLabelledBy,
  ariaDescribedBy,
  closeButtonLabel = "Close modal",
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabelledBy: string;
  ariaDescribedBy?: string;
  closeButtonLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [panelRef, animate] = useAnimate<HTMLDivElement>();
  const reduce = useReducedMotion();

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!dialog || !panel) return;

    let cancelled = false;
    if (open && !dialog.open) {
      previousOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      panel.style.clipPath = reduce ? OPEN_CLIP : FOLDED_CLIP;
      panel.style.opacity = reduce ? "0" : "1";
      dialog.showModal();
    }
    if (!dialog.open) return;

    // Reset the clip immediately if the preference changes during a transition.
    if (reduce) panel.style.clipPath = OPEN_CLIP;
    const animation = animate(
      panel,
      {
        clipPath: open || reduce ? OPEN_CLIP : FOLDED_CLIP,
        opacity: reduce && !open ? 0 : 1,
      },
      { duration: reduce ? 0.14 : 0.43, ease: UNFOLD_EASE },
    );
    void animation.then(() => {
      if (cancelled || open) return;
      dialog.close();
      if (previousOverflow.current !== null) {
        document.body.style.overflow = previousOverflow.current;
        previousOverflow.current = null;
      }
    });
    return () => {
      cancelled = true;
      animation.stop();
    };
  }, [open, reduce, animate, panelRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      dialog?.close();
      if (previousOverflow.current !== null) {
        document.body.style.overflow = previousOverflow.current;
        previousOverflow.current = null;
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={cn(
        "m-auto max-h-[88vh] w-[min(1100px,calc(100%-2rem))] max-w-none overflow-visible border-0 bg-transparent p-0 text-foreground backdrop:bg-black/45 backdrop:backdrop-blur-sm",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          onOpenChange(false);
        }
      }}
    >
      <div ref={panelRef} className="relative overflow-hidden rounded-[30px] border bg-background shadow-2xl">
        {children}
        <button
          type="button"
          aria-label={closeButtonLabel}
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 inline-flex size-8 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </dialog>
  );
}
