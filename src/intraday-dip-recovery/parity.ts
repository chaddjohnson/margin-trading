// The verification gates before any search (PROTOCOL.md §12; standard §5.1), sealed as results/parity/parity.json.
// Zero tolerance (Object.is) unless stated.
//   P1  canonical daily D1: the L0 engine on the session clock (costs 0, no arming date) equals the canonical D1 file
//       (src/app/allIn-trailingBuy-postExitContinuation.ts, unchanged) run on the same D24 bytes, trade for trade and in
//       both drawdowns, under stop and next-open fills; and D1's sealed development record ($137,222.97 / $19,330.69).
//   P2  the completed Intraday D1 engine (src/intraday-d1/engine.ts, unchanged): L0 equals it lot field by lot field,
//       in net, realized, unrealized, both drawdowns with their times and every daily mark — its frozen shortlist, its
//       diagnostics' configurations and 120 scrambled-Sobol vectors under the five execution variants, on D19 and D24.
//   P3  native controls to the cent: Intraday D1 shortlist #1 and B1 reproduce their sealed development centres.
//   P4  causal doors: every rule set on D19, D21 and D23 equals the D24 run up to that door's last session (lots,
//       the open position, daily marks, the drawdown of the truncated run).
//   P5  accounting identities on every P4/P8 run: Σ closed nets = realized; realized + unrealized = net = the last
//       daily mark; one position at a time; principal = $100,000 per entry; interest and costs recomputed.
//   P6  the one-book identity: the worker (search) path equals the local (report) path record for record.
//   P7  execution stresses recomputed from the bars: 10/20 bps, 14% interest, next-open, +25 bps slippage, minute low.
//   P8  the independent reference (reference.ts) equals the engine for L1–L5 and F1–F4 (lots exactly, money and
//       drawdowns within $1e-6) on 2016 windows of D19.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { simulate as oldSimulate } from '../intraday-d1/engine.ts';
import { compareWithD1, readD1Trades } from '../intraday-d1/parity.ts';
import { minuteClock, sessionClock } from '../intraday-d1/periods.ts';
import { Rng, deriveSeed } from '../optimizer/rng.ts';
import { Sobol } from '../optimizer/sobol.ts';
import {
  type FamilyKey,
  axes,
  dataFile,
  familyKeys,
  intradayD1Shortlist,
  keys,
  ladder,
  log,
  prefixDoors,
  seedOf
} from './context.ts';
import { openPrefixDoor } from './data.ts';
import {
  type DoorView,
  type RuleSet,
  dailyParams,
  recOf,
  rulesOf,
  run,
  runDaily,
  settingsOf,
  viewOf
} from './evaluate.ts';
import type { Lot, RunResult, StopFill } from './engine.ts';
import { referenceSimulate } from './reference.ts';
import { Pool } from './pool.ts';
import { type Grid, candidateOf, diagnosticGrids, incumbentGrids, paramsOf, valueOf, zeroGrid } from './space.ts';

const iso = (t: number) => new Date(t * 1000).toISOString();

const sobolGrids = (n: number, labels: (string | number)[]) => {
  const sobol = new Sobol({ dimensions: keys.length, scramble: { seed: deriveSeed(...seedOf(...labels)) } });

  return Array.from({ length: n }, () => {
    const u = sobol.next();
    const g = zeroGrid();

    keys.forEach((k, d) => (g[k] = Math.min(axes[k].size - 1, Math.floor(u[d]! * axes[k].size))));
    return candidateOf('F4', g).grid;
  });
};

const variants = [
  { key: 'base', costBps: 5, rate: 0.11, stopFill: 'stop' as StopFill, stopSlippageBps: 0 },
  { key: 'cost10', costBps: 10, rate: 0.11, stopFill: 'stop' as StopFill, stopSlippageBps: 0 },
  { key: 'rate14', costBps: 5, rate: 0.14, stopFill: 'stop' as StopFill, stopSlippageBps: 0 },
  { key: 'nextOpen', costBps: 5, rate: 0.11, stopFill: 'next-open' as StopFill, stopSlippageBps: 0 },
  { key: 'slip25', costBps: 5, rate: 0.11, stopFill: 'stop' as StopFill, stopSlippageBps: 25 },
  { key: 'minuteLow', costBps: 20, rate: 0.11, stopFill: 'minute-low' as StopFill, stopSlippageBps: 0 }
];

const lotFields = [
  'setupKind', 'activationTime', 'activationPrice', 'referenceHigh', 'anchorHigh', 'decisionTime', 'decisionPrice',
  'trigger', 'trailingLow', 'carried', 'signalPeriod', 'entryPeriod', 'entrySession', 'entryTime', 'entryRaw',
  'entryPrice', 'entryExecution', 'shares', 'open', 'exitPeriod', 'exitSession', 'exitTime', 'exitRaw', 'exitPrice',
  'exitReason', 'exitExecution', 'stopAtExit', 'stopActiveAtExit', 'maximumHoldDue', 'bufferSignalTime', 'interest',
  'gross', 'net', 'costs', 'slippage', 'mae', 'mfe', 'stopFirstActivePeriod', 'stopActivePeriods', 'heldPeriods'
] as const;

// Every difference between two runs (lots field by field, money, drawdowns and their times, daily marks).
const diffRuns = (a: { lots: object[] } & Record<string, unknown>, b: RunResult, upTo = Infinity) => {
  const problems: string[] = [];
  const ra = a as unknown as RunResult;

  if (ra.lots.length !== b.lots.length) problems.push(`lots ${ra.lots.length} ≠ ${b.lots.length}`);

  for (let i = 0; i < Math.min(ra.lots.length, b.lots.length) && problems.length < 8; i++)
    for (const f of lotFields)
      if (f in (ra.lots[i] as object) && !Object.is((ra.lots[i] as never)[f], (b.lots[i] as never)[f]))
        problems.push(`lot ${i + 1} ${f}: ${(ra.lots[i] as never)[f]} ≠ ${(b.lots[i] as never)[f]}`);

  for (const k of ['net', 'realized', 'unrealized', 'interest', 'costs'] as const)
    if (!Object.is(ra[k], b[k])) problems.push(`${k}: ${ra[k]} ≠ ${b[k]}`);

  for (const k of ['minuteDrawdown', 'dailyDrawdown'] as const)
    for (const f of ['maximum', 'peakTime', 'troughTime'] as const)
      if (!Object.is(ra[k][f], b[k][f])) problems.push(`${k}.${f}: ${ra[k][f]} ≠ ${b[k][f]}`);

  for (let s = 0; s < Math.min(ra.dailyMarks.length, upTo + 1); s++)
    if (!Object.is(ra.dailyMarks[s], b.dailyMarks[s])) {
      problems.push(`daily mark ${s}: ${ra.dailyMarks[s]} ≠ ${b.dailyMarks[s]}`);
      break;
    }

  return problems;
};

const oldParams = (grid: Grid) => {
  const p = paramsOf({ family: 'F4', grid });

  return {
    targetPercentChange: p.X,
    trailingBuyPercentage: p.Y,
    trailingStopPercentage: p.S,
    holdSeconds: p.holdSeconds,
    lookbackPeriods: p.lookbackPeriods,
    intradayLossBuffer: p.buffer,
    pullback: p.pullback,
    continuationPeriods: p.continuationPeriods
  };
};

// P5: accounting identities of one run.
const accounting = (view: DoorView, r: RunResult, rate: number, costBps: number) => {
  const problems: string[] = [];
  const N = 100_000;
  const closed = r.lots.filter((l) => !l.open);
  let realized = 0;

  for (const l of closed) realized += l.net;
  if (!Object.is(realized, r.realized)) problems.push(`Σ closed nets ${realized} ≠ realized ${r.realized}`);
  if (Math.abs(r.realized + r.unrealized - r.net) > 1e-9) problems.push('realized + unrealized ≠ net');
  if (Math.abs(r.dailyMarks[view.end]! - r.net) > 1e-6) problems.push(`last daily mark ${r.dailyMarks[view.end]} ≠ net ${r.net}`);
  if (r.lots.filter((l) => l.open).length > 1) problems.push('more than one open lot');

  for (let i = 0; i < r.lots.length; i++) {
    const l = r.lots[i]!;
    const next = r.lots[i + 1];

    if (next && !(next.entryTime >= l.exitTime)) problems.push(`lot ${i + 2} enters before lot ${i + 1} exits`);
    if (Math.abs(l.shares * l.entryPrice - N) > 1e-6) problems.push(`lot ${i + 1} principal ${l.shares * l.entryPrice}`);
    if (!Object.is(l.entryPrice, l.entryRaw * (1 + costBps / 10000))) problems.push(`lot ${i + 1} entry cost`);

    const s1 = l.open ? view.end : l.exitSession;
    const days = (view.door.sessions[s1]!.time - view.door.sessions[l.entrySession]!.time) / 86400;
    const interest = N * rate * ((days * 86400) / (365 * 86400));

    if (Math.abs(interest - l.interest) > 1e-6) problems.push(`lot ${i + 1} interest ${l.interest} ≠ ${interest}`);
    if (!l.open && Math.abs(l.gross - (l.shares * l.exitPrice - N)) > 1e-6) problems.push(`lot ${i + 1} gross`);
    if (Math.abs(l.net - (l.gross - l.interest)) > 1e-6) problems.push(`lot ${i + 1} net ≠ gross − interest`);
    if (!l.open && Math.abs(l.costs - (l.shares * (l.entryPrice - l.entryRaw) + l.shares * (l.exitRaw - l.exitPrice))) > 1e-6)
      problems.push(`lot ${i + 1} costs`);
  }

  return problems;
};

export const runParity = async () => {
  const results: Record<string, unknown> = {};
  const failures: string[] = [];
  const d24 = viewOf(openPrefixDoor('D24', 'parity (engineering gate, development door)'));
  const d19 = viewOf(openPrefixDoor('D19', 'parity (engineering gate, development door)'));
  const views: Record<string, DoorView> = { D19: d19, D24: d24 };

  // P1: the canonical D1 file on the D24 bytes.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dip-p1-'));
  const prefix = path.join(tmp, 'VGT-D24-prefix.csv');
  const fd = fs.openSync(dataFile, 'r');
  const buf = Buffer.alloc(prefixDoors.D24.bytes);

  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);
  fs.writeFileSync(prefix, buf);

  const p1: Record<string, unknown> = {};

  for (const fill of ['stop', 'next-open'] as const) {
    const out = path.join(tmp, fill);

    fs.mkdirSync(out);
    execFileSync(
      process.execPath,
      ['--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'src/app.ts', 'allIn-trailingBuy-postExitContinuation', 'VGT', '-', '-', prefix, out, fill],
      { stdio: ['ignore', 'ignore', 'inherit'] }
    );

    const summary = JSON.parse(fs.readFileSync(path.join(out, 'summary.json'), 'utf8')) as Record<string, number>;
    const r = runDaily(d24, { costBps: 0, stopFill: fill }, 'native');
    const problems = compareWithD1(r as never, d24.door.sessions, readD1Trades(path.join(out, 'trades.csv')));

    if (!Object.is(r.net, summary.netProfit)) problems.push(`net ${r.net} ≠ ${summary.netProfit}`);
    if (!Object.is(r.minuteDrawdown.maximum, summary.minuteMaximumDrawdown)) problems.push(`minute DD ${r.minuteDrawdown.maximum} ≠ ${summary.minuteMaximumDrawdown}`);
    if (!Object.is(r.dailyDrawdown.maximum, summary.maximumDrawdown)) problems.push(`daily DD ${r.dailyDrawdown.maximum} ≠ ${summary.maximumDrawdown}`);

    p1[fill] = { trades: r.lots.length, net: r.net, minuteDd: r.minuteDrawdown.maximum, dailyDd: r.dailyDrawdown.maximum, d1: { net: summary.netProfit, minuteDd: summary.minuteMaximumDrawdown, dailyDd: summary.maximumDrawdown }, problems };
    failures.push(...problems.map((p) => `P1 ${fill}: ${p}`));
    log(`P1 ${fill}: ${r.lots.length} trades, net ${r.net.toFixed(2)}, ${problems.length} differences`);
  }

  fs.rmSync(tmp, { recursive: true, force: true });

  const sealedD1 = { net: 137222.97, minuteDd: 19330.69, dailyDd: 15611.46, trades: 17 };
  const stopRun = p1.stop as { net: number; minuteDd: number; dailyDd: number; trades: number };
  const d1Record =
    Math.round(stopRun.net * 100) / 100 === sealedD1.net &&
    Math.round(stopRun.minuteDd * 100) / 100 === sealedD1.minuteDd &&
    Math.round(stopRun.dailyDd * 100) / 100 === sealedD1.dailyDd &&
    stopRun.trades === sealedD1.trades;

  if (!d1Record) failures.push('P1 sealed D1 development record not reproduced');
  results.P1 = { ...p1, sealedRecord: { ...sealedD1, source: 'research/intraday-d1-vgt/REPORT.md §1 (canonical D1 CLI on the 2016–2024 prefix)', reproduced: d1Record } };

  // P2: the completed Intraday D1 engine.
  const p2: Record<string, unknown>[] = [];
  const p2Grids = [
    ...incumbentGrids.map((g) => ({ label: g.id, grid: g.grid })),
    ...diagnosticGrids.map((g) => ({ label: g.id, grid: g.grid })),
    ...sobolGrids(120, ['parity', 'P2']).map((grid, n) => ({ label: `sobol${n}`, grid }))
  ];

  for (const doorKey of ['D24', 'D19'] as const) {
    const view = views[doorKey]!;

    p2Grids.forEach(({ label, grid }, n) => {
      const v = variants[n % variants.length]!;
      const settings = { principal: 100_000, rate: v.rate, costBps: v.costBps, stopFill: v.stopFill, stopSlippageBps: v.stopSlippageBps };
      const clock = minuteClock(view.market, view.door.sessions, valueOf(grid, 'B'));
      const window = { armFromSession: view.armFrom, endSession: view.end };
      const a = oldSimulate(view.market, clock, oldParams(grid), settings, window);
      const b = run(view, { ruleSet: 'L0', grid, settings: v });
      const problems = diffRuns(a as never, b);

      failures.push(...problems.map((p) => `P2 ${doorKey} ${label} ${v.key}: ${p}`));
      p2.push({ door: doorKey, label, variant: v.key, lots: b.lots.length, net: b.net, dd: b.minuteDrawdown.maximum, problems });
    });
    log(`P2 ${doorKey}: ${p2Grids.length} vectors, ${p2.filter((x) => x.door === doorKey && (x.problems as string[]).length).length} with differences`);
  }

  results.P2 = { comparisons: p2.length, withDifferences: p2.filter((x) => (x.problems as string[]).length).length, runs: p2 };

  // P3: native controls to the cent (the sealed Intraday D1 development centres).
  const q = JSON.parse(fs.readFileSync('research/intraday-d1-vgt/results/qualify/qualification.json', 'utf8')) as {
    candidates: { id: string; evidence: { centre: { net: number; dd: number; ddDaily: number; lots: number } }; ledger: string[] }[];
  };
  const p3: Record<string, unknown>[] = [];

  for (const c of q.candidates) {
    const grid = incumbentGrids.find((g) => g.id === c.id)!.grid;
    const r = run(d24, { ruleSet: 'L0', grid });
    const ledger = r.lots.map((l) => `${l.entryTime}|${l.open ? '' : l.exitTime}`);
    const problems: string[] = [];

    if (Math.round(r.net * 100) / 100 !== c.evidence.centre.net) problems.push(`net ${r.net} ≠ ${c.evidence.centre.net}`);
    if (!Object.is(r.minuteDrawdown.maximum, c.evidence.centre.dd)) problems.push(`dd ${r.minuteDrawdown.maximum} ≠ ${c.evidence.centre.dd}`);
    if (!Object.is(r.dailyDrawdown.maximum, c.evidence.centre.ddDaily)) problems.push(`daily dd ${r.dailyDrawdown.maximum} ≠ ${c.evidence.centre.ddDaily}`);
    if (r.lots.length !== c.evidence.centre.lots) problems.push(`lots ${r.lots.length} ≠ ${c.evidence.centre.lots}`);
    if (JSON.stringify(ledger) !== JSON.stringify(c.ledger)) problems.push('ledger differs');

    failures.push(...problems.map((p) => `P3 ${c.id}: ${p}`));
    p3.push({ id: c.id, net: r.net, dd: r.minuteDrawdown.maximum, lots: r.lots.length, sealed: c.evidence.centre, problems });
  }

  const b1 = runDaily(d24, {}, 'harmonized');

  p3.push({ id: 'B1 (daily D1 primary, session clock, 5 bps, 11%, arming 2016-02-01)', net: b1.net, dd: b1.minuteDrawdown.maximum, lots: b1.lots.length, note: 'research/intraday-d1-vgt REPORT §4.3 states $135,359 (rounded)', problems: Math.round(b1.net) === 135359 ? [] : [`net ${b1.net} ≠ 135,359`] });
  if (Math.round(b1.net) !== 135359) failures.push(`P3 B1: net ${b1.net}`);
  results.P3 = p3;
  log(`P3: ${p3.length} native controls, ${p3.filter((x) => (x.problems as string[]).length).length} with differences`);

  // P4 + P5: causal doors and accounting.
  const ruleSets: RuleSet[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'F1', 'F2', 'F3', 'F4'];
  const p4: Record<string, unknown>[] = [];
  const p5: Record<string, unknown>[] = [];
  const shorter = { D19: d19, D21: viewOf(openPrefixDoor('D21', 'parity P4')), D23: viewOf(openPrefixDoor('D23', 'parity P4')) };
  const p4Grids = sobolGrids(30, ['parity', 'P4']);

  p4Grids.forEach((grid, n) => {
    const ruleSet = ruleSets[n % ruleSets.length]!;
    const v = variants[n % variants.length]!;
    const full = run(d24, { ruleSet, grid, settings: v });
    const acc = accounting(d24, full, v.rate, v.costBps);

    p5.push({ ruleSet, n, problems: acc });
    failures.push(...acc.map((p) => `P5 ${ruleSet} #${n}: ${p}`));

    for (const [key, view] of Object.entries(shorter)) {
      const short = run(view, { ruleSet, grid, settings: v });
      const truncated = run(d24, { ruleSet, grid, settings: v, endSession: view.end });
      const problems = diffRuns(short as never, truncated, view.end);
      const closed = short.lots.filter((l) => !l.open);

      closed.forEach((l, i) => {
        const g = full.lots[i]!;

        if (!g || g.entryTime !== l.entryTime || g.exitTime !== l.exitTime || !Object.is(g.net, l.net))
          problems.push(`closed lot ${i + 1} differs from the D24 run`);
      });

      const open = short.lots.find((l) => l.open);

      if (open) {
        const g = full.lots[short.lots.indexOf(open)];

        if (!g || g.entryTime !== open.entryTime || !Object.is(g.entryRaw, open.entryRaw)) problems.push('the open lot differs from the D24 run');
        if (g && !g.open && g.exitTime <= view.door.sessions[view.end]!.closeTime) problems.push('the D24 lot closed before the door ended');
      }

      for (let s = 0; s <= view.end; s++)
        if (!Object.is(short.dailyMarks[s], full.dailyMarks[s])) {
          problems.push(`daily mark ${s} differs from the D24 run`);
          break;
        }

      failures.push(...problems.map((p) => `P4 ${ruleSet} #${n} ${key}: ${p}`));
      p4.push({ ruleSet, n, door: key, lots: short.lots.length, open: Boolean(open), problems });
    }
  });

  results.P4 = { runs: p4.length, withDifferences: p4.filter((x) => (x.problems as string[]).length).length, detail: p4 };
  results.P5 = { runs: p5.length, withDifferences: p5.filter((x) => (x.problems as string[]).length).length, detail: p5 };
  log(`P4: ${p4.length} door comparisons; P5: ${p5.length} accounting checks`);

  // P6: the one-book identity (the worker/search path equals the local/report path).
  const pool = new Pool({ door: 'D24', purpose: 'parity P6 (worker path)', workers: 2 });
  const p6Grids = sobolGrids(24, ['parity', 'P6']);
  const p6: Record<string, unknown>[] = [];

  await pool.start();
  await pool.run(
    p6Grids.map((grid, n) => ({ k: String(n), spec: { ruleSet: familyKeys[n % 4]!, grid, settings: variants[n % variants.length]! } })),
    (task, rec) => {
      const local = recOf(run(d24, task.spec));
      const same = JSON.stringify(local) === JSON.stringify(rec);

      p6.push({ n: Number(task.k), ruleSet: task.spec.ruleSet, same });
      if (!same) failures.push(`P6 #${task.k}: the worker record differs from the local record`);
    }
  );
  await pool.close();
  results.P6 = { runs: p6.length, identical: p6.filter((x) => x.same).length, pooledIdentities: 'not applicable: one VGT book, one funded position, no pool of families (PROTOCOL.md §4)' };

  // P7: execution stresses recomputed from the bars.
  const p7: Record<string, unknown>[] = [];
  const bars = d24.market.bars;

  sobolGrids(20, ['parity', 'P7']).forEach((grid, n) => {
    const ruleSet = familyKeys[n % 4]!;

    for (const v of [
      { key: 'bps10', costBps: 10 },
      { key: 'bps20', costBps: 20 },
      { key: 'rate14', rate: 0.14 },
      { key: 'nextOpen', stopFill: 'next-open' as StopFill },
      { key: 'slip25', stopSlippageBps: 25 },
      { key: 'minuteLow', stopFill: 'minute-low' as StopFill }
    ]) {
      const s = settingsOf(v);
      const r = run(d24, { ruleSet, grid, settings: v });
      const problems = accounting(d24, r, s.rate, s.costBps);

      for (const l of r.lots.filter((x) => !x.open)) {
        const isStop = l.exitReason === 'trailing stop' || l.exitReason === 'trailing stop gap';
        const expected = l.exitRaw * (1 - s.costBps / 10000) * (isStop ? 1 - s.stopSlippageBps / 10000 : 1);

        if (!Object.is(l.exitPrice, expected)) problems.push(`lot ${l.id} exit price`);
        if (l.exitExecution === 'stop level' && !(bars.low[l.exitBar]! <= l.exitRaw && bars.open[l.exitBar]! > l.exitRaw)) problems.push(`lot ${l.id} stop level outside the bar`);
        if (l.exitExecution === 'trigger minute low' && !Object.is(l.exitRaw, bars.low[l.exitBar]!)) problems.push(`lot ${l.id} minute low`);
        if (v.key === 'nextOpen' && l.exitReason === 'trailing stop' && l.exitExecution === 'first trade after decision') {
          if (!Object.is(l.exitRaw, bars.open[l.exitBar]!) || !(bars.low[l.exitBar - 1]! <= l.stopAtExit)) problems.push(`lot ${l.id} next-open fill`);
        }
      }

      failures.push(...problems.map((p) => `P7 ${ruleSet} #${n} ${v.key}: ${p}`));
      p7.push({ n, ruleSet, stress: v.key, lots: r.lots.length, net: r.net, problems });
    }
  });

  results.P7 = { runs: p7.length, withDifferences: p7.filter((x) => (x.problems as string[]).length).length, detail: p7 };
  log(`P6: ${p6.length} worker/local identities; P7: ${p7.length} stress recomputations`);

  // P8: the independent reference on 2016 windows of D19.
  const p8: Record<string, unknown>[] = [];
  const endSession = d19.door.sessions.findIndex((s) => s.date >= '2016-07-01') - 1;
  const rng = new Rng(deriveSeed(...seedOf('parity', 'P8')));
  const p8Sets: RuleSet[] = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5', 'F1', 'F2', 'F3', 'F4'];

  for (let n = 0; n < 100; n++) {
    const ruleSet = p8Sets[n % p8Sets.length]!;
    const g = zeroGrid();

    for (const k of keys) g[k] = Math.floor(rng.next() * axes[k].size);
    g.X = Math.floor(rng.next() * 50); // dips that occur in a 2016 window
    if (n % 2 === 0) g.B = Math.min(g.B, 3);

    const grid = candidateOf('F4', g).grid;
    const v = variants[n % variants.length]!;
    const settings = settingsOf(v);
    const clock = minuteClock(d19.market, d19.door.sessions, valueOf(grid, 'B'));
    const e = run(d19, { ruleSet, grid, settings: v, endSession });
    const r = referenceSimulate(d19.market, clock, rulesOf(ruleSet), paramsOf({ family: 'F4', grid }), settings, d19.armFrom, endSession);
    const problems: string[] = [];

    if (e.lots.length !== r.lots.length) problems.push(`lots ${e.lots.length} ≠ ${r.lots.length}`);

    for (let i = 0; i < Math.min(e.lots.length, r.lots.length) && problems.length < 6; i++) {
      const a = e.lots[i]!;
      const b = r.lots[i]!;

      if (a.entryBar !== b.entryBar || a.exitBar !== (b.exitBar < 0 ? -1 : b.exitBar) || a.setupKind !== b.kind) problems.push(`lot ${i + 1} bars ${a.entryBar}/${a.exitBar} vs ${b.entryBar}/${b.exitBar}`);
      else if (!Object.is(a.entryRaw, b.entryRaw) || (!a.open && !Object.is(a.exitRaw, b.exitRaw))) problems.push(`lot ${i + 1} prices`);
      else if (!a.open && a.exitReason !== b.reason) problems.push(`lot ${i + 1} reason ${a.exitReason} vs ${b.reason}`);
      else if (Math.abs(a.net - b.net) > 1e-6) problems.push(`lot ${i + 1} net ${a.net} vs ${b.net}`);
    }

    if (Math.abs(e.net - r.net) > 1e-6) problems.push(`net ${e.net} vs ${r.net}`);
    if (Math.abs(e.minuteDrawdown.maximum - r.minuteDd) > 1e-6) problems.push(`dd ${e.minuteDrawdown.maximum} vs ${r.minuteDd}`);

    for (const [s, v2] of r.dailyMarks)
      if (Math.abs(e.dailyMarks[s]! - v2) > 1e-6) {
        problems.push(`daily mark ${s}`);
        break;
      }

    failures.push(...problems.map((p) => `P8 ${ruleSet} #${n}: ${p}`));
    p8.push({ n, ruleSet, variant: v.key, lots: e.lots.length, net: e.net, problems });
  }

  // P8b: a longer, more volatile window (through 2018-12-31: the February and fourth-quarter 2018 sell-offs), B ≥ 15.
  const end18 = d19.door.sessions.findIndex((s) => s.date >= '2019-01-01') - 1;

  for (let n = 0; n < 60; n++) {
    const ruleSet = p8Sets[n % p8Sets.length]!;
    const g = zeroGrid();

    for (const k of keys) g[k] = Math.floor(rng.next() * axes[k].size);
    g.B = 3 + (n % 4);

    const grid = candidateOf('F4', g).grid;
    const v = variants[n % variants.length]!;
    const settings = settingsOf(v);
    const clock = minuteClock(d19.market, d19.door.sessions, valueOf(grid, 'B'));
    const e = run(d19, { ruleSet, grid, settings: v, endSession: end18 });
    const r = referenceSimulate(d19.market, clock, rulesOf(ruleSet), paramsOf({ family: 'F4', grid }), settings, d19.armFrom, end18);
    const problems: string[] = [];

    if (e.lots.length !== r.lots.length) problems.push(`lots ${e.lots.length} ≠ ${r.lots.length}`);
    for (let i = 0; i < Math.min(e.lots.length, r.lots.length) && problems.length < 6; i++) {
      const a = e.lots[i]!;
      const b = r.lots[i]!;

      if (a.entryBar !== b.entryBar || a.exitBar !== (b.exitBar < 0 ? -1 : b.exitBar) || (!a.open && a.exitReason !== b.reason)) problems.push(`lot ${i + 1} differs`);
      else if (Math.abs(a.net - b.net) > 1e-6) problems.push(`lot ${i + 1} net`);
    }
    if (Math.abs(e.net - r.net) > 1e-6) problems.push(`net ${e.net} vs ${r.net}`);
    if (Math.abs(e.minuteDrawdown.maximum - r.minuteDd) > 1e-6) problems.push('drawdown');

    failures.push(...problems.map((p) => `P8b ${ruleSet} #${n}: ${p}`));
    p8.push({ n: 100 + n, window: '2016-01-04 → 2018-12-31', ruleSet, variant: v.key, lots: e.lots.length, net: e.net, problems });
  }

  results.P8 = { runs: p8.length, withLots: p8.filter((x) => (x.lots as number) > 0).length, withDifferences: p8.filter((x) => (x.problems as string[]).length).length, detail: p8 };
  log(`P8: ${p8.length} reference comparisons, ${p8.filter((x) => (x.lots as number) > 0).length} with trades`);

  return { results, failures, dailyParams, iso: iso(0) };
};
