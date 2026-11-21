// gpu-phase7 (brief Phase D): ILLUSTRATION of the nonbinding drawdown-policy diagnostics D1–D3 (src/risk-envelope/
// diagnostics.ts) on representative historical paths — New L0 and N/original on D24, and threshold-edge engineering
// subjects of the restored Assignment 3 archives on D21 and D24 (research/gpu-phase7/results/risk-parity/edge-subjects-*).
// NON-OFFICIAL CPU diagnostic (purpose diagnostic, --no-maglev, development doors only): it explains how the formulas
// behave; it selects, ranks and nominates nothing (the edge subjects were chosen by archived DD near $35,000/$40,000, for
// engineering parity, and are labelled as such). The illustrative D2 coefficients (40 / 30 / 60) are NOT thresholds.
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/gpu-phase7/diagnostics-demo.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { type Cfg, canonicalCfg, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { portfolioPath, tradeRisk } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { openDoor, repoRoot, writeJson } from '../../src/gpu-phase7/context.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { engineRuntime, requireEngineRuntime } from '../../src/gpu-backend/runtime.ts';
import { ILLUSTRATIVE_HYBRID, cappedHybrid, componentDrawdown, peakEquityDrawdown } from '../../src/risk-envelope/diagnostics.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess } from '../../src/risk-envelope/policy.ts';

assertNonOfficialCpuRun('gpu-phase7 diagnostics illustration');
requireEngineRuntime('gpu-phase7 diagnostics illustration');

const out = process.argv[process.argv.indexOf('--out') + 1] ?? 'research/gpu-phase7/results/diagnostics/diagnostics-demo.json';
const C0 = 100_000;
const frozen = decode<{ finalists: { label: string; cfg: Cfg }[] }>(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-full-joint/FROZEN_SELECTION.json'), 'utf8'));
const ref = (label: string) => canonicalCfg(frozen.finalists.find((f) => f.label === label)!.cfg);
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const rows: unknown[] = [];

const diag = async (doorName: 'D21' | 'D24', key: string, label: string, cfg: Cfg) => {
  const door = await openDoor(doorName, 'gpu-phase7 Phase D diagnostics illustration');
  const q = quadOf(cfg);
  const x = runWithControls2(door, q, cfg.controls, vOptions, false, false, { cache: false });
  const L = toLedger({ door, subject: null as never, options: vOptions, books: x.books, result: x.result, rec: null as never });
  const pts = portfolioPath(L);
  const trades = L.lots.map((l) => tradeRisk(l, L.endT));
  const env = {
    bankedDdMarked: 0,
    bankedDdLiquidation: 0,
    principalLossMarked: Math.max(0, ...trades.map((t) => t.principalLossMarked)),
    principalLossLiquidation: Math.max(0, ...trades.map((t) => t.principalLossLiq))
  };
  const d3 = componentDrawdown(pts, L);
  const d3L = componentDrawdown(pts, L, 'liquidation');

  env.bankedDdMarked = d3.bankedDd;
  env.bankedDdLiquidation = d3L.bankedDd;

  const d1 = peakEquityDrawdown(pts, C0);
  const d2 = cappedHybrid(pts, C0, ILLUSTRATIVE_HYBRID);

  rows.push({
    door: doorName,
    key,
    label,
    lots: L.lots.length,
    net: r2(x.result.net),
    markedDd: r2(x.result.dd.max),
    markedDdPctC0: r4(x.result.dd.max / C0),
    envelope: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, r2(v)])),
    control: assess({ dd: x.result.dd.max, envelope: env }, NL0_CONTROL).pass,
    experimental: assess({ dd: x.result.dd.max, envelope: env }, RE_EXPERIMENTAL).pass,
    D1: { pct: r4(d1.pct), dollars: r2(d1.dollars), peakEquity: r2(d1.peakEquity), peakDate: d1.peakDate, troughDate: d1.troughDate, passAt40: d1.pct <= 0.4 },
    D2: { utilization: r4(d2.utilization), allowance: r2(d2.allowance), regime: d2.regime, dollars: r2(d2.dollars), peakEquity: r2(d2.peakEquity), pass: d2.pass },
    D3: {
      window: d3.window && { ...d3.window, peakValue: r2(d3.window.peakValue), troughValue: r2(d3.window.troughValue), bankedHigh: r2(d3.window.bankedHigh) },
      account: Object.fromEntries(Object.entries(d3.account).map(([k, v]) => [k, r2(v)])),
      lot: d3.lot && { profitGiveback: r2(d3.lot.profitGiveback), principalLoss: r2(d3.lot.principalLoss), residual: d3.lot.residual, lots: d3.lot.lots }
    }
  });
};

await diag('D24', 'NL0', 'New L0 (control; frozen)', ref('incumbent: New L0'));
await diag('D24', 'N/original', 'N/original (Assignment 3 Track N profit; frozen)', ref('C24/informed/GD.VB/R2#1 profit'));
for (const d of ['D21', 'D24'] as const) {
  const e = JSON.parse(fs.readFileSync(path.join(repoRoot, `research/gpu-phase7/results/risk-parity/edge-subjects-${d}.json`), 'utf8')) as { subjects: { sel: string; id: string; cfg: Cfg }[] };

  for (const sel of ['near35', 'near40'])
    for (const s of e.subjects.filter((x) => x.sel === sel).slice(0, 12)) await diag(d, `E:${sel}:${s.id}`, `edge subject (${sel}, engineering only)`, canonicalCfg(s.cfg));
}

writeJson(path.join(repoRoot, out), {
  kind: 'gpu-phase7 Phase D illustration of the nonbinding drawdown-policy diagnostics (non-official CPU)',
  t: new Date().toISOString(),
  runtime: engineRuntime(),
  c0: C0,
  hybrid: ILLUSTRATIVE_HYBRID,
  note: 'Illustration only: development doors D21/D24; New L0 and N/original are frozen references; edge subjects were picked by archived DD for engineering parity and are not candidates. No threshold here is approved.',
  rows
});
console.log(`${rows.length} rows`);
