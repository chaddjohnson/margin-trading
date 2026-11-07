// Report charts for research/vg-balanced-entry-eligibility (post-freeze helper; reads results only, writes
// results/charts/charts.html). Self-contained HTML with inline SVG, light/dark tokens, a crosshair tooltip on the line
// charts and per-point tooltips on the scatter. Run from the repository root:
//   node --experimental-transform-types tools/vg-balanced-entry-eligibility/charts.ts
import fs from 'node:fs';
import path from 'node:path';

const root = 'research/vg-balanced-entry-eligibility/results';
const csv = (file: string) => {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const keys = head!.split(',');

  return lines.map((line) => Object.fromEntries(line.split(',').map((v, i) => [keys[i]!, v])));
};
const equity = (dir: string) =>
  csv(path.join(dir, 'daily-equity.csv')).map((r) => ({ date: r.date!, v: Number(r.equity) }));

const dev = {
  off: equity(`${root}/diagnostics/D24/OFF`),
  ref: equity(`${root}/diagnostics/D24/VGT+GDX_A20_E5.0_`)
};
const full = {
  off: equity(`${root}/validation/OFF`),
  ref: equity(`${root}/validation/VGT+GDX_A20_E5.0_`)
};
const diag = JSON.parse(fs.readFileSync(`${root}/diagnostics/D24/diagnostics.json`, 'utf8'));
const points = csv(`${root}/diagnostics/D24/d1-stress-points.csv`).filter((r) => r.subject!.startsWith('VGT+GDX'));
const centre = diag.comparisons[0];

const underwater = (series: { date: string; v: number }[]) => {
  let peak = -Infinity;

  return series.map((p) => {
    peak = Math.max(peak, p.v);
    return { date: p.date, v: p.v - peak };
  });
};

// Nice-number ticks covering [lo, hi].
const niceTicks = (lo: number, hi: number, count = 5) => {
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((m) => m >= raw)!;
  const first = Math.floor(lo / step) * step;
  const last = Math.ceil(hi / step) * step;

  return Array.from({ length: Math.round((last - first) / step) + 1 }, (_v, i) => first + i * step);
};

const W = 760;
const H = 300;
const M = { l: 64, r: 120, t: 16, b: 32 };
const k = (v: number) => `${v < 0 ? '−' : ''}$${Math.abs(v / 1000).toFixed(0)}k`;

const lineChart = (
  id: string,
  a: { date: string; v: number }[],
  b: { date: string; v: number }[],
  names: [string, string],
  marker?: { date: string; label: string }
) => {
  const n = a.length;
  const values = [...a, ...b].map((p) => p.v);
  const grid = niceTicks(Math.min(0, ...values), Math.max(0, ...values), 7);
  const lo = grid[0]!;
  const hi = grid.at(-1)!;
  const x = (i: number) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - (v - lo) / (hi - lo || 1)) * (H - M.t - M.b);
  const d = (s: { v: number }[]) => s.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('');
  const years = a
    .map((p, i) => ({ i, year: p.date.slice(0, 4) }))
    .filter((p, i, all) => i === 0 || p.year !== all[i - 1]!.year);
  const markerIndex = marker ? a.findIndex((p) => p.date >= marker.date) : -1;
  const labelY = (v: number, other: number) => {
    const gap = 14;
    const yy = y(v);

    return Math.abs(yy - y(other)) < gap ? (v >= other ? yy - gap / 2 : yy + gap / 2) : yy;
  };

  return `<figure class="chart" id="${id}">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${names[0]} and ${names[1]}">
    ${grid.map((v) => `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${M.l - 8}" y="${y(v) + 4}" text-anchor="end">${k(v)}</text>`).join('')}
    <line class="axis" x1="${M.l}" x2="${W - M.r}" y1="${y(0)}" y2="${y(0)}"/>
    ${years.map((p) => `<text class="tick" x="${x(p.i)}" y="${H - 10}" text-anchor="middle">${p.year}</text>`).join('')}
    ${markerIndex >= 0 ? `<line class="marker" x1="${x(markerIndex)}" x2="${x(markerIndex)}" y1="${M.t}" y2="${H - M.b}"/><text class="tick" x="${x(markerIndex) + 4}" y="${M.t + 10}">${marker!.label}</text>` : ''}
    <path class="s2" d="${d(b)}"/>
    <path class="s1" d="${d(a)}"/>
    <circle class="end s2f" cx="${x(n - 1)}" cy="${y(b[n - 1]!.v)}" r="4"/><circle class="end s1f" cx="${x(n - 1)}" cy="${y(a[n - 1]!.v)}" r="4"/>
    ${
      Math.abs(a[n - 1]!.v - b[n - 1]!.v) < 1
        ? `<text class="label" x="${x(n - 1) + 8}" y="${y(a[n - 1]!.v) + 4}">both ${k(a[n - 1]!.v)}</text>`
        : `<text class="label" x="${x(n - 1) + 8}" y="${labelY(a[n - 1]!.v, b[n - 1]!.v) + 4}">${names[0]} ${k(a[n - 1]!.v)}</text>
    <text class="label" x="${x(n - 1) + 8}" y="${labelY(b[n - 1]!.v, a[n - 1]!.v) + 4}">${names[1]} ${k(b[n - 1]!.v)}</text>`
    }
    <line class="cross" x1="0" x2="0" y1="${M.t}" y2="${H - M.b}" visibility="hidden"/>
    <rect class="hit" x="${M.l}" y="${M.t}" width="${W - M.l - M.r}" height="${H - M.t - M.b}" data-n="${n}" data-l="${M.l}" data-w="${W - M.l - M.r}"/>
  </svg>
  <div class="tip" hidden></div>
  <script type="application/json">${JSON.stringify({ names, dates: a.map((p) => p.date), a: a.map((p) => Math.round(p.v)), b: b.map((p) => Math.round(p.v)) })}</script>
</figure>`;
};

const scatter = () => {
  const xs = points.map((p) => Number(p.variantDd) - Number(p.offDd));
  const ys = points.map((p) => Number(p.delta));
  const gridX = niceTicks(Math.min(0, ...xs, centre.ddDelta), Math.max(...xs, centre.ddDelta));
  const gridY = niceTicks(Math.min(...ys, centre.delta), Math.max(0, ...ys, centre.delta));
  const [x0, x1] = [gridX[0]!, gridX.at(-1)!];
  const [y0, y1] = [gridY[0]!, gridY.at(-1)!];
  const R = 160;
  const B = 52; // room for the tick labels and the axis title
  const x = (v: number) => M.l + ((v - x0) / (x1 - x0)) * (W - M.l - R);
  const y = (v: number) => M.t + 12 + (1 - (v - y0) / (y1 - y0)) * (H - M.t - 12 - B);

  return `<figure class="chart">
  <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="D1 stress: paired change in net against change in minute drawdown">
    ${gridY.map((v) => `<line class="grid" x1="${M.l}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${M.l - 8}" y="${y(v) + 4}" text-anchor="end">${k(v)}</text>`).join('')}
    ${gridX.map((v) => `<text class="tick" x="${x(v)}" y="${H - B + 18}" text-anchor="middle">${k(v)}</text>`).join('')}
    <text class="tick" x="${M.l - 8}" y="${M.t + 2}" text-anchor="end">Δ net</text>
    <line class="axis" x1="${M.l}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
    <line class="axis" x1="${x(0)}" x2="${x(0)}" y1="${M.t + 12}" y2="${H - B}"/>
    ${points
      .map(
        (p, i) =>
          `<circle class="dot" cx="${x(xs[i]!).toFixed(1)}" cy="${y(ys[i]!).toFixed(1)}" r="4"><title>${p.family} #${p.index}: Δ net ${k(ys[i]!)}, Δ minute DD ${k(xs[i]!)}, delayed entries ${p.late}</title></circle>`
      )
      .join('')}
    <rect class="centre" x="${x(centre.ddDelta) - 5}" y="${y(centre.delta) - 5}" width="10" height="10"><title>VG #2 centre (the study's D1 values): Δ net ${k(centre.delta)}, Δ DD ${k(centre.ddDelta)}</title></rect>
    <text class="label" x="${x(centre.ddDelta) + 10}" y="${y(centre.delta) + 4}">VG #2 centre</text>
    <text class="label" x="${W - R + 8}" y="${y(0) - 6}">no change (${points.filter((p) => Math.abs(Number(p.delta)) < 0.005).length} of ${points.length})</text>
    <text class="tick" x="${(M.l + W - R) / 2}" y="${H - 6}" text-anchor="middle">Δ whole-run minute drawdown (variant − OFF)</text>
  </svg>
</figure>`;
};

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entry Eligibility Charts</title>
<style>
:root { color-scheme: light; --surface: #fcfcfb; --page: #f9f9f7; --ink: #0b0b0b; --ink2: #52514e; --muted: #898781; --grid: #e1e0d9; --axis: #c3c2b7; --s1: #2a78d6; --s2: #eb6834; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --surface: #1a1a19; --page: #0d0d0d; --ink: #ffffff; --ink2: #c3c2b7; --muted: #898781; --grid: #2c2c2a; --axis: #383835; --s1: #3987e5; --s2: #d95926; } }
:root[data-theme="dark"] { color-scheme: dark; --surface: #1a1a19; --page: #0d0d0d; --ink: #ffffff; --ink2: #c3c2b7; --muted: #898781; --grid: #2c2c2a; --axis: #383835; --s1: #3987e5; --s2: #d95926; }
body { margin: 0; padding: 16px; background: var(--page); color: var(--ink); font: 14px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 800px; margin: 0 auto; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 24px 0 2px; } p { color: var(--ink2); margin: 0 0 8px; }
.chart { margin: 0; background: var(--surface); border-radius: 8px; padding: 8px; position: relative; }
svg { width: 100%; height: auto; display: block; }
.grid { stroke: var(--grid); stroke-width: 1; } .axis { stroke: var(--axis); stroke-width: 1; }
.tick { fill: var(--muted); font-size: 11px; font-variant-numeric: tabular-nums; } .label { fill: var(--ink2); font-size: 12px; }
.s1, .s2 { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; } .s1 { stroke: var(--s1); } .s2 { stroke: var(--s2); }
.s1f { fill: var(--s1); } .s2f { fill: var(--s2); } .end { stroke: var(--surface); stroke-width: 2; }
.marker { stroke: var(--muted); stroke-width: 1; } .cross { stroke: var(--muted); stroke-width: 1; }
.hit { fill: transparent; } .dot { fill: var(--s1); fill-opacity: 0.75; stroke: var(--surface); stroke-width: 2; }
.centre { fill: var(--s2); stroke: var(--surface); stroke-width: 2; }
.legend { display: flex; gap: 16px; color: var(--ink2); font-size: 12px; margin: 4px 0 6px; } .key { display: inline-block; width: 16px; height: 2px; vertical-align: middle; margin-right: 6px; }
.tip { position: absolute; pointer-events: none; background: var(--surface); color: var(--ink); border: 1px solid var(--grid); border-radius: 6px; padding: 6px 8px; font-size: 12px; font-variant-numeric: tabular-nums; box-shadow: 0 2px 8px rgba(0,0,0,.12); }
</style></head><body><main>
<h1>Bounded entry eligibility for VG #2 Balanced</h1>
<p>Control (OFF) against the most permissive grid configuration (VGT+GDX, A 20, E 5%), the only kind that ever funds a delayed entry. Marked P&amp;L of the fixed $100,000 slot after costs and interest. Tables: REPORT.md.</p>
<div class="legend"><span><i class="key" style="background:var(--s1)"></i>OFF (control)</span><span><i class="key" style="background:var(--s2)"></i>VGT+GDX A20 E5% (reference, never selected)</span></div>
<h2>Development, 2016–2024 (door D24): cumulative marked P&amp;L</h2>
${lineChart('dev', dev.off, dev.ref, ['OFF', 'Reference'])}
<h2>Drawdown from the running peak (daily marks; the minute maxima are $17,281 and $33,641)</h2>
${lineChart('uw', underwater(dev.off), underwater(dev.ref), ['OFF', 'Reference'])}
<h2>Full history to 2026-10-30 (FULL): identical after 2023; validation adds nothing</h2>
${lineChart('full', full.off, full.ref, ['OFF', 'Reference'], { date: '2025-01-02', label: 'validation →' })}
<h2>D1 stress (192 nearby D1 parameter sets, development): paired change against OFF</h2>
<p>Each dot is one D1 point run with and without the reference eligibility setting. Up = more profit; right = deeper whole-run minute drawdown.</p>
${scatter()}
</main>
<script>
for (const fig of document.querySelectorAll('figure.chart')) {
  const data = fig.querySelector('script[type="application/json"]');
  if (!data) continue;
  const d = JSON.parse(data.textContent), svg = fig.querySelector('svg'), hit = fig.querySelector('.hit'), cross = fig.querySelector('.cross'), tip = fig.querySelector('.tip');
  const fmt = (v) => (v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US');
  hit.addEventListener('mousemove', (e) => {
    const box = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, sx = (e.clientX - box.left) * vb.width / box.width;
    const n = +hit.dataset.n, l = +hit.dataset.l, w = +hit.dataset.w, i = Math.max(0, Math.min(n - 1, Math.round((sx - l) / w * (n - 1))));
    const cx = l + i / (n - 1) * w;
    cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
    tip.hidden = false; tip.innerHTML = d.dates[i] + '<br>' + d.names[0] + ' ' + fmt(d.a[i]) + '<br>' + d.names[1] + ' ' + fmt(d.b[i]) + '<br>Δ ' + fmt(d.b[i] - d.a[i]);
    const fx = (cx / vb.width) * box.width; tip.style.left = Math.min(fx + 12, box.width - 160) + 'px'; tip.style.top = '24px';
  });
  hit.addEventListener('mouseleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
}
</script></body></html>`;

fs.mkdirSync(`${root}/charts`, { recursive: true });
fs.writeFileSync(`${root}/charts/charts.html`, html);
console.log(`wrote ${root}/charts/charts.html (${html.length} bytes)`);
