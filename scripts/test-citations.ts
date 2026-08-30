import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { ArticleMarkdown } from "../src/components/article-markdown";
import { getAircraftArticleTitles, getArticleHeadings, getArticleMentionParts, parseArticleImageShorthand, parseArticleMarkdown, parseStructuredFieldMarkdown, resolveFlagCode } from "../src/lib/article-markdown";

const valid = parseArticleMarkdown("A claim.[^alpha] Another claim.[^alpha]\n\n[^alpha]: https://example.com/source");
assert.deepEqual(valid.errors, []);
assert.equal(valid.citations.length, 1);
assert.equal(valid.citations[0].number, 1);
assert.equal(valid.citations[0].occurrences, 2);
const citationPreviewMarkup = renderToStaticMarkup(
  createElement(ArticleMarkdown, {
    root: valid.root,
    citations: valid.citations,
    citationSources: [
      {
        identifier: "alpha",
        title: "Aircraft reference",
        publisher: "Example publisher",
        url: "https://example.com/source",
        accessedAt: "2026-08-30",
      },
    ],
  }),
);
assert.match(citationPreviewMarkup, /role="tooltip"/);
assert.match(citationPreviewMarkup, /Aircraft reference/);
assert.match(citationPreviewMarkup, /Example publisher · example\.com/);
assert.equal(
  new Set([...citationPreviewMarkup.matchAll(/id="(citation-preview-[^"]+)"/g)].map((match) => match[1])).size,
  2,
);

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

assert.deepEqual(parseArticleImageShorthand("![https://example.com/photo.jpg | Photo by Jane Smith]"), {
  url: "https://example.com/photo.jpg",
  credit: "Photo by Jane Smith",
});
const linkedImageCredit = "![https://cdn.jetphotos.com/full/6/example.jpg | Photo by [Benjamin Barbe](https://www.jetphotos.com/photographer/98834) on [JetPhotos](https://www.jetphotos.com/photo/12155165)]";
assert.deepEqual(parseArticleImageShorthand(linkedImageCredit), {
  url: "https://cdn.jetphotos.com/full/6/example.jpg",
  credit: "Photo by [Benjamin Barbe](https://www.jetphotos.com/photographer/98834) on [JetPhotos](https://www.jetphotos.com/photo/12155165)",
});
assert.deepEqual(parseArticleMarkdown("![https://example.com/photo.jpg]").errors, []);
assert.match(parseArticleMarkdown("![javascript:alert(1)]").errors[0]?.message || "", /unsupported image URL/);
assert.match(parseStructuredFieldMarkdown("![https://example.com/photo.jpg]").errors[0]?.message || "", /only support inline Markdown/);

const sidebar = parseArticleMarkdown(`<Sidebar>
![https://example.com/aircraft.jpg | Photo by Jane Smith]
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
assert.deepEqual(sidebar.sidebarImages, [
  {
    url: "https://example.com/aircraft.jpg",
    credit: "Photo by Jane Smith",
  },
]);
const linkedCreditSidebar = parseArticleMarkdown(`<Sidebar>
${linkedImageCredit}
Name: DHL Aviation
</Sidebar>`);
assert.deepEqual(linkedCreditSidebar.errors, []);
assert.deepEqual(linkedCreditSidebar.sidebarFields, [
  { key: "Name", value: "DHL Aviation" },
]);
assert.deepEqual(linkedCreditSidebar.sidebarImages, [
  {
    url: "https://cdn.jetphotos.com/full/6/example.jpg",
    credit: "Photo by [Benjamin Barbe](https://www.jetphotos.com/photographer/98834) on [JetPhotos](https://www.jetphotos.com/photo/12155165)",
  },
]);
assert.match(parseArticleMarkdown("<Sidebar>\nBroken field\n</Sidebar>").errors[0]?.message || "", /Label: value/);

const headings = getArticleHeadings(parseArticleMarkdown("## Fleet\n\n### Current fleet\n\n## Fleet").root);
assert.deepEqual(headings.map(({ id, text, depth }) => ({ id, text, depth })), [
  { id: "section-fleet", text: "Fleet", depth: 2 },
  { id: "section-current-fleet", text: "Current fleet", depth: 3 },
  { id: "section-fleet-2", text: "Fleet", depth: 2 },
]);

const articleLinks = [
  { title: "Boeing 737", href: "/aircraft/boeing-737" },
  { title: "Boeing 737 family", href: null },
];
assert.deepEqual(
  getArticleMentionParts(
    "The Boeing 737 family followed the Boeing 737; XBoeing 737 is not a mention.",
    articleLinks,
  ),
  [
    { text: "The ", href: null },
    { text: "Boeing 737 family", href: null },
    { text: " followed the ", href: null },
    { text: "Boeing 737", href: "/aircraft/boeing-737" },
    { text: "; XBoeing 737 is not a mention.", href: null },
  ],
);
assert.deepEqual(
  getAircraftArticleTitles("General Dynamics F-16 Fighting Falcon"),
  [
    "General Dynamics F-16 Fighting Falcon",
    "F-16 Fighting Falcon",
    "F-16",
  ],
);
assert.deepEqual(getAircraftArticleTitles("Boeing 747"), ["Boeing 747"]);

console.log("Citation parser tests passed");
