export const CHART_TYPES = [
  "line",
  "bar",
  "area",
  "donut",
  "stacked-bar",
  "fleet-timeline",
] as const;

export const CHART_ATTRIBUTES = [
  "type",
  "title",
  "description",
  "xLabel",
  "yLabel",
  "orientation",
  "stacked",
  "sort",
  "valuePrefix",
  "valueSuffix",
  "valueFormat",
  "source",
  "height",
  "showLegend",
  "showValues",
] as const;

const orientations = ["vertical", "horizontal"] as const;
const sortOrders = ["none", "ascending", "descending"] as const;
const valueFormats = [
  "raw",
  "integer",
  "decimal",
  "compact",
  "percentage",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];
export type ChartOrientation = (typeof orientations)[number];
export type ChartSort = (typeof sortOrders)[number];
export type ChartValueFormat = (typeof valueFormats)[number];

export type ChartDefinition = {
  type: ChartType;
  title: string;
  description?: string;
  xLabel?: string;
  yLabel?: string;
  orientation: ChartOrientation;
  stacked: boolean;
  sort: ChartSort;
  valuePrefix?: string;
  valueSuffix?: string;
  valueFormat: ChartValueFormat;
  source?: string;
  height: number;
  showLegend: boolean;
  showValues: boolean;
  columns: string[];
  rows: Array<Record<string, string | number>>;
  rawRows: string[][];
};

export type ChartDiagnostic = {
  line: number;
  column: number;
  message: string;
};

type ChartAttribute = {
  name?: string;
  value?: unknown;
};

export const CHART_TEMPLATE = `<Chart
  type="line"
  title="Chart title"
  description="Explain what the chart shows."
  xLabel="Category"
  yLabel="Value"
  source="https://example.com/source"
>

Category | Value
Example A | 10
Example B | 20

</Chart>`;

function parseRow(line: string) {
  let value = line.trim();
  const wrapped = value.startsWith("|");
  if (wrapped) value = value.slice(1);
  if (wrapped && value.endsWith("|")) value = value.slice(0, -1);
  return value.split("|").map((cell) => cell.trim());
}

function isSeparatorRow(cells: string[]) {
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

function enumValue<T extends string>(
  value: string | undefined,
  values: readonly T[],
  fallback: T,
  name: string,
  line: number,
  errors: ChartDiagnostic[],
) {
  if (value === undefined) return fallback;
  if (values.includes(value as T)) return value as T;
  errors.push({
    line,
    column: 1,
    message: `Chart ${name} must be ${values.map((item) => `"${item}"`).join(", ")}.`,
  });
  return fallback;
}

function booleanValue(
  value: string | undefined,
  fallback: boolean,
  name: string,
  line: number,
  errors: ChartDiagnostic[],
) {
  if (value === undefined) return fallback;
  if (value === "true" || value === "false") return value === "true";
  errors.push({
    line,
    column: 1,
    message: `Chart ${name} must be "true" or "false".`,
  });
  return fallback;
}

export function formatChartValue(
  value: number,
  definition: Pick<
    ChartDefinition,
    "valueFormat" | "valuePrefix" | "valueSuffix"
  >,
  locale?: string,
) {
  let formatted: string;
  if (definition.valueFormat === "raw") formatted = String(value);
  else if (definition.valueFormat === "integer")
    formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
    }).format(value);
  else if (definition.valueFormat === "decimal")
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value);
  else if (definition.valueFormat === "compact")
    formatted = new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(value);
  else
    formatted = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(value / 100);

  const suffix =
    definition.valueFormat === "percentage" &&
    definition.valueSuffix?.trim() === "%"
      ? ""
      : definition.valueSuffix ?? "";
  return `${definition.valuePrefix ?? ""}${formatted}${suffix}`;
}

export function parseChartDefinition({
  attributes,
  body,
  blockLine,
  bodyLine,
}: {
  attributes: ChartAttribute[];
  body: string;
  blockLine: number;
  bodyLine: number;
}): { definition: ChartDefinition | null; errors: ChartDiagnostic[] } {
  const errors: ChartDiagnostic[] = [];
  const values = new Map<string, string>();
  for (const attribute of attributes) {
    if (
      !attribute.name ||
      !CHART_ATTRIBUTES.includes(
        attribute.name as (typeof CHART_ATTRIBUTES)[number],
      ) ||
      typeof attribute.value !== "string"
    )
      continue;
    if (values.has(attribute.name))
      errors.push({
        line: blockLine,
        column: 1,
        message: `Duplicate Chart attribute: ${attribute.name}.`,
      });
    else values.set(attribute.name, attribute.value.trim());
  }

  const title = values.get("title") ?? "";
  if (!title)
    errors.push({
      line: blockLine,
      column: 1,
      message: "Chart title is required.",
    });
  else if (title.length > 120)
    errors.push({
      line: blockLine,
      column: 1,
      message: "Chart title must be 120 characters or fewer.",
    });

  const description = values.get("description");
  if (description && description.length > 300)
    errors.push({
      line: blockLine,
      column: 1,
      message: "Chart description must be 300 characters or fewer.",
    });

  for (const name of ["xLabel", "yLabel"] as const) {
    if ((values.get(name)?.length ?? 0) > 100)
      errors.push({
        line: blockLine,
        column: 1,
        message: `Chart ${name} must be 100 characters or fewer.`,
      });
  }
  for (const name of ["valuePrefix", "valueSuffix"] as const) {
    if ((values.get(name)?.length ?? 0) > 40)
      errors.push({
        line: blockLine,
        column: 1,
        message: `Chart ${name} must be 40 characters or fewer.`,
      });
  }

  const type = enumValue(
    values.get("type"),
    CHART_TYPES,
    "line",
    "type",
    blockLine,
    errors,
  );
  let orientation = enumValue(
    values.get("orientation"),
    orientations,
    "vertical",
    "orientation",
    blockLine,
    errors,
  );
  const sort = enumValue(
    values.get("sort"),
    sortOrders,
    "none",
    "sort",
    blockLine,
    errors,
  );
  const valueFormat = enumValue(
    values.get("valueFormat"),
    valueFormats,
    "raw",
    "valueFormat",
    blockLine,
    errors,
  );
  const requestedStacked = booleanValue(
    values.get("stacked"),
    false,
    "stacked",
    blockLine,
    errors,
  );
  const showValues = booleanValue(
    values.get("showValues"),
    false,
    "showValues",
    blockLine,
    errors,
  );

  const source = values.get("source");
  if (source && source.length > 2048)
    errors.push({
      line: blockLine,
      column: 1,
      message: "Chart source URL must be 2048 characters or fewer.",
    });
  else if (source && !isHttpsUrl(source))
    errors.push({
      line: blockLine,
      column: 1,
      message: "Chart source must be a valid https:// URL without credentials.",
    });

  let requestedHeight: number | undefined;
  if (values.has("height")) {
    requestedHeight = Number(values.get("height"));
    if (
      !Number.isInteger(requestedHeight) ||
      requestedHeight < 240 ||
      requestedHeight > 640
    )
      errors.push({
        line: blockLine,
        column: 1,
        message: 'Chart height must be a quoted integer from "240" to "640".',
      });
  }

  if (/<\/?[A-Za-z][^>]*>/.test(body))
    errors.push({
      line: bodyLine,
      column: 1,
      message: "Nested article blocks and HTML are not allowed inside <Chart>.",
    });

  const lines = body
    .split(/\r?\n/)
    .map((line, index) => ({
      line: bodyLine + index,
      value: line.trim(),
    }))
    .filter((line) => line.value);

  if (!lines.length) {
    errors.push({
      line: bodyLine,
      column: 1,
      message: "Chart dataset is empty.",
    });
    return { definition: null, errors };
  }

  const header = parseRow(lines[0].value);
  if (isSeparatorRow(header)) {
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Chart dataset is missing a header row.",
    });
    return { definition: null, errors };
  }
  if (header.length < 2)
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Chart datasets require at least two columns.",
    });
  if (header.some((cell) => !cell))
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Chart column names cannot be empty.",
    });
  if (header.some((cell) => cell.length > 100))
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Chart cells must be 100 characters or fewer.",
    });
  const normalizedHeaders = header.map((cell) => cell.toLocaleLowerCase("en"));
  const duplicate = normalizedHeaders.find(
    (cell, index) => normalizedHeaders.indexOf(cell) !== index,
  );
  if (duplicate)
    errors.push({
      line: lines[0].line,
      column: 1,
      message: `Duplicate Chart column name: ${header[normalizedHeaders.indexOf(duplicate)]}.`,
    });

  const dataLines =
    lines[1] && isSeparatorRow(parseRow(lines[1].value))
      ? lines.slice(2)
      : lines.slice(1);
  if (dataLines.length < 2)
    errors.push({
      line: dataLines[0]?.line ?? lines[0].line,
      column: 1,
      message: "Chart datasets require at least two data rows.",
    });
  if (dataLines.length > 50)
    errors.push({
      line: dataLines[50].line,
      column: 1,
      message: "Charts support at most 50 data rows.",
    });
  if (type !== "fleet-timeline" && header.length - 1 > 8)
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Charts support at most eight numeric series.",
    });

  const rows: Array<Record<string, string | number>> = [];
  const rawRows: string[][] = [];
  for (const dataLine of dataLines.slice(0, 51)) {
    const cells = parseRow(dataLine.value);
    if (cells.length !== header.length) {
      errors.push({
        line: dataLine.line,
        column: 1,
        message: `Chart row has ${cells.length} cells; expected ${header.length}.`,
      });
      continue;
    }
    if (cells.some((cell) => cell.length > 100)) {
      errors.push({
        line: dataLine.line,
        column: 1,
        message: "Chart cells must be 100 characters or fewer.",
      });
      continue;
    }
    if (!cells[0]) {
      errors.push({
        line: dataLine.line,
        column: 1,
        message: "Chart category values cannot be empty.",
      });
      continue;
    }

    const row: Record<string, string | number> = { [header[0]]: cells[0] };
    if (type === "fleet-timeline") {
      for (let index = 1; index < header.length; index += 1)
        row[header[index]] = cells[index];
    } else {
      for (let index = 1; index < header.length; index += 1) {
        const value = Number(cells[index]);
        if (!cells[index] || !Number.isFinite(value))
          errors.push({
            line: dataLine.line,
            column: 1,
            message: `Chart value "${cells[index]}" in "${header[index]}" must be a finite number.`,
          });
        else if (valueFormat === "percentage" && (value < 0 || value > 100))
          errors.push({
            line: dataLine.line,
            column: 1,
            message: `Percentage value "${cells[index]}" must be between 0 and 100.`,
          });
        row[header[index]] = value;
      }
    }
    rows.push(row);
    rawRows.push(cells);
  }

  if (type === "fleet-timeline") {
    const required = ["Aircraft", "Entered service", "Retired"];
    if (
      header.length !== required.length ||
      required.some((column, index) => header[index] !== column)
    )
      errors.push({
        line: lines[0].line,
        column: 1,
        message:
          "Fleet timeline columns must be Aircraft | Entered service | Retired.",
      });
    else {
      rows.forEach((row, index) => {
        const entered = Number(row["Entered service"]);
        const retiredValue = String(row.Retired);
        const retired = retiredValue ? Number(retiredValue) : null;
        const line = dataLines[index]?.line ?? bodyLine;
        if (!Number.isInteger(entered) || entered < 1900 || entered > 2200)
          errors.push({
            line,
            column: 1,
            message: "Entered service must be a four-digit year.",
          });
        if (
          retired !== null &&
          (!Number.isInteger(retired) ||
            retired < entered ||
            retired > 2200)
        )
          errors.push({
            line,
            column: 1,
            message:
              "Retired must be empty or a four-digit year no earlier than entered service.",
          });
        row["Entered service"] = entered;
        row.Retired = retired ?? "";
      });
    }
  }

  const seriesCount = Math.max(0, header.length - 1);
  const stacked = type === "stacked-bar" || requestedStacked;
  if (
    requestedStacked &&
    !["bar", "area", "stacked-bar"].includes(type)
  )
    errors.push({
      line: blockLine,
      column: 1,
      message:
        'Chart stacked="true" is supported only for bar, stacked-bar, and area charts.',
    });
  if (
    orientation === "horizontal" &&
    !["bar", "stacked-bar"].includes(type)
  )
    errors.push({
      line: blockLine,
      column: 1,
      message:
        'Chart orientation="horizontal" is supported only for bar and stacked-bar charts.',
    });
  if (stacked && type !== "fleet-timeline" && seriesCount < 2)
    errors.push({
      line: lines[0].line,
      column: 1,
      message: "Stacked charts require at least two numeric series.",
    });

  if (type === "donut") {
    if (seriesCount !== 1)
      errors.push({
        line: lines[0].line,
        column: 1,
        message: "Donut charts require exactly one numeric series.",
      });
    if (rows.length > 6)
      errors.push({
        line: dataLines[6]?.line ?? lines[0].line,
        column: 1,
        message: "Donut charts support at most six categories.",
      });
    if (
      seriesCount === 1 &&
      rows.some((row) => Number(row[header[1]]) < 0)
    )
      errors.push({
        line: bodyLine,
        column: 1,
        message: "Donut chart values cannot be negative.",
      });
    if (
      seriesCount === 1 &&
      rows.reduce((sum, row) => sum + Number(row[header[1]]), 0) <= 0
    )
      errors.push({
        line: bodyLine,
        column: 1,
        message: "Donut chart values must have a positive total.",
      });
  }

  let showLegend = booleanValue(
    values.get("showLegend"),
    seriesCount > 1 || type === "donut",
    "showLegend",
    blockLine,
    errors,
  );
  if (type === "stacked-bar" && !showLegend) {
    errors.push({
      line: blockLine,
      column: 1,
      message: 'Stacked-bar charts require showLegend="true".',
    });
    showLegend = true;
  }

  if (
    type === "bar" &&
    rows.length >= 6 &&
    !values.has("orientation")
  )
    orientation = "horizontal";

  const pairs = rows.map((row, index) => ({
    row,
    raw: rawRows[index],
  }));
  if (sort !== "none") {
    const key =
      type === "fleet-timeline" ? "Entered service" : header[1] ?? header[0];
    pairs.sort((left, right) => {
      const difference = Number(left.row[key]) - Number(right.row[key]);
      return sort === "ascending" ? difference : -difference;
    });
  }

  if (errors.length) return { definition: null, errors };

  const defaultHeight =
    type === "fleet-timeline"
      ? Math.min(640, Math.max(300, rows.length * 44 + 80))
      : type === "donut"
      ? 340
      : orientation === "horizontal"
        ? Math.min(640, Math.max(320, rows.length * 46 + 100))
        : 360;
  return {
    definition: {
      type,
      title,
      description: description || undefined,
      xLabel: values.get("xLabel") || undefined,
      yLabel: values.get("yLabel") || undefined,
      orientation,
      stacked,
      sort,
      valuePrefix: values.get("valuePrefix") || undefined,
      valueSuffix: values.get("valueSuffix") || undefined,
      valueFormat,
      source,
      height: requestedHeight ?? defaultHeight,
      showLegend,
      showValues,
      columns: header,
      rows: pairs.map((pair) => pair.row),
      rawRows: pairs.map((pair) => pair.raw),
    },
    errors,
  };
}

export function chartVerificationData(definition: ChartDefinition) {
  return {
    type: definition.type,
    title: definition.title,
    description: definition.description,
    labels: {
      x: definition.xLabel,
      y: definition.yLabel,
      columns: definition.columns,
    },
    rows: definition.rawRows,
    source: definition.source,
  };
}
