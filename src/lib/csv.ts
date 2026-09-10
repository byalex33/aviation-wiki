/** Quote CSV text and keep spreadsheet applications from interpreting formulas. */
export function csvCell(value: string) {
  // Spreadsheet importers can ignore leading spaces, controls, and format marks.
  const formula = /^[\s\p{Cc}\p{Cf}]*[=+@-]/u.test(value);
  const literal = formula ? `'${value}` : value;
  return `"${literal.replaceAll('"', '""')}"`;
}
