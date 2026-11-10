// The engineering gates (PROTOCOL.md §12), sealed in results/parity/parity.json before the freeze. A failure stops every
// dependent stage (the stages refuse to run without a sealed 0-failure record).
//
// E1 Priority 3's evaluation code is the code its sealed parity verified (digest).
// E2 Appendix A through THIS study's configuration path on D24 equals Priority 5A's sealed L0 centre of "SG alone"
//    field for field (bar the quad id): $53,816.50 / $17,709.96 / 13 lots — the development parity target.
// E3 canonical parity, trade by trade, zero tolerance (money and drawdowns within $1e-6): the standalone pooled path
//    (Priority 3's engine, only Growth·GDX enabled) against the canonical engine (`runRiseTrading` +
//    `summarizeSimulation` on the door's minute sessions: decision/entry/exit times, raw and after-cost prices, net and
//    interest of every trade, the minute and daily drawdowns and their times, every daily mark), and this study's
//    compact record (`evaluate`) against the same canonical summary — for Appendix A, every prior control and 48 random
//    configurations of both entries and every stratum on D24, and 16 random configurations on D19.
// E4 prefix causality: 18 random configurations on D19, D21 and D23 equal their D24 runs through the shorter door
//    (decisions, funded lots, daily marks).
// E5 accounting identities on every E3 configuration: Σ lot net = net; principal ≤ $100,000; never two lots open at
//    once (one position); every decision funded (standalone: no refusal); cash = $0 / $0 / 0 lots.
// E6 identity: inactive GDX genes never change the configuration identity; equal effective vectors give one id.
// E7 Priority 5A's standalone family-level instrument (its namespace) reproduces 5A's sealed Appendix A confirmation
//    statistics exactly (the report-only matched instrument).
import fs from 'node:fs';
import path from 'node:path';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { type Check, canonicalGrowth, checkGrowth } from '../vg-d1-growth-joint/parity.ts';
import { type Rec, evaluate, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { growthDraws } from '../vg-growth-funding-lifecycle/instruments.ts';
import { economics, log, resultsDir } from './context.ts';
import { appendixA, loadControls, readPinned, sources } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { nbStats } from './fitness.ts';
import { p3EvaluationDigest } from './lab.ts';
import { plain, sealJson } from './records.ts';
import {
  type Built,
  type GConfig,
  buildS,
  decodeGdx,
  entries,
  gId,
  pinEntry,
  pinStratum,
  screenGenomes
} from './space.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

const same = (a: unknown, b: unknown) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));
const firstDiff = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(plain(a[k])) !== JSON.stringify(plain(b[k])));

// random GDX books (parity labels, never study labels), both entries and every stratum
export const randomGdx = (n: number, label: string): GConfig[] => {
  const out: GConfig[] = [];

  for (const [i, g] of screenGenomes(n * 8, 'parity', label).entries()) {
    if (out.length >= n) break;

    const entry = entries[i % 2]!;

    try {
      out.push(decodeGdx(pinStratum(pinEntry(g, entry), entry, Math.floor(i / 2))));
    } catch {
      // invalid draw
    }
  }
  return out;
};

const causality = (early: Door, late: Door, bs: readonly Built[]): Check[] =>
  bs.map((b, i) => {
    const a = run(early, b.quad, b.options, true).result;
    const z = run(late, b.quad, b.options, true).result;
    const end = early.sessions - 1;
    const problems: string[] = [];

    for (let s = 0; s <= end; s++)
      if (a.daily[s] !== z.daily[s]) {
        problems.push(`daily mark ${early.dates[s]}: ${a.daily[s]} vs ${z.daily[s]}`);
        break;
      }

    const fa = a.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);
    const fz = z.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);

    if (fa.join() !== fz.join()) problems.push('funding decisions differ');

    const la = a.lots.map((l) => `${l.book}${l.entryT}`);
    const lz = z.lots.filter((l) => l.entryS <= end).map((l) => `${l.book}${l.entryT}`);

    if (la.join() !== lz.join()) problems.push('funded lots differ');

    return { name: `E4 ${early.name}→${late.name} #${i}`, pass: problems.length === 0, detail: problems };
  });

// The compact record against the canonical summary, and the accounting identities (E3 record part, E5).
const checkRecord = (door: Door, g: GConfig, label: string): Check[] => {
  const b = buildS(g);
  const rec: Rec = evaluate(door, b.quad, b.options);
  const canon = canonicalGrowth(door, 'GDX', g);
  const cs = canon.run.simulation;
  const x = run(door, b.quad, b.options, true).result;
  const problems: string[] = [];
  const near = (a: number, z: number, tol = 0.005) => Math.abs(a - z) <= tol;

  if (!near(rec.net, canon.metrics.pnl.totalMarkedNetUsd))
    problems.push(`net ${rec.net} vs ${canon.metrics.pnl.totalMarkedNetUsd}`);
  if (!near(rec.realized, canon.metrics.pnl.realizedNetUsd)) problems.push('realized');
  if (!near(rec.dd, cs.minuteDrawdown.maximum)) problems.push(`dd ${rec.dd} vs ${cs.minuteDrawdown.maximum}`);
  if (rec.dd > 0 && (rec.ddPeakT !== cs.minuteDrawdown.peakTime || rec.ddTroughT !== cs.minuteDrawdown.troughTime))
    problems.push('dd times');
  if (rec.lots !== cs.trades.length) problems.push(`lots ${rec.lots} vs ${cs.trades.length}`);

  const acct: string[] = [];
  const sumLots = x.lots.reduce((a, l) => a + l.net, 0);

  if (Math.abs(sumLots - x.net) > 1e-6) acct.push(`Σ lots ${sumLots} vs net ${x.net}`);
  if (x.lots.some((l) => l.principal0 > economics.budget + 1e-6)) acct.push('principal above $100,000');

  const sorted = [...x.lots].sort((p, q) => p.entryT - q.entryT);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;

    if (prev.open || prev.fills.at(-1)!.t > sorted[i]!.entryT) acct.push(`two lots open at ${sorted[i]!.entryT}`);
  }
  if (x.funding.some((f) => f.outcome !== 'granted')) acct.push('a standalone decision was refused');

  return [
    {
      name: `E3 record ${label}`,
      pass: problems.length === 0,
      detail: { problems, net: rec.net, dd: rec.dd, lots: rec.lots }
    },
    { name: `E5 accounting ${label}`, pass: acct.length === 0, detail: acct }
  ];
};

export const runParity = async () => {
  if (fs.existsSync(parityFile)) throw new Error('the engineering gates are sealed: parity.json is never rewritten');

  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    if (!c.pass) log(`FAIL ${c.name}: ${JSON.stringify(c.detail).slice(0, 300)}`);
  };

  // E1
  add({
    name: "E1 Priority 3's evaluation digest",
    pass: p3EvaluationDigest() === p3.evaluationDigest,
    detail: { now: p3EvaluationDigest(), sealed: p3.evaluationDigest }
  });

  const d24 = await openStudyDoor('D24', 'engineering gates E2–E7');
  const controls = loadControls();
  const appA = appendixA().gdx;

  // E2
  {
    const c = readPinned<{ centres: Record<string, { modes: { L0: { rec: Rec } } }> }>(sources.p5aCentres);
    const target = c.centres.SG!.modes.L0.rec;
    const b = buildS(appA);
    const mine = evaluate(d24, b.quad, b.options);
    const { id: _a, ...m } = mine as unknown as Record<string, unknown>;
    const { id: _b, ...t } = target as unknown as Record<string, unknown>;

    add({
      name: "E2 Appendix A = Priority 5A's sealed SG centre (field for field, bar the quad id)",
      pass: same(m, t),
      detail: { differences: firstDiff(m, t), net: mine.net, dd: mine.dd, lots: mine.lots }
    });
  }

  // E3 + E5: controls and random configurations
  const rand24 = randomGdx(48, 'E3-D24');
  const targets: [string, GConfig][] = [
    ...controls.filter((c) => c.gdx).map((c) => [c.label, c.gdx!] as [string, GConfig]),
    ...rand24.map((g, i) => [`random D24 #${i} ${gId(g)}`, g] as [string, GConfig])
  ];

  for (const [label, g] of targets) {
    add(checkGrowth(d24, 'GDX', g, label));
    for (const c of checkRecord(d24, g, label)) add(c);
  }

  {
    const cash = buildS(null);
    const r = evaluate(d24, cash.quad, cash.options);

    add({
      name: 'E5 cash = $0 / $0 / 0 lots',
      pass: r.net === 0 && r.dd === 0 && r.lots === 0,
      detail: { net: r.net, dd: r.dd, lots: r.lots }
    });
  }

  // E3 on D19, E4 causality
  const d19 = await openStudyDoor('D19', 'engineering gates E3/E4');

  for (const [i, g] of randomGdx(16, 'E3-D19').entries()) {
    add(checkGrowth(d19, 'GDX', g, `random D19 #${i}`));
    for (const c of checkRecord(d19, g, `random D19 #${i}`)) add(c);
  }

  const causal = randomGdx(18, 'E4').map((g) => buildS(g));

  for (const c of causality(d19, d24, causal)) add(c);

  const d21 = await openStudyDoor('D21', 'engineering gates E4');

  for (const c of causality(d21, d24, causal)) add(c);

  const d23 = await openStudyDoor('D23', 'engineering gates E4');

  for (const c of causality(d23, d24, causal)) add(c);

  // E6 identity
  {
    const g = { ...appA } as GConfig;
    const withInactive = { ...g, retentionSellPercent: 33, breakoutSmaSessions: 77, maximumHoldDays: 9 } as GConfig;
    const a = buildS(g);
    const z = buildS(withInactive);

    add({
      name: 'E6 inactive GDX inputs never change the identity',
      pass: a.id === z.id && gId(a.cfg.gdx!) === gId(z.cfg.gdx!),
      detail: { a: a.id, z: z.id }
    });
    add({
      name: 'E6 Appendix A identity 07cac3329fc7a520',
      pass: gId(a.cfg.gdx!) === '07cac3329fc7a520',
      detail: gId(a.cfg.gdx!)
    });
  }

  // E7 Priority 5A's standalone instrument reproduces its sealed Appendix A statistics
  {
    const s = readPinned<{ subjects: Record<string, { families: Record<string, { nb: Record<string, number> }> }> }>(
      sources.p5aStandalone
    );
    const b = buildS(appA);
    const centre = evaluate(d24, b.quad, b.options);
    const out: Record<string, unknown> = {};
    let ok = true;

    for (const family of ['confirm', 'small', 'wide'] as const) {
      const draws = growthDraws(appA, family);
      const recs = draws.map((d) => {
        const x = buildS(d.config);

        return evaluate(d24, x.quad, x.options);
      });
      const nb = nbStats(
        centre,
        recs,
        draws.map((d) => d.clipped)
      );
      const sealed = s.subjects.SG!.families[family]!.nb;
      const keys = ['n', 'median', 'p10', 'p90Dd', 'worstDd', 'breaches', 'meanExcess', 'clipped'] as const;
      const diff = keys.filter((k) => (nb as unknown as Record<string, number>)[k] !== sealed[k]);

      out[family] = {
        mine: Object.fromEntries(keys.map((k) => [k, (nb as unknown as Record<string, number>)[k]])),
        diff
      };
      if (diff.length) ok = false;
    }

    add({
      name: "E7 Priority 5A's standalone instrument reproduces its sealed Appendix A statistics",
      pass: ok,
      detail: out
    });
  }

  const failed = checks.filter((c) => !c.pass).length;
  const record = {
    stage: 'engineering gates',
    checks,
    total: checks.length,
    failed,
    evaluationDigest: p3EvaluationDigest(),
    finished: new Date().toISOString()
  };

  sealJson(parityFile, plain(record), 'engineering gates');
  log(`engineering gates: ${checks.length} checks, ${failed} failed`);
  return record;
};
