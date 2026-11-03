// `npm run pools -- forward report [--snapshot ID]`: the prospective comparison of B4 and B5 on the observations after
// the cutoff (PROTOCOL.md §3–§7). Without a snapshot it verifies the freeze, proves the frozen `all` still reproduces
// the frozen cutoff state, and reports "prospective observation count = 0; not yet evaluated" — no P&L is computed.
import path from 'node:path';
import fs from 'fs-extra';
import { toCsv } from '../../multi-etf-allocator/metrics.ts';
import type { NRunResult } from '../../portfolio-aware-d1/nbook/engine.ts';
import { type LoadedPool, loadPool } from '../load.ts';
import { type PoolRunOptions, loadPoolUniverse, runPoolOn } from '../run.ts';
import { composeSnapshot, listSnapshots } from './data.ts';
import { type ProspectiveFreeze, cutoffModes, verifyProspectiveFreeze } from './freeze.ts';
import { type ForwardFigures, forwardFiguresOf, stateAt } from './metrics.ts';
import { calendarState, codeManifest, prospective, readSealed, writeOnce } from './protocol.ts';

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';
const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a');

// PROTOCOL.md §9: stated in every report.
export const limitations = [
  'price-only lots except open VGT lots under the frozen dividend convention; non-Vanguard distributions omitted',
  "Vanguard's 30-day no-loan-value rule for newly bought Vanguard ETFs is not modelled; no live margin, house requirement or call beyond the frozen engine",
  'simulated fills from minute bars at the frozen per-side friction; no broker, order or account access',
  'a short window cannot distinguish two pools; nothing here is annualized or a validation'
];

export const zeroObservationStatement = 'prospective observation count = 0; not yet evaluated';

export const nextStepText = [
  'Next step (when new minute bars after 2026-10-13 exist, obtained under a separately authorized download or supplied by you):',
  '  1. put VOOG.csv VGT.csv XBI.csv XRT.csv KRE.csv GDX.csv (canonical format, sessions 2026-10-14 onward only) in a folder;',
  '  2. npm run pools -- forward import --from <folder> --snapshot <id> --source "<where the bars came from>"',
  '     [--splits <file>] [--distributions <file> --distributions-through YYYY-MM-DD];',
  '  3. npm run pools -- forward report --snapshot <id>'
].join('\n');

const sameState = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const checkCutoffState = (
  freeze: ProspectiveFreeze,
  id: string,
  key: string,
  result: NRunResult,
  cutoffIndex: number
) => {
  const state = stateAt(result, cutoffIndex);

  if (!sameState(state, freeze.cutoffState[id]?.[key])) {
    throw new Error(
      `${id} ${key}: the run's state at ${freeze.cutoff} differs from the frozen cutoff state; the report is refused`
    );
  }

  return state;
};

const strip = (figures: ForwardFigures) => {
  if (figures.observations === 0) {
    return figures;
  }

  const { lots, months, ...rest } = figures as Exclude<ForwardFigures, { observations: 0 }>;

  return { ...rest, lotCount: lots.length, monthCount: months.length };
};

// Matched borrowing (PROTOCOL.md §6): the B4 ladder's forward return, interpolated linearly at B5's borrowing
// intensity (forward borrowing dollar-days ÷ the run's own cutoff equity); never extrapolated.
export interface LadderPoint {
  fraction: number;
  borrowingIntensity: number;
  forwardReturn: number;
}

export const matchedBorrowing = (ladder: LadderPoint[], target: number) => {
  const points = [...ladder].sort((a, b) => a.borrowingIntensity - b.borrowingIntensity);
  const exact = points.find((point) => point.borrowingIntensity === target);

  // An exact match (including no borrowing at all on both sides) needs no interpolation.
  if (exact) {
    return { status: 'matched' as const, forwardReturn: exact.forwardReturn, between: [exact.fraction] };
  }

  for (let index = 1; index < points.length; index++) {
    const low = points[index - 1]!;
    const high = points[index]!;

    if (
      low.borrowingIntensity <= target &&
      target <= high.borrowingIntensity &&
      high.borrowingIntensity > low.borrowingIntensity
    ) {
      const weight = (target - low.borrowingIntensity) / (high.borrowingIntensity - low.borrowingIntensity);

      return {
        status: 'interpolated' as const,
        forwardReturn: low.forwardReturn + weight * (high.forwardReturn - low.forwardReturn),
        between: [low.fraction, high.fraction]
      };
    }
  }

  return { status: 'outside the ladder' as const, forwardReturn: NaN, between: [] as number[] };
};

const runOn = async (
  pool: LoadedPool,
  options: PoolRunOptions,
  cache: Map<string, Awaited<ReturnType<typeof loadPoolUniverse>>>
) => {
  const key = `${pool.config.id}:${options.mode}`;
  let loaded = cache.get(key);

  if (!loaded) {
    loaded = await loadPoolUniverse(pool, options);
    cache.set(key, loaded);
  }

  return { loaded, result: runPoolOn(pool, loaded, options) };
};

const formatForward = (
  body: {
    version: string;
    freezeBodyHash: string;
    cutoff: string;
    snapshot: { id: string; first: string; last: string; sessions: number };
    observationCount: number;
    evidence: { statement: string };
    dividends: string;
  },
  b4: Record<string, Exclude<ForwardFigures, { observations: 0 }>>,
  b5: Record<string, Exclude<ForwardFigures, { observations: 0 }>>,
  comparison: {
    fixed: Record<string, number>;
    portfolio: {
      forwardReturn: number;
      strategyReturnOnCutoffEquity: number;
      dailyPercentDrawdown: number;
      matchedBorrowing: { status: string; b5MinusMatchedB4Return: number };
    };
  }
) => {
  const rows = (
    label: string,
    value: (figures: Record<string, Exclude<ForwardFigures, { observations: 0 }>>) => string
  ) => `  ${label.padEnd(44)} ${value(b4).padStart(30)} ${value(b5).padStart(30)}`;

  return [
    `Prospective shadow comparison ${body.version} — snapshot ${body.snapshot.id}: ${body.observationCount} forward sessions ${body.snapshot.first} → ${body.snapshot.last}`,
    `  freeze ${body.freezeBodyHash.slice(0, 16)}… verified; cutoff ${body.cutoff}; both runs reproduced the frozen cutoff state (state carried, nothing reset)`,
    `  ${'(forward figures only; history excluded)'.padEnd(44)} ${'B4 (default)'.padStart(30)} ${'B5 (incumbent)'.padStart(30)}`,
    'Fixed pool ($100,000 per funded trade, one slot, 5 bps per side, 11% simple):',
    rows('forward net (M_end − M_cutoff)', (f) => money(f.fixed!.forwardNet)),
    rows(
      '  realized in window / unrealized at end',
      (f) => `${money(f.fixed!.realizedInWindow)} / ${money(f.fixed!.unrealizedAtEnd)}`
    ),
    rows(
      'forward interest / friction',
      (f) => `${money(f.fixed!.forwardInterest)} / ${money(f.fixed!.forwardFriction)}`
    ),
    rows(
      'max MINUTE drawdown (peak reset at cutoff)',
      (f) => `${money(f.fixed!.fixed!.minuteDrawdown)} (${pct(f.fixed!.fixed!.minuteDrawdownPercentOfNotional)})`
    ),
    rows(
      'max DAILY drawdown',
      (f) => `${money(f.fixed!.fixed!.dailyDrawdown)} (${pct(f.fixed!.fixed!.dailyDrawdownPercentOfNotional)})`
    ),
    rows(
      'lots carried / new / open at end',
      (f) => `${f.fixed!.lotsCarried} / ${f.fixed!.lotsNew} / ${f.fixed!.lotsOpenAtEnd}`
    ),
    rows('decisions funded / refused', (f) => `${f.fixed!.granted} / ${f.fixed!.refused}`),
    rows('time in market', (f) => pct(f.fixed!.timeInMarket)),
    rows(
      'borrowing $-days; net per $1M $-days',
      (f) =>
        `${Math.round(f.fixed!.borrowingDollarDays).toLocaleString('en-US')}; ${money(f.fixed!.netPerMillionBorrowingDollarDays)}`
    ),
    rows('largest lot share of forward net', (f) =>
      f.fixed!.largestLot ? pct(f.fixed!.largestLot.shareOfNet) : 'n/a'
    ),
    'Portfolio ($300,000 60/40 core reference; 20% of marked equity per trade; frozen dividends):',
    rows(
      'equity at cutoff → end',
      (f) =>
        `${money(f['portfolio-frozen']!.portfolio!.equityAtCutoff)} → ${money(f['portfolio-frozen']!.portfolio!.equityAtEnd)}`
    ),
    rows('forward return (cumulative, not annualized)', (f) => pct(f['portfolio-frozen']!.portfolio!.forwardReturn)),
    rows('max DAILY % drawdown (peak reset at cutoff)', (f) =>
      pct(f['portfolio-frozen']!.portfolio!.dailyPercentDrawdown)
    ),
    rows('symmetric dividends: forward return', (f) => pct(f['portfolio-symmetric']!.portfolio!.forwardReturn)),
    rows('borrowing $-days (portfolio)', (f) =>
      Math.round(f['portfolio-frozen']!.borrowingDollarDays).toLocaleString('en-US')
    ),
    rows('strategy P&L ÷ cutoff equity', (f) => pct(f['portfolio-frozen']!.portfolio!.strategyReturnOnCutoffEquity)),
    rows('borrowing intensity ($-days ÷ cutoff equity)', (f) =>
      f['portfolio-frozen']!.portfolio!.borrowingIntensity.toFixed(2)
    ),
    rows('whole-run minute % DD (includes history)', (f) =>
      pct(f['portfolio-frozen']!.portfolio!.wholeRunMinutePercentDrawdown)
    ),
    '',
    `B5 − B4 on the same observations: fixed net ${money(comparison.fixed.forwardNet!)}; fixed minute DD ${money(comparison.fixed.minuteDrawdown!)}; portfolio forward return ${pct(comparison.portfolio.forwardReturn)}; strategy P&L ÷ cutoff equity ${pct(comparison.portfolio.strategyReturnOnCutoffEquity)}; daily % DD ${pct(comparison.portfolio.dailyPercentDrawdown)}; return at matched borrowing intensity (${comparison.portfolio.matchedBorrowing.status}) ${pct(comparison.portfolio.matchedBorrowing.b5MinusMatchedB4Return)}`,
    '  (portfolio dollar changes are not compared: B4 and B5 enter the window with different equity)',
    `Reporting-only scenarios (fixed net): ${[...prospective.frictionScenariosBps.map((bps) => `fixed-${bps}bps`), ...prospective.rateScenarios.map((rate) => `fixed-rate-${Math.round(rate * 100)}%`)].map((key) => `${key} B4 ${money(b4[key]!.forwardNet)} / B5 ${money(b5[key]!.forwardNet)}`).join('; ')}`,
    `Evidence: ${body.evidence.statement}.`,
    `Dividends: ${body.dividends}. Inspected 2016–2026 history is never included in forward figures.`,
    'Limitations:',
    ...limitations.map((line) => `  - ${line}`),
    ''
  ].join('\n');
};

// The observation summary of a snapshot is written once; a later report of the same snapshot must reproduce it. The
// seal covers the stored object (including when it was first written); the content is compared without that time.
export const checkOrWriteObservation = async (file: string, body: Record<string, unknown>) => {
  if (await fs.pathExists(file)) {
    const { bodyHash, firstWrittenAt, ...content } = await readSealed<{ bodyHash: string; firstWrittenAt?: string }>(
      file
    );

    void bodyHash;
    void firstWrittenAt;

    if (JSON.stringify(content) !== JSON.stringify(JSON.parse(JSON.stringify(body)))) {
      throw new Error(`${file} exists and this report does not reproduce it`);
    }

    return 'reproduced' as const;
  }

  await writeOnce(file, { ...body, firstWrittenAt: new Date().toISOString() });

  return 'written' as const;
};

export const runForwardReport = async (
  options: { snapshot?: string; dir?: string; outputRoot?: string; snapshotsRoot?: string } = {}
) => {
  const dir = options.dir ?? prospective.dir;
  const verified = await verifyProspectiveFreeze(dir);

  if (!verified.frozen || verified.failures.length > 0) {
    throw new Error(`the prospective freeze does not verify:\n  ${verified.failures.join('\n  ')}`);
  }

  const { freeze } = verified;
  const snapshots = await listSnapshots(dir);
  const outputRoot = options.outputRoot ?? prospective.outputRoot;

  if (!options.snapshot && snapshots.length > 0) {
    throw new Error(`name the snapshot to report: --snapshot ${snapshots.join(' | ')}`);
  }

  // No new data: prove the boundary machinery on the frozen all, compute no forward figure.
  if (!options.snapshot) {
    const checks: string[] = [];

    for (const id of prospective.pools) {
      const pool = await loadPool(id);

      for (const item of cutoffModes) {
        const run: PoolRunOptions = {
          mode: item.mode,
          dataset: 'all',
          costBps: prospective.principalCostBps,
          dividends: item.dividends
        };
        const loaded = await loadPoolUniverse(pool, run);
        const result = runPoolOn(pool, loaded, run);

        checkCutoffState(freeze, id, item.key, result, result.universe.dates.indexOf(freeze.cutoff));
        checks.push(`${id} ${item.key}: frozen cutoff state reproduced`);
      }
    }

    const record = {
      schemaVersion: 1,
      kind: 'prospective-report',
      version: freeze.version,
      generatedAt: new Date().toISOString(),
      freezeBodyHash: freeze.bodyHash,
      cutoff: freeze.cutoff,
      snapshot: null,
      observationCount: 0,
      status: zeroObservationStatement,
      checks,
      next: nextStepText,
      limitations,
      environment: { node: process.version, codeDigest: freeze.code.digest, calendarCoverage: calendarState().coverage }
    };
    const out = path.join(outputRoot, 'no-snapshot');
    const text = [
      `Prospective shadow comparison ${freeze.version} — B4 (default) vs B5 (leading incumbent)`,
      `  freeze ${freeze.bodyHash.slice(0, 16)}… verified (protocol, pools, member vectors, code, market events, canonical data)`,
      `  cutoff ${freeze.cutoff}; forward observations are sessions from ${prospective.firstForwardSession}`,
      ...checks.map((check) => `  ${check}`),
      '',
      `  ${zeroObservationStatement.toUpperCase()}: no snapshot of post-cutoff bars has been imported, so no forward P&L,`,
      '  drawdown or borrowing figure exists. Historical 2016–2026 figures are inspected baselines, not forward evidence.',
      '',
      nextStepText,
      '',
      'Limitations:',
      ...limitations.map((line) => `  - ${line}`),
      ''
    ].join('\n');

    await fs.outputFile(path.join(out, 'report.txt'), text);
    await fs.outputJson(path.join(out, 'forward.json'), record, { spaces: 2 });

    return { text, record, out };
  }

  const pins = freeze.data.canonicalPins;
  const composed = await composeSnapshot(options.snapshot, pins, {
    dir,
    snapshotsRoot: options.snapshotsRoot,
    outputRoot
  });
  if (composed.record.freezeBodyHash !== freeze.bodyHash) {
    throw new Error(
      `snapshot ${options.snapshot} was imported under freeze ${composed.record.freezeBodyHash.slice(0, 16)}…, not the current ${freeze.bodyHash.slice(0, 16)}…`
    );
  }

  const base = { dataset: 'all' as const, root: composed.root, splits: composed.splits, ledger: composed.ledger };
  const cache = new Map<string, Awaited<ReturnType<typeof loadPoolUniverse>>>();
  const pools: Record<string, Record<string, ForwardFigures>> = {};
  const lotsCsv: Record<string, string> = {};
  const ladder: LadderPoint[] = [];
  let dividendsCovered = true;

  for (const id of prospective.pools) {
    const pool = await loadPool(id);
    const notional = pool.config.funding.notionalPerTrade;

    pools[id] = {};

    for (const item of cutoffModes) {
      const run: PoolRunOptions = {
        ...base,
        mode: item.mode,
        costBps: prospective.principalCostBps,
        dividends: item.dividends
      };
      const { loaded, result } = await runOn(pool, run, cache);
      const cutoffIndex = result.universe.dates.indexOf(freeze.cutoff);

      checkCutoffState(freeze, id, item.key, result, cutoffIndex);
      pools[id]![item.key] = forwardFiguresOf(result, freeze.cutoff, {
        rate: prospective.annualRate,
        costBps: prospective.principalCostBps,
        notional
      });

      if (item.key === 'fixed' && pools[id]!.fixed!.observations > 0) {
        lotsCsv[id] = toCsv((pools[id]!.fixed as Exclude<ForwardFigures, { observations: 0 }>).lots);
      }

      if (item.mode === 'portfolio' && loaded.universe.end > composed.ledger.coverage.VGT) {
        dividendsCovered = false;
      }
    }

    // Reporting-only scenarios (PROTOCOL.md §7): friction and rates on the fixed pool.
    for (const costBps of prospective.frictionScenariosBps) {
      const { result } = await runOn(pool, { ...base, mode: 'fixed', costBps, dividends: 'frozen' }, cache);

      pools[id]![`fixed-${costBps}bps`] = forwardFiguresOf(result, freeze.cutoff, {
        rate: prospective.annualRate,
        costBps,
        notional
      });
    }

    for (const rate of prospective.rateScenarios) {
      const { result } = await runOn(
        pool,
        { ...base, mode: 'fixed', costBps: prospective.principalCostBps, dividends: 'frozen', rate },
        cache
      );

      pools[id]![`fixed-rate-${Math.round(rate * 100)}%`] = forwardFiguresOf(result, freeze.cutoff, {
        rate,
        costBps: prospective.principalCostBps,
        notional
      });
    }

    if (id === 'B4') {
      for (const fraction of prospective.ladderFractions) {
        const { result } = await runOn(
          pool,
          {
            ...base,
            mode: 'portfolio',
            costBps: prospective.principalCostBps,
            dividends: 'frozen',
            borrowedFraction: fraction
          },
          cache
        );
        const figures = forwardFiguresOf(result, freeze.cutoff, {
          rate: prospective.annualRate,
          costBps: prospective.principalCostBps,
          notional
        }) as Exclude<ForwardFigures, { observations: 0 }>;

        if (figures.observations > 0) {
          ladder.push({
            fraction,
            borrowingIntensity: figures.portfolio!.borrowingIntensity,
            forwardReturn: figures.portfolio!.forwardReturn
          });
        }
      }
    }
  }

  const observations = pools.B4!.fixed!.observations;
  const b4 = pools.B4! as Record<string, Exclude<ForwardFigures, { observations: 0 }>>;
  const b5 = pools.B5! as Record<string, Exclude<ForwardFigures, { observations: 0 }>>;
  const thin =
    observations < prospective.evidenceThreshold.sessions ||
    b4.fixed!.lotsNew < prospective.evidenceThreshold.lotsPerPool ||
    b5.fixed!.lotsNew < prospective.evidenceThreshold.lotsPerPool;
  const matched = matchedBorrowing(ladder, b5['portfolio-frozen']!.portfolio!.borrowingIntensity);
  const comparison = {
    fixed: {
      forwardNet: b5.fixed!.forwardNet - b4.fixed!.forwardNet,
      minuteDrawdown: b5.fixed!.fixed!.minuteDrawdown - b4.fixed!.fixed!.minuteDrawdown,
      dailyDrawdown: b5.fixed!.fixed!.dailyDrawdown - b4.fixed!.fixed!.dailyDrawdown,
      lotsNew: b5.fixed!.lotsNew - b4.fixed!.lotsNew,
      refused: b5.fixed!.refused - b4.fixed!.refused,
      timeInMarket: b5.fixed!.timeInMarket - b4.fixed!.timeInMarket,
      interest: b5.fixed!.forwardInterest - b4.fixed!.forwardInterest,
      friction: b5.fixed!.forwardFriction - b4.fixed!.forwardFriction,
      borrowingDollarDays: b5.fixed!.borrowingDollarDays - b4.fixed!.borrowingDollarDays,
      netPerMillionBorrowingDollarDays:
        b5.fixed!.netPerMillionBorrowingDollarDays - b4.fixed!.netPerMillionBorrowingDollarDays
    },
    portfolio: {
      strategyReturnOnCutoffEquity:
        b5['portfolio-frozen']!.portfolio!.strategyReturnOnCutoffEquity -
        b4['portfolio-frozen']!.portfolio!.strategyReturnOnCutoffEquity,
      forwardReturn:
        b5['portfolio-frozen']!.portfolio!.forwardReturn - b4['portfolio-frozen']!.portfolio!.forwardReturn,
      dailyPercentDrawdown:
        b5['portfolio-frozen']!.portfolio!.dailyPercentDrawdown -
        b4['portfolio-frozen']!.portfolio!.dailyPercentDrawdown,
      matchedBorrowing: {
        ...matched,
        ladder,
        b5BorrowingIntensity: b5['portfolio-frozen']!.portfolio!.borrowingIntensity,
        b5MinusMatchedB4Return: b5['portfolio-frozen']!.portfolio!.forwardReturn - matched.forwardReturn
      }
    }
  };
  const body = {
    schemaVersion: 1,
    kind: 'prospective-report',
    version: freeze.version,
    freezeBodyHash: freeze.bodyHash,
    cutoff: freeze.cutoff,
    snapshot: {
      id: composed.record.id,
      bodyHash: composed.record.bodyHash,
      first: composed.record.first,
      last: composed.record.last,
      sessions: composed.record.sessions,
      files: composed.record.files,
      composed: composed.composed,
      splits: composed.record.splits,
      dividendCoverage: composed.ledger.coverage
    },
    observationCount: observations,
    status: observations > 0 ? `evaluated: ${observations} forward sessions` : zeroObservationStatement,
    evidence: {
      sessions: observations,
      months: observations > 0 ? b4.fixed!.months.length : 0,
      newLots: { B4: b4.fixed!.lotsNew, B5: b5.fixed!.lotsNew },
      statement: thin
        ? `too thin to distinguish B5 from B4 (fewer than ${prospective.evidenceThreshold.sessions} forward sessions, about 12 months, or ${prospective.evidenceThreshold.lotsPerPool} new funded lots per pool); cumulative figures only, not annualized`
        : 'past the descriptive evidence threshold; still not a validation and no promotion rule'
    },
    dividends: dividendsCovered
      ? 'covered by the ledger'
      : `INCOMPLETE dividends after ${composed.ledger.coverage.VGT}: later VOOG/VGT distributions are not credited`,
    pools: Object.fromEntries(
      Object.entries(pools).map(([id, figures]) => [
        id,
        Object.fromEntries(Object.entries(figures).map(([key, item]) => [key, strip(item)]))
      ])
    ),
    comparison,
    code: { digest: (await codeManifest(freeze.code.entries)).digest },
    limitations
  };
  const out = path.join(outputRoot, options.snapshot);
  const observationFile = path.join(dir, 'observations', `${options.snapshot}.json`);

  const observation = await checkOrWriteObservation(observationFile, body);

  const text = formatForward(body, b4, b5, comparison);

  await fs.outputFile(path.join(out, 'report.txt'), text);
  await fs.outputJson(
    path.join(out, 'forward.json'),
    {
      ...body,
      generatedAt: new Date().toISOString(),
      environment: { node: process.version, codeDigest: body.code.digest, calendarCoverage: calendarState().coverage }
    },
    { spaces: 2 }
  );
  await fs.outputFile(
    path.join(out, 'monthly.csv'),
    toCsv(
      observations > 0
        ? b4.fixed!.months.map((row, index) => ({
            month: row.month,
            B4_fixed: row.strategyChange,
            B5_fixed: b5.fixed!.months[index]?.strategyChange ?? 0,
            B4_portfolio_equity: b4['portfolio-frozen']!.months[index]?.equityChange ?? 0,
            B5_portfolio_equity: b5['portfolio-frozen']!.months[index]?.equityChange ?? 0
          }))
        : []
    )
  );

  for (const [id, csv] of Object.entries(lotsCsv)) {
    await fs.outputFile(path.join(out, `lots-${id}.csv`), csv);
  }

  return { text: `${text}Observation record: ${observationFile} (${observation}).\n`, record: body, out };
};
