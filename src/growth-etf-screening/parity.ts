// The engineering gates (PROTOCOL.md §12), sealed in results/parity/parity.json before the freeze. A failure stops every
// dependent stage (the stages refuse to run without a sealed 0-failure record).
//
// E1 Priority 3's evaluation code is the code its sealed parity verified (digest).
// E2 the transfer vectors with sealed standalone development figures reproduce them through THIS study's path on their
//    native symbol's D24 door to the cent (net, minute DD, lots): VGT #4 and 08500a60 on VGT (Priority 5A's sealed
//    centres), 4A's five GDX books on GDX (4A's sealed records).
// E3 canonical parity on EVERY eligible ETF, trade by trade, zero tolerance (money within $1e-6): this study's path
//    (Priority 3's engine, only the Growth slot enabled, the ETF's door in the slot) against the canonical engine
//    `runRiseTrading` + `summarizeSimulation` run with the TRUE symbol on the same split-adjusted minute sessions:
//    decision/entry/exit times, raw and after-cost prices, net and interest of every trade, the minute and daily
//    drawdowns and their times, every daily mark, net and realized — VGT #4, Appendix A and two random configurations
//    (one Rise, one breakout; parity labels) per ETF on D24.
// E4 prefix causality: two random configurations per ETF on D19, D21 and D23 equal their D24 runs through the shorter
//    door (decisions, funded lots, daily marks) — every ETF with a development split and every fifth other ETF.
// E5 accounting identities on every E3 configuration: Σ lot net = net; principal ≤ $100,000; never two lots open at
//    once; every decision funded (standalone: no refusal); cash = $0 / $0 / 0 lots.
// E6 identity: inactive genes never change the configuration identity; the transfer identities.
// E7 the split convention: every ETF's split-adjusted D23 door sessions deep-equal the canonical TRAINING partition
//    loaded through the repository's partition loader (forward split adjustment; 2016-01-04 → 2023-12-29).
// E8 the blackout and period semantics on a non-control ETF: a blackout of the top episode's decisions removes exactly
//    that episode's funded lots, and a boundary's period P&L equals the daily-mark difference.
import fs from 'node:fs';
import path from 'node:path';
import { growthParamsOf } from '../vg-d1-growth-joint/books.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import type { Check } from '../vg-d1-growth-joint/parity.ts';
import { type Rec, episodesOf, evaluate, run } from '../vg-d1-growth-joint/evaluate.ts';
import { runRiseTrading, summarizeSimulation } from '../growth-trading/riseTrading.ts';
import { resolveDataset } from '../lib/dataset.ts';
import { loadDatasetSessions } from '../lib/evaluation.ts';
import { economics, log, prefixDoors, resultsDir } from './context.ts';
import { type EtfDoor, openEtfDoor } from './doors.ts';
import { p3EvaluationDigest } from './lab.ts';
import { addToLedger } from './ledger.ts';
import { plain, sealJson } from './records.ts';
import {
  type GConfig,
  build,
  canonicalG,
  decodeG,
  entries,
  gId,
  pinEntry,
  pinStratum,
  screenGenomes
} from './space.ts';
import { transferVectors } from './transfer.ts';
import { eligibleSymbols } from './universe.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

const eq = (a: number, b: number) => a === b || (Number.isNaN(a) && Number.isNaN(b));
let sims = 0;

// random configurations (parity labels, never study labels), both entries and every stratum
export const randomG = (n: number, label: string): GConfig[] => {
  const out: GConfig[] = [];

  for (const [i, g] of screenGenomes(n * 8, 'parity', label).entries()) {
    if (out.length >= n) break;

    const entry = entries[i % 2]!;

    try {
      out.push(decodeG(pinStratum(pinEntry(g, entry), entry, Math.floor(i / 2))));
    } catch {
      // invalid draw
    }
  }
  return out;
};

// E3 + E5 for one configuration on one ETF door.
const checkEtf = (d: EtfDoor, g: GConfig, label: string): Check[] => {
  const door = d.door;
  const b = build(g);
  const params = growthParamsOf(b.g!, d.sym as never, door);
  const canon = runRiseTrading(d.sym, d.sessions, 0, params, d.dataSha256);
  const cm = summarizeSimulation(canon.simulation, canon.ds).metrics;
  const cs = canon.simulation;
  const x = run(door, b.quad, b.options, true);
  const pool = x.result;
  const rec: Rec = evaluate(door, b.quad, b.options);
  const book = x.books[0]!;
  const problems: string[] = [];

  sims += 3;
  // the virtual book's trades against the canonical trades (every field, exact)
  const vt = book.trades.filter((t) => t.eS >= 0);

  if (vt.length !== cs.trades.length) problems.push(`trades ${vt.length} vs ${cs.trades.length}`);
  cs.trades.forEach((t, i) => {
    const m = vt[i];

    if (!m) return;
    if (!eq(m.dT, t.decisionTime)) problems.push(`trade ${i + 1} decisionTime`);
    if (!eq(m.eT, t.entryTime) || !eq(m.eRaw, t.entryRawPrice) || !eq(m.ePrice, t.entryPrice))
      problems.push(`trade ${i + 1} entry`);

    const last = m.fills.at(-1);

    if (
      t.exitIndex >= 0 &&
      (!last || !eq(last.t, t.exitTime) || !eq(last.raw, t.exitRawPrice) || !eq(last.price, t.exitPrice))
    )
      problems.push(`trade ${i + 1} exit`);
    if (!eq(m.vNet, t.net) || !eq(m.vInterest, t.interest))
      problems.push(`trade ${i + 1} net/interest ${m.vNet} vs ${t.net}`);
  });
  if (!eq(pool.dd.max, cs.minuteDrawdown.maximum))
    problems.push(`minute dd ${pool.dd.max} vs ${cs.minuteDrawdown.maximum}`);
  if (
    pool.dd.max > 0 &&
    (!eq(pool.dd.peakT, cs.minuteDrawdown.peakTime) || !eq(pool.dd.troughT, cs.minuteDrawdown.troughTime))
  )
    problems.push('minute dd times');
  if (!eq(pool.ddDaily.max, cs.dailyDrawdown.maximum))
    problems.push(`daily dd ${pool.ddDaily.max} vs ${cs.dailyDrawdown.maximum}`);
  if (cs.daily.length !== door.sessions) problems.push(`daily rows ${cs.daily.length}`);
  for (let s = 0; s < cs.daily.length; s++)
    if (Math.abs(pool.daily[s]! - cs.daily[s]!.marked) > 1e-6) {
      problems.push(`daily mark ${cs.daily[s]!.date}: ${pool.daily[s]} vs ${cs.daily[s]!.marked}`);
      break;
    }
  if (Math.abs(pool.net - cm.pnl.totalMarkedNetUsd) > 1e-6)
    problems.push(`net ${pool.net} vs ${cm.pnl.totalMarkedNetUsd}`);
  if (Math.abs(pool.realized - cm.pnl.realizedNetUsd) > 1e-6) problems.push('realized');
  if (Math.abs(rec.net - Math.round(cm.pnl.totalMarkedNetUsd * 100) / 100) > 0.005) problems.push('record net');
  if (rec.lots !== cs.trades.length) problems.push(`record lots ${rec.lots}`);

  const acct: string[] = [];
  const sumLots = pool.lots.reduce((a, l) => a + l.net, 0);

  if (Math.abs(sumLots - pool.net) > 1e-6) acct.push(`Σ lots ${sumLots} vs net ${pool.net}`);
  if (pool.lots.some((l) => l.principal0 > economics.budget + 1e-6)) acct.push('principal above $100,000');

  const sorted = [...pool.lots].sort((p, q) => p.entryT - q.entryT);

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;

    if (prev.open || prev.fills.at(-1)!.t > sorted[i]!.entryT) acct.push(`two lots open at ${sorted[i]!.entryT}`);
  }
  if (pool.funding.some((f) => f.outcome !== 'granted')) acct.push('a standalone decision was refused');

  return [
    {
      name: `E3 ${d.sym} ${label}`,
      pass: problems.length === 0,
      detail: { problems, net: rec.net, dd: rec.dd, lots: rec.lots }
    },
    { name: `E5 ${d.sym} ${label}`, pass: acct.length === 0, detail: acct }
  ];
};

const causality = (early: EtfDoor, late: EtfDoor, gs: readonly GConfig[]): Check[] =>
  gs.map((g, i) => {
    const b = build(g);
    const a = run(early.door, b.quad, b.options, true).result;
    const z = run(late.door, b.quad, b.options, true).result;
    const end = early.door.sessions - 1;
    const problems: string[] = [];

    sims += 2;
    for (let s = 0; s <= end; s++)
      if (a.daily[s] !== z.daily[s]) {
        problems.push(`daily mark ${early.door.dates[s]}: ${a.daily[s]} vs ${z.daily[s]}`);
        break;
      }

    const fa = a.funding.filter((f) => f.s <= end).map((f) => `${f.t}${f.outcome}`);
    const fz = z.funding.filter((f) => f.s <= end).map((f) => `${f.t}${f.outcome}`);

    if (fa.join() !== fz.join()) problems.push('decisions differ');

    const la = a.lots.map((l) => l.entryT);
    const lz = z.lots.filter((l) => l.entryS <= end).map((l) => l.entryT);

    if (la.join() !== lz.join()) problems.push('funded lots differ');
    return { name: `E4 ${early.sym} ${early.key}→${late.key} #${i}`, pass: problems.length === 0, detail: problems };
  });

export const runParity = async (o: { dry?: boolean; symbols?: string[] } = {}) => {
  if (!o.dry && fs.existsSync(parityFile))
    throw new Error('the engineering gates are sealed: parity.json is never rewritten');

  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    if (!c.pass) log(`FAIL ${c.name}: ${JSON.stringify(c.detail).slice(0, 300)}`);
  };
  const symbols = o.symbols ?? eligibleSymbols();
  const vectors = transferVectors();
  const t1 = vectors.find((v) => v.key === 'T1')!.g;
  const t9 = vectors.find((v) => v.key === 'T9')!.g;

  // E1
  add({
    name: "E1 Priority 3's evaluation digest",
    pass: p3EvaluationDigest() === p3.evaluationDigest,
    detail: { now: p3EvaluationDigest(), sealed: p3.evaluationDigest }
  });

  // E6
  {
    const problems: string[] = [];

    for (const v of vectors) if (gId(canonicalG(v.g)) !== v.identity) problems.push(`${v.key} identity`);
    for (const g of randomG(32, 'E6')) {
      const st = { ...g } as Record<string, unknown>;

      // an inactive input (absent from the effective vector) never changes the identity
      if (!g.trendFilterEnabled) st.trendChangeLookbackSessions = 77;
      if (!g.retentionEnabled) st.retentionSellPercent = 33;
      if (!g.continuationEnabled) st.continuationWindowSessions = 41;
      if (build(st as GConfig).id !== build(g).id) problems.push(`inactive input changed ${gId(g)}`);
    }
    add({
      name: 'E6 identity under inactive inputs; transfer identities',
      pass: problems.length === 0,
      detail: problems
    });
  }

  const causalSyms = new Set(symbols.filter((s, i) => i % 5 === 0));
  let e8Done = false;

  for (const sym of symbols) {
    const d24 = await openEtfDoor(sym, 'D24', 'engineering gates E2–E8', true);
    const rnd = randomG(2, `E3-${sym}`);

    // E2 on the native symbols
    for (const v of vectors.filter((x) => x.native === sym && x.development)) {
      const r = evaluate(d24.door, build(v.g).quad, build(v.g).options);

      sims++;
      add({
        name: `E2 ${v.key} ${v.label} on ${sym} D24 = ${v.development!.source}`,
        pass: r.net === v.development!.net && r.dd === v.development!.dd && r.lots === v.development!.lots,
        detail: { net: r.net, dd: r.dd, lots: r.lots, target: v.development }
      });
    }

    // E3 + E5
    for (const [label, g] of [
      ['T1 VGT #4', t1],
      ['T9 Appendix A', t9],
      ...rnd.map((g, i) => [`random #${i} ${gId(g)}`, g] as const)
    ] as [string, GConfig][])
      for (const c of checkEtf(d24, g, label)) add(c);

    // E5 cash
    {
      const cash = build(null);
      const r = evaluate(d24.door, cash.quad, cash.options);

      sims++;
      add({
        name: `E5 ${sym} cash = $0 / $0 / 0 lots`,
        pass: r.net === 0 && r.dd === 0 && r.lots === 0,
        detail: { net: r.net, dd: r.dd, lots: r.lots }
      });
    }

    // E7 the split convention through the canonical training partition
    {
      const d23 = await openEtfDoor(sym, 'D23', 'engineering gate E7', true);
      const part = await loadDatasetSessions({
        dataset: resolveDataset(sym, 'training'),
        startDate: '2016-01-04',
        endDate: '2023-12-29',
        warmupSessions: 0,
        access: 'optimization'
      });
      const a = JSON.stringify(plain(d23.sessions));
      const z = JSON.stringify(plain(part.history));

      add({
        name: `E7 ${sym} D23 split-adjusted sessions = the canonical training partition`,
        pass: a === z,
        detail: {
          sessions: [d23.sessions.length, part.history.length],
          splitsApplied: d23.splitsApplied,
          partitionSplits: part.report?.splitAdjustments ?? []
        }
      });

      // E4 causality (every ETF with a development split, every fifth other)
      if (causalSyms.has(sym) || d24.splitsApplied.length > 0) {
        for (const k of prefixDoors.filter((x) => x !== 'D24' && x !== 'D23')) {
          const early = await openEtfDoor(sym, k, 'engineering gate E4', true);

          for (const c of causality(early, d24, rnd)) add(c);
        }
        for (const c of causality(d23, d24, rnd)) add(c);
      }
    }

    // E8 blackout and period semantics (one non-control ETF with a profitable episode)
    if (!e8Done && sym !== 'VGT' && sym !== 'GDX') {
      for (const g of [t1, t9, ...rnd]) {
        const b = build(g);
        const x = run(d24.door, b.quad, b.options, true).result;
        const eps = episodesOf(x)
          .filter((e) => e.net > 0)
          .sort((p, q) => q.net - p.net);

        sims++;
        if (!eps.length) continue;

        const top = eps[0]!;
        const lots = x.lots.filter((l) => l.entryS >= top.first && (l.open ? Infinity : l.fills.at(-1)!.s) <= top.last);
        const firstDecision = Math.min(...lots.map((l) => l.trade.dS));
        const blackout = {
          first: d24.door.dates[firstDecision]!,
          last: d24.door.dates[Math.min(top.last, d24.door.sessions - 1)]!
        };
        const y = run(d24.door, b.quad, { ...b.options, blackouts: [blackout] }, true).result;
        const removed = x.lots.filter((l) => !y.lots.some((m) => m.entryT === l.entryT));
        const mid = d24.door.dates[1000]!;
        const p = evaluate(d24.door, b.quad, { ...b.options, boundaries: [mid] });
        const periodOk =
          Math.abs(p.periods[0]!.after - Math.round((x.daily[d24.door.sessions - 1]! - x.daily[1000]!) * 100) / 100) <=
          0.011;

        sims += 2;
        add({
          name: `E8 ${sym} blackout of the top episode removes exactly its lots; period P&L = mark difference`,
          pass:
            removed
              .map((l) => l.entryT)
              .sort()
              .join() ===
              lots
                .map((l) => l.entryT)
                .sort()
                .join() &&
            y.lots.length === x.lots.length - lots.length &&
            periodOk,
          detail: { episodeLots: lots.length, removed: removed.length, periodOk }
        });
        e8Done = true;
        break;
      }
    }

    log(`parity ${sym}: ${checks.filter((c) => !c.pass).length} failure(s) so far`);
  }

  const failed = checks.filter((c) => !c.pass).length;
  const record = {
    kind: 'growth-etf-screening engineering gates',
    checks: checks.length,
    failed,
    symbols: symbols.length,
    simulations: sims,
    results: checks,
    finished: new Date().toISOString()
  };

  addToLedger({
    job: o.dry ? 'pilot-parity-dry' : 'parity',
    door: `D19–D24 (${symbols.length} ETFs)`,
    fresh: sims,
    hits: 0,
    kind: 'in-process'
  });
  if (o.dry) {
    log(`parity dry run: ${checks.length} checks, ${failed} failed (not sealed)`);
    return record;
  }
  sealJson(parityFile, record, 'engineering gates');
  log(`engineering gates: ${checks.length} checks, ${failed} failed`);
  return record;
};
