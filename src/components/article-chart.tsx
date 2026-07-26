"use client";

import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  formatChartValue,
  type ChartDefinition,
} from "@/lib/article-chart";

const chartPalette = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "color-mix(in srgb, var(--chart-1) 65%, var(--foreground))",
  "color-mix(in srgb, var(--chart-3) 65%, var(--foreground))",
  "color-mix(in srgb, var(--chart-4) 65%, var(--foreground))",
] as const;

const linePatterns = [
  undefined,
  "7 3",
  "2 3",
  "9 3 2 3",
  "12 4",
  "4 2",
  "1 3",
  "8 2 1 2",
] as const;

function formattedValue(value: unknown, definition: ChartDefinition) {
  return formatChartValue(Number(value), definition);
}

function sourceHostname(source: string) {
  try {
    const url = new URL(source);
    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

function SeriesLegend({
  items,
}: {
  items: Array<{ label: string; color: string; pattern?: string }>;
}) {
  return (
    <ul
      className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
      aria-label="Chart legend"
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block w-5 border-t-2"
            style={{
              borderColor: item.color,
              borderTopStyle: item.pattern ? "dashed" : "solid",
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

function commonTooltip(definition: ChartDefinition) {
  return (
    <Tooltip
      formatter={(value, name) => [
        formattedValue(value, definition),
        String(name),
      ]}
      contentStyle={{
        background: "var(--popover)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        color: "var(--popover-foreground)",
        fontSize: 12,
      }}
      cursor={{ fill: "var(--muted)", opacity: 0.65 }}
      isAnimationActive="auto"
    />
  );
}

function axisTick(value: unknown, definition: ChartDefinition) {
  return formattedValue(value, definition);
}

function CartesianArticleChart({
  definition,
}: {
  definition: ChartDefinition;
}) {
  const category = definition.columns[0];
  const series = definition.columns.slice(1);
  const legend = series.map((label, index) => ({
    label,
    color: chartPalette[index],
    pattern:
      definition.type === "line" || definition.type === "area"
        ? linePatterns[index]
        : undefined,
  }));
  const labelFormatter = (value: unknown) =>
    formattedValue(value, definition);
  const grid = (
    <CartesianGrid
      stroke="var(--border)"
      strokeDasharray="3 3"
      vertical={definition.orientation === "horizontal"}
    />
  );

  if (definition.type === "line") {
    return (
      <>
        {definition.showLegend && <SeriesLegend items={legend} />}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={definition.rows}
            margin={{ top: 18, right: 24, bottom: 28, left: 8 }}
            accessibilityLayer
          >
            {grid}
            <XAxis
              dataKey={category}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              label={
                definition.xLabel
                  ? {
                      value: definition.xLabel,
                      position: "insideBottom",
                      offset: -16,
                    }
                  : undefined
              }
            />
            <YAxis
              tickFormatter={(value) => axisTick(value, definition)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
              label={
                definition.yLabel
                  ? {
                      value: definition.yLabel,
                      angle: -90,
                      position: "insideLeft",
                    }
                  : undefined
              }
            />
            {commonTooltip(definition)}
            {series.map((name, index) => (
              <Line
                key={name}
                dataKey={name}
                name={name}
                type="monotone"
                stroke={chartPalette[index]}
                strokeWidth={2.25}
                strokeDasharray={linePatterns[index]}
                dot={definition.rows.length <= 12}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              >
                {definition.showValues && (
                  <LabelList
                    dataKey={name}
                    position="top"
                    formatter={labelFormatter}
                    className="fill-foreground text-[10px]"
                  />
                )}
              </Line>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </>
    );
  }

  if (definition.type === "area") {
    return (
      <>
        {definition.showLegend && <SeriesLegend items={legend} />}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={definition.rows}
            margin={{ top: 18, right: 24, bottom: 28, left: 8 }}
            accessibilityLayer
          >
            {grid}
            <XAxis
              dataKey={category}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              label={
                definition.xLabel
                  ? {
                      value: definition.xLabel,
                      position: "insideBottom",
                      offset: -16,
                    }
                  : undefined
              }
            />
            <YAxis
              tickFormatter={(value) => axisTick(value, definition)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={72}
              label={
                definition.yLabel
                  ? {
                      value: definition.yLabel,
                      angle: -90,
                      position: "insideLeft",
                    }
                  : undefined
              }
            />
            {commonTooltip(definition)}
            {series.map((name, index) => (
              <Area
                key={name}
                dataKey={name}
                name={name}
                type="monotone"
                stackId={definition.stacked ? "chart" : undefined}
                stroke={chartPalette[index]}
                strokeWidth={2}
                strokeDasharray={linePatterns[index]}
                fill={chartPalette[index]}
                fillOpacity={series.length > 1 ? 0.12 : 0.2}
                isAnimationActive={false}
              >
                {definition.showValues && (
                  <LabelList
                    dataKey={name}
                    position="top"
                    formatter={labelFormatter}
                    className="fill-foreground text-[10px]"
                  />
                )}
              </Area>
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </>
    );
  }

  const horizontal = definition.orientation === "horizontal";
  return (
    <>
      {definition.showLegend && <SeriesLegend items={legend} />}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={definition.rows}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{
            top: 18,
            right: horizontal ? 68 : 24,
            bottom: 28,
            left: horizontal ? 12 : 8,
          }}
          accessibilityLayer
        >
          {grid}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tickFormatter={(value) => axisTick(value, definition)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                label={
                  definition.xLabel
                    ? {
                        value: definition.xLabel,
                        position: "insideBottom",
                        offset: -16,
                      }
                    : undefined
                }
              />
              <YAxis
                type="category"
                dataKey={category}
                width={112}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={
                  definition.yLabel
                    ? {
                        value: definition.yLabel,
                        angle: -90,
                        position: "insideLeft",
                      }
                    : undefined
                }
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={category}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                label={
                  definition.xLabel
                    ? {
                        value: definition.xLabel,
                        position: "insideBottom",
                        offset: -16,
                      }
                    : undefined
                }
              />
              <YAxis
                type="number"
                tickFormatter={(value) => axisTick(value, definition)}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={72}
                label={
                  definition.yLabel
                    ? {
                        value: definition.yLabel,
                        angle: -90,
                        position: "insideLeft",
                      }
                    : undefined
                }
              />
            </>
          )}
          {commonTooltip(definition)}
          {series.map((name, index) => (
            <Bar
              key={name}
              dataKey={name}
              name={name}
              stackId={definition.stacked ? "chart" : undefined}
              fill={chartPalette[index]}
              radius={definition.stacked ? 0 : 3}
              isAnimationActive={false}
            >
              {definition.showValues && (
                <LabelList
                  dataKey={name}
                  position={horizontal ? "right" : "top"}
                  formatter={labelFormatter}
                  className="fill-foreground text-[10px]"
                />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

function DonutArticleChart({
  definition,
}: {
  definition: ChartDefinition;
}) {
  const category = definition.columns[0];
  const series = definition.columns[1];
  const total = definition.rows.reduce(
    (sum, row) => sum + Number(row[series]),
    0,
  );
  const legend = definition.rows.map((row, index) => ({
    label: String(row[category]),
    color: chartPalette[index],
  }));

  return (
    <>
      {definition.showLegend && <SeriesLegend items={legend} />}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer>
          <Pie
            data={definition.rows}
            dataKey={series}
            nameKey={category}
            cx="50%"
            cy="50%"
            innerRadius="54%"
            outerRadius="78%"
            paddingAngle={2}
            label={(label) =>
              definition.showValues
                ? `${String(label.name)}: ${formattedValue(label.value, definition)}`
                : String(label.name)
            }
            labelLine
            isAnimationActive={false}
          >
            {definition.rows.map((row, index) => (
              <Cell
                key={String(row[category])}
                fill={chartPalette[index]}
                stroke="var(--card)"
                strokeWidth={2}
              />
            ))}
          </Pie>
          {commonTooltip(definition)}
          <text
            x="50%"
            y="48%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--foreground)"
            className="text-base font-semibold"
          >
            {formattedValue(total, definition)}
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted-foreground)"
            className="text-[10px]"
          >
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>
    </>
  );
}

function FleetTimeline({ definition }: { definition: ChartDefinition }) {
  const currentYear = new Date().getFullYear();
  const entered = definition.rows.map((row) =>
    Number(row["Entered service"]),
  );
  const retired = definition.rows.flatMap((row) =>
    row.Retired === "" ? [] : [Number(row.Retired)],
  );
  const minimum = Math.min(...entered);
  const maximum = Math.max(currentYear, ...retired);
  const range = Math.max(1, maximum - minimum);
  const midpoint = Math.round(minimum + range / 2);

  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`${definition.title}. Timeline from ${minimum} to ${maximum}.`}
    >
      <div className="grid grid-cols-[minmax(90px,140px)_minmax(0,1fr)] items-end gap-3 text-[10px] text-muted-foreground">
        <span />
        <div className="flex justify-between" aria-hidden="true">
          <span>{minimum}</span>
          <span>{midpoint}</span>
          <span>{maximum}</span>
        </div>
      </div>
      {definition.rows.map((row) => {
        const aircraft = String(row.Aircraft);
        const start = Number(row["Entered service"]);
        const end = row.Retired === "" ? currentYear : Number(row.Retired);
        const active = row.Retired === "";
        const left = ((start - minimum) / range) * 100;
        const width = Math.max(1.5, ((end - start) / range) * 100);
        return (
          <div
            key={`${aircraft}-${start}`}
            className="grid grid-cols-[minmax(90px,140px)_minmax(0,1fr)] items-center gap-3"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-medium" title={aircraft}>
                {aircraft}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {start}–{active ? "Active" : end}
              </p>
            </div>
            <div className="relative h-7 rounded bg-muted">
              <span
                tabIndex={0}
                className={`absolute top-1 h-5 min-w-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-2 border-dashed border-foreground/45" : ""}`}
                style={{
                  left: `${left}%`,
                  width: `${Math.min(100 - left, width)}%`,
                  backgroundColor: active
                    ? chartPalette[2]
                    : chartPalette[0],
                }}
                aria-label={`${aircraft}: entered service ${start}; ${active ? "still active" : `retired ${end}`}.`}
              />
            </div>
          </div>
        );
      })}
      {definition.showLegend && (
        <SeriesLegend
          items={[
            { label: "Retired", color: chartPalette[0] },
            { label: "Active", color: chartPalette[2], pattern: "dashed" },
          ]}
        />
      )}
    </div>
  );
}

function ChartDataTable({
  definition,
  id,
  visible,
}: {
  definition: ChartDefinition;
  id: string;
  visible: boolean;
}) {
  return (
    <div id={id} hidden={!visible} className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b">
            {definition.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-3 py-2 font-semibold"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {definition.rawRows.map((row, rowIndex) => (
            <tr key={`${row[0]}-${rowIndex}`} className="border-b last:border-0">
              {row.map((value, columnIndex) => {
                const numeric =
                  definition.type !== "fleet-timeline" &&
                  columnIndex > 0 &&
                  Number.isFinite(Number(value));
                const formatted = numeric
                  ? formattedValue(Number(value), definition)
                  : value;
                return (
                  <td
                    key={`${definition.columns[columnIndex]}-${columnIndex}`}
                    className="px-3 py-2 align-top"
                  >
                    {value}
                    {numeric && formatted !== value && (
                      <span className="block text-[10px] text-muted-foreground">
                        {formatted}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UnavailableArticleChart() {
  return (
    <aside
      className="my-6 rounded-xl border bg-muted/35 p-5 text-sm text-muted-foreground"
      role="status"
    >
      This chart is unavailable because its data could not be rendered safely.
    </aside>
  );
}

export function ArticleChart({
  definition,
}: {
  definition: ChartDefinition;
}) {
  const [showData, setShowData] = useState(false);
  const id = useId().replaceAll(":", "");
  const titleId = `chart-title-${id}`;
  const descriptionId = `chart-description-${id}`;
  const tableId = `chart-data-${id}`;
  const valid =
    definition.columns.length >= 2 &&
    definition.rows.length >= 2 &&
    definition.rawRows.length === definition.rows.length &&
    (!definition.source || sourceHostname(definition.source));

  if (!valid) return <UnavailableArticleChart />;

  return (
    <figure
      className="my-7 min-w-0 overflow-hidden rounded-xl border bg-card shadow-xs"
      aria-labelledby={titleId}
      aria-describedby={definition.description ? descriptionId : undefined}
    >
      <figcaption className="border-b px-5 py-4 sm:px-6">
        <h3 id={titleId} className="text-base font-semibold">
          {definition.title}
        </h3>
        {definition.description && (
          <p
            id={descriptionId}
            className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground"
          >
            {definition.description}
          </p>
        )}
      </figcaption>
      <div className="min-w-0 px-2 pb-2 pt-4 sm:px-5">
        <div
          className="min-w-0"
          style={
            definition.type === "fleet-timeline"
              ? { minHeight: definition.height }
              : { height: definition.height }
          }
          role={definition.type === "fleet-timeline" ? undefined : "img"}
          aria-label={
            definition.type === "fleet-timeline"
              ? undefined
              : `${definition.title}. ${definition.type} chart with ${definition.rows.length} data rows.`
          }
          tabIndex={definition.type === "fleet-timeline" ? undefined : 0}
        >
          {definition.type === "donut" ? (
            <DonutArticleChart definition={definition} />
          ) : definition.type === "fleet-timeline" ? (
            <FleetTimeline definition={definition} />
          ) : (
            <CartesianArticleChart definition={definition} />
          )}
        </div>
      </div>
      <div className="border-t bg-muted/25 px-5 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {definition.source ? (
            <a
              href={definition.source}
              target="_blank"
              rel="noreferrer"
              className="break-all text-xs font-medium text-primary hover:underline"
            >
              Source: {sourceHostname(definition.source)}
            </a>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={showData}
            aria-controls={tableId}
            onClick={() => setShowData((visible) => !visible)}
          >
            {showData ? "Hide data" : "View data"}
          </Button>
        </div>
        <ChartDataTable
          definition={definition}
          id={tableId}
          visible={showData}
        />
      </div>
    </figure>
  );
}
