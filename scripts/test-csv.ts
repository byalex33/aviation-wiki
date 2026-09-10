import assert from "node:assert/strict";
import { csvCell } from "../src/lib/csv";

for (const prefix of ["", " ", "\t", "\r\n", "\0", "\uFEFF", "\u200B", "\u00A0"])
  for (const formula of ["=1+1", "+1+1", "-1+1", "@SUM(1,2)"])
    assert.equal(csvCell(`${prefix}${formula}`), `"'${prefix}${formula}"`);
assert.equal(csvCell('Airbus "A350", family'), '"Airbus ""A350"", family"');
assert.equal(csvCell("Airbus\nA350"), '"Airbus\nA350"');
assert.equal(csvCell("A350-1000"), '"A350-1000"');
assert.equal(csvCell(""), '""');
assert.equal(csvCell("'Already literal"), '"\'Already literal"');
console.log("CSV formula, whitespace/control prefixes, quoting, and literal text checks passed.");
