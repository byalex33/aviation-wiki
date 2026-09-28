"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CircleAlert, CircleCheck } from "lucide-react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EVENT = "admin-toast";

type Toast = { id: number; ok: boolean; text: string };

/** Shows a short confirmation from anywhere in the admin area. */
export function showAdminToast(text: string, ok = true) {
  window.dispatchEvent(new CustomEvent<Omit<Toast, "id">>(EVENT, { detail: { ok, text } }));
}

// Lives in the admin layout so a toast outlives the component that raised it
// (e.g. an "Assign to me" button that disappears once the row is assigned).
export function AdminToaster() {
  const [toast, setToast] = useState<Toast | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const show = (event: Event) => setToast({ id: Date.now(), ...(event as CustomEvent<Omit<Toast, "id">>).detail });
    window.addEventListener(EVENT, show);
    return () => window.removeEventListener(EVENT, show);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[60]">
      <AnimatePresence mode="wait">
        {toast && (
          <motion.div
            key={toast.id}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 4, transition: { duration: 0.12, ease: EASE_OUT } }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: EASE_OUT }}
            className="flex items-center gap-2 rounded-[10px] border bg-card px-4 py-3 text-sm shadow-[0_12px_32px_-12px_rgba(0,0,0,.25)]"
          >
            {toast.ok ? (
              <CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-4 text-destructive" aria-hidden="true" />
            )}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
