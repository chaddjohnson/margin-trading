// Priority 4's report-only CPU diagnostics (PROTOCOL.md §11, §13) — NON-OFFICIAL (purpose diagnostic), reading only doors
// the study's guards allow for diagnostics (doors.ts: D24 after the freeze, D21/D23 after the earlier interval, FULL after
// the sealed validation). For each declared PAIR (a reference configuration A and a variant B: an incumbent and its staged
// point; an EXP representative's all-OFF projection and the representative; …) both are replayed in full detail on the
// CPU reference (src/d1-risk-controls-rc3/run.ts runWithStaged, staged detail rows) and compared trade by trade in the
// COMPLETE chronological shared-capital pool (never a sum of standalone books):
//   portfolio    net, realized, open mark, marked DD (minute), daily DD, Σ interest, Σ costs, turnover (Σ funded principal),
//                sessions held / idle, lots by book
//   exits        the lots funded in both (same book and entry session) whose exit changed: date, reason, net Δ
//   displacement lots funded only in A (no longer funded in B) and only in B (newly funded), with their nets; refusals
//   giveback     per winning lot: the ex-post peak unrealized profit (best mark, NOT realizable), the realized/marked net,
//                giveback = peak − net; the staged stops' armed levels (protected at the level — an identity, never P&L)
//   forfeited    B's lots ending in a staged (armed) trailing exit whose A counterpart (same entry) ended with a larger net
//   staged       arms, staged exits, placement exits per book (B)
//   regimes      Δ marked net and the window DD over 2018-10..12, 2020-02..03, 2022, 2025-04 (when inside the door)
// It selects nothing. Usage (repository root):
//   GPU_POLICY_PURPOSE=diagnostic npm run vg-l0ss-tools -- diagnose --spec <pairs.json> --door D24 --out <json>
//   pairs.json: [{ "label": "...", "a": <PCfg>, "b": <PCfg>, "options"?: EvalOptions }]
import fs from 'node:fs';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { quadOf } from '../../src/vg-l0-full-joint/space.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { Lot, PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { runWithStaged, stagedLitesOf, stagedRowsOf, validateStagedFor } from '../../src/d1-risk-controls-rc3/run.ts';
import { openP4Door } from '../../src/vg-l0-staged-stop/doors.ts';
import { type PCfg, baseOf, stagedOf } from '../../src/vg-l0-staged-stop/space.ts';
import { codeDigest, headCommit } from '../../src/vg-l0-staged-stop/records.ts';
import { purposeOf, writeJson } from './common.ts';

const r2 = (x: number) => Math.round(x * 100) / 100;
const regimes: Record<string, [string, string]> = {
  '2018 Q4': ['2018-10-01', '2018-12-31'],
  '2020-02/03': ['2020-02-01', '2020-03-31'],
  '2022': ['2022-01-01', '2022-12-31'],
  '2025-04': ['2025-04-01', '2025-04-30']
};

export interface Pair {
  label: string;
  a: PCfg;
  b: PCfg;
  options?: EvalOptions;
}

const replay = (door: Door, c: PCfg, o: EvalOptions) => {
  const base = baseOf(c);
  const q = quadOf(base);
  const st = validateStagedFor(q, stagedOf(c), o);
  const x = runWithStaged(door, q, base.controls, st, o, true, false, { detail: true, cache: false });

  return { x, st };
};

const lotKey = (l: Lot) => `${l.book}@${l.entryS}`;
const exitOf = (door: Door, l: Lot) => (l.open ? null : door.dates[l.fills.at(-1)!.s]!);
const reasonOf = (l: Lot) => (l.open ? 'open' : l.fills.at(-1)!.reason);
const windowOf = (door: Door, r: PoolResult, from: string, to: string) => {
  const i0 = door.dates.findIndex((d) => d >= from);
  let i1 = -1;

  for (let i = door.dates.length - 1; i >= 0; i--)
    if (door.dates[i]! <= to) {
      i1 = i;
      break;
    }
  if (i0 < 0 || i1 < i0 || i1 > r.endIndex) return null;

  const start = i0 > 0 ? r.daily[i0 - 1]! : 0;
  let peak = start;
  let dd = 0;

  for (let i = i0; i <= i1; i++) {
    peak = Math.max(peak, r.daily[i]!);
    dd = Math.max(dd, peak - r.daily[i]!);
  }
  return { change: r2(r.daily[i1]! - start), dailyDd: r2(dd) };
};

const portfolioOf = (door: Door, r: PoolResult) => {
  const books = [...new Set(r.lots.map((l) => l.book))].sort();

  return {
    net: r2(r.net),
    realized: r2(r.realized),
    openMark: r2(r.unrealized),
    markedDd: r2(r.dd.max),
    dailyDd: r2(r.ddDaily.max),
    interest: r2(r.lots.reduce((a, l) => a + l.interest, 0)),
    costs: r2(r.lots.reduce((a, l) => a + l.costs, 0)),
    turnover: r2(r.lots.reduce((a, l) => a + l.principal0, 0)),
    lots: r.lots.length,
    sessionsHeld: r.sessionsHeld,
    sessionsIdle: r.endIndex + 1 - r.sessionsHeld,
    byBook: Object.fromEntries(
      books.map((b) => {
        const ls = r.lots.filter((l) => l.book === b);

        return [b, { lots: ls.length, net: r2(ls.reduce((a, l) => a + l.net, 0)), interest: r2(ls.reduce((a, l) => a + l.interest, 0)), costs: r2(ls.reduce((a, l) => a + l.costs, 0)) }];
      })
    ),
    refusals: r.refusals,
    regimes: Object.fromEntries(Object.entries(regimes).map(([k, [f, t]]) => [k, windowOf(door, r, f, t)]))
  };
};

const givebackOf = (r: PoolResult) => {
  const winners = r.lots.filter((l) => l.best > 0);
  const peak = winners.reduce((a, l) => a + l.best, 0);
  const kept = winners.reduce((a, l) => a + Math.max(0, l.net), 0);

  return {
    winningLots: winners.length,
    exPostPeakProfit: r2(peak), // the sum of each lot's best mark: hindsight, never realizable
    netOfThoseLots: r2(winners.reduce((a, l) => a + l.net, 0)),
    retainedPositive: r2(kept),
    giveback: r2(peak - kept),
    retainedShare: peak > 0 ? r2((100 * kept) / peak) / 100 : null
  };
};

export const comparePair = (door: Door, p: Pair) => {
  const o = p.options ?? vOptions;
  const A = replay(door, p.a, o);
  const B = replay(door, p.b, o);
  const la = new Map(A.x.result.lots.map((l) => [lotKey(l), l]));
  const lb = new Map(B.x.result.lots.map((l) => [lotKey(l), l]));
  const both = [...la.keys()].filter((k) => lb.has(k));
  const exitChanges = both
    .map((k) => ({ a: la.get(k)!, b: lb.get(k)! }))
    .filter(({ a, b }) => exitOf(door, a) !== exitOf(door, b) || reasonOf(a) !== reasonOf(b) || Math.abs(a.net - b.net) > 0.005)
    .map(({ a, b }) => ({
      book: a.book,
      entry: door.dates[a.entryS],
      exitA: exitOf(door, a),
      exitB: exitOf(door, b),
      reasonA: reasonOf(a),
      reasonB: reasonOf(b),
      netA: r2(a.net),
      netB: r2(b.net),
      delta: r2(b.net - a.net),
      bestA: r2(a.best)
    }));
  const onlyA = [...la.keys()].filter((k) => !lb.has(k)).map((k) => la.get(k)!);
  const onlyB = [...lb.keys()].filter((k) => !la.has(k)).map((k) => lb.get(k)!);
  const rowsB = stagedRowsOf(B.x.books);
  // B's staged (armed) trailing exits: the lots whose staged row records an exit event while armed
  const stagedExitEntries = new Set<string>();

  for (const [book, rows] of Object.entries(rowsB))
    for (const row of rows ?? []) if (row.events.some((e) => e.staged)) stagedExitEntries.add(`${book}@${row.entryS}`);

  const forfeited = [...stagedExitEntries]
    .filter((k) => la.has(k) && lb.has(k))
    .map((k) => ({ k, a: la.get(k)!, b: lb.get(k)! }))
    .filter(({ a, b }) => a.net > b.net + 0.005)
    .map(({ a, b }) => ({ book: a.book, entry: door.dates[a.entryS], exitB: exitOf(door, b), exitA: exitOf(door, a), netB: r2(b.net), netA: r2(a.net), forfeited: r2(a.net - b.net) }));
  const protectedLevels = Object.entries(rowsB).flatMap(([book, rows]) =>
    (rows ?? [])
      .filter((row) => row.armedS >= 0)
      .map((row) => ({ book, entry: door.dates[row.entryS], armed: door.dates[row.armedS], levelAtArming: r2(row.levelAtArming), entryRaw: r2(row.entryRaw), placed: row.placed }))
  );
  const pa = portfolioOf(door, A.x.result);
  const pb = portfolioOf(door, B.x.result);

  return {
    label: p.label,
    options: p.options ? 'declared' : 'vOptions',
    a: { staged: A.st, portfolio: pa, giveback: givebackOf(A.x.result) },
    b: { staged: B.st, portfolio: pb, giveback: givebackOf(B.x.result), stagedCounters: stagedLitesOf(B.x.books, B.st) },
    delta: {
      net: r2(pb.net - pa.net),
      markedDd: r2(pb.markedDd - pa.markedDd),
      interest: r2(pb.interest - pa.interest),
      costs: r2(pb.costs - pa.costs),
      turnover: r2(pb.turnover - pa.turnover),
      sessionsHeld: pb.sessionsHeld - pa.sessionsHeld
    },
    trades: {
      fundedInBoth: both.length,
      exitChanges: exitChanges.length,
      exitChangeNet: r2(exitChanges.reduce((s, x) => s + x.delta, 0)),
      noLongerFunded: onlyA.map((l) => ({ book: l.book, entry: door.dates[l.entryS], net: r2(l.net) })),
      newlyFunded: onlyB.map((l) => ({ book: l.book, entry: door.dates[l.entryS], net: r2(l.net) })),
      noLongerFundedNet: r2(onlyA.reduce((s, l) => s + l.net, 0)),
      newlyFundedNet: r2(onlyB.reduce((s, l) => s + l.net, 0)),
      changes: exitChanges
    },
    forfeited: { count: forfeited.length, total: r2(forfeited.reduce((s, x) => s + x.forfeited, 0)), rows: forfeited },
    stagedExits: stagedExitEntries.size,
    protectedAtLevel: { note: 'the armed stop level at arming: protection at a hypothetical level, never realized P&L', rows: protectedLevels }
  };
};

const args = process.argv.slice(2);
const opt = (k: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : undefined);

if (args[0] === 'diagnose') {
  const purpose = purposeOf(['diagnostic']);
  const doorName = opt('door') as StudyDoor;
  const pairs = JSON.parse(fs.readFileSync(opt('spec')!, 'utf8')) as Pair[];
  const door = await openP4Door(doorName, 'diagnostic', `report-only CPU diagnostic replays (${pairs.length} pairs; ${purpose})`);
  const t0 = Date.now();
  const rows = pairs.map((p) => comparePair(door, p));

  writeJson(opt('out')!, {
    kind: 'Priority 4 report-only CPU diagnostic (purpose diagnostic; never official evidence; selects nothing)',
    door: doorName,
    head: headCommit(),
    codeDigest: codeDigest(),
    pairs: rows,
    wallSeconds: Math.round((Date.now() - t0) / 100) / 10,
    finished: new Date().toISOString()
  });
  console.log(`diagnose ${doorName}: ${rows.length} pairs in ${Math.round((Date.now() - t0) / 1000)} s`);
}
