import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";

import {
  ArticleChart,
  UnavailableArticleChart,
} from "../src/components/article-chart";
import {
  CHART_TEMPLATE,
  chartVerificationData,
  formatChartValue,
  type ChartDefinition,
} from "../src/lib/article-chart";
import { parseArticleMarkdown } from "../src/lib/article-markdown";

function source(attributes: string, rows: string) {
  return `<Chart ${attributes}>\n\n${rows}\n\n</Chart>`;
}

function valid(markdown: string) {
  const parsed = parseArticleMarkdown(markdown);
  assert.deepEqual(parsed.errors, []);
  assert.equal(parsed.charts.length, 1);
  return parsed.charts[0];
}

function invalid(markdown: string, message: RegExp) {
  const errors = parseArticleMarkdown(markdown).errors;
  assert.ok(
    errors.some((error) => message.test(error.message)),
    `${message} was not found in ${errors.map((error) => error.message).join(" | ")}`,
  );
}

const line = valid(
  source(
    'type="line" title="Passengers"',
    "Year | Passengers\n2024 | 12.5\n2025 | 14.8",
  ),
);
assert.equal(line.type, "line");
assert.equal(line.orientation, "vertical");
assert.equal(line.rows[0].Passengers, 12.5);
assert.equal(line.showLegend, false);

const multiSeries = valid(
  source(
    'title="Traffic"',
    "Year | Domestic | International\n2024 | 10 | 20\n2025 | 12 | 24",
  ),
);
assert.equal(multiSeries.showLegend, true);
assert.deepEqual(multiSeries.columns, [
  "Year",
  "Domestic",
  "International",
]);

const horizontal = valid(
  source(
    'type="bar" title="Airports" orientation="horizontal"',
    "Airport | Passengers\nLHR | 80\nLGW | 40",
  ),
);
assert.equal(horizontal.orientation, "horizontal");

const area = valid(
  source(
    'type="area" title="Traffic area" stacked="true"',
    "Year | Domestic | International\n2024 | 10 | 20\n2025 | 12 | 24",
  ),
);
assert.equal(area.type, "area");
assert.equal(area.stacked, true);

const automaticHorizontal = valid(
  source(
    'type="bar" title="Airports"',
    "Airport | Passengers\nA | 1\nB | 2\nC | 3\nD | 4\nE | 5\nF | 6",
  ),
);
assert.equal(automaticHorizontal.orientation, "horizontal");

const stacked = valid(
  source(
    'type="stacked-bar" title="Fleet"',
    "Year | Narrow-body | Wide-body\n2024 | 10 | 5\n2025 | 12 | 6",
  ),
);
assert.equal(stacked.stacked, true);
assert.equal(stacked.showLegend, true);

const donut = valid(
  source(
    'type="donut" title="Fleet share"',
    "Aircraft | Count\nA320 | 20\nA350 | 8",
  ),
);
assert.equal(donut.showLegend, true);

const fleet = valid(
  source(
    'type="fleet-timeline" title="Aircraft service history"',
    "Aircraft | Entered service | Retired\nBoeing 707 | 1960 | 1983\nAirbus A350 | 2019 |",
  ),
);
assert.equal(fleet.rows[1].Retired, "");
assert.equal(fleet.rows[0]["Entered service"], 1960);

const markdownTable = valid(
  source(
    'title="Table form"',
    "| Year | Passengers |\n| --- | --- |\n| 2024 | 12.5 |\n| 2025 | 14.8 |",
  ),
);
assert.deepEqual(markdownTable.rawRows, [
  ["2024", "12.5"],
  ["2025", "14.8"],
]);

const whitespace = valid(
  source(
    'title="Whitespace"',
    "  Year   |   Passengers  \n  2024 | 12.5  \n2025   |   14.8",
  ),
);
assert.deepEqual(whitespace.columns, ["Year", "Passengers"]);

const sorted = valid(
  source(
    'title="Sorted" sort="ascending"',
    "Airport | Passengers\nB | 20\nA | 10",
  ),
);
assert.deepEqual(
  sorted.rows.map((row) => row.Airport),
  ["A", "B"],
);
assert.deepEqual(sorted.rawRows.map((row) => row[0]), ["A", "B"]);

assert.equal(
  formatChartValue(
    12.5,
    {
      valueFormat: "decimal",
      valuePrefix: "$",
      valueSuffix: " million",
    },
    "en",
  ),
  "$12.5 million",
);
assert.equal(
  formatChartValue(
    1250,
    { valueFormat: "compact", valuePrefix: "", valueSuffix: "" },
    "en",
  ),
  "1.25K",
);
assert.equal(
  formatChartValue(
    42,
    { valueFormat: "percentage", valuePrefix: "", valueSuffix: "%" },
    "en",
  ),
  "42%",
);

invalid(source('type="line"', "Year | Value\n2024 | 1\n2025 | 2"), /title is required/);
invalid(source('title="Empty"', ""), /dataset is empty/);
invalid(source('title="Header"', "--- | ---\n2024 | 1\n2025 | 2"), /missing a header row/);
invalid(source('title="Columns"', "Year\n2024\n2025"), /at least two columns/);
invalid(source('title="Data rows"', "Year | Value\n2024 | 1"), /at least two data rows/);
invalid(source('title="Invalid"', "Year | Value\n2024 | no\n2025 | 2"), /finite number/);
invalid(source('title="Rows"', "Year | Value\n2024 | 1 | extra\n2025 | 2"), /cells; expected/);
invalid(source('title="Duplicate"', "Year | Value | value\n2024 | 1 | 2\n2025 | 2 | 3"), /Duplicate Chart column/);
invalid(source('title="Source" source="javascript:alert(1)"', "Year | Value\n2024 | 1\n2025 | 2"), /https:\/\/ URL/);
invalid(source('title="Unknown" colour="red"', "Year | Value\n2024 | 1\n2025 | 2"), /Unsupported attribute "colour"/);
invalid(source('title="Type" type="scatter"', "Year | Value\n2024 | 1\n2025 | 2"), /Chart type must be/);
invalid(
  source(
    'title="Rows"',
    `Year | Value\n${Array.from({ length: 51 }, (_, index) => `${index} | ${index}`).join("\n")}`,
  ),
  /at most 50 data rows/,
);
invalid(
  source(
    'title="Series"',
    `${["Category", ...Array.from({ length: 9 }, (_, index) => `S${index}`)].join(" | ")}\n${["A", ...Array(9).fill("1")].join(" | ")}\n${["B", ...Array(9).fill("2")].join(" | ")}`,
  ),
  /at most eight numeric series/,
);
invalid(
  source(
    'title="Donut" type="donut"',
    `Category | Value\n${Array.from({ length: 7 }, (_, index) => `${index} | ${index + 1}`).join("\n")}`,
  ),
  /at most six categories/,
);
invalid(
  source(
    'title="Donut" type="donut"',
    "Category | A | B\nOne | 1 | 2\nTwo | 3 | 4",
  ),
  /exactly one numeric series/,
);
invalid(
  source(
    'title="Donut" type="donut"',
    "Category | Value\nOne | -1\nTwo | 4",
  ),
  /cannot be negative/,
);
invalid(
  source(
    'title="Fleet" type="fleet-timeline"',
    "Aircraft | Start | End\nA320 | 2000 | 2020\nA350 | 2015 |",
  ),
  /Fleet timeline columns/,
);
invalid(
  '<Chart title="Missing">\n\nYear | Value\n2024 | 1\n2025 | 2',
  /Missing closing <\/Chart>/,
);
invalid(
  '<Chart title=Missing>\nYear | Value\n2024 | 1\n2025 | 2\n</Chart>',
  /attribute values must use quotes/,
);
invalid(
  source(
    'title="Nested"',
    "Category | Value\n<Notice>Unsafe</Notice> | 1\nSafe | 2",
  ),
  /Nested article blocks/,
);
invalid(
  source(
    'title="Percent" valueFormat="percentage"',
    "Year | Value\n2024 | 101\n2025 | 50",
  ),
  /between 0 and 100/,
);

const malicious = valid(
  source(
    'title="Safe labels"',
    "Category | Value\n&lt;img src=x onerror=alert(1)&gt; | 1\nSafe | 2",
  ),
);
const markup = renderToStaticMarkup(
  <ArticleChart definition={malicious as ChartDefinition} />,
);
assert.ok(markup.includes("aria-labelledby"));
assert.ok(markup.includes('aria-expanded="false"'));
assert.ok(markup.includes("<table"));
assert.ok(markup.includes("overflow-x-auto"));
assert.ok(!markup.includes("<img src=x"));
assert.match(
  renderToStaticMarkup(<UnavailableArticleChart />),
  /chart is unavailable/,
);

const template = valid(CHART_TEMPLATE);
assert.equal(template.title, "Chart title");
assert.ok(CHART_TEMPLATE.includes("Category | Value"));
assert.deepEqual(chartVerificationData(line), {
  type: "line",
  title: "Passengers",
  description: undefined,
  labels: {
    x: undefined,
    y: undefined,
    columns: ["Year", "Passengers"],
  },
  rows: [
    ["2024", "12.5"],
    ["2025", "14.8"],
  ],
  source: undefined,
});

const sourced = parseArticleMarkdown(
  `${source(
    'title="Sourced" source="https://example.com/report"',
    "Year | Value\n2024 | 1\n2025 | 2",
  )}\n\nThe source remains separate.[^report]\n\n[^report]: https://example.com/report`,
);
assert.equal(sourced.charts.length, 1);
assert.equal(sourced.citations.length, 1);
assert.equal(sourced.citations[0].identifier, "report");

console.log("Chart parser and renderer tests passed");
