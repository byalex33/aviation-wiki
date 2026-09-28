import { formatDisplayLabel } from "@/lib/display";

const HOUR = 36e5;

/** Whole hours since a timestamp, never negative. */
export function hoursSince(value: unknown, now = Date.now()) {
  const time = value ? new Date(String(value)).getTime() : NaN;
  return Number.isNaN(time) ? null : Math.max(0, (now - time) / HOUR);
}

/** Compact relative age for queue rows: "just now", "5h ago", "3d ago". */
export function formatAge(value: unknown, { suffix = true, now = Date.now() } = {}) {
  const hours = hoursSince(value, now);
  if (hours === null) return "—";
  const rounded = Math.round(hours);
  if (rounded < 1) return "just now";
  const label = rounded < 24 ? `${rounded}h` : `${Math.floor(rounded / 24)}d`;
  return suffix ? `${label} ago` : label;
}

/** Activity feed time in UTC (Zulu, as elsewhere in aviation): clock time today, "Yest.", then a short date. */
export function formatActivityTime(value: unknown, now = new Date()) {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  const day = (d: Date) => d.toISOString().slice(0, 10);
  if (day(date) === day(now))
    return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  if (day(date) === day(new Date(now.getTime() - 24 * HOUR))) return "Yest.";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

const auditPhrases: Record<string, (title: string) => string> = {
  "revision.approve": (title) => `approved ${title}`,
  "revision.reject": (title) => `rejected ${title}`,
  "revision.request_changes": (title) => `requested changes to ${title}`,
  "revision.assigned": (title) => `picked up ${title}`,
  "revision.unassigned": (title) => `released ${title}`,
  "revision.private_note_added": (title) => `added a private note to ${title}`,
  "revision.staff_publish": (title) => `published ${title}`,
  "revision.edited_and_approved": (title) => `edited and approved ${title}`,
  "article.controls_updated": (title) => `updated page controls on ${title}`,
  "article.restoration_proposed": (title) => `proposed restoring ${title}`,
  "import.draft_created": (title) => `drafted ${title} from an import`,
  "contributor.updated": () => "updated a contributor",
  "source.reviewed": () => "reviewed a source",
  "notification.custom_sent": () => "sent a notification",
};

/** One-line sentence (minus the actor) describing an audit log entry. */
export function describeAuditEvent(action: string, articleTitle?: unknown) {
  const title = articleTitle ? String(articleTitle) : "";
  const phrase = auditPhrases[action];
  if (phrase) return phrase(title || "an article");
  const label = formatDisplayLabel(action).toLowerCase();
  return title ? `${label} · ${title}` : label;
}

export type ModerationFilterValues = {
  status: string;
  q: string;
  contentType: string;
  conflicting: boolean;
  unassigned: boolean;
};

/** Moderation queue URL for a set of filters; defaults are left out. */
export function moderationHref(values: ModerationFilterValues) {
  const params = new URLSearchParams();
  if (values.status !== "pending_review") params.set("status", values.status);
  if (values.q) params.set("q", values.q);
  if (values.contentType !== "all") params.set("contentType", values.contentType);
  if (values.conflicting) params.set("conflicting", "1");
  if (values.unassigned) params.set("unassigned", "1");
  const query = params.toString();
  return query ? `/admin/moderation?${query}` : "/admin/moderation";
}
