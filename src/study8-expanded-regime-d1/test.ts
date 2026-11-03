// The test stage (PROTOCOL.md §8.4–§8.5) for one fold: the fold's test door (one continuous run from 2016-01-04 to the
// test end; no reset at the cutoff), opened once after FROZEN_SELECTION.json and the pre-test audit are sealed, in the
// documented order F19 → F20 → F21 → F23 → F24. Every shortlist member of every track is evaluated with fresh `test`
// seed families and FLAGGED by T1–T7 (block-only: no re-ranking, replacement or re-selection); the role holders get the
// full evidence (every neighbourhood variant, minute series, drawdown decomposition), the other members the lite
// evidence T1–T7 need. Report-only: Study 7-equivalent out-of-fold Q/E gates, persistence rates, the return-rank
// diagnostic, gap risk, paired bootstraps. Controls (and, on F24, Study 7's sealed research references) are evaluated
// with the same sets. F24's `--confirm` repeats the stage deterministically to detect computational mistakes only.
import zlib from 'node:zlib';
import fs from 'fs-extra';
import { stationaryBootstrap } from '../b4-b5-robustness/analysis.ts';
import { Rng } from '../optimizer/rng.ts';
import {
  Lab as Study6Lab,
  drawdownEpisodes,
  lotContributions,
  minuteSeries,
  newYork,
  periodMinuteDrawdown
} from '../study6-b5-kre-robustness/evaluate.ts';
import {
  type FoldKey,
  bookOrder,
  bootstrap,
  eligibility,
  insufficientTestLots,
  episodeGap,
  executionSettings,
  folds,
  frozenGrids,
  frozenPools,
  frozenSelectionFile,
  gdxControls,
  primaryFold,
  seedOf,
  stresses,
  testConfirmFile,
  testFile,
  testGates,
  years
} from './context.ts';
import { type Door, openDoor } from './data.ts';
import { type Books, Evaluator, Lab, PointCache, type PointRecord, baseSettings, settingsWith } from './evaluate.ts';
import { type Evidence, evidenceOf, qualificationOf } from './evidence.ts';
import { type Floors, floorsOf } from './fitness.ts';
import { constantsDigest } from './integrity.ts';
import { fileSha256, log, nowIso, readSealed, writeSealed } from './records.ts';
import { spearman } from './stats.ts';

interface Frozen {
  rankedByFold: Record<string, { rank: number; track: string; role: string; id: string; books: Books; tier: string }[]>;
  testPlan: Record<
    string,
    {
      shortlists: {
        track: string;
        id: string;
        order: number;
        pick: string;
        qualified: boolean;
        selectionRobustPerYear: number;
        confirmationRobustPerYear: number;
        books: Books;
      }[];
    }
  >;
  constants: { sha256: string };
  bodyHash: string;
}

// T6's test-window floors use yTest rounded to 0.01 (a 253-session calendar year must not add a lot).
export const testFloorsOf = (yTest: number) => {
  const years = Math.round(yTest * 100) / 100;

  return {
    lots: Math.ceil(testGates.testLotsPerYear * years),
    episodes: Math.ceil(testGates.testEpisodesPerYear * years)
  };
};

type GateEvidence = Pick<Evidence, 'decisive' | 'perRep' | 'nearBound'> & {
  alternates: { inbox?: { nb: { share: number; p90Dd: number } } };
};
type GateRecord = Pick<
  PointRecord,
  'dd' | 'net' | 'top1Share' | 'periods' | 'lots' | 'episodes' | 'lotYears' | 'books' | 'perCapitalYear'
>;
interface GateDeep {
  test: { net: number; newLots: number; newEpisodes: number };
  sensitivities: Record<string, { test: number | undefined; dd: number }>;
}

// PROTOCOL.md §8.4: T1–T7 and the status (pass | ambiguous | fail) of one configuration on a test door (pure).
export const testGatesOf = (
  evidence: GateEvidence,
  record: GateRecord,
  d: GateDeep,
  ctx: { y: number; yTest: number; floors: Floors; symbols: readonly string[] }
) => {
  const { ceiling } = eligibility;
  const nb = evidence.decisive.nb;
  const testMedian = evidence.decisive.test?.median ?? NaN;
  const bestYear = Math.max(
    0,
    ...Object.entries(record.periods)
      .filter(([k]) => /^\d{4}(~partial)?$/.test(k))
      .map(([, v]) => v)
  );
  const testFloors = testFloorsOf(ctx.yTest);
  const inbox = evidence.alternates.inbox?.nb;
  const gates = {
    T1: record.dd < ceiling,
    T2: nb.share >= eligibility.share && nb.p90Dd < ceiling,
    T2b: evidence.nearBound.length === 0 || (!!inbox && inbox.share >= eligibility.share && inbox.p90Dd < ceiling),
    T3:
      d.test.net >= testGates.centrePerTestYear * ctx.yTest &&
      testMedian > 0 &&
      testMedian >= testGates.medianPerTestYear * ctx.yTest,
    T4: stresses.every((s) => {
      const row = d.sensitivities[s.key];

      return !!row && (row.test ?? NaN) > 0 && row.dd < ceiling;
    }),
    T5:
      record.net > 0 &&
      bestYear / record.net <= eligibility.topYearShare &&
      (record.net - bestYear) / Math.max(1, ctx.y - 1) >= eligibility.exBestPerYear &&
      Number.isFinite(record.top1Share) &&
      record.top1Share <= eligibility.topLotShare,
    T6:
      record.lots >= ctx.floors.lots &&
      record.episodes >= ctx.floors.episodes &&
      record.lotYears >= ctx.floors.lotYears &&
      (ctx.symbols.length === 1 || ctx.symbols.every((s) => (record.books[s]?.lots ?? 0) >= ctx.floors.bookLots)) &&
      d.test.newLots >= testFloors.lots &&
      d.test.newEpisodes >= testFloors.episodes,
    T7: record.perCapitalYear >= eligibility.perCapitalYear
  };
  const failed = Object.entries(gates)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const ambiguous =
    failed.length === 0 &&
    (nb.share <= testGates.marginalShare ||
      evidence.perRep.some((r) => !(r.nb.share >= eligibility.share && r.nb.p90Dd < ceiling)) ||
      record.dd >= testGates.marginalCentreDd);

  return {
    gates,
    failed,
    status: failed.length ? 'fail' : ambiguous ? 'ambiguous' : 'pass',
    riskGatesPass: gates.T1 && gates.T2 && gates.T2b,
    bestYearShare: record.net > 0 ? bestYear / record.net : NaN,
    testFloors
  };
};

// Study 7's sealed research candidates (retrospective references only; selected with data through 2023 and evaluated
// on 2024–2026 by Study 7). Their books are read from Study 7's sealed FROZEN_SELECTION.json by rank.
export const study7References = [
  { key: 'S7#1-VG-profit', rank: 1 },
  { key: 'S7#2-VG-robust', rank: 2 },
  { key: 'S7#5-VG-balanced', rank: 5 },
  { key: 'S7#6-VXR-profit', rank: 6 },
  { key: 'S7#7-G-profit', rank: 7 },
  { key: 'S7#10-G-balanced', rank: 10 },
  { key: 'S7#11-G-robust', rank: 11 }
];

const study7Selection = 'research/study7-stability-first-d1/FROZEN_SELECTION.json';

export const controlsFor = async (fold: FoldKey) => {
  const out: Record<string, Books> = Object.fromEntries(
    Object.entries(frozenPools).map(([key, symbols]) => [
      key,
      Object.fromEntries(symbols.map((s) => [s, { ...frozenGrids[s] }]))
    ])
  );

  out['G-PA'] = { GDX: { ...gdxControls['G-PA']!.grid } };

  if (fold === primaryFold) {
    for (const key of ['G-NM1', 'G-NM2', 'G-NM3']) out[key] = { GDX: { ...gdxControls[key]!.grid } };

    const s7 = await readSealed<{ ranked: { rank: number; books: Books }[] }>(study7Selection);

    for (const ref of study7References) out[ref.key] = s7.ranked.find((r) => r.rank === ref.rank)!.books;
  }

  return out;
};

export interface StagePlan {
  holders: Frozen['rankedByFold'][string];
  members: Frozen['testPlan'][string]['shortlists'];
}

// The test pipeline of one fold on an open door, without writing any record: the body of the test record and the
// per-trade ledgers. runTest runs it on the fold's test door; parity gate T0 runs it twice on a parity door with frozen
// controls before any search (review N2). No status is printed here: statuses are logged only after the seal.
export const testStageOn = async (
  door: Door,
  fold: FoldKey,
  plan: StagePlan,
  { primary, controls: controlBooks, label }: { primary: boolean; controls: Record<string, Books>; label: string }
) => {
  const started = Date.now();
  const ev = new Evaluator(door);
  // always a fresh memory cache: a rerun or --confirm never reloads cached records
  const lab = new Lab(ev, PointCache.memory(door));
  const y = ev.yearsOfRun();
  const end = door.dates[door.lastIndex]!;
  const spec = folds[fold];
  const floors = floorsOf(y, 2017, Number(end.slice(0, 4)));
  const trainKey = `TRAIN-${fold}`;
  const testKey = `TEST-${fold}`;
  const options = { prefix: 'test', track: 'sets', fold, floors, trainKey, testKey };
  const testStart = door.indexOf(spec.testStart);
  const yTest = (door.lastIndex - testStart + 1) / 252;
  const s6 = new Study6Lab(door as never);
  const periodOf = (record: PointRecord, key: string) => record.periods[key] ?? record.periods[`${key}~partial`];
  const r2 = (value: number) => Math.round(value * 100) / 100;

  // gap risk (PROTOCOL.md §8.5): funded lots closed by a stop that gapped through at the open, and the loss beyond the
  // stop level (shares × (stop − opening price)), from each lot's own virtual trade
  const gapRiskOf = (
    books: Books,
    lots: readonly { symbol: string; tradeId: number; exitTime: number; entryIndex: number; open: boolean }[]
  ) => {
    let stops = 0;
    let gapStops = 0;
    let testGapStops = 0;
    let gapLoss = 0;
    let worst = 0;

    for (const lot of lots) {
      if (lot.open) continue;

      const trade = ev.trace(lot.symbol, books[lot.symbol]!, baseSettings).trades.find((t) => t.id === lot.tradeId);

      if (!trade || trade.exitTime !== lot.exitTime)
        throw new Error(`gap risk: lot ${lot.symbol} #${lot.tradeId} has no matching virtual trade`);
      if (trade.exitReason === 'trailing stop') stops++;
      if (trade.exitReason === 'trailing stop gap') {
        const loss = trade.shares * (trade.exitStopPrice - trade.exitRawPrice);

        gapStops++;
        gapLoss += loss;
        worst = Math.max(worst, loss);
        if (lot.entryIndex >= testStart) testGapStops++;
      }
    }

    return {
      stops,
      gapStops,
      testWindowGapStops: testGapStops,
      gapLossBeyondStop: r2(gapLoss),
      worstGapLossBeyondStop: r2(worst)
    };
  };

  const deep = (books: Books, withSeries: boolean) => {
    const centre = lab.point(books);
    const result = ev.replay(books);
    const sensitivities = Object.fromEntries(
      [
        ...executionSettings,
        { key: 'arm2017-12-15', armDate: '2017-12-15' },
        { key: 'arm2018-06-15', armDate: '2018-06-15' }
      ].map((setting) => {
        const { key, ...overrides } = setting;
        const record = lab.point(books, settingsWith(overrides));

        return [
          key,
          {
            net: record.net,
            dd: record.dd,
            ddDaily: record.ddDaily,
            lots: record.lots,
            test: periodOf(record, testKey)
          }
        ];
      })
    );
    const yearKeys = years.map((year) =>
      centre.periods[String(year)] !== undefined ? String(year) : `${year}~partial`
    );
    const leaveOneYearOut = Object.fromEntries(
      yearKeys.filter((key) => key in centre.periods).map((key) => [key, centre.net - centre.periods[key]!])
    );
    const testLots = result.lots.filter((lot) => lot.entryIndex >= testStart);
    let testEpisodes = 0;
    let previousExit = -Infinity;

    for (const lot of testLots) {
      if (lot.entryIndex - previousExit > episodeGap) testEpisodes++;

      previousExit = lot.exitIndex >= 0 ? lot.exitIndex : Infinity;
    }

    let series: Record<string, unknown> | undefined;
    const lots = result.lots.map((lot) => ({
      symbol: lot.symbol,
      entry: newYork(lot.entryTime),
      exit: lot.exitTime > 0 ? newYork(lot.exitTime) : '',
      net: lot.net,
      interest: lot.interest,
      costs: lot.costs,
      open: lot.open,
      inTest: lot.entryIndex >= testStart,
      mae: NaN
    }));

    if (withSeries) {
      const detailed = s6.replay(books, baseSettings, true);
      const minutes = minuteSeries(s6, detailed, books, baseSettings);

      // the minute series must reproduce the strict tracker and list the same lots in the same order (review m15)
      if (minutes.matchesTracker !== true) throw new Error('minute series does not reproduce the tracker maximum');
      if (
        minutes.lots.length !== result.lots.length ||
        minutes.lots.some(
          (lot, i) => lot.symbol !== result.lots[i]!.symbol || lot.entryTime !== result.lots[i]!.entryTime
        )
      ) {
        throw new Error('minute series lots differ from the replay lots');
      }

      const contributions = lotContributions(minutes, minutes.peakIndex, minutes.troughIndex);
      const worst = new Map<number, number>();

      for (const point of minutes.points) {
        if (point.openLot >= 0) worst.set(point.openLot, Math.min(worst.get(point.openLot) ?? 0, point.unrealized));
      }

      minutes.lots.forEach((lot, index) => {
        lots[index]!.mae = worst.get(lot.id) ?? 0;
      });
      series = {
        maximum: minutes.maximum,
        matchesTracker: minutes.matchesTracker,
        peak: newYork(minutes.points[minutes.peakIndex]?.time ?? 0),
        trough: newYork(minutes.points[minutes.troughIndex]?.time ?? 0),
        lots: contributions.rows.map((row) => ({
          symbol: row.symbol,
          entry: newYork(row.entryTime),
          exit: newYork(row.exitTime),
          net: row.net,
          contribution: row.contribution
        })),
        residual: contributions.residual,
        episodes: drawdownEpisodes(minutes, 5).map((e) => ({
          depth: e.depth,
          peak: newYork(minutes.points[e.peakIndex]?.time ?? 0),
          trough: newYork(minutes.points[e.troughIndex]?.time ?? 0)
        })),
        testWindowMinuteDd: periodMinuteDrawdown(minutes, door.dates, spec.testStart, spec.testEnd),
        trainingWindowMinuteDd: periodMinuteDrawdown(minutes, door.dates, '2016-01-01', spec.trainEnd)
      };
    }

    const lotSum = result.lots.reduce((a, l) => a + l.net, 0);
    const testNet = periodOf(centre, testKey) ?? NaN;

    return {
      sensitivities,
      leaveOneYearOut,
      test: {
        net: testNet,
        perYear: testNet / yTest,
        newLots: testLots.length,
        newEpisodes: testEpisodes,
        lotYears: new Set(testLots.map((lot) => door.dates[lot.entryIndex]!.slice(0, 4))).size,
        y2025: periodOf(centre, 'Y2025'),
        y2026ytd: periodOf(centre, 'Y2026YTD'),
        worstLotMae: lots.filter((l) => l.inTest).reduce((m, l) => Math.min(m, Number.isFinite(l.mae) ? l.mae : 0), 0)
      },
      gapRisk: gapRiskOf(books, result.lots),
      reconciliation: {
        lotSumEqualsNet: Math.abs(lotSum - result.net) < 0.01,
        realizedPlusUnrealizedEqualsNet: Math.abs(result.realized + result.unrealized - result.net) < 0.01
      },
      series,
      lots,
      marks: result.marks
    };
  };

  const ranges = ev.ranges();
  const rangeOf = (key: string) => ranges.find((r) => r.key === key || r.key === `${key}~partial`);
  const pairedBootstrap = (a: Float64Array, b: Float64Array, key: string, label: string) => {
    const range = rangeOf(key);

    if (!range) return null;

    const diffs: number[] = [];

    for (let i = range.first; i <= range.last; i++) {
      const prev = i > 0 ? a[i - 1]! - b[i - 1]! : 0;

      diffs.push(a[i]! - b[i]! - prev);
    }

    const totals = stationaryBootstrap(
      [diffs],
      bootstrap.blockLength,
      bootstrap.resamples,
      Rng.from(...seedOf('test', fold, 'bootstrap', label, key))
    )[0]!.sort((x, z) => x - z);
    const q = (p: number) => totals[Math.min(totals.length - 1, Math.max(0, Math.round(p * (totals.length - 1))))]!;

    return {
      observed: diffs.reduce((s, v) => s + v, 0),
      p05: q(0.05),
      p50: q(0.5),
      p95: q(0.95),
      shareAboveZero: totals.filter((v) => v > 0).length / totals.length
    };
  };
  const gatesOf = (evidence: Evidence, d: ReturnType<typeof deep>, books: Books) =>
    testGatesOf(evidence, evidence.centre.record, d, { y, yTest, floors, symbols: Object.keys(books) });

  // controls (and Study 7 references on the primary fold)
  const controls: Record<string, unknown> = {};
  const controlEvidence: Record<string, Evidence> = {};
  const marksOf: Record<string, Float64Array> = {};
  const lotsOut: { who: string; lots: unknown[] }[] = [];

  for (const [key, books] of Object.entries(controlBooks)) {
    const evidence = evidenceOf(lab, books, { ...options, sequence: Object.keys(books).length > 1 });
    const d = deep(books, primary);
    const { marks, lots, ...rest } = d;

    marksOf[key] = marks;
    controlEvidence[key] = evidence;
    controls[key] = { books, evidence, deep: rest, lotsCount: lots.length, gates: gatesOf(evidence, d, books) };
    lotsOut.push({ who: `control:${key}`, lots });
    lab.cache.flushSync();
    log(`${label}: control ${key} done`);
  }

  // Study 7-equivalent out-of-fold gates (report only): Study 7's Q/E gates on the run to the test end
  const s7EquivalentOf = (evidence: Evidence, books: Books) => {
    const q = qualificationOf(evidence, floors, {
      fold,
      trainKey,
      testKey,
      b1: controlEvidence.B1!,
      pooled: Object.keys(books).length > 1
    });

    return { gates: q.gates, failed: q.failed, passed: q.failed.length === 0 };
  };

  for (const [key, row] of Object.entries(controls)) {
    (row as Record<string, unknown>).s7Equivalent = s7EquivalentOf(
      controlEvidence[key]!,
      (row as { books: Books }).books
    );
  }

  // role holders, in the sealed rank order (flags only), with the full evidence
  const holderIds = new Set(plan.holders.map((h) => `${h.track}/${h.id}`));
  const holders = plan.holders.map((holder) => {
    const evidence = evidenceOf(lab, holder.books, options);
    const d = deep(holder.books, true);
    const { marks, lots, ...rest } = d;
    const gates = gatesOf(evidence, d, holder.books);
    const subset = Object.entries(frozenPools).find(
      ([, symbols]) => symbols.length === Object.keys(holder.books).length && symbols.every((s) => s in holder.books)
    )?.[0];
    const comparators = [
      'B1',
      'B5',
      ...(holder.track === 'G' ? ['G-PA'] : subset && subset !== 'B1' && subset !== 'B5' ? [subset] : [])
    ];
    const comparisons = Object.fromEntries(
      comparators.flatMap((control) =>
        ['FULL', testKey].map((key) => [
          `${control}:${key}`,
          pairedBootstrap(marks, marksOf[control]!, key, `${holder.id}-${control}`)
        ])
      )
    );

    lotsOut.push({ who: `${holder.track}/${fold}/${holder.id}`, lots });
    lab.cache.flushSync();
    log(`${label}: holder #${holder.rank} ${holder.track} ${holder.role} done`);

    return {
      ...holder,
      evidence,
      deep: rest,
      gates,
      s7Equivalent: s7EquivalentOf(evidence, holder.books),
      comparisons
    };
  });
  const holderById = new Map(holders.map((h) => [`${h.track}/${h.id}`, h]));

  // every shortlist member of every track (holders reuse their full evidence; the rest get the lite evidence)
  const members = plan.members.map((item) => {
    const holder = holderById.get(`${item.track}/${item.id}`);
    const evidence = holder ? holder.evidence : evidenceOf(lab, item.books, { ...options, lite: true });
    const d = holder ? undefined : deep(item.books, false);
    const gates = holder ? holder.gates : gatesOf(evidence, d!, item.books);
    const s7 = holder ? holder.s7Equivalent : s7EquivalentOf(evidence, item.books);
    const testNet = holder ? holder.deep.test.net : d!.test.net;

    log(`${label}: member ${item.track} #${item.order} done`);

    return {
      ...item,
      holder: holderIds.has(`${item.track}/${item.id}`),
      centre: {
        net: evidence.centre.record.net,
        dd: evidence.centre.record.dd,
        lots: evidence.centre.record.lots,
        train: evidence.centre.record.periods[trainKey],
        test: testNet
      },
      testMedian: evidence.decisive.test?.median ?? NaN,
      evidence: holder ? { see: 'holders' } : evidence,
      deep: holder ? { see: 'holders' } : (({ marks, lots, ...rest }) => (void marks, void lots, rest))(d!),
      gates,
      s7Equivalent: s7
    };
  });

  // fold-level diagnostics (PROTOCOL.md §8.5; descriptive)
  const count = <T>(list: readonly T[], test: (item: T) => boolean) => list.filter(test).length;
  const rate = (k: number, n: number) => (n ? k / n : null);
  const notFailed = (m: { gates: { status: string } }) => m.gates.status !== 'fail';
  const qualifiedMembers = members.filter((m) => m.qualified);
  const otherMembers = members.filter((m) => !m.qualified);
  const holderTestLots = holders.reduce((total, h) => total + h.deep.test.newLots, 0);
  const persistence = {
    holders: {
      n: holders.length,
      notFailed: count(holders, notFailed),
      rate: rate(count(holders, notFailed), holders.length)
    },
    shortlist: {
      n: members.length,
      notFailed: count(members, notFailed),
      rate: rate(count(members, notFailed), members.length)
    },
    qualifiedMembers: {
      n: qualifiedMembers.length,
      notFailed: count(qualifiedMembers, notFailed),
      rate: rate(count(qualifiedMembers, notFailed), qualifiedMembers.length)
    },
    otherMembers: {
      n: otherMembers.length,
      notFailed: count(otherMembers, notFailed),
      rate: rate(count(otherMembers, notFailed), otherMembers.length)
    },
    s7Equivalent: {
      n: members.length,
      passed: count(members, (m) => m.s7Equivalent.passed),
      rate: rate(
        count(members, (m) => m.s7Equivalent.passed),
        members.length
      )
    },
    positiveTestWindow: {
      qualified: rate(
        count(qualifiedMembers, (m) => m.centre.test > 0),
        qualifiedMembers.length
      ),
      other: rate(
        count(otherMembers, (m) => m.centre.test > 0),
        otherMembers.length
      )
    },
    holderTestLots,
    insufficientEvidence: holders.length === 0 || holderTestLots < insufficientTestLots
  };
  const rho = (
    list: typeof members,
    x: (m: (typeof members)[number]) => number,
    z: (m: (typeof members)[number]) => number
  ) => {
    const rows = list.filter((m) => Number.isFinite(x(m)) && Number.isFinite(z(m)));

    return { n: rows.length, rho: rows.length >= 3 ? spearman(rows.map(x), rows.map(z)) : null };
  };
  const returnRank = {
    selectionVsTestCentre: rho(
      members,
      (m) => m.selectionRobustPerYear,
      (m) => m.centre.test
    ),
    selectionVsTestMedian: rho(
      members,
      (m) => m.selectionRobustPerYear,
      (m) => m.testMedian
    ),
    confirmationVsTestCentre: rho(
      members,
      (m) => m.confirmationRobustPerYear,
      (m) => m.centre.test
    ),
    byTrack: Object.fromEntries(
      [...new Set(members.map((m) => m.track))].map((track) => [
        track,
        rho(
          members.filter((m) => m.track === track),
          (m) => -m.order,
          (m) => m.centre.test
        )
      ])
    )
  };
  const nominations = primary
    ? holders
        .filter((h) => h.gates.status !== 'fail')
        .map((h) => ({ rank: h.rank, track: h.track, role: h.role, id: h.id, status: h.gates.status }))
    : [];
  const outcome = !primary
    ? null
    : nominations.length
      ? { class: 'qualified', primaryNominee: nominations[0]! }
      : holders.some((h) => h.gates.riskGatesPass)
        ? { class: 'stable-but-weaker only', primaryNominee: null }
        : { class: 'none', primaryNominee: null };

  const body = {
    door: { key: door.key, id: door.id, last: end, sessions: door.dates.length },
    window: {
      train: `2017-06-15 → ${spec.trainEnd}`,
      test: `${door.dates[testStart]} → ${end}`,
      yRun: y,
      yTest,
      testFloors: testFloorsOf(yTest),
      floors
    },
    holders,
    persistent: holders
      .filter((h) => h.gates.status !== 'fail')
      .map((h) => ({ rank: h.rank, track: h.track, role: h.role, id: h.id, status: h.gates.status })),
    nominations,
    outcome,
    persistence,
    returnRank,
    controls,
    members,
    stats: lab.stats(),
    seconds: (Date.now() - started) / 1000
  };

  return { body, lotsOut };
};

// The decision-bearing part of a test body, in its sealed serialization (non-finite numbers as strings).
export const sealedForm = (body: Record<string, unknown>) =>
  JSON.parse(JSON.stringify(body, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))) as Record<
    string,
    unknown
  >;

export const stageCore = (r: Record<string, unknown>) =>
  JSON.stringify({
    holders: r.holders,
    controls: r.controls,
    members: r.members,
    persistent: r.persistent,
    nominations: r.nominations,
    outcome: r.outcome,
    persistence: r.persistence,
    returnRank: r.returnRank
  });

export const runTest = async (fold: FoldKey, { confirm }: { confirm: boolean }) => {
  const out = confirm ? testConfirmFile(fold) : testFile(fold);

  if (confirm && fold !== primaryFold) throw new Error('--confirm is defined for the primary fold only');
  if (await fs.pathExists(out))
    throw new Error(`${out} exists (sealed); the test stage runs once (and --confirm once)`);
  if (confirm && !(await fs.pathExists(testFile(fold)))) throw new Error('--confirm needs the sealed test record');

  const frozen = await readSealed<Frozen>(frozenSelectionFile);

  // the rulebook applied must be the one sealed with the selection (review M1)
  if (frozen.constants?.sha256 !== constantsDigest())
    throw new Error('the live rulebook (context.ts) differs from the one sealed in FROZEN_SELECTION.json');

  const door = await openDoor(`test-${fold}`, [...bookOrder], `test stage ${fold}${confirm ? ' (confirm)' : ''}`);
  const stage = await testStageOn(
    door,
    fold,
    { holders: frozen.rankedByFold[fold] ?? [], members: frozen.testPlan[fold]?.shortlists ?? [] },
    {
      primary: fold === primaryFold,
      controls: await controlsFor(fold),
      label: `test ${fold}${confirm ? ' --confirm' : ''}`
    }
  );
  const lotsFile = out.replace(/\.json$/, '-lots.jsonl.gz');

  await fs.outputFile(
    lotsFile,
    zlib.gzipSync(stage.lotsOut.map((row) => JSON.stringify(row)).join('\n') + '\n', { level: 9 })
  );

  const body: Record<string, unknown> = {
    stage: confirm ? 'TEST_CONFIRM' : 'TEST',
    fold,
    at: nowIso(),
    selection: { file: frozenSelectionFile, bodyHash: frozen.bodyHash },
    ...stage.body,
    lots: { file: lotsFile, sha256: await fileSha256(lotsFile) }
  };
  let identical: boolean | undefined;

  if (confirm) {
    const a = await readSealed<Record<string, unknown>>(testFile(fold));

    identical = stageCore(a) === stageCore(sealedForm(body));
    body.confirmation = { of: testFile(fold), identical };
  }

  const record = await writeSealed(out, body);
  const { holders, nominations } = stage.body;

  // statuses are printed only now, after the record is sealed
  for (const h of holders) {
    log(
      `test ${fold}: #${h.rank} ${h.track} ${h.role} ${h.id}: ${h.gates.status}${h.gates.failed.length ? ` (${h.gates.failed.join(',')})` : ''}`
    );
  }

  log(
    `test ${fold}${confirm ? ' --confirm' : ''}: ${record.file} ${record.bodyHash.slice(0, 12)}; ${stage.body.persistent.length}/${holders.length} role holders not failed${fold === primaryFold ? `; nominations ${nominations.length}` : ''}`
  );

  if (confirm) {
    log(`test ${fold} --confirm: ${identical ? 'IDENTICAL to test.json' : 'DIFFERS from test.json'}`);
    if (!identical)
      throw new Error(
        'the confirmation run differs from the sealed test record (a computational problem; see AMENDMENTS.md)'
      );
  }
};
