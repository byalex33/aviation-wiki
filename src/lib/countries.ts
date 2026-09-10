/** Remove presentation-only country flags before indexing or filtering. */
export function canonicalCountry(value: string) {
  return value.replace(/f!\[[^\]]+\]/gi, "").replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "").trim().replace(/\s+/g, " ");
}
