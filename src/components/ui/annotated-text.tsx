import { useId, type ReactNode } from "react";

// OpenSourceUI AnnotatedText, arrow variant (MIT); see THIRD_PARTY_NOTICES.md.
export function AnnotatedText({ children }: { children: ReactNode }) {
  const filterId = useId();

  return (
    <span className="relative inline-block whitespace-nowrap">
      {children}
      <svg
        className="pointer-events-none absolute -bottom-[0.45em] -left-[1%] h-[0.8em] w-[106%] overflow-visible text-primary"
        viewBox="0 0 150 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={2} seed={11} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={1.5} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={`url(#${filterId})`} stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3,7 C45,3 105,4 140,8" />
          <path d="M132,3 L142,8 L131,13" />
        </g>
      </svg>
    </span>
  );
}
