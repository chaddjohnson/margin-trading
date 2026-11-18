// Stage 2 (PROTOCOL.md §7, §8 S2): the ILLUSTRATIVE account-margin scenarios — never the user's account, never a
// prediction of a call or a liquidation, never a selection input.
//   grid    — the declared scenario grid on stylized slot states (pure arithmetic; no data);
//   overlay — an illustrative historical overlay: a 60/40 VOOG/VGT core bought at the 2016-01-04 closes and held (price
//             only, no distributions), plus a candidate's actual daily strategy state (its funded lot's market value and
//             loan, accrued interest, banked net as cash) at every session close of FULL; daily excess under each scenario.
//   node --experimental-transform-types tools/vg-l0-risk-metrics/margin-scenarios.ts grid | overlay [--dry]
import path from 'node:path';
import { resolveDataset } from '../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../src/lib/evaluation.ts';
import { r2, resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { reconcile, replay, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { evaluateAccount, firstDeficiencyShock, linearDeficiencyShock, type Scenario, scenarioAccount } from '../../src/vg-l0-risk-metrics/margin.ts';
import { markedDrawdown, portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { logDoor, sealJson, sha256File } from '../../src/vg-l0-risk-metrics/records.ts';
import { auditSubjects } from '../../src/vg-l0-risk-metrics/subjects.ts';
import { codeDigest, studyGuard } from './common.ts';

const dry = process.argv.includes('--dry');
const freeze = studyGuard();
const t0 = Date.now();
const emit = (rel: string, v: unknown, label: string) => {
  if (dry) return console.log(JSON.stringify(v, null, 1).slice(0, 6000));
  console.log(rel, sealJson(path.join(resultsDir, rel), v, label));
};

const maintenance = { 'FINRA minimum 25%': 0.25, 'Vanguard published house minimum 35%': 0.35, 'Vanguard published concentrated minimum 50%': 0.5, 'stress 70%': 0.7 };
const cores = [250_000, 500_000, 1_000_000];
const otherDebts = [0, 100_000, 200_000];
const concentration = { trigger: 0.5, maintenance: 0.5 }; // scenario: a symbol above half the market value at 50%

const grid = () => {
  // the brief's example: $100k → $250k → $210k on the slot (GDX), core $500k, no other debt
  const ex = Object.fromEntries(
    Object.entries(maintenance).map(([k, m]) => {
      const at = (v: number) => evaluateAccount(scenarioAccount({ core: 500_000, voogShare: 0.6, tradedSymbol: 'GDX', slotValue: v, slotLoan: 100_000, slotInterest: 0, realized: 0, otherDebt: 0, maintenance: m }));
      const a = at(250_000);
      const b = at(210_000);

      return [k, { at250k: { equity: a.equity, requirement: a.requirement, excess: a.excess, equityRatio: a.equityRatio }, at210k: { equity: b.equity, requirement: b.requirement, excess: b.excess, equityRatio: b.equityRatio }, excessChange: b.excess - a.excess, tradeStillProfitable: 210_000 - 100_000 }];
    })
  );
  const states = { 'slot at entry (1.0×)': 99_950, 'slot at 1.5×': 150_000, 'slot at 2.5×': 250_000, 'slot −30% (0.7×)': 70_000 };
  const rows: Record<string, unknown>[] = [];

  for (const traded of ['GDX', 'VGT'] as const)
    for (const core of cores)
      for (const od of otherDebts)
        for (const [mk, m] of Object.entries(maintenance))
          for (const [sk, v] of Object.entries(states))
            for (const conc of [null, concentration]) {
              const s: Scenario = { core, voogShare: 0.6, tradedSymbol: traded, slotValue: v, slotLoan: 100_000, slotInterest: 0, realized: 0, otherDebt: od, maintenance: m, concentration: conc };
              const a = scenarioAccount(s);
              const e = evaluateAccount(a);

              rows.push({
                traded,
                core,
                otherDebt: od,
                maintenance: mk,
                slot: sk,
                concentration: conc ? 'a symbol above 50% of MV at 50%' : 'none',
                marketValue: r2(e.marketValue),
                equity: r2(e.equity),
                requirement: r2(e.requirement),
                excess: r2(e.excess),
                equityRatio: e.equityRatio,
                headroomPoints: e.headroomPoints,
                uniformShockToDeficiency: firstDeficiencyShock(a),
                tradedOnlyShockToDeficiency: firstDeficiencyShock(a, { [traded]: 1 }),
                linearCheck: conc ? null : linearDeficiencyShock(e.marketValue, a.cash, a.debt, 0, m)
              });
            }

  // the joint shock grid at a stated reference: core $500k, other debt $100k, slot at 1.0× and 2.5×
  const joint: Record<string, unknown>[] = [];

  for (const traded of ['GDX', 'VGT'] as const)
    for (const [sk, v] of [['1.0×', 99_950], ['2.5×', 250_000]] as const)
      for (const [mk, m] of [['35%', 0.35], ['50%', 0.5]] as const)
        for (const cs of [0, 0.1, 0.2, 0.3, 0.4])
          for (const ts of [0, 0.1, 0.2, 0.3, 0.5]) {
            const a = scenarioAccount({ core: 500_000, voogShare: 0.6, tradedSymbol: traded, slotValue: v, slotLoan: 100_000, slotInterest: 0, realized: 0, otherDebt: 100_000, maintenance: m });
            // GDX slot: the core's VOOG and VGT fall by cs, GDX by ts; VGT slot: VOOG by cs, VGT (core and slot) by max(cs, ts)
            const shocks: Record<string, number> = traded === 'GDX' ? { VOOG: cs, VGT: cs, GDX: ts } : { VOOG: cs, VGT: Math.max(cs, ts) };
            const e = evaluateAccount(a, shocks);

            joint.push({ traded, slot: sk, maintenance: mk, coreShock: cs, tradedShock: ts, excess: r2(e.excess), deficient: e.deficient, equityRatio: e.equityRatio });
          }

  emit('margin/grid.json', { stage: 'S2 margin scenario grid (illustrative)', freeze: freeze.protocol.sha256, code: codeDigest(), maintenance, concentration, example250to210: ex, rows, joint }, 'S2 margin grid');
};

const overlay = async () => {
  const full = await openDoor('FULL', 'Stage 2: margin overlay — candidates’ daily strategy state on FULL (illustrative)');
  const voogFile = path.join(path.resolve(import.meta.dirname, '../..'), 'data', 'VOOG', 'data.csv');
  const loaded = await loadDatasetSessions({ dataset: resolveDataset('VOOG', 'all'), startDate: '2016-01-04', endDate: '2026-10-30', warmupSessions: 0, access: 'manual evaluation' });

  logDoor('VOOG all', 'Stage 2: illustrative core prices (daily closes; never a selection input)', { sha256: sha256File(voogFile), sessions: loaded.history.length, last: loaded.history.at(-1)!.date });

  const voog = new Map(loaded.history.map((s) => [s.date, s.close as number]));
  const vgt = full.sym.VGT.ds;
  const dates = full.dates;
  const voogClose = (i: number) => {
    for (let j = i; j >= 0; j--) {
      const x = voog.get(dates[j]!);

      if (x !== undefined) return x;
    }
    throw new Error(`no VOOG close on or before ${dates[i]}`);
  };
  const missingVoog = dates.filter((d) => !voog.has(d)).length;
  const keys = ['New L0', 'N/original', 'N/RA1', 'L/RA1', 'F/original', 'F/RA1'];
  const rows: Record<string, unknown>[] = [];

  for (const s of auditSubjects().filter((x) => keys.includes(x.key))) {
    const r = replay(full, s.subject, undefined, ['2024-12-31']);
    const L = toLedger(r);

    reconcile(r, L);

    const pts = portfolioPath(L);
    // the strategy state at each session close: its lot's close mark, else flat with the banked net
    const closeMarks = new Map<number, { mv: number; loan: number; interest: number; realizedTotal: number; m: number; symbol: string }>();
    let before = 0;

    for (const lot of L.lots) {
      for (const k of lot.marks) closeMarks.set(k.t, { mv: k.shares * k.price, loan: k.principal, interest: k.interest, realizedTotal: before + k.realized, m: before + k.pnl, symbol: lot.symbol });
      if (!lot.open) before += lot.net;
    }

    let pi = 0;
    let rNow = 0;
    const series = dates.map((d, i) => {
      const t = vgt.sCloseTime[i]!;

      while (pi < pts.length && pts[pi]!.t <= t) rNow = pts[pi++]!.r;

      const cm = closeMarks.get(t);

      return { d, i, slotMv: cm?.mv ?? 0, loan: cm?.loan ?? 0, interest: cm?.interest ?? 0, cash: cm ? cm.realizedTotal : rNow, symbol: cm?.symbol ?? null, m: cm ? cm.m : rNow };
    });
    const v0 = voogClose(0);
    const g0 = vgt.sClose[0]!;
    const scen: Record<string, unknown>[] = [];

    for (const core of cores)
      for (const od of otherDebts)
        for (const [mk, m] of Object.entries(maintenance))
          for (const conc of [null, concentration]) {
            let worst = { excess: Infinity, d: '', ratio: NaN, coreValue: NaN, strategyNet: NaN, withoutStrategy: NaN };
            let deficientDays = 0;

            for (const x of series) {
              const coreVoog = (core * 0.6 * voogClose(x.i)) / v0;
              const coreVgt = (core * 0.4 * vgt.sClose[x.i]!) / g0;
              const positions = [
                { symbol: 'VOOG', quantity: coreVoog, price: 1 },
                { symbol: 'VGT', quantity: coreVgt, price: 1 },
                ...(x.symbol ? [{ symbol: x.symbol, quantity: x.slotMv, price: 1 }] : [])
              ];
              const e = evaluateAccount({ positions, cash: Math.max(0, x.cash), debt: od + x.loan + Math.max(0, -x.cash), accruedInterest: x.interest, maintenance: m, concentration: conc });

              if (e.deficient) deficientDays++;
              if (e.excess < worst.excess) {
                const without = evaluateAccount({ positions: positions.slice(0, 2), cash: 0, debt: od, maintenance: m, concentration: conc });

                worst = { excess: e.excess, d: x.d, ratio: e.equityRatio!, coreValue: coreVoog + coreVgt, strategyNet: x.m, withoutStrategy: without.excess };
              }
            }
            scen.push({ core, otherDebt: od, maintenance: mk, concentration: conc ? 'a symbol above 50% of MV at 50%' : 'none', minExcess: r2(worst.excess), minDate: worst.d, equityRatioThen: worst.ratio, coreValueThen: r2(worst.coreValue), strategyNetThen: r2(worst.strategyNet), excessWithoutStrategyThen: r2(worst.withoutStrategy), deficientSessions: deficientDays });
          }

    // the strategy's own conventional drawdown and the excess it removes at an unchanged maintenance rate
    const dd = markedDrawdown(pts);
    const atPeak = series.find((x) => x.d === dd.peakDate);
    const atTrough = series.find((x) => x.d === dd.troughDate);

    rows.push({
      key: s.key,
      label: s.label,
      strategyDd: { max: r2(dd.max), peak: dd.peakDate, trough: dd.troughDate },
      slotAtPeak: atPeak ? { marketValue: r2(atPeak.slotMv), loan: atPeak.loan, symbol: atPeak.symbol } : null,
      slotAtTrough: atTrough ? { marketValue: r2(atTrough.slotMv), loan: atTrough.loan, symbol: atTrough.symbol } : null,
      peakSlotMarketValue: r2(Math.max(...series.map((x) => x.slotMv))),
      scenarios: scen
    });
    console.log(`${s.key}: overlay done, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  emit('margin/overlay.json', { stage: 'S2 margin overlay (illustrative; price-only core, no distributions)', freeze: freeze.protocol.sha256, code: codeDigest(), core: '60% VOOG / 40% VGT bought at the 2016-01-04 closes and held', voogMissingSessionsFilledForward: missingVoog, maintenance, concentration, rows, seconds: (Date.now() - t0) / 1000 }, 'S2 margin overlay');
};

if (process.argv[2] === 'grid') grid();
else if (process.argv[2] === 'overlay') await overlay();
else console.error('usage: margin-scenarios.ts grid | overlay [--dry]');
