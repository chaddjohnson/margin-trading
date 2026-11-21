// gpu-phase5 root cause (PROTOCOL.md §4.3 H3): forensic of a captured CPU-reference envelope transient. For one task of
// Phase 4's D24-fund list it rebuilds the ledger and the portfolio path and evaluates the banked-capital drawdown as
// written (src/vg-l0-risk-metrics/metrics.ts bankedDrawdown) and under candidate MIS-EXECUTIONS (a wrong field, a
// stale high-water mark, …), to see which one reproduces a captured wrong value bit for bit.
//   node --experimental-transform-types tools/gpu-phase5/diag-envelope.ts --index 3 --wrong 101060.43759030467,101108.57625063331
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, markedDrawdown, portfolioPath, realizedDrawdown } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { growthStrata, randomSubjects, referenceSubjects } from '../../src/gpu-phase4/subjects.ts';
import { resolveDoor } from '../../src/gpu-phase5/doorSpec.ts';
import { bitsOf } from '../../src/gpu-phase5/bits.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const door = await resolveDoor({ kind: 'market', name: 'D24' }, 'gpu-phase5 diag-envelope (CPU reference forensic)');
const at = (q: number) => door.dates[Math.min(door.sessions - 1, Math.max(0, Math.floor(q * (door.sessions - 1))))]!;
const options = { ...vOptions, fundFrom: at(0.3) };
const subjects = [...referenceSubjects(), ...randomSubjects(1500, 'O-fund', 'coarse', 0), ...growthStrata(2, 'O-fund-G')];
const s = subjects[Number(opt('index', '3'))]!;
const wrong = opt('wrong', '').split(',').filter(Boolean).map(Number);
const x = runWithControls2(door, s.quad, s.controls, options, true, false, { cache: false });
const L = toLedger({ door, subject: null as never, options, books: x.books, result: x.result, rec: null as never });
const pts = portfolioPath(L);
type P = (typeof pts)[number];
const run = (hOf: (p: P) => number, fOf: (p: P) => number, h0 = 0) => {
  let h = h0;
  let best = 0;

  for (const p of pts) {
    if (hOf(p) > h) h = hOf(p);
    const d = h - fOf(p);

    if (d > best) best = d;
  }
  return best;
};
const fields = { m: (p: P) => p.m, liq: (p: P) => p.liq, r: (p: P) => p.r, t: (p: P) => p.t };
const variants: Record<string, number> = {
  'as written: marked': bankedDrawdown(pts, 'marked').max,
  'as written: liquidation': bankedDrawdown(pts, 'liquidation').max,
  'conventional marked drawdown (strict, from the marked peak)': markedDrawdown(pts, 'marked').max,
  'conventional liquidation drawdown': markedDrawdown(pts, 'liquidation').max,
  'realized drawdown': realizedDrawdown(pts).max
};

for (const [hn, hf] of Object.entries(fields))
  for (const [fn, ff] of Object.entries(fields)) if (hn !== 't' && fn !== 't') variants[`high-water mark of ${hn}, shortfall against ${fn}`] = run(hf, ff);

const out = Object.entries(variants).map(([name, v]) => ({ name, value: v, bits: bitsOf(v), matchesCaptured: wrong.findIndex((w) => Object.is(w, v)) }));

console.log(JSON.stringify({ k: s.key, lots: L.lots.length, points: pts.length, captured: wrong.map((w) => ({ value: w, bits: bitsOf(w) })), variants: out }, null, 1));

// brute force (--search): which pair of path values gives a captured wrong value exactly? h − v = captured for some
// h and v among the path's own numbers (m, liq, r of every point; the running realized net before each lot).
if (args.includes('--search')) {
  const sources: { name: string; i: number; v: number }[] = [];

  pts.forEach((p, i) => {
    sources.push({ name: 'm', i, v: p.m }, { name: 'liq', i, v: p.liq }, { name: 'r', i, v: p.r });
  });
  let before = 0;

  L.lots.forEach((lot, i) => {
    sources.push({ name: 'beforeLot', i, v: before }, { name: 'lotNet', i, v: lot.net }, { name: 'principal0', i, v: lot.principal0 });
    lot.marks.forEach((k, j) => {
      if (j === 0 || j === lot.marks.length - 1) sources.push({ name: `lot${i}.mark${j === 0 ? 'First' : 'Last'}.pnl`, i: j, v: k.pnl });
    });
    if (!lot.open) before += lot.net;
  });

  const byV = new Map<number, { name: string; i: number }[]>();

  for (const s2 of sources) {
    const key = Math.round(s2.v * 1e6);

    (byV.get(key) ?? byV.set(key, []).get(key)!).push({ name: s2.name, i: s2.i });
  }
  const hits: unknown[] = [];

  for (const w of wrong)
    for (const lo of sources) {
      if (lo.name !== 'm' && lo.name !== 'liq' && lo.name !== 'r') continue;
      const need = w + lo.v;

      for (const dk of [-1, 0, 1]) {
        for (const h of byV.get(Math.round(need * 1e6) + dk) ?? []) {
          const hv = sources.find((q) => q.name === h.name && q.i === h.i)!.v;

          if (Object.is(hv - lo.v, w) && hits.length < 40)
            hits.push({ captured: w, high: { ...h, v: hv, date: h.name.length <= 3 ? pts[h.i]!.date : null, lot: h.name.length <= 3 ? pts[h.i]!.lot : null }, low: { name: lo.name, i: lo.i, v: lo.v, date: pts[lo.i]!.date, lot: pts[lo.i]!.lot } });
        }
      }
    }
  console.log(JSON.stringify({ search: { sources: sources.length, exactHits: hits } }, null, 1));
  const maxR = pts.reduce((a, p) => Math.max(a, p.r), -Infinity);
  const maxM = pts.reduce((a, p) => Math.max(a, p.m), -Infinity);
  const minM = pts.reduce((a, p) => Math.min(a, p.m), Infinity);

  console.log(JSON.stringify({ maxR, maxM, minM, finalM: pts.at(-1)!.m, finalR: pts.at(-1)!.r, lotNets: L.lots.map((l) => Math.round(l.net)) }));
}
