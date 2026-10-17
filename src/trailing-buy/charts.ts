// Static SVG charts for the reports. Each chart is one measure on one y-axis; series take the fixed
// categorical order (blue, orange, aqua) and never more than three per chart; sequential magnitude uses one
// blue ramp; signed differences use the blue <-> red diverging pair with a gray midpoint. Colors are role
// tokens with light and dark values (the SVG follows the viewer's color scheme). Every mark carries a
// <title>, the hover tooltip of a static SVG.
import fs from 'fs-extra';
import { chartsDir } from './constants.ts';

const tokens = `
  .c { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .surface { fill: #fcfcfb; } .ink { fill: #0b0b0b; } .ink2 { fill: #52514e; } .muted { fill: #898781; }
  .grid { stroke: #e1e0d9; } .axis { stroke: #c3c2b7; }
  .s1 { stroke: #2a78d6; } .s2 { stroke: #eb6834; } .s3 { stroke: #1baf7a; }
  .f1 { fill: #2a78d6; } .f2 { fill: #eb6834; } .f3 { fill: #1baf7a; } .ring { stroke: #fcfcfb; }
  @media (prefers-color-scheme: dark) {
    .surface { fill: #1a1a19; } .ink { fill: #f0efec; } .ink2 { fill: #c3c2b7; }
    .grid { stroke: #2c2c2a; } .axis { stroke: #383835; }
    .s1 { stroke: #3987e5; } .s2 { stroke: #d95926; } .s3 { stroke: #199e70; }
    .f1 { fill: #3987e5; } .f2 { fill: #d95926; } .f3 { fill: #199e70; } .ring { stroke: #1a1a19; }
  }`;

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const niceTicks = (min: number, max: number, count = 5) => {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((value) => value >= raw)!;
  const ticks: number[] = [];

  // From the step at or below the minimum to the step at or above the maximum, so every mark is inside.
  for (let value = Math.floor(min / step) * step; value < max + step * (1 - 1e-9); value += step) {
    ticks.push(Number(value.toPrecision(12)));
  }

  return ticks;
};

export const dollars = (value: number) =>
  Math.abs(value) >= 1000 ? `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value) / 1000)}k` : `$${Math.round(value)}`;

const frame = (
  width: number,
  height: number,
  title: string,
  subtitle: string,
  body: string
) => `<svg xmlns="http://www.w3.org/2000/svg" class="c" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escape(title)}">
<style>${tokens}</style>
<rect class="surface" width="${width}" height="${height}" rx="6"/>
<text class="ink" x="16" y="26" font-size="15" font-weight="600">${escape(title)}</text>
<text class="ink2" x="16" y="45" font-size="12">${escape(subtitle)}</text>
${body}
</svg>
`;

export interface LineSeries {
  name: string;
  values: number[]; // aligned with the dates; NaN = gap
}

export const lineChart = (options: {
  title: string;
  subtitle: string;
  dates: string[];
  series: LineSeries[];
  format?: (value: number) => string;
  width?: number;
  height?: number;
  // Category x-axis (e.g. parameter values) instead of dates: label every `tickEvery`-th value.
  categories?: { label: string; tickEvery: number };
}) => {
  const { dates, series } = options;
  const format = options.format ?? dollars;
  const width = options.width ?? 900;
  const height = options.height ?? 380;
  const left = 64;
  const right = 150;
  const top = 64;
  const bottom = 40;
  const all = series.flatMap((line) => line.values.filter(Number.isFinite));
  const ticks = niceTicks(Math.min(0, ...all), Math.max(...all));
  const yMin = ticks[0]!;
  const yMax = ticks.at(-1)!;
  const x = (index: number) => left + (index / Math.max(1, dates.length - 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - yMin) / (yMax - yMin || 1)) * (height - top - bottom);
  let body = '';

  for (const tick of ticks) {
    body += `<line class="${tick === 0 ? 'axis' : 'grid'}" x1="${left}" x2="${width - right}" y1="${y(tick)}" y2="${y(tick)}" stroke-width="1"/>`;
    body += `<text class="muted" x="${left - 8}" y="${y(tick) + 4}" font-size="11" text-anchor="end">${escape(format(tick))}</text>`;
  }

  let lastYear = '';

  dates.forEach((date, index) => {
    const label = options.categories ? (index % options.categories.tickEvery === 0 ? date : '') : date.slice(0, 4);

    if (options.categories ? label : label !== lastYear) {
      lastYear = label;
      body += `<text class="muted" x="${x(index)}" y="${height - bottom + 18}" font-size="11" text-anchor="middle">${escape(label)}</text>`;
    }
  });

  if (options.categories) {
    body += `<text class="ink2" x="${(left + width - right) / 2}" y="${height - 4}" font-size="12" text-anchor="middle">${escape(options.categories.label)}</text>`;
  }

  const labelSlots: number[] = [];

  series.slice(0, 3).forEach((line, position) => {
    let path = '';
    let pen = false;

    line.values.forEach((value, index) => {
      if (!Number.isFinite(value)) {
        pen = false;
        return;
      }

      path += `${pen ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`;
      pen = true;
    });
    body += `<path class="s${position + 1}" d="${path}" fill="none" stroke-width="2" stroke-linejoin="round"/>`;

    // Hover points: about one per 20 sessions, invisible but with a tooltip.
    const stride = Math.max(1, Math.floor(dates.length / 120));

    for (let index = 0; index < dates.length; index += stride) {
      const value = line.values[index]!;

      if (Number.isFinite(value)) {
        body += `<circle cx="${x(index).toFixed(1)}" cy="${y(value).toFixed(1)}" r="6" fill="transparent"><title>${escape(`${line.name} · ${dates[index]} · ${format(value)}`)}</title></circle>`;
      }
    }

    // Direct label at the line end, nudged apart from the other labels.
    const lastIndex = line.values.map(Number.isFinite).lastIndexOf(true);
    let labelY = y(line.values[lastIndex]!) + 4;

    while (labelSlots.some((slot) => Math.abs(slot - labelY) < 14)) {
      labelY += 14;
    }

    labelSlots.push(labelY);
    body += `<rect class="f${position + 1}" x="${width - right + 8}" y="${labelY - 9}" width="10" height="10" rx="2"/>`;
    body += `<text class="ink" x="${width - right + 22}" y="${labelY}" font-size="11">${escape(line.name)} ${escape(format(line.values[lastIndex]!))}</text>`;
  });

  return frame(width, height, options.title, options.subtitle, body);
};

export interface ScatterPoint {
  x: number;
  y: number;
  group: number; // 0, 1 or 2: categorical slot
  label?: string; // drawn next to the point
  tip: string;
}

export const scatterChart = (options: {
  title: string;
  subtitle: string;
  points: ScatterPoint[];
  groups: string[];
  xLabel: string;
  yLabel: string;
  xFormat?: (value: number) => string;
  yFormat?: (value: number) => string;
  width?: number;
  height?: number;
}) => {
  const width = options.width ?? 900;
  const height = options.height ?? 460;
  const left = 70;
  const right = 24;
  const top = 86;
  const bottom = 52;
  const xFormat = options.xFormat ?? dollars;
  const yFormat = options.yFormat ?? dollars;
  const xs = niceTicks(
    Math.min(...options.points.map((point) => point.x)),
    Math.max(...options.points.map((point) => point.x))
  );
  const ys = niceTicks(
    Math.min(...options.points.map((point) => point.y)),
    Math.max(...options.points.map((point) => point.y))
  );
  const x = (value: number) => left + ((value - xs[0]!) / (xs.at(-1)! - xs[0]! || 1)) * (width - left - right);
  const y = (value: number) => top + (1 - (value - ys[0]!) / (ys.at(-1)! - ys[0]! || 1)) * (height - top - bottom);
  let body = '';

  for (const tick of ys) {
    body += `<line class="grid" x1="${left}" x2="${width - right}" y1="${y(tick)}" y2="${y(tick)}"/>`;
    body += `<text class="muted" x="${left - 8}" y="${y(tick) + 4}" font-size="11" text-anchor="end">${escape(yFormat(tick))}</text>`;
  }

  for (const tick of xs) {
    body += `<line class="grid" x1="${x(tick)}" x2="${x(tick)}" y1="${top}" y2="${height - bottom}"/>`;
    body += `<text class="muted" x="${x(tick)}" y="${height - bottom + 16}" font-size="11" text-anchor="middle">${escape(xFormat(tick))}</text>`;
  }

  body += `<text class="ink2" x="${(left + width - right) / 2}" y="${height - 12}" font-size="12" text-anchor="middle">${escape(options.xLabel)}</text>`;
  body += `<text class="ink2" x="16" y="${top - 12}" font-size="12">${escape(options.yLabel)}</text>`;
  options.groups.slice(0, 3).forEach((group, index) => {
    body += `<circle class="f${index + 1}" cx="${24 + index * 200}" cy="62" r="5"/><text class="ink2" x="${34 + index * 200}" y="66" font-size="12">${escape(group)}</text>`;
  });

  // Small groups last, so highlighted points sit on top.
  const ordered = [...options.points].sort(
    (a, b) => Number(Boolean(a.label)) - Number(Boolean(b.label)) || a.group - b.group
  );

  for (const point of ordered) {
    const radius = point.label ? 5 : 3;

    body += `<circle class="f${point.group + 1} ring" cx="${x(point.x).toFixed(1)}" cy="${y(point.y).toFixed(1)}" r="${radius}" stroke-width="${point.label ? 2 : 0.5}" fill-opacity="${point.label ? 1 : 0.55}"><title>${escape(point.tip)}</title></circle>`;

    if (point.label) {
      body += `<text class="ink" x="${x(point.x) + 8}" y="${y(point.y) - 6}" font-size="11">${escape(point.label)}</text>`;
    }
  }

  return frame(width, height, options.title, options.subtitle, body);
};

const lerp = (a: number[], b: number[], t: number) =>
  a.map((value, index) => Math.round(value + (b[index]! - value) * t));
const hex = (rgb: number[]) => `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
const rgb = (code: string) => [1, 3, 5].map((offset) => parseInt(code.slice(offset, offset + 2), 16));
const blueRamp = ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95', '#0d366b'].map(rgb);
const redRamp = ['#fbd5d3', '#f4a3a0', '#e66767', '#d03b3b', '#a32b2b'].map(rgb);
const neutral = rgb('#f0efec');

const sequential = (t: number) => {
  const position = Math.min(1, Math.max(0, t)) * (blueRamp.length - 1);
  const lower = Math.floor(position);

  return hex(lerp(blueRamp[lower]!, blueRamp[Math.min(blueRamp.length - 1, lower + 1)]!, position - lower));
};

const divergingColor = (t: number) => {
  // t in [-1, 1]: negative = red arm, positive = blue arm, 0 = neutral gray.
  const ramp = t < 0 ? redRamp : blueRamp.slice(0, 5);
  const magnitude = Math.min(1, Math.abs(t));

  if (magnitude < 0.04) {
    return hex(neutral);
  }

  const position = magnitude * (ramp.length - 1);
  const lower = Math.floor(position);
  const from = lower === 0 ? lerp(neutral, ramp[0]!, position) : ramp[lower]!;

  return hex(lower === 0 ? from : lerp(ramp[lower]!, ramp[Math.min(ramp.length - 1, lower + 1)]!, position - lower));
};

export const heatmap = (options: {
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  xValues: string[]; // columns
  yValues: string[]; // rows, top to bottom
  cells: number[][]; // [row][column]
  format: (value: number) => string;
  diverging?: { center: number; span: number };
  marks?: { row: number; column: number; label: string }[];
  xTickEvery?: number;
  yTickEvery?: number;
}) => {
  const columns = options.xValues.length;
  const rows = options.yValues.length;
  const cell = Math.max(3, Math.min(14, Math.floor(820 / columns)));
  const cellH = Math.max(3, Math.min(14, Math.floor(560 / rows)));
  const left = 70;
  const top = 90;
  const width = left + columns * cell + 150;
  const height = top + rows * cellH + 56;
  const finite = options.cells.flat().filter(Number.isFinite);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const color = (value: number) =>
    !Number.isFinite(value)
      ? '#c3c2b7'
      : options.diverging
        ? divergingColor((value - options.diverging.center) / options.diverging.span)
        : sequential((value - min) / (max - min || 1));
  let body = '';

  options.cells.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      body += `<rect x="${left + columnIndex * cell}" y="${top + rowIndex * cellH}" width="${cell}" height="${cellH}" fill="${color(value)}"><title>${escape(`${options.yLabel} ${options.yValues[rowIndex]}, ${options.xLabel} ${options.xValues[columnIndex]}: ${options.format(value)}`)}</title></rect>`;
    });
  });

  const xEvery = options.xTickEvery ?? 10;
  const yEvery = options.yTickEvery ?? 10;

  options.xValues.forEach((value, index) => {
    if (index % xEvery === 0) {
      body += `<text class="muted" x="${left + index * cell + cell / 2}" y="${top + rows * cellH + 14}" font-size="10" text-anchor="middle">${escape(value)}</text>`;
    }
  });
  options.yValues.forEach((value, index) => {
    if (index % yEvery === 0) {
      body += `<text class="muted" x="${left - 6}" y="${top + index * cellH + cellH / 2 + 3}" font-size="10" text-anchor="end">${escape(value)}</text>`;
    }
  });
  body += `<text class="ink2" x="${left + (columns * cell) / 2}" y="${top + rows * cellH + 34}" font-size="12" text-anchor="middle">${escape(options.xLabel)}</text>`;
  body += `<text class="ink2" x="16" y="${top - 10}" font-size="12">${escape(options.yLabel)}</text>`;

  for (const mark of options.marks ?? []) {
    const cx = left + mark.column * cell + cell / 2;
    const cy = top + mark.row * cellH + cellH / 2;

    body += `<circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="#0b0b0b" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="5" fill="none" stroke="#fcfcfb" stroke-width="0.8"/>`;
    body += `<text x="${cx + 8}" y="${cy - 6}" font-size="11" font-weight="600" fill="#0b0b0b" stroke="#fcfcfb" stroke-width="3" paint-order="stroke">${escape(mark.label)}</text>`;
  }

  // Legend: a ramp with its end values.
  const legendX = left + columns * cell + 24;

  for (let step = 0; step <= 20; step++) {
    const t = step / 20;
    const value = options.diverging
      ? options.diverging.center + (2 * t - 1) * options.diverging.span
      : min + t * (max - min);

    body += `<rect x="${legendX}" y="${top + (1 - t) * 200}" width="14" height="${200 / 20 + 0.5}" fill="${color(value)}"/>`;
  }

  const legendTop = options.diverging ? options.diverging.center + options.diverging.span : max;
  const legendBottom = options.diverging ? options.diverging.center - options.diverging.span : min;

  body += `<text class="ink2" x="${legendX + 20}" y="${top + 8}" font-size="11">${escape(options.format(legendTop))}${options.diverging ? '+' : ''}</text>`;
  body += `<text class="ink2" x="${legendX + 20}" y="${top + 204}" font-size="11">${escape(options.format(legendBottom))}${options.diverging ? '−' : ''}</text>`;

  if (options.diverging) {
    body += `<text class="ink2" x="${legendX + 20}" y="${top + 104}" font-size="11">${escape(options.format(options.diverging.center))}</text>`;
  }

  return frame(width, height, options.title, options.subtitle, body);
};

// Horizontal signed bars (e.g. P&L difference per episode): blue = better than the comparator, red = worse.
export const divergingBars = (options: {
  title: string;
  subtitle: string;
  rows: { label: string; value: number; tip: string }[];
  format?: (value: number) => string;
}) => {
  const format = options.format ?? dollars;
  const left = 170;
  const right = 90;
  const top = 64;
  const barHeight = 16;
  const gap = 6;
  const width = 900;
  const height = top + options.rows.length * (barHeight + gap) + 30;
  const extent = Math.max(1, ...options.rows.map((row) => Math.abs(row.value)));
  const zero = left + (width - left - right) / 2;
  const scale = (width - left - right) / 2 / extent;
  let body = `<line class="axis" x1="${zero}" x2="${zero}" y1="${top - 6}" y2="${height - 24}" stroke-width="1"/>`;

  options.rows.forEach((row, index) => {
    const y = top + index * (barHeight + gap);
    const length = Math.abs(row.value) * scale;
    const x = row.value >= 0 ? zero : zero - length;
    const fill = row.value >= 0 ? 'f1' : '';

    body += `<text class="ink2" x="${left - 8}" y="${y + 12}" font-size="11" text-anchor="end">${escape(row.label)}</text>`;
    body += `<rect class="${fill}" x="${x.toFixed(1)}" y="${y}" width="${Math.max(1, length).toFixed(1)}" height="${barHeight}" rx="3" ${row.value < 0 ? 'fill="#e34948"' : ''}><title>${escape(row.tip)}</title></rect>`;
    body += `<text class="ink" x="${row.value >= 0 ? x + length + 6 : x - 6}" y="${y + 12}" font-size="11" text-anchor="${row.value >= 0 ? 'start' : 'end'}">${escape(format(row.value))}</text>`;
  });

  return frame(width, height, options.title, options.subtitle, body);
};

// A price path with each strategy's entries (up triangles) and exits (down triangles): blue = the first
// strategy, orange = the second. Marker values are the fill prices.
export const traceChart = (options: {
  title: string;
  subtitle: string;
  dates: string[];
  close: number[];
  strategies: {
    name: string;
    entries: { index: number; price: number }[];
    exits: { index: number; price: number }[];
  }[];
}) => {
  const width = 900;
  const height = 400;
  const left = 64;
  const right = 24;
  const top = 78;
  const bottom = 40;
  const prices = [
    ...options.close,
    ...options.strategies.flatMap((strategy) => [...strategy.entries, ...strategy.exits].map((mark) => mark.price))
  ];
  const ticks = niceTicks(Math.min(...prices), Math.max(...prices));
  const x = (index: number) => left + (index / Math.max(1, options.dates.length - 1)) * (width - left - right);
  const y = (value: number) =>
    top + (1 - (value - ticks[0]!) / (ticks.at(-1)! - ticks[0]! || 1)) * (height - top - bottom);
  let body = '';

  for (const tick of ticks) {
    body += `<line class="grid" x1="${left}" x2="${width - right}" y1="${y(tick)}" y2="${y(tick)}"/>`;
    body += `<text class="muted" x="${left - 8}" y="${y(tick) + 4}" font-size="11" text-anchor="end">$${tick.toFixed(tick < 10 ? 2 : 0)}</text>`;
  }

  let lastMonth = '';

  options.dates.forEach((date, index) => {
    const month = date.slice(0, 7);

    if (month !== lastMonth && (lastMonth === '' || Number(month.slice(5)) % 2 === 1)) {
      body += `<text class="muted" x="${x(index)}" y="${height - bottom + 18}" font-size="11" text-anchor="middle">${month}</text>`;
    }

    if (month !== lastMonth) {
      lastMonth = month;
    }
  });

  body += `<path d="${options.close.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join('')}" fill="none" stroke="#898781" stroke-width="1.5"/>`;
  options.strategies.slice(0, 2).forEach((strategy, position) => {
    const cls = `f${position + 1} ring`;
    const offset = position === 0 ? -1 : 1;

    for (const mark of strategy.entries) {
      const cx = x(mark.index) + offset * 2;
      const cy = y(mark.price);

      body += `<path class="${cls}" stroke-width="1" d="M${cx - 6},${cy + 9} L${cx + 6},${cy + 9} L${cx},${cy + 1} Z"><title>${escape(`${strategy.name} buy ${options.dates[mark.index]} at $${mark.price.toFixed(2)}`)}</title></path>`;
    }

    for (const mark of strategy.exits) {
      const cx = x(mark.index) + offset * 2;
      const cy = y(mark.price);

      body += `<path class="${cls}" stroke-width="1" d="M${cx - 6},${cy - 9} L${cx + 6},${cy - 9} L${cx},${cy - 1} Z"><title>${escape(`${strategy.name} sell ${options.dates[mark.index]} at $${mark.price.toFixed(2)}`)}</title></path>`;
    }

    body += `<path class="f${position + 1}" d="M${24 + position * 260},66 L${36 + position * 260},66 L${30 + position * 260},58 Z"/><text class="ink2" x="${42 + position * 260}" y="66" font-size="12">${escape(strategy.name)} (▲ buy, ▼ sell)</text>`;
  });

  return frame(width, height, options.title, options.subtitle, body);
};

export const writeChart = async (name: string, svg: string) => {
  await fs.ensureDir(chartsDir);
  await fs.writeFile(`${chartsDir}/${name}.svg`, svg);

  return `charts/${name}.svg`;
};
