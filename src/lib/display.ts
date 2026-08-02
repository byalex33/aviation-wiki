export function formatDisplayLabel(value: string) {
  const normalized = value
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (normalized === "event") return "Aviation news";
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "";
}
