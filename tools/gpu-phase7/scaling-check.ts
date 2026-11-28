// gpu-phase7 (brief Phase E): POSITION-SIZE NORMALIZATION CHECK — the same configurations replayed by the canonical CPU
// pool (src/vg-d1-growth-joint/pool.ts runPool, the books of src/d1-risk-controls-rc2/run.ts) with a fixed trading
// allocation C0 of $100,000, $250,000 and $500,000 (PoolOptions.budget), then assessed by src/risk-envelope/policy.ts
// against limits scaled to each C0. NON-OFFICIAL diagnostic (purpose diagnostic, CPU engine under --no-maglev): it
// verifies the normalization; it searches, selects and ranks nothing. Per configuration and size it compares with the
// $100,000 run: the trade chronology (every lot's book, entry and exit instants and raw fills), the share count and every
// dollar quantity (net, realized, marked DD and its instants, interest, costs, each lot's net, the four envelope inputs)
// divided by k = C0 / $100,000, and the policies' decisions and ratios. Floating-point effects are reported as the largest
// deviation (relative to C0 for dollar amounts — the criterion — and relative to the value, reported), never hidden; a
// decision that differs is a failure unless its value lies within 1e-9 relative of the limit (reported).
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/gpu-phase7/scaling-check.ts --door D24 --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { booksWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { runPool } from '../../src/vg-d1-growth-joint/pool.ts';
import { datasetsOf, poolOptionsOf } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { type Cfg, canonicalCfg, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { decode } from '../../src/growth140-vgt-s8m/store.ts';
import { openDoor, repoRoot, writeJson } from '../../src/gpu-phase7/context.ts';
import { randomSubjects } from '../../src/gpu-phase7/subjects.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import { engineRuntime, requireEngineRuntime } from '../../src/gpu-backend/runtime.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess, capitalContext } from '../../src/risk-envelope/policy.ts';

assertNonOfficialCpuRun('gpu-phase7 scaling check');
requireEngineRuntime('gpu-phase7 scaling check');

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const doorName = opt('door', 'D24') as 'D24';
const out = opt('out', `research/gpu-phase7/results/scaling/scaling-${doorName}.json`);
const sizes = [100_000, 250_000, 500_000];
const door = await openDoor(doorName, 'gpu-phase7 Phase E position-size normalization (diagnostic)');

// subjects: the references and sealed finalists, threshold-edge subjects of this door (if any), fresh random genomes
const subjects: { key: string; cfg: Cfg }[] = [];
const frozen = decode<{ finalists: { label: string; cfg: Cfg }[] }>(fs.readFileSync(path.join(repoRoot, 'research/vg-l0-full-joint/FROZEN_SELECTION.json'), 'utf8'));

for (const f of frozen.finalists) subjects.push({ key: `F:${f.label}`, cfg: canonicalCfg(f.cfg) });
{
  const ef = path.join(repoRoot, `research/gpu-phase7/results/risk-parity/edge-subjects-${doorName}.json`);

  if (fs.existsSync(ef)) {
    const e = JSON.parse(fs.readFileSync(ef, 'utf8')) as { subjects: { sel: string; id: string; cfg: Cfg }[] };

    for (const sel of ['near35', 'near40', 'band'])
      for (const s of e.subjects.filter((x) => x.sel === sel).slice(0, 25)) subjects.push({ key: `E:${sel}:${s.id}`, cfg: canonicalCfg(s.cfg) });
  }
}
for (const s of randomSubjects(Number(opt('random', '25')), `scaling-${doorName}`)) subjects.push({ key: `A:${s.key}`, cfg: s.cfg! });

const run = (cfg: Cfg, budget: number) => {
  const q = quadOf(cfg);
  const books = booksWithControls2(door, q, cfg.controls, vOptions);
  const result = runPool(datasetsOf(door), books, q.first, { ...poolOptionsOf(door, vOptions, false), budget, endIndex: door.sessions - 1 });
  const [bdM, bdL, plM, plL] = envelopeOf(door, { books, result }, vOptions);

  return {
    result,
    money: {
      net: result.net,
      realized: result.realized,
      unrealized: result.unrealized,
      dd: result.dd.max,
      bankedDdMarked: bdM!,
      bankedDdLiquidation: bdL!,
      principalLossMarked: plM!,
      principalLossLiquidation: plL!,
      lotNets: result.lots.map((l) => l.net),
      lotInterest: result.lots.map((l) => l.interest),
      lotCosts: result.lots.map((l) => l.costs),
      lotPrincipal0: result.lots.map((l) => l.principal0),
      fillShares: result.lots.flatMap((l) => l.fills.map((f) => f.shares)),
      fillProceeds: result.lots.flatMap((l) => l.fills.map((f) => f.proceeds))
    },
    chronology: result.lots.map((l) => [l.book, l.entryT, l.entryRaw, l.fills.map((f) => [f.t, f.raw, f.partial, f.reason])]),
    shares: result.lots.map((l) => l.shares0),
    ddTimes: [result.dd.peakT, result.dd.troughT, result.dd.recoveryT],
    envelope: { bankedDdMarked: bdM!, bankedDdLiquidation: bdL!, principalLossMarked: plM!, principalLossLiquidation: plL! }
  };
};
const rel = (a: number, b: number) => (a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-300));
const rows: unknown[] = [];
const worst: Record<string, number> = {}; // relative to the value
const worstC0: Record<string, number> = {}; // relative to C0
let chronologyDiffers = 0;
let decisionDiffers = 0;
let nearLimitDecisionDiffers = 0;
const t0 = Date.now();

for (const s of subjects) {
  const base = run(s.cfg, 100_000);
  const row: Record<string, unknown> = { key: s.key, lots: base.result.lots.length, base: { net: base.money.net, dd: base.money.dd, envelope: base.envelope } };

  for (const c0 of sizes.slice(1)) {
    const k = c0 / 100_000;
    const x = run(s.cfg, c0);
    const sameChronology = JSON.stringify(x.chronology) === JSON.stringify(base.chronology) && JSON.stringify(x.ddTimes) === JSON.stringify(base.ddTimes);
    const dev: Record<string, number> = {};

    // two measures per field: relative to the value itself (reported; inflated for differences near zero, e.g. a lot
    // that closed near break-even) and relative to the allocation C0 (the pass criterion for dollar amounts)
    for (const [f, v] of Object.entries(base.money)) {
      const w = (x.money as Record<string, number | number[]>)[f]!;
      const pairs: [number, number][] = Array.isArray(v) ? (v as number[]).map((y, i) => [y * k, (w as number[])[i]!]) : [[(v as number) * k, w as number]];
      const d = Math.max(0, ...pairs.map(([a, b]) => rel(a, b)));
      const dc = Math.max(0, ...pairs.map(([a, b]) => Math.abs(a - b) / c0));

      dev[f] = dc;
      worst[f] = Math.max(worst[f] ?? 0, d);
      worstC0[f] = Math.max(worstC0[f] ?? 0, dc);
    }
    dev.shares = Math.max(0, ...base.shares.map((y, i) => rel(y * k, x.shares[i]!))); // shares: relative to the value
    worst.shares = Math.max(worst.shares ?? 0, dev.shares);
    worstC0.shares = worst.shares;
    if (!sameChronology) chronologyDiffers++;

    const decisions: Record<string, unknown> = {};

    for (const p of [NL0_CONTROL, RE_EXPERIMENTAL]) {
      const a = assess({ dd: base.money.dd, envelope: base.envelope }, p, capitalContext(100_000));
      const b = assess({ dd: x.money.dd, envelope: x.envelope }, p, capitalContext(c0));
      const same = a.pass === b.pass && a.checks.every((ch, i) => ch.pass === b.checks[i]!.pass);
      const nearLimit = a.checks.some((ch) => ch.limit !== null && rel(ch.value, ch.limit) < 1e-9);

      if (!same) (nearLimit ? nearLimitDecisionDiffers++ : decisionDiffers++);
      decisions[p.id] = { pass100k: a.pass, pass: b.pass, same, maxRatioDeviation: Math.max(...a.checks.map((ch, i) => Math.abs(ch.ratio - b.checks[i]!.ratio))) };
    }
    row[`c0_${c0}`] = { k, sameChronology, maxRelativeDeviation: Math.max(...Object.values(dev)), decisions };
  }
  rows.push(row);
}

const pass = chronologyDiffers === 0 && decisionDiffers === 0 && Object.values(worstC0).every((d) => d < 1e-12);

writeJson(path.join(repoRoot, out), {
  kind: 'gpu-phase7 Phase E position-size normalization check (non-official CPU diagnostic)',
  t: new Date().toISOString(),
  runtime: engineRuntime(),
  door: doorName,
  doorSha256: { GDX: door.sym.GDX.dataSha256, VGT: door.sym.VGT.dataSha256 },
  sizes,
  subjects: subjects.length,
  limits: Object.fromEntries(sizes.map((c0) => [c0, { markedDd40: (c0 * 40) / 100, principalLoss25: (c0 * 25) / 100, bankedDd25: (c0 * 25) / 100, markedDd35: (c0 * 35) / 100 }])),
  chronologyDiffers,
  decisionDiffers,
  nearLimitDecisionDiffers,
  worstDeviationRelativeToC0: worstC0,
  worstDeviationRelativeToValue: worst,
  criterion: 'identical trade chronology and drawdown instants; identical decisions of both policies; every dollar amount within 1e-12 × C0 of k × its $100,000 value (shares within 1e-12 relative)',
  note: 'The official GPU path evaluates at the fixed $100,000 budget only (EvalOptions has no budget; encode.ts uses poolOptionsOf, which sets none): sizes other than $100,000 are a CPU-only diagnostic.',
  rows,
  seconds: Math.round((Date.now() - t0) / 100) / 10,
  pass
});
console.log(JSON.stringify({ pass, subjects: subjects.length, chronologyDiffers, decisionDiffers, nearLimitDecisionDiffers, worstC0, worstValue: worst }));
process.exitCode = pass ? 0 : 2;
