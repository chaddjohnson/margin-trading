// Stage 3–4 analysis (PROTOCOL.md §6–§10), computed from the stored runs only: neighbourhoods, the opportunity
// catalog and capture, costs and tails, years and regimes, portfolio efficiency, the fold-forward chronology, selection
// bias, and the predeclared flags and standing (./standing.ts). Bound by the protocol freeze. It never runs a
// strategy; it loads the candidate universe (≤ 2023-12-29) for closes and the deep-condition sessions only, and
// requires the catalog it recomputes to equal the bound pre-freeze catalog. Writes results/analysis.json and CSVs.
import path from 'node:path';
import fs from 'fs-extra';
import { study as sourceStudy } from '../d1-ranked-preemption/context.ts';
import { readSealed } from '../d1-ranked-preemption/freeze.ts';
import type { Dataset } from '../four-family/data.ts';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { loadPhenotypes, procedureMatchedId, stageCSymbols } from './batch.ts';
import { catalogFile } from './catalogs.ts';
import { censusFile } from './census.ts';
import {
  armingDate,
  candidateCutoff,
  costScenarios,
  flagThresholds,
  foldKeys,
  jsonReplacer,
  log,
  nowIso,
  readJson,
  resultDir,
  sourceResults,
  windows
} from './context.ts';
import { candidateUniverse } from './data.ts';
import {
  type Episode,
  type EpisodeCapture,
  capturesOf,
  catalogOf,
  deepConditionSessions,
  familiesOf,
  anchorOf,
  familyNetOf,
  independentOf,
  phaseOf
} from './events.ts';
import type { CensusRow, Grid } from './inventory.ts';
import { median, quantile } from './inventory.ts';
import type { CompactLot } from './run.ts';
import { type Phenotype, gridKeyOf, oatPointsOf } from './specs.ts';
import { type PhenotypeSummary, etfStandingOf, standingOf } from './standing.ts';
import { type StoredRun, lotsOf, readFamily } from './store.ts';

export const analysisFile = resultDir('analysis.json');
const tablesDir = resultDir('tables');

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);
const share = (values: readonly boolean[]) => (values.length > 0 ? values.filter(Boolean).length / values.length : NaN);
const num = (value: unknown) => (typeof value === 'number' ? value : NaN);

const csvCell = (value: unknown) => {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    return '';
  }

  const text = typeof value === 'number' ? String(Math.round(value * 1e6) / 1e6) : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const writeCsv = async (name: string, rows: readonly Record<string, unknown>[]) => {
  const columns = rows.length > 0 ? Object.keys(rows[0]!) : [];
  const text = [columns.join(','), ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(','))].join(
    '\n'
  );

  await fs.outputFile(path.join(tablesDir, name), `${text}\n`);
};

const distribution = (values: readonly number[]) => ({
  n: values.length,
  median: median(values),
  p10: quantile(values, 0.1),
  p90: quantile(values, 0.9),
  worst: values.length > 0 ? Math.min(...values) : NaN,
  best: values.length > 0 ? Math.max(...values) : NaN
});

// The longest underwater spell of a daily mark series (sessions below a prior running peak).
const longestUnderwater = (marks: readonly { date: string; value: number }[]) => {
  let peak = -Infinity;
  let start = -1;
  let longest = { sessions: 0, from: '', to: '' };

  marks.forEach((row, index) => {
    if (row.value >= peak - 1e-9) {
      if (start >= 0 && index - start > longest.sessions) {
        longest = { sessions: index - start, from: marks[start - 1]?.date ?? marks[0]!.date, to: row.date };
      }

      peak = row.value;
      start = -1;
    } else if (start < 0) {
      start = index;
    }
  });

  if (start >= 0 && marks.length - start > longest.sessions) {
    longest = {
      sessions: marks.length - start,
      from: marks[start - 1]?.date ?? '',
      to: `${marks.at(-1)!.date} (open)`
    };
  }

  return longest;
};

// Net per $1M of borrowing dollar-days of a fixed run: one $100,000 slot × its occupied calendar days (the source's
// Stage A definition), the same denominator for every configuration.
const perMillion = (net: number, occupiedDays: number) => (net / (occupiedDays * 100000)) * 1e6;

// ----- per-design neighbourhood summaries (PROTOCOL.md §6.3) -----

const neighbourhoodOf = (fixed: readonly StoredRun[], portfolio: readonly StoredRun[], baseNet: number, c0: number) => {
  const nets = fixed.map((run) => run.view.net);
  const portfolioDaily = portfolio.map((run) => num(run.metrics.dailyPercent));

  return {
    n: fixed.length,
    net: distribution(nets),
    shareProfitable: share(nets.map((value) => value > 0)),
    shareHalfOfBase: share(nets.map((value) => value >= 0.5 * baseNet)),
    shareAboveBase: share(nets.map((value) => value > baseNet)),
    retention: distribution(nets.map((value) => value / baseNet)),
    shareDdWithinCeiling: share(fixed.map((run) => run.view.minuteDrawdown <= flagThresholds.ddCeiling)),
    minuteDrawdown: distribution(fixed.map((run) => run.view.minuteDrawdown)),
    netPerMillionDollarDays: distribution(fixed.map((run) => perMillion(run.view.net, run.view.occupiedDays))),
    lots: distribution(fixed.map((run) => run.view.trades)),
    portfolio: {
      n: portfolio.length,
      dailyPercent: distribution(portfolioDaily),
      shareAbove30: share(portfolioDaily.map((value) => value > 0.3)),
      shareAbove35: share(portfolioDaily.map((value) => value > 0.35)),
      shareIncrementalPositive: share(portfolio.map((run) => num(run.metrics.endEquity) - c0 > 0))
    }
  };
};

interface FoldRecord {
  symbol: string;
  fold: string;
  credible: boolean;
  candidateId: string;
  trainingNetStored: number;
  trainingStatus: string;
  markAtBoundary: number;
  increment5: number;
  increment10: number;
  lotsEntered: number;
  openAtBoundary: number;
  windowedDailyDrawdown: number;
  boundaryParity: boolean;
}

// The source study's 13 regimes, the last clipped to the cutoff.
const regimeList = sourceStudy.regimes.map((regime) => ({
  ...regime,
  end: regime.end > candidateCutoff ? candidateCutoff : regime.end
}));

const previousDay = (date: string) => new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);

// Deterministic CSV ledgers (no timestamps): the event-by-event capture ledger, every base trade, the cost and OAT
// tables and the fold-forward table.
const writeTables = async (analysis: AnalysisRecord) => {
  const phenotypes = Object.values(analysis.phenotypes);

  await writeCsv(
    'capture_ledger.csv',
    phenotypes.flatMap((result) =>
      result.perEpisode.map(({ episode, base, joint, oat, shallowerThanX, voogOverlap }) => ({
        phenotype: result.id,
        episode: episode.id,
        family: episode.family,
        peak: episode.peakDate,
        trough: episode.troughDate,
        depth: episode.depth,
        band: episode.band,
        status: episode.status,
        eligible: episode.eligible,
        shallower_than_x: shallowerThanX,
        voog_overlap: voogOverlap,
        base_outcome: base.outcome,
        base_dip_captured: base.dipCaptured,
        base_entries: base.entries,
        base_decline_entries: base.declineEntries,
        base_dip_entries: base.dipEntries,
        base_deep_entries: base.deepEntries,
        base_continuation_entries: base.continuationEntries,
        base_net: base.net,
        base_dip_net: base.dipNet,
        base_interest: base.interest,
        base_friction: base.friction,
        base_first_entry_offset: base.firstEntryOffset,
        base_first_entry_depth: base.firstEntryDepth,
        base_captured_share: base.capturedShare,
        base_worst_mae: base.worstMae,
        base_lots: base.lots.join(' '),
        joint_captured: joint.captured,
        joint_dip_captured: joint.dipCaptured,
        joint_entered_loss: joint.enteredLoss,
        joint_in_position: joint.inPosition,
        joint_armed_no_entry: joint.armedNoEntry,
        joint_not_armed: joint.notArmed,
        joint_net_median: joint.net.median,
        joint_net_p10: joint.net.p10,
        joint_net_p90: joint.net.p90,
        joint_offset_median: joint.offsetMedian,
        joint_offset_iqr: joint.offsetIqr,
        joint_captured_share_median: joint.capturedShareMedian,
        oat_captured: oat.captured,
        oat_dip_captured: oat.dipCaptured,
        oat_entered_loss: oat.enteredLoss,
        oat_net_median: oat.net.median
      }))
    )
  );
  await writeCsv(
    'base_trades.csv',
    phenotypes.flatMap((result) =>
      result.lotRows.map((lot) => ({
        phenotype: result.id,
        lot: lot.id,
        setup: lot.setup,
        activation_date: lot.activationDate,
        entry_date: lot.entryDate,
        entry_time: new Date(lot.entryTime * 1000).toISOString(),
        entry_raw: lot.entryRawPrice,
        exit_date: lot.exitDate,
        exit_time: new Date(lot.exitTime * 1000).toISOString(),
        exit_raw: lot.exitRawPrice,
        exit_reason: lot.exitReason,
        shares: lot.shares,
        gross: lot.gross,
        interest: lot.interest,
        friction: lot.friction,
        net: lot.net,
        occupied_days: lot.occupiedDays,
        mae: lot.maePercent,
        mfe: lot.mfePercent,
        episode: lot.episode,
        family: lot.family,
        phase: lot.phase,
        dip: lot.dip
      }))
    )
  );
  await writeCsv(
    'costs.csv',
    phenotypes.flatMap((result) => result.costRows.map((row) => ({ phenotype: result.id, ...row })))
  );
  await writeCsv(
    'oat.csv',
    phenotypes.flatMap((result) => result.oatTable.map((row) => ({ phenotype: result.id, ...row })))
  );
  await writeCsv('folds.csv', analysis.folds as unknown as Record<string, unknown>[]);
};

export const analyze = async () => {
  const startedAt = nowIso();
  const phenotypes = await loadPhenotypes();
  const census = await readJson<{ rows: CensusRow[] }>(censusFile);
  const shortlist = await readJson<{ selected: { symbol: string; slot: string; cluster: string }[] }>(
    'research/d1-standalone-etf-opportunity-audit/SHORTLIST.json'
  );
  const boundCatalog = await readJson<{
    symbols: Record<string, { episodes: Episode[]; families: unknown[]; coverage: number; volatility: number }>;
  }>(catalogFile);
  const families = {
    base: await readFamily('base'),
    cost: await readFamily('cost'),
    oat: await readFamily('oat'),
    joint: await readFamily('joint'),
    incumbent: await readFamily('incumbent'),
    fold: await readFamily('fold')
  };
  const { universe } = await candidateUniverse(stageCSymbols(phenotypes));
  const dates = universe.dates;
  const armingIndex = universe.eligibilityIndex;

  if (dates[armingIndex] !== armingDate) {
    throw new Error('the arming session moved');
  }

  const get = (map: Map<string, StoredRun>, key: string) => {
    const run = map.get(key);

    if (!run) {
      throw new Error(`missing stored run ${key}`);
    }

    return run;
  };
  const c0 = get(families.incumbent, 'incumbent:C0:base:portfolio');
  const c0Equity = num(c0.metrics.endEquity);
  const c0Daily = num(c0.metrics.dailyPercent);

  // ----- catalogs (must equal the bound pre-freeze catalog) -----

  const catalogs = new Map<string, Episode[]>();
  const conditionCache = new Map<string, Uint8Array>();
  const datasetOf = (symbol: string) => universe.instruments[symbol]!.ds as unknown as Dataset;
  const catalogFor = (symbol: string) => {
    if (!catalogs.has(symbol)) {
      const catalog = catalogOf(symbol, dates, datasetOf(symbol).sClose, armingIndex);
      const bound = boundCatalog.symbols[symbol];

      if (
        !bound ||
        JSON.stringify(bound.episodes) !== JSON.stringify(JSON.parse(JSON.stringify(catalog, jsonReplacer)))
      ) {
        throw new Error(`${symbol}: the recomputed episode catalog differs from the bound ${catalogFile}`);
      }

      catalogs.set(symbol, catalog);
    }

    return catalogs.get(symbol)!;
  };
  const conditionFor = (symbol: string, grid: Grid) => {
    const key = `${symbol}|${grid.targetPercentChange}|${grid.tickWindowSize}`;

    if (!conditionCache.has(key)) {
      conditionCache.set(
        key,
        deepConditionSessions(datasetOf(symbol), grid.targetPercentChange / 1000, grid.tickWindowSize, armingIndex)
      );
    }

    return conditionCache.get(key)!;
  };
  const voogCatalog = catalogFor('VOOG');

  // ----- per phenotype -----

  const analyzePhenotype = (phenotype: Phenotype) => {
    const id = phenotype.id;
    const baseFixed = get(families.base, `base:${id}:base:fixed`);
    const basePortfolio = get(families.base, `base:${id}:base:portfolio`);
    const baseNet = baseFixed.view.net;
    const baseLots = lotsOf(baseFixed);
    const catalog = catalogFor(phenotype.symbol);
    const familyList = familiesOf(catalog, datasetOf(phenotype.symbol).sClose);
    const capturesFor = (run: StoredRun) =>
      capturesOf(catalog, lotsOf(run), conditionFor(phenotype.symbol, run.grid as unknown as Grid));
    const baseCaptures = capturesFor(baseFixed);

    // neighbourhoods
    const ofFamily = (map: Map<string, StoredRun>, prefix: string, mode: string) =>
      [...map.values()].filter((run) => run.subject === id && run.key.startsWith(prefix) && run.mode === mode);
    const oatFixed = ofFamily(families.oat, `oat:${id}:`, 'fixed');
    const oatPortfolio = ofFamily(families.oat, `oat:${id}:`, 'portfolio');
    const jointFixed = ofFamily(families.joint, `joint:${id}:`, 'fixed').sort((a, b) => (a.key < b.key ? -1 : 1));
    const jointPortfolio = ofFamily(families.joint, `joint:${id}:`, 'portfolio');
    const seedRuns = (runs: readonly StoredRun[], seed: number) => runs.filter((run) => run.meta.seed === seed);
    const neighbourhoods = {
      oat: neighbourhoodOf(oatFixed, oatPortfolio, baseNet, c0Equity),
      jointSeed1: neighbourhoodOf(seedRuns(jointFixed, 1), seedRuns(jointPortfolio, 1), baseNet, c0Equity),
      jointSeed2: neighbourhoodOf(seedRuns(jointFixed, 2), seedRuns(jointPortfolio, 2), baseNet, c0Equity),
      jointPooled: neighbourhoodOf(jointFixed, jointPortfolio, baseNet, c0Equity)
    };
    const oatTable = oatPointsOf(phenotype).map((point) => {
      const run = oatFixed.find((item) => item.meta.parameter === point.key && item.meta.offset === point.offset);
      const portfolio = oatPortfolio.find(
        (item) => item.meta.parameter === point.key && item.meta.offset === point.offset
      );

      return {
        parameter: point.key,
        offset: point.offset,
        frozen: point.frozen,
        value: point.value,
        relativeShift: point.relativeShift,
        feasible: point.feasible,
        insideSourceBox: point.insideSourceBox,
        reason: point.reason,
        net: run?.view.net ?? NaN,
        retention: run ? run.view.net / baseNet : NaN,
        lots: run?.view.trades ?? NaN,
        minuteDrawdown: run?.view.minuteDrawdown ?? NaN,
        portfolioDaily: portfolio ? num(portfolio.metrics.dailyPercent) : NaN
      };
    });

    // episode capture across the neighbourhood (joint, both seeds) and OAT
    const jointCaptures = jointFixed.map((run) => ({ run, captures: capturesFor(run) }));
    const oatCaptures = oatFixed.map((run) => ({ run, captures: capturesFor(run) }));
    const eligible = catalog.filter((episode) => episode.eligible);
    const eligibleFamilies = familyList.filter((family) => family.eligible);
    const majorDipFamilies = eligibleFamilies.filter(
      (family) => family.major && familyNetOf(baseCaptures, family.id, true) > 0
    );
    const neighbourCaptureShares = jointCaptures.map(({ captures }) =>
      majorDipFamilies.length === 0
        ? 0
        : majorDipFamilies.filter((family) => familyNetOf(captures, family.id, true) > 0).length /
          majorDipFamilies.length
    );
    const perEpisode = catalog.map((episode) => {
      const base = baseCaptures.find((capture) => capture.episode === episode.id)!;
      const joint = jointCaptures.map(({ captures }) => captures.find((capture) => capture.episode === episode.id)!);
      const oat = oatCaptures.map(({ captures }) => captures.find((capture) => capture.episode === episode.id)!);
      const offsets = joint
        .map((capture) => capture.firstEntryOffset)
        .filter((value): value is number => value !== null);
      const voog = voogCatalog.filter(
        (other) => other.peakIndex <= episode.endIndex && other.endIndex >= episode.peakIndex
      );

      return {
        episode,
        base,
        shallowerThanX: episode.depth < phenotype.grid.targetPercentChange / 1000,
        voogOverlap: voog.map((other) => `${other.id} (${(other.depth * 100).toFixed(1)}%)`).join(' '),
        joint: {
          captured: share(joint.map((capture) => capture.outcome === 'captured')),
          dipCaptured: share(joint.map((capture) => capture.dipCaptured)),
          enteredLoss: share(joint.map((capture) => capture.outcome === 'entered, loss')),
          inPosition: share(joint.map((capture) => capture.outcome === 'in position')),
          armedNoEntry: share(joint.map((capture) => capture.outcome === 'armed, no entry')),
          notArmed: share(joint.map((capture) => capture.outcome === 'not armed')),
          net: distribution(joint.map((capture) => capture.net)),
          offsetIqr: offsets.length > 0 ? quantile(offsets, 0.75) - quantile(offsets, 0.25) : NaN,
          offsetMedian: offsets.length > 0 ? median(offsets) : NaN,
          capturedShareMedian: median(
            joint.map((capture) => capture.capturedShare).filter((value): value is number => value !== null)
          )
        },
        oat: {
          captured: share(oat.map((capture) => capture.outcome === 'captured')),
          dipCaptured: share(oat.map((capture) => capture.dipCaptured)),
          enteredLoss: share(oat.map((capture) => capture.outcome === 'entered, loss')),
          net: distribution(oat.map((capture) => capture.net))
        }
      };
    });

    // winner parameter-dependence (F5): the base's top-3 winning lots
    const winners = [...baseLots]
      .filter((lot) => lot.net > 0)
      .sort((a, b) => b.net - a.net)
      .slice(0, 3);
    const winnerPersistence = winners.map((lot, rank) => {
      const { episode, phase } = phaseOf(catalog, lot.entryIndex);

      if (!episode || !episode.eligible) {
        return {
          rank: rank + 1,
          lotId: lot.id,
          net: lot.net,
          entryDate: dates[lot.entryIndex]!,
          episode: episode?.id ?? null,
          phase,
          reference: 0.5 * baseNet,
          keptShare: share(jointFixed.map((run) => run.view.net >= 0.5 * baseNet)),
          basis: 'whole-run retention ≥ 50% (the lot is outside every eligible episode)'
        };
      }

      const episodeNet = baseCaptures.find((capture) => capture.episode === episode.id)!.net;
      const reference = episodeNet > 0 ? episodeNet : lot.net;

      return {
        rank: rank + 1,
        lotId: lot.id,
        net: lot.net,
        entryDate: dates[lot.entryIndex]!,
        episode: episode.id,
        phase,
        reference,
        keptShare: share(
          jointCaptures.map(
            ({ captures }) => captures.find((capture) => capture.episode === episode.id)!.net >= 0.5 * reference
          )
        ),
        basis:
          episodeNet > 0
            ? 'episode net ≥ 50% of the base’s episode net'
            : 'episode net ≥ 50% of the lot’s own net (the base’s episode net was ≤ 0)'
      };
    });

    // families (eligible episodes only)
    const familyRows = familyList.map((family) => ({
      ...family,
      baseNet: familyNetOf(baseCaptures, family.id),
      baseDipNet: familyNetOf(baseCaptures, family.id, true),
      jointProfitableShare: share(jointCaptures.map(({ captures }) => familyNetOf(captures, family.id) > 0)),
      jointDipShare: share(jointCaptures.map(({ captures }) => familyNetOf(captures, family.id, true) > 0))
    }));
    const profitableFamilies = familyRows.filter((family) => family.eligible && family.baseNet > 0).length;
    const dipFamilyRows = familyRows.filter((family) => family.eligible && family.baseDipNet > 0);
    const dipFamilies126 = dipFamilyRows.length;
    const dipFamilies = independentOf(dipFamilyRows.map((family) => anchorOf(catalog, family.id)));
    const eligibleMajorFamilies = familyRows.filter((family) => family.eligible && family.major).length;
    const jointDipFamilies = jointCaptures.map(
      ({ captures }) => eligibleFamilies.filter((family) => familyNetOf(captures, family.id, true) > 0).length
    );

    // base trades: attribution, falling knives, tails
    const lotRows = baseLots.map((lot) => {
      const { episode, phase } = phaseOf(catalog, lot.entryIndex);

      return {
        ...lot,
        activationDate: lot.activationIndex >= 0 ? dates[lot.activationIndex]! : '',
        episode: episode?.id ?? '',
        family: episode?.family ?? '',
        eligibleEpisode: episode?.eligible ?? false,
        phase,
        dip: episode
          ? lot.entryIndex <= episode.troughIndex ||
            lot.entryRawPrice <= episode.peakClose * (1 - flagThresholds.dipDepthShare * episode.depth)
          : false
      };
    });
    const losingDeclineEntries = lotRows.filter((row) => row.phase === 'decline' && row.net < 0);
    const sortedNets = baseLots.map((lot) => lot.net).sort((a, b) => b - a);
    const topShare = (n: number) =>
      baseNet > 0 ? sum(sortedNets.slice(0, n).filter((value) => value > 0)) / baseNet : NaN;
    const winsNet = sum(baseLots.filter((lot) => lot.net > 0).map((lot) => lot.net));
    const lossNet = sum(baseLots.filter((lot) => lot.net < 0).map((lot) => lot.net));
    const daily = (baseFixed.daily ?? []).map((row) => ({ date: row.date, value: row.strategyMark }));
    const tails = {
      lots: baseLots.length,
      wins: baseLots.filter((lot) => lot.net > 0).length,
      losses: baseLots.filter((lot) => lot.net <= 0).length,
      averageWin: winsNet / Math.max(1, baseLots.filter((lot) => lot.net > 0).length),
      averageLoss: lossNet / Math.max(1, baseLots.filter((lot) => lot.net < 0).length),
      profitFactor: lossNet < 0 ? winsNet / -lossNet : Infinity,
      worstLot: Math.min(0, ...baseLots.map((lot) => lot.net)),
      bestLot: Math.max(0, ...baseLots.map((lot) => lot.net)),
      worstMae: Math.min(0, ...baseLots.map((lot) => lot.maePercent)),
      maeP10: quantile(
        baseLots.map((lot) => lot.maePercent),
        0.1
      ),
      top1Share: topShare(1),
      top3Share: topShare(3),
      top5Share: topShare(5),
      netMinusTop1: baseNet - sum(sortedNets.slice(0, 1).filter((value) => value > 0)),
      netMinusTop3: baseNet - sum(sortedNets.slice(0, 3).filter((value) => value > 0)),
      netMinusTop5: baseNet - sum(sortedNets.slice(0, 5).filter((value) => value > 0)),
      losingDeclineEntries: losingDeclineEntries.length,
      losingDeclineNet: sum(losingDeclineEntries.map((row) => row.net)),
      lotsMaeBeyond10: baseLots.filter((lot) => lot.maePercent <= -0.1).length,
      dipLots: lotRows.filter((row) => row.dip).length,
      dipNet: sum(lotRows.filter((row) => row.dip).map((row) => row.net)),
      outsideLots: lotRows.filter((row) => row.phase === 'outside').length,
      outsideNet: sum(lotRows.filter((row) => row.phase === 'outside').map((row) => row.net)),
      exposure: num(baseFixed.metrics.sessionsHeld) / num(baseFixed.metrics.sessionsEligible),
      lotDays: num(baseFixed.metrics.lotDays),
      netPerMillionDollarDays: perMillion(baseNet, baseFixed.view.occupiedDays),
      longestUnderwater: longestUnderwater(daily),
      exitReasons: Object.fromEntries(
        [...new Set(baseLots.map((lot) => lot.exitReason))].map((reason) => [
          reason,
          {
            lots: baseLots.filter((lot) => lot.exitReason === reason).length,
            net: sum(baseLots.filter((lot) => lot.exitReason === reason).map((lot) => lot.net))
          }
        ])
      ),
      setups: Object.fromEntries(
        ['deep', 'continuation'].map((setup) => [
          setup,
          {
            lots: baseLots.filter((lot) => lot.setup === setup).length,
            net: sum(baseLots.filter((lot) => lot.setup === setup).map((lot) => lot.net))
          }
        ])
      ),
      accountingMaxError: Math.max(
        0,
        ...baseLots.map((lot) => Math.abs(lot.gross - lot.interest - lot.friction - lot.net))
      )
    };

    // costs (19 scenarios)
    const costRows = costScenarios.map((scenario) => {
      const fixedRun = scenario.id === 'base' ? baseFixed : get(families.cost, `cost:${id}:${scenario.id}:fixed`);
      const portfolioRun =
        scenario.id === 'base' ? basePortfolio : get(families.cost, `cost:${id}:${scenario.id}:portfolio`);
      const runLots = lotsOf(fixedRun);
      const keyOf = (lot: CompactLot) => `${lot.entryIndex}|${lot.exitIndex}|${lot.exitReason}`;
      const baseKeys = new Set(baseLots.map(keyOf));
      const runKeys = new Set(runLots.map(keyOf));

      return {
        scenario: scenario.id,
        label: scenario.label,
        net: fixedRun.view.net,
        change: fixedRun.view.net - baseNet,
        ratio: fixedRun.view.net / baseNet,
        lots: fixedRun.view.trades,
        lotsChanged:
          [...runKeys].filter((key) => !baseKeys.has(key)).length +
          [...baseKeys].filter((key) => !runKeys.has(key)).length,
        minuteDrawdown: fixedRun.view.minuteDrawdown,
        interest: fixedRun.view.interest,
        friction: fixedRun.view.friction,
        endEquity: num(portfolioRun.metrics.endEquity),
        incremental: num(portfolioRun.metrics.endEquity) - c0Equity,
        dailyPercent: num(portfolioRun.metrics.dailyPercent),
        minutePercent: num(portfolioRun.metrics.minutePercent)
      };
    });
    const costOf = (scenario: string) => costRows.find((row) => row.scenario === scenario)!;

    // years and regimes (fixed mark; portfolio equity)
    const yearsFixed = baseFixed.metrics.yearly as Record<string, { change: number; entered: number; exited: number }>;
    const yearsPortfolio = basePortfolio.metrics.yearly as Record<string, { change: number }>;
    const markAt = (rows: readonly { date: string; value: number }[], date: string) => {
      let value = rows.length > 0 && rows[0]!.date > date ? NaN : 0;

      for (const row of rows) {
        if (row.date > date) {
          break;
        }

        value = row.value;
      }

      return value;
    };
    const portfolioDaily = (basePortfolio.daily ?? []).map((row) => ({ date: row.date, value: row.equity }));
    const regimes = regimeList.map((regime) => ({
      ...regime,
      fixed: markAt(daily, regime.end) - markAt(daily, previousDay(regime.start)),
      portfolio: markAt(portfolioDaily, regime.end) - markAt(portfolioDaily, previousDay(regime.start)),
      entered: baseLots.filter((lot) => dates[lot.entryIndex]! >= regime.start && dates[lot.entryIndex]! <= regime.end)
        .length
    }));

    const portfolio = {
      endEquity: num(basePortfolio.metrics.endEquity),
      incremental: num(basePortfolio.metrics.endEquity) - c0Equity,
      dailyPercent: num(basePortfolio.metrics.dailyPercent),
      dailyOverC0: num(basePortfolio.metrics.dailyPercent) - c0Daily,
      minutePercent: num(basePortfolio.metrics.minutePercent),
      strategyNet: num(basePortfolio.metrics.net),
      interest: num(basePortfolio.metrics.interest),
      borrowingDollarDays: num(basePortfolio.metrics.borrowingDollarDays),
      productivity: (num(basePortfolio.metrics.net) / num(basePortfolio.metrics.borrowingDollarDays)) * 1e6,
      lots: num(basePortfolio.metrics.lots),
      maxPrincipal: num(basePortfolio.metrics.maxPrincipal),
      cagr: num(basePortfolio.metrics.cagr),
      minimumU35: (basePortfolio.metrics.minimum as Record<string, { ratio: number } | null>)?.U35?.ratio ?? NaN
    };

    return {
      id,
      symbol: phenotype.symbol,
      role: phenotype.role,
      candidateId: phenotype.candidateId,
      grid: phenotype.grid,
      researchOnly: phenotype.researchOnly,
      base: {
        view: baseFixed.view,
        minutePercentOf100k: baseFixed.view.minuteDrawdown / 100000,
        dailyPercentOf100k: baseFixed.view.dailyDrawdown / 100000,
        engineNet: num(baseFixed.metrics.net)
      },
      neighbourhoods,
      oatTable,
      catalog: {
        episodes: catalog.length,
        eligible: eligible.length,
        major: eligible.filter((episode) => episode.major).length,
        families: familyList.length,
        eligibleFamilies: eligibleFamilies.length,
        eligibleMajorFamilies,
        coverage: boundCatalog.symbols[phenotype.symbol]!.coverage,
        volatility: boundCatalog.symbols[phenotype.symbol]!.volatility,
        bands: Object.fromEntries(
          ['10-15', '15-20', '20-30', '30+'].map((band) => [
            band,
            eligible.filter((episode) => episode.band === band).length
          ])
        )
      },
      perEpisode,
      familyRows,
      profitableFamilies,
      dipFamilies,
      dipFamilies126,
      majorDipFamilies: majorDipFamilies.map((family) => family.id),
      jointDipFamilies: distribution(jointDipFamilies),
      neighbourCapture: {
        median: median(neighbourCaptureShares),
        p10: quantile(neighbourCaptureShares, 0.1),
        seed1: median(neighbourCaptureShares.filter((_, index) => jointFixed[index]!.meta.seed === 1)),
        seed2: median(neighbourCaptureShares.filter((_, index) => jointFixed[index]!.meta.seed === 2))
      },
      winnerPersistence,
      lotRows,
      tails,
      costRows,
      costs: { f10: costOf('f10'), f20: costOf('f20'), C1: costOf('C1') },
      yearsFixed,
      yearsPortfolio,
      regimes,
      portfolio
    };
  };

  const results: Record<string, ReturnType<typeof analyzePhenotype>> = {};

  for (const phenotype of phenotypes) {
    results[phenotype.id] = analyzePhenotype(phenotype);
    log(`analysis: ${phenotype.id}`);
  }

  // ----- incumbents on the common window -----

  const incumbents = Object.fromEntries(
    (['B4', 'B5'] as const).map((id) => {
      const rows = costScenarios.map((scenario) => {
        const fixedRun = get(families.incumbent, `incumbent:${id}:${scenario.id}:fixed`);
        const portfolioRun = get(families.incumbent, `incumbent:${id}:${scenario.id}:portfolio`);
        const nets = lotsOf(fixedRun)
          .map((lot) => lot.net)
          .sort((a, b) => b - a);

        return {
          scenario: scenario.id,
          net: fixedRun.view.net,
          engineNet: num(fixedRun.metrics.net),
          lots: fixedRun.view.trades,
          minuteDrawdown: fixedRun.view.minuteDrawdown,
          dailyDrawdown: fixedRun.view.dailyDrawdown,
          interest: fixedRun.view.interest,
          friction: fixedRun.view.friction,
          occupiedDays: fixedRun.view.occupiedDays,
          netPerMillionDollarDays: perMillion(fixedRun.view.net, fixedRun.view.occupiedDays),
          endEquity: num(portfolioRun.metrics.endEquity),
          incremental: num(portfolioRun.metrics.endEquity) - c0Equity,
          dailyPercent: num(portfolioRun.metrics.dailyPercent),
          minutePercent: num(portfolioRun.metrics.minutePercent),
          productivity: (num(portfolioRun.metrics.net) / num(portfolioRun.metrics.borrowingDollarDays)) * 1e6,
          top3Share: sum(nets.slice(0, 3).filter((value) => value > 0)) / fixedRun.view.net,
          worstLot: Math.min(0, ...nets)
        };
      });

      return [id, rows];
    })
  );
  const c0Row = {
    endEquity: c0Equity,
    dailyPercent: c0Daily,
    minutePercent: num(c0.metrics.minutePercent),
    cagr: num(c0.metrics.cagr)
  };

  // ----- Stage D: fold-forward over the 61 -----

  const foldRecords: FoldRecord[] = [];

  for (const fold of foldKeys) {
    for (const row of census.rows.filter((item) => item.window === fold && item.representative)) {
      const five = families.fold.get(`fold:${fold}:${row.symbol}:representative:5bps`);
      const ten = families.fold.get(`fold:${fold}:${row.symbol}:representative@10bps`);

      if (!five || !ten) {
        throw new Error(`missing fold run for ${fold} ${row.symbol}`);
      }

      foldRecords.push({
        symbol: row.symbol,
        fold,
        credible: row.representative!.metrics.credible,
        candidateId: row.representative!.candidateId,
        trainingNetStored: row.representative!.metrics.net,
        trainingStatus: `${row.status}${row.uncertain ? '*' : ''}`,
        markAtBoundary: five.windowed!.markAtBoundary,
        increment5: five.windowed!.increment,
        increment10: ten.windowed!.increment,
        lotsEntered: five.windowed!.lotsEntered,
        openAtBoundary: five.windowed!.openAtBoundary,
        windowedDailyDrawdown: five.windowed!.dailyDrawdown,
        boundaryParity: Math.abs(five.windowed!.markAtBoundary - row.representative!.metrics.net) <= 0.01
      });
    }
  }

  // Fail closed (review N5): every fold run's liquidation mark at its search-end close must equal the stored Stage A
  // net of its vector before any fold figure is used.
  const brokenFolds = foldRecords.filter((record) => !record.boundaryParity);

  if (brokenFolds.length > 0) {
    throw new Error(
      `fold boundary parity failed for ${brokenFolds.map((record) => `${record.fold} ${record.symbol}`).join(', ')}`
    );
  }

  const spearman = (a: readonly number[], b: readonly number[]) => {
    const rank = (values: readonly number[]) => {
      const order = values.map((value, index) => ({ value, index })).sort((x, y) => x.value - y.value);
      const ranks = new Array<number>(values.length);

      for (let i = 0; i < order.length;) {
        let j = i;

        while (j + 1 < order.length && order[j + 1]!.value === order[i]!.value) {
          j++;
        }

        for (let k = i; k <= j; k++) {
          ranks[order[k]!.index] = (i + j) / 2 + 1;
        }

        i = j + 1;
      }

      return ranks;
    };
    const ra = rank(a);
    const rb = rank(b);
    const ma = sum(ra) / ra.length;
    const mb = sum(rb) / rb.length;
    const cov = sum(ra.map((value, index) => (value - ma) * (rb[index]! - mb)));
    const va = Math.sqrt(sum(ra.map((value) => (value - ma) ** 2)));
    const vb = Math.sqrt(sum(rb.map((value) => (value - mb) ** 2)));

    return cov / (va * vb);
  };
  const selection = Object.fromEntries(
    foldKeys.map((fold) => {
      const rows = foldRecords.filter((record) => record.fold === fold);
      const byTraining = [...rows].sort((a, b) => b.trainingNetStored - a.trainingNetStored);
      const medianV = median(rows.map((record) => record.increment5));
      const top10 = byTraining.slice(0, 10);

      return [
        fold,
        {
          symbols: rows.length,
          spearmanTrainingVsValidation: spearman(
            rows.map((record) => record.trainingNetStored),
            rows.map((record) => record.increment5)
          ),
          medianIncrement: medianV,
          shareIncrementPositive: share(rows.map((record) => record.increment5 > 0)),
          shareIncrementNegative: share(rows.map((record) => record.increment5 < 0)),
          shareNoEvidence: share(rows.map((record) => record.lotsEntered === 0 && record.openAtBoundary === 0)),
          top10: top10.map((record) => ({
            symbol: record.symbol,
            training: record.trainingNetStored,
            increment: record.increment5
          })),
          top10AboveMedian: share(top10.map((record) => record.increment5 > medianV)),
          boundaryParity: share(rows.map((record) => record.boundaryParity))
        }
      ];
    })
  );
  const trainingNet = (symbol: string, window: string) =>
    census.rows.find((row) => row.symbol === symbol && row.window === window)?.representative?.metrics.net ?? 0;
  const symbols61 = [...new Set(census.rows.map((row) => row.symbol))].sort();
  const rankStability = {
    foldAvsFoldB: spearman(
      symbols61.map((symbol) => trainingNet(symbol, 'fold-a')),
      symbols61.map((symbol) => trainingNet(symbol, 'fold-b'))
    ),
    foldBvsFinal: spearman(
      symbols61.map((symbol) => trainingNet(symbol, 'fold-b')),
      symbols61.map((symbol) => trainingNet(symbol, 'final'))
    ),
    foldAvsFinal: spearman(
      symbols61.map((symbol) => trainingNet(symbol, 'fold-a')),
      symbols61.map((symbol) => trainingNet(symbol, 'final'))
    )
  };
  const finalNets = symbols61.map((symbol) => trainingNet(symbol, 'final'));
  const percentileOf = (value: number) =>
    share(finalNets.map((other) => other < value)) + share(finalNets.map((other) => other === value)) / 2;

  // stored pooled fold records and VGT primary's stored increments (B1; obtained with hindsight)
  const pooled: Record<string, unknown>[] = [];
  const vgtPrimaryFolds: Record<string, { increment5: number; increment10: number; lots: number }> = {};

  for (const fold of foldKeys) {
    const validation = await readSealed<{
      fixed: Record<
        string,
        Record<string, { members: string[]; validation: { net: number; lots: number; minuteDrawdown: number } }>
      >;
      gates: { procedure: string; success: boolean }[];
      bodyHash: string;
    }>(sourceResults('walkforward', fold, 'VALIDATION.json'));

    vgtPrimaryFolds[fold] = {
      increment5: validation.fixed.B1!['5']!.validation.net,
      increment10: validation.fixed.B1!['10']!.validation.net,
      lots: validation.fixed.B1!['5']!.validation.lots
    };

    for (const procedure of ['C-R1', 'C-R2', 'D-R1', 'D-R2']) {
      const record = validation.fixed[procedure]!['5']!;

      pooled.push({
        fold,
        procedure,
        members: record.members.join(' '),
        validationNet: record.validation.net,
        validationLots: record.validation.lots,
        validationMinuteDrawdown: record.validation.minuteDrawdown,
        gate: validation.gates.find((gate) => gate.procedure === procedure)?.success ?? 'control (no gate)'
      });
    }
  }

  // phenotype drift (step units of the source local search: X 5, Y 1, stop 5, hold 1, L 5, buffer 5, P 5, W 10)
  const steps: Record<string, number> = {
    targetPercentChange: 5,
    trailingBuyPercentage: 1,
    trailingStopPercentage: 5,
    maximumHoldDays: 1,
    tickWindowSize: 5,
    intradayLossBuffer: 5,
    pullback: 5,
    continuationWindow: 10
  };
  const gridOf = (symbol: string, window: string) =>
    census.rows.find((row) => row.symbol === symbol && row.window === window)?.representative?.grid;
  const drift = (a?: Grid, b?: Grid) =>
    a && b ? sum(d1Keys.map((key) => Math.abs(a[key] - b[key]) / steps[key]!)) : NaN;

  // ----- flags and standing (./standing.ts, PROTOCOL.md §10) -----

  const summaryOf = (result: (typeof results)[string]): PhenotypeSummary => {
    const census61 = census.rows.find((row) => row.symbol === result.symbol && row.window === 'final')!;
    const isPrimary = result.id === 'VGT-primary';
    const folds = foldKeys
      .map((fold) => foldRecords.find((record) => record.symbol === result.symbol && record.fold === fold))
      .filter((record): record is FoldRecord => record !== undefined);
    const pooledJoint = result.neighbourhoods.jointPooled;

    return {
      id: result.id,
      isControl: isPrimary || result.id === procedureMatchedId,
      hindsightFolds: isPrimary,
      baseNet: result.base.view.net,
      baseMinuteDrawdown: result.base.view.minuteDrawdown,
      c1Net: result.costs.C1.net,
      c1MinuteDrawdown: result.costs.C1.minuteDrawdown,
      f10Net: result.costs.f10.net,
      f20Net: result.costs.f20.net,
      basePortfolioDaily: result.portfolio.dailyPercent,
      worstLot: result.tails.worstLot,
      worstMae: result.tails.worstMae,
      accountingMaxError: result.tails.accountingMaxError,
      eligibleMajorFamilies: result.catalog.eligibleMajorFamilies,
      dipFamilies: result.dipFamilies,
      eligibleFamilies: result.catalog.eligibleFamilies,
      majorDipFamilies: result.majorDipFamilies.length,
      neighbourMajorCapture: result.neighbourCapture.median,
      winnerKeptShare: result.winnerPersistence[0]?.keptShare ?? null,
      pooled: {
        medianNet: pooledJoint.net.median,
        shareProfitable: pooledJoint.shareProfitable,
        medianRetention: pooledJoint.retention.median,
        shareDdWithinCeiling: pooledJoint.shareDdWithinCeiling,
        medianPortfolioDaily: pooledJoint.portfolio.dailyPercent.median
      },
      seeds: [
        {
          medianNet: result.neighbourhoods.jointSeed1.net.median,
          shareProfitable: result.neighbourhoods.jointSeed1.shareProfitable
        },
        {
          medianNet: result.neighbourhoods.jointSeed2.net.median,
          shareProfitable: result.neighbourhoods.jointSeed2.shareProfitable
        }
      ],
      liquidityConcern:
        census61.liquidity.coverageMedian < flagThresholds.coverage ||
        census61.liquidity.medianDollarVolume < flagThresholds.dollarVolume,
      folds: folds.map((record) => ({
        fold: record.fold,
        increment5: record.increment5,
        lotsEntered: record.lotsEntered,
        openAtBoundary: record.openAtBoundary
      })),
      foldsExpected: foldKeys.length
    };
  };
  const summaries = Object.fromEntries(Object.values(results).map((result) => [result.id, summaryOf(result)]));
  const primarySummary = summaries['VGT-primary']!;
  const matchedSummary = summaries[procedureMatchedId]!;
  const standings = Object.fromEntries(
    Object.values(results).map((result) => {
      const verdict = standingOf(summaries[result.id]!, primarySummary, matchedSummary);
      const census61 = census.rows.find((row) => row.symbol === result.symbol && row.window === 'final')!;

      return [
        result.id,
        {
          ...verdict,
          summary: summaries[result.id],
          annotations: {
            lots: result.base.view.trades,
            lowLots: result.base.view.trades < flagThresholds.lowLots,
            dipFamilies: `${result.dipFamilies} independent (${result.dipFamilies126} of ${result.catalog.eligibleFamilies} eligible families)`,
            top3Share: result.tails.top3Share,
            portfolioAbove30: result.portfolio.dailyPercent > flagThresholds.portfolioPreferred,
            portfolioDailyOverC0: result.portfolio.dailyOverC0
          },
          finalNetPercentile: percentileOf(census61.representative?.metrics.net ?? 0),
          drift: {
            foldAtoFinal: drift(gridOf(result.symbol, 'fold-a'), gridOf(result.symbol, 'final')),
            foldBtoFinal: drift(gridOf(result.symbol, 'fold-b'), gridOf(result.symbol, 'final')),
            phenotypeToFinalRepresentative: drift(result.grid, gridOf(result.symbol, 'final'))
          },
          folds:
            result.id === 'VGT-primary'
              ? { source: 'stored B1 increments, obtained with hindsight over these years', ...vgtPrimaryFolds }
              : Object.fromEntries(
                  foldRecords.filter((record) => record.symbol === result.symbol).map((record) => [record.fold, record])
                )
        }
      ];
    })
  );
  const etfs = Object.fromEntries(
    shortlist.selected.map((entry) => {
      const representative = standings[`${entry.symbol}:representative`]!;
      const alternative = standings[`${entry.symbol}:alternative-1`];

      return [
        entry.symbol,
        {
          slot: entry.slot,
          cluster: entry.cluster,
          representative: representative.standing,
          alternative: alternative?.standing ?? null,
          ...etfStandingOf(representative, alternative)
        }
      ];
    })
  );

  const analysis = {
    schema: 'd1-standalone-opportunity-analysis',
    schemaVersion: 2,
    startedAt,
    finishedAt: nowIso(),
    window: { first: dates[0], arming: armingDate, end: dates.at(-1), sessions: dates.length },
    shortlist: shortlist.selected,
    c0: c0Row,
    incumbents,
    phenotypes: results,
    standings,
    etfs,
    voogCatalog,
    folds: foldRecords,
    selection,
    rankStability,
    pooled,
    vgtPrimaryFolds,
    windows
  };

  await fs.outputFile(analysisFile, `${JSON.stringify(analysis, jsonReplacer, 1)}\n`);
  await writeTables(analysis);
  log(`analysis → ${analysisFile}`);

  return analysis;
};

export type Analysis = Awaited<ReturnType<typeof analyze>>;
type AnalysisRecord = Analysis;

export const writeNeighbourhoodVectors = async () => {
  const joint = await readFamily('joint');
  const rows = [...joint.values()]
    .filter((run) => run.mode === 'fixed')
    .sort((a, b) => (a.key < b.key ? -1 : 1))
    .map((run) => ({
      key: run.key,
      phenotype: run.subject,
      seed: run.meta.seed,
      sample: run.meta.sample,
      vector: gridKeyOf(run.grid as unknown as Grid),
      net: run.view.net,
      lots: run.view.trades,
      minute_dd: run.view.minuteDrawdown,
      interest: run.view.interest
    }));

  await writeCsv('joint_vectors.csv', rows);
};

export type { EpisodeCapture };
