import assert from "node:assert/strict";

import { getArticleHeadings, parseArticleMarkdown, parseStructuredFieldMarkdown, resolveFlagCode } from "../src/lib/article-markdown";

const valid = parseArticleMarkdown("A claim.[^alpha] Another claim.[^alpha]\n\n[^alpha]: https://example.com/source");
assert.deepEqual(valid.errors, []);
assert.equal(valid.citations.length, 1);
assert.equal(valid.citations[0].number, 1);
assert.equal(valid.citations[0].occurrences, 2);

const ordered = parseArticleMarkdown("Second first.[^b] First second.[^a]\n\n[^a]: https://example.com/a\n[^b]: https://example.com/b");
assert.deepEqual(ordered.citations.map((citation) => [citation.identifier, citation.number]), [["b", 1], ["a", 2]]);

const missing = parseArticleMarkdown("Unsupported.[^missing]");
assert.match(missing.errors[0]?.message || "", /no matching source definition/);

const duplicate = parseArticleMarkdown("Claim.[^1]\n\n[^1]: https://example.com/a\n[^1]: https://example.com/b");
assert.ok(duplicate.errors.some((error) => error.message.includes("Duplicate citation identifier")));

const unsafe = parseArticleMarkdown("Claim.[^1]\n\n[^1]: javascript:alert(1)");
assert.ok(unsafe.errors.some((error) => error.message.includes("Unsafe or unsupported citation URL")));

const unused = parseArticleMarkdown("Text only.\n\n[^unused]: https://example.com/unused");
assert.ok(unused.warnings.some((warning) => warning.message.includes("not cited")));

assert.deepEqual(parseStructuredFieldMarkdown("f![gr] Greece; f![usa] United States").errors, []);
assert.equal(resolveFlagCode("usa"), "us");
assert.match(parseArticleMarkdown("f![greece]").errors[0]?.message || "", /Unknown flag code/);
assert.match(parseStructuredFieldMarkdown("![Logo](https://example.com/logo.png)").errors[0]?.message || "", /only support inline Markdown/);
assert.match(parseStructuredFieldMarkdown("## Heading").errors[0]?.message || "", /only support inline Markdown/);

const sidebar = parseArticleMarkdown(`<Sidebar>
IATA code: A3
ICAO code: AEE
Callsign: AEGEAN
Country: f![gr] Greece
Status: Active
</Sidebar>`);
assert.deepEqual(sidebar.errors, []);
assert.deepEqual(sidebar.sidebarFields, [
  { key: "IATA code", value: "A3" },
  { key: "ICAO code", value: "AEE" },
  { key: "Callsign", value: "AEGEAN" },
  { key: "Country", value: "f![gr] Greece" },
  { key: "Status", value: "Active" },
]);
assert.match(parseArticleMarkdown("<Sidebar>\nBroken field\n</Sidebar>").errors[0]?.message || "", /Label: value/);

const headings = getArticleHeadings(parseArticleMarkdown("## Fleet\n\n### Current fleet\n\n## Fleet").root);
assert.deepEqual(headings.map(({ id, text, depth }) => ({ id, text, depth })), [
  { id: "section-fleet", text: "Fleet", depth: 2 },
  { id: "section-current-fleet", text: "Current fleet", depth: 3 },
  { id: "section-fleet-2", text: "Fleet", depth: 2 },
]);

console.log("Citation parser tests passed");
