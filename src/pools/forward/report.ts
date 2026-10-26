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
import { hashBody, prospective, writeOnce } from './protocol.ts';

const money = (value: number) =>
  Number.isFinite(value)
    ? `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'n/a';
const pct = (value: number) => (Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : 'n/a');

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

// Linear interpolation of the ladder's forward equity change at a target number of borrowing dollar-days.
export const matchedBorrowing = (
  ladder: { fraction: number; borrowingDollarDays: number; equityChange: number }[],
  target: number
) => {
  const points = [...ladder].sort((a, b) => a.borrowingDollarDays - b.borrowingDollarDays);

  for (let index = 1; index < points.length; index++) {
    const low = points[index - 1]!;
    const high = points[index]!;

    if (
      low.borrowingDollarDays <= target &&
      target <= high.borrowingDollarDays &&
      high.borrowingDollarDays > low.borrowingDollarDays
    ) {
      const weight = (target - low.borrowingDollarDays) / (high.borrowingDollarDays - low.borrowingDollarDays);

      return {
        status: 'interpolated' as const,
        equityChange: low.equityChange + weight * (high.equityChange - low.equityChange),
        between: [low.fraction, high.fraction]
      };
    }
  }

  return { status: 'outside the ladder' as const, equityChange: NaN, between: [] as number[] };
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
      equityChange: number;
      forwardReturn: number;
      dailyPercentDrawdown: number;
      matchedBorrowing: { status: string; b5MinusMatchedB4: number };
    };
  }
) => {
  const rows = (
    label: string,
    value: (figures: Record<string, Exclude<ForwardFigures, { observations: 0 }>>) => string
  ) => `  ${label.padEnd(44)} ${value(b4).padStart(16)} ${value(b5).padStart(16)}`;

  return [
    `Prospective shadow comparison ${body.version} — snapshot ${body.snapshot.id}: ${body.observationCount} forward sessions ${body.snapshot.first} → ${body.snapshot.last}`,
    `  freeze ${body.freezeBodyHash.slice(0, 16)}… verified; cutoff ${body.cutoff}; both runs reproduced the frozen cutoff state (state carried, nothing reset)`,
    `  ${'(forward figures only; history excluded)'.padEnd(44)} ${'B4 (default)'.padStart(16)} ${'B5 (incumbent)'.padStart(16)}`,
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
    '',
    `B5 − B4 on the same observations: fixed net ${money(comparison.fixed.forwardNet!)}; minute DD ${money(comparison.fixed.minuteDrawdown!)}; portfolio equity ${money(comparison.portfolio.equityChange)}; daily % DD ${pct(comparison.portfolio.dailyPercentDrawdown)}; at matched borrowing (${comparison.portfolio.matchedBorrowing.status}) ${money(comparison.portfolio.matchedBorrowing.b5MinusMatchedB4)}`,
    `Reporting-only scenarios (fixed net): ${[...prospective.frictionScenariosBps.map((bps) => `fixed-${bps}bps`), ...prospective.rateScenarios.map((rate) => `fixed-rate-${Math.round(rate * 100)}%`)].map((key) => `${key} B4 ${money(b4[key]!.forwardNet)} / B5 ${money(b5[key]!.forwardNet)}`).join('; ')}`,
    `Evidence: ${body.evidence.statement}.`,
    `Dividends: ${body.dividends}. Inspected 2016–2026 history is never included in forward figures.`,
    ''
  ].join('\n');
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
      next: nextStepText
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
  const base = { dataset: 'all' as const, root: composed.root, splits: composed.splits, ledger: composed.ledger };
  const cache = new Map<string, Awaited<ReturnType<typeof loadPoolUniverse>>>();
  const pools: Record<string, Record<string, ForwardFigures>> = {};
  const lotsCsv: Record<string, string> = {};
  const ladder: { fraction: number; borrowingDollarDays: number; equityChange: number }[] = [];
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
            borrowingDollarDays: figures.borrowingDollarDays,
            equityChange: figures.portfolio!.equityChange
          });
        }
      }
    }
  }

  const observations = pools.B4!.fixed!.observations;
  const b4 = pools.B4! as Record<string, Exclude<ForwardFigures, { observations: 0 }>>;
  const b5 = pools.B5! as Record<string, Exclude<ForwardFigures, { observations: 0 }>>;
  const months = observations > 0 ? b4.fixed!.months.length : 0;
  const thin =
    months < prospective.evidenceThreshold.months ||
    b4.fixed!.lotsNew < prospective.evidenceThreshold.lotsPerPool ||
    b5.fixed!.lotsNew < prospective.evidenceThreshold.lotsPerPool;
  const matched = matchedBorrowing(ladder, b5['portfolio-frozen']!.borrowingDollarDays);
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
      equityChange: b5['portfolio-frozen']!.portfolio!.equityChange - b4['portfolio-frozen']!.portfolio!.equityChange,
      forwardReturn:
        b5['portfolio-frozen']!.portfolio!.forwardReturn - b4['portfolio-frozen']!.portfolio!.forwardReturn,
      dailyPercentDrawdown:
        b5['portfolio-frozen']!.portfolio!.dailyPercentDrawdown -
        b4['portfolio-frozen']!.portfolio!.dailyPercentDrawdown,
      matchedBorrowing: {
        ...matched,
        ladder,
        b5BorrowingDollarDays: b5['portfolio-frozen']!.borrowingDollarDays,
        b5MinusMatchedB4: b5['portfolio-frozen']!.portfolio!.equityChange - matched.equityChange
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
      months,
      newLots: { B4: b4.fixed!.lotsNew, B5: b5.fixed!.lotsNew },
      statement: thin
        ? `too thin to distinguish B5 from B4 (fewer than ${prospective.evidenceThreshold.months} forward months or ${prospective.evidenceThreshold.lotsPerPool} new funded lots per pool); cumulative figures only, not annualized`
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
    limitations: [
      'price-only lots except open VGT lots under the frozen dividend convention; non-Vanguard distributions omitted',
      "Vanguard's 30-day no-loan-value rule for newly bought Vanguard ETFs is not modelled; no live margin, house requirement or call beyond the frozen engine",
      'simulated fills from minute bars at the frozen per-side friction; no broker, order or account access',
      'a short window cannot distinguish two pools; nothing here is annualized or a validation'
    ]
  };
  const out = path.join(outputRoot, options.snapshot);
  const observationFile = path.join(dir, 'observations', `${options.snapshot}.json`);

  if (await fs.pathExists(observationFile)) {
    const { bodyHash, firstWrittenAt, ...stored } = (await fs.readJson(observationFile)) as Record<string, unknown>;

    void firstWrittenAt;

    if (hashBody(stored) !== bodyHash || JSON.stringify(stored) !== JSON.stringify(JSON.parse(JSON.stringify(body)))) {
      throw new Error(`${observationFile} exists and this report does not reproduce it`);
    }
  } else {
    await writeOnce(observationFile, { ...body, firstWrittenAt: new Date().toISOString() });
  }

  const text = formatForward(body, b4, b5, comparison);

  await fs.outputFile(path.join(out, 'report.txt'), text);
  await fs.outputJson(
    path.join(out, 'forward.json'),
    { ...body, generatedAt: new Date().toISOString() },
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

  return { text, record: body, out };
};
