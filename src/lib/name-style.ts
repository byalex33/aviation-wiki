import { hasPro } from "@/lib/pro";

/**
 * Pro name styles: an icon beside the name, a font, and a text effect.
 * Stored in Clerk `publicMetadata.nameStyle`, which only the server can write.
 * Keys are persisted, so rename labels freely but never reuse or rename a key.
 */
export const nameIcons = {
  none: { label: "No icon", animated: false },
  plane: { label: "Plane", animated: false },
  takeoff: { label: "Take-off", animated: false },
  crown: { label: "Crown", animated: false },
  star: { label: "Star", animated: false },
  gem: { label: "Gem", animated: false },
  zap: { label: "Bolt", animated: false },
  flame: { label: "Flame", animated: false },
  globe: { label: "Globe", animated: false },
  cloud: { label: "Cloud", animated: false },
  heart: { label: "Heart", animated: false },
  propeller: { label: "Propeller", animated: true },
  cruising: { label: "Cruising", animated: true },
  beacon: { label: "Beacon", animated: true },
  twinkle: { label: "Twinkle", animated: true },
  heartbeat: { label: "Heartbeat", animated: true },
  compass: { label: "Compass", animated: true },
} as const;

export const nameFonts = {
  default: { label: "Standard" },
  serif: { label: "Serif" },
  modern: { label: "Modern" },
  rounded: { label: "Rounded" },
  cockpit: { label: "Cockpit" },
  runway: { label: "Runway" },
  signature: { label: "Signature" },
  mono: { label: "Monospace" },
  pixel: { label: "Pixel" },
} as const;

export const nameEffects = {
  none: { label: "None", animated: false },
  sunset: { label: "Sunset", animated: false },
  ocean: { label: "Ocean", animated: false },
  aurora: { label: "Aurora", animated: false },
  gold: { label: "Gold", animated: false },
  chrome: { label: "Chrome", animated: false },
  neon: { label: "Neon", animated: false },
  shimmer: { label: "Shimmer", animated: true },
  rainbow: { label: "Rainbow", animated: true },
  afterburner: { label: "Afterburner", animated: true },
  pulse: { label: "Pulse", animated: true },
} as const;

export type NameIcon = keyof typeof nameIcons;
export type NameFont = keyof typeof nameFonts;
export type NameEffect = keyof typeof nameEffects;
export type NameStyle = { icon: NameIcon; font: NameFont; effect: NameEffect };

export const defaultNameStyle: NameStyle = { icon: "none", font: "default", effect: "none" };

function pick<T extends string>(catalog: Record<T, unknown>, value: unknown, fallback: T): T | null {
  if (value === undefined || value === null) return fallback;
  return typeof value === "string" && Object.hasOwn(catalog, value) ? value as T : null;
}

/** Strictly validates untrusted input. Missing fields fall back to defaults; unknown values reject the whole style. */
export function parseNameStyle(value: unknown): NameStyle | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const icon = pick(nameIcons, input.icon, defaultNameStyle.icon);
  const font = pick(nameFonts, input.font, defaultNameStyle.font);
  const effect = pick(nameEffects, input.effect, defaultNameStyle.effect);
  return icon && font && effect ? { icon, font, effect } : null;
}

export function isDefaultNameStyle(style: NameStyle) {
  return style.icon === "none" && style.font === "default" && style.effect === "none";
}

export function sameNameStyle(a: NameStyle, b: NameStyle) {
  return a.icon === b.icon && a.font === b.font && a.effect === b.effect;
}

/** The style to display for a user, or null. Lapsed Pro accounts fall back to the plain name. */
export function nameStyleFromMetadata(publicMetadata: Record<string, unknown> | null | undefined): NameStyle | null {
  if (!hasPro(publicMetadata)) return null;
  const style = parseNameStyle(publicMetadata?.nameStyle);
  return style && !isDefaultNameStyle(style) ? style : null;
}

/** The saved style for the settings editor, regardless of Pro status. */
export function savedNameStyle(publicMetadata: Record<string, unknown> | null | undefined): NameStyle {
  return parseNameStyle(publicMetadata?.nameStyle) ?? defaultNameStyle;
}
