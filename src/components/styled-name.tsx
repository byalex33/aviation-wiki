import type { ReactNode } from "react";
import { Cloud, Compass, Crown, Earth, Fan, Flame, Gem, Heart, Plane, PlaneTakeoff, Sparkles, Star, Zap, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { NameEffect, NameIcon, NameStyle } from "@/lib/name-style";
import styles from "./styled-name.module.css";

const icons: Record<Exclude<NameIcon, "none" | "beacon">, { Icon: LucideIcon; className: string }> = {
  plane: { Icon: Plane, className: "text-sky-600 dark:text-sky-400" },
  takeoff: { Icon: PlaneTakeoff, className: "text-sky-600 dark:text-sky-400" },
  crown: { Icon: Crown, className: "text-amber-500 dark:text-amber-300" },
  star: { Icon: Star, className: "fill-current text-amber-400 dark:text-amber-300" },
  gem: { Icon: Gem, className: "text-violet-600 dark:text-violet-400" },
  zap: { Icon: Zap, className: "fill-current text-yellow-500 dark:text-yellow-300" },
  flame: { Icon: Flame, className: "text-orange-600 dark:text-orange-400" },
  globe: { Icon: Earth, className: "text-emerald-600 dark:text-emerald-400" },
  cloud: { Icon: Cloud, className: "text-slate-500 dark:text-slate-300" },
  heart: { Icon: Heart, className: "fill-current text-rose-500 dark:text-rose-400" },
  propeller: { Icon: Fan, className: cn("text-slate-600 dark:text-slate-300", styles["icon-propeller"]) },
  cruising: { Icon: Plane, className: cn("text-sky-600 dark:text-sky-400", styles["icon-cruising"]) },
  twinkle: { Icon: Sparkles, className: cn("text-amber-500 dark:text-amber-300", styles["icon-twinkle"]) },
  heartbeat: { Icon: Heart, className: cn("fill-current text-rose-500 dark:text-rose-400", styles["icon-heartbeat"]) },
  compass: { Icon: Compass, className: cn("text-teal-600 dark:text-teal-400", styles["icon-compass"]) },
};

const clippedEffects = new Set<NameEffect>(["sunset", "ocean", "aurora", "gold", "chrome", "shimmer", "rainbow", "afterburner"]);

export function NameStyleIcon({ icon, className }: { icon: NameIcon; className?: string }) {
  if (icon === "none") return null;
  if (icon === "beacon") return <span className={cn(styles.beacon, className)} aria-hidden="true"/>;
  const { Icon, className: iconClassName } = icons[icon];
  return <Icon className={cn(styles.icon, iconClassName, className)} aria-hidden="true"/>;
}

/** The classes for a name's font and effect, for surfaces that render the text themselves. */
export function nameTextClassName(style: Pick<NameStyle, "font" | "effect">) {
  return cn(
    styles.name,
    style.font !== "default" && styles[`font-${style.font}`],
    style.effect !== "none" && styles[`effect-${style.effect}`],
    clippedEffects.has(style.effect) && styles.clip,
  );
}

/** A display name with its Pro icon, font and effect. Stays a plain inline span so wrapping and truncation keep working. */
export function StyledName({ name, style, className }: { name: ReactNode; style: NameStyle | null | undefined; className?: string }) {
  if (!style) return <span className={className}>{name}</span>;
  return <span className={className}>
    <span className={nameTextClassName(style)}>{name}</span>
    <NameStyleIcon icon={style.icon}/>
  </span>;
}
