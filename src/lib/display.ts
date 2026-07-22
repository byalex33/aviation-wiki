export function formatDisplayLabel(value: string) {
  const normalized = value
    .trim()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : "";
}
