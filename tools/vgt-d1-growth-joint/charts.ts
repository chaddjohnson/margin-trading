// Equity and drawdown charts (report helper; reads ledgers, writes one HTML page; never touches a sealed record).
//
//   node --experimental-transform-types tools/vgt-d1-growth-joint/charts.ts <ledgerDir> <out.html> <title> <NN,NN,…> [boundaryDate]
//
// <ledgerDir> holds NN-daily.csv files and INDEX.md (written by the diagnostics or the validation stage); the listed
// NN are drawn (≤ 4 series: categorical slots 1–4, validated for line charts in both modes). The paths are the marked
// net at each session close; the drawdown panel is measured from the running peak of those closes (the tables report
// the deeper MINUTE drawdowns).
import fs from 'node:fs';
import path from 'node:path';

const [dir, out, title, pick, boundary] = process.argv.slice(2);

if (!dir || !out || !title || !pick)
  throw new Error('usage: charts.ts <ledgerDir> <out.html> <title> <NN,…> [boundary]');

const index = Object.fromEntries(
  fs
    .readFileSync(path.join(dir, 'INDEX.md'), 'utf8')
    .split('\n')
    .filter((l) => /^- \d\d: /.test(l))
    .map((l) => [l.slice(2, 4), l.slice(6).split(' — ')[0]!])
);
const series = pick.split(',').map((item) => {
  const [nn, short] = item.split('=') as [string, string | undefined];

  const rows = fs
    .readFileSync(path.join(dir, `${nn}-daily.csv`), 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => l.split(','));
  let peak = 0;

  return {
    nn,
    label: short ?? index[nn] ?? nn,
    full: index[nn] ?? nn,
    dates: rows.map((r) => r[0]!),
    net: rows.map((r) => Number(r[1])),
    dd: rows.map((r) => {
      const v = Number(r[1]);

      peak = Math.max(peak, v);
      return v - peak;
    })
  };
});

if (series.length > 4) throw new Error('at most 4 series');

const data = {
  dates: series[0]!.dates,
  series: series.map((s, i) => ({ label: s.label, slot: i + 1, net: s.net, dd: s.dd })),
  boundary: boundary ?? null
};
const years = [...new Set(data.dates.map((d) => d.slice(0, 4)))];
const yearly = series.map((s) =>
  years.map((y) => {
    const last = s.dates
      .map((d, i) => [d, i] as const)
      .filter(([d]) => d.slice(0, 4) === y)
      .at(-1)?.[1];
    const prevYear = s.dates
      .map((d, i) => [d, i] as const)
      .filter(([d]) => d.slice(0, 4) < y)
      .at(-1)?.[1];

    return last === undefined ? 0 : s.net[last]! - (prevYear === undefined ? 0 : s.net[prevYear]!);
  })
);
const fmt = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
const esc = (s: string) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
:root { color-scheme: light; --surface:#fcfcfb; --text:#0b0b0b; --text2:#52514e; --muted:#8a8984; --grid:#e7e6e2; --axis:#c9c8c3;
  --s1:#2a78d6; --s2:#eb6834; --s3:#1baf7a; --s4:#eda100; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --surface:#1a1a19; --text:#ffffff; --text2:#c3c2b7; --muted:#8f8e86; --grid:#2c2c2a; --axis:#4a4945;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500; } }
:root[data-theme="dark"] { color-scheme: dark; --surface:#1a1a19; --text:#ffffff; --text2:#c3c2b7; --muted:#8f8e86; --grid:#2c2c2a; --axis:#4a4945;
  --s1:#3987e5; --s2:#d95926; --s3:#199e70; --s4:#c98500; }
body { margin:0; background:var(--surface); color:var(--text); font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif; }
main { max-width:1100px; margin:0 auto; padding:24px 16px 48px; }
h1 { font-size:20px; margin:0 0 4px; } h2 { font-size:15px; margin:28px 0 6px; } p.note { color:var(--text2); margin:0 0 12px; }
.legend { display:flex; flex-wrap:wrap; gap:6px 18px; margin:8px 0 4px; color:var(--text2); }
.legend span::before { content:""; display:inline-block; width:14px; height:3px; border-radius:2px; margin-right:6px; vertical-align:middle; background:var(--c); }
.chart { position:relative; } svg { width:100%; height:auto; display:block; overflow:visible; }
.tip { position:absolute; pointer-events:none; background:var(--surface); border:1px solid var(--axis); border-radius:6px; padding:6px 8px; font-size:12px; color:var(--text); display:none; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.12); }
.tip b { font-weight:600; } .tip i { display:inline-block; width:10px; height:3px; border-radius:2px; margin-right:6px; vertical-align:middle; }
table { border-collapse:collapse; font-size:12px; margin-top:8px; } th, td { padding:3px 8px; text-align:right; border-bottom:1px solid var(--grid); } th:first-child, td:first-child { text-align:left; }
details { margin-top:18px; color:var(--text2); } summary { cursor:pointer; }
</style></head><body><main>
<h1>${esc(title)}</h1>
<p class="note">Marked net (realized + open positions marked at each session close, after costs and interest) on the fixed $100,000 budget. The drawdown panel is measured from the running peak of the session closes; the report's tables give the deeper maximum <em>minute</em> drawdowns.${boundary ? ` The dashed line marks ${esc(boundary)} (development | validation).` : ''}</p>
<div class="legend">${data.series.map((s, i) => `<span style="--c:var(--s${s.slot})" title="${esc(series[i]!.full)}">${esc(s.label)}</span>`).join('')}</div>
<h2>Marked net</h2><div class="chart" id="c1"></div>
<h2>Drawdown from the running peak (session closes)</h2><div class="chart" id="c2"></div>
<details><summary>Table: marked P&amp;L by calendar year</summary>
<table><thead><tr><th>Year</th>${data.series.map((s) => `<th>${esc(s.label)}</th>`).join('')}</tr></thead><tbody>
${years.map((y, i) => `<tr><td>${y}</td>${yearly.map((r) => `<td>${fmt(r[i]!)}</td>`).join('')}</tr>`).join('\n')}
</tbody></table></details>
<script>
const D = ${JSON.stringify(data)};
const fmt = (x) => (x < 0 ? '\\u2212' : '') + '$' + Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 });
const W = 1060, H = 300, M = { l: 70, r: 200, t: 10, b: 26 };
const draw = (id, key) => {
  const el = document.getElementById(id);
  const n = D.dates.length;
  const vals = D.series.flatMap((s) => s[key]);
  let lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const pad = (hi - lo) * 0.05 || 1; lo -= key === 'dd' ? pad : 0; hi += pad;
  const x = (i) => M.l + (i / (n - 1)) * (W - M.l - M.r);
  const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
  const step = Math.pow(10, Math.floor(Math.log10((hi - lo) / 4)));
  const tick = [1, 2, 5, 10].map((m) => m * step).find((s) => (hi - lo) / s <= 6) || step * 10;
  let g = '';
  for (let v = Math.ceil(lo / tick) * tick; v <= hi; v += tick)
    g += '<line x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="var(--grid)" stroke-width="1"/>' +
      '<text x="' + (M.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end" fill="var(--muted)" font-size="11">' + fmt(v) + '</text>';
  let last = '';
  D.dates.forEach((d, i) => { const yr = d.slice(0, 4); if (yr !== last) { last = yr;
    g += '<text x="' + x(i) + '" y="' + (H - 8) + '" fill="var(--muted)" font-size="11">' + yr + '</text>'; } });
  if (D.boundary) { const b = D.dates.indexOf(D.boundary); if (b >= 0) g += '<line x1="' + x(b) + '" x2="' + x(b) + '" y1="' + M.t + '" y2="' + (H - M.b) + '" stroke="var(--axis)" stroke-dasharray="4 4"/>'; }
  g += '<line x1="' + M.l + '" x2="' + (W - M.r) + '" y1="' + y(0) + '" y2="' + y(0) + '" stroke="var(--axis)"/>';
  const labels = D.series.map((s) => ({ s, v: s[key][n - 1] })).sort((a, b) => b.v - a.v);
  let prevY = -Infinity;
  for (const { s } of D.series.map((s) => ({ s }))) {
    const pts = s[key].map((v, i) => x(i).toFixed(1) + ',' + y(v).toFixed(1)).join(' ');
    g += '<polyline points="' + pts + '" fill="none" stroke="var(--s' + s.slot + ')" stroke-width="2" stroke-linejoin="round"/>';
  }
  for (const { s, v } of labels) { let ly = Math.max(y(v) + 4, prevY + 14); prevY = ly;
    g += '<text x="' + (W - M.r + 8) + '" y="' + ly + '" fill="var(--text2)" font-size="11">' + fmt(v) + ' \\u00b7 ' + s.label.slice(0, 26) + '</text>'; }
  el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + key + '">' + g +
    '<line class="xh" y1="' + M.t + '" y2="' + (H - M.b) + '" stroke="var(--text2)" stroke-width="1" visibility="hidden"/>' +
    '<rect x="' + M.l + '" y="' + M.t + '" width="' + (W - M.l - M.r) + '" height="' + (H - M.t - M.b) + '" fill="transparent"/></svg><div class="tip"></div>';
  const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.max(0, Math.min(n - 1, Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1))));
    xh.setAttribute('x1', x(i)); xh.setAttribute('x2', x(i)); xh.setAttribute('visibility', 'visible');
    tip.innerHTML = '<b>' + D.dates[i] + '</b><br>' + D.series.map((s) => '<i style="background:var(--s' + s.slot + ')"></i>' + fmt(s[key][i]) + ' ' + s.label).join('<br>');
    tip.style.display = 'block'; const left = (x(i) / W) * r.width; tip.style.left = Math.min(left + 12, r.width - tip.offsetWidth - 4) + 'px'; tip.style.top = '8px';
  });
  svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; xh.setAttribute('visibility', 'hidden'); });
};
draw('c1', 'net'); draw('c2', 'dd');
</script></main></body></html>
`;

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`wrote ${out}`);
