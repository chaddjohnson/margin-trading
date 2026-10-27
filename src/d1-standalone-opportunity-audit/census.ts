// Writes the Stage A census (./inventory.ts) to results/inventory/: the complete machine-readable census (JSON), a
// flat CSV with one row per symbol × window, and the source checks. Read-only on every source; idempotent (the
// content is a pure function of the sealed source records, so a rerun writes identical bytes).
import path from 'node:path';
import fs from 'fs-extra';
import { jsonReplacer, log, resultDir, windowKeys } from './context.ts';
import { type CensusRow, buildCensus } from './inventory.ts';

export const censusFile = resultDir('inventory', 'census.json');
export const censusCsvFile = resultDir('inventory', 'census.csv');
export const sourceChecksFile = resultDir('inventory', 'source-checks.json');

const csvCell = (value: unknown) => {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    return '';
  }

  const text = typeof value === 'number' ? String(Math.round(value * 10000) / 10000) : String(value);

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const flatRow = (row: CensusRow) => {
  const rep = row.representative;
  const m = rep?.metrics;
  const d = rep?.derived;
  const nb = rep?.neighbourhood;

  return {
    symbol: row.symbol,
    window: row.window,
    search_end: row.searchEnd,
    cluster: row.cluster,
    category: row.category,
    semiconductor: row.semiconductor,
    control_instrument: row.controlInstrument,
    status: row.status,
    uncertain: row.uncertain,
    sample: row.sample,
    min_trades: row.minTrades,
    evaluated: row.evaluated,
    credible_vectors: row.credibleVectors,
    sobol_credible_share: row.sobol.credibleShare,
    sobol_positive_share: row.sobol.positiveShare,
    representative: rep?.candidateId ?? '',
    representative_vector: rep?.description ?? '',
    credible: m?.credible ?? '',
    trades: m?.trades ?? '',
    open_at_end: m?.open ?? '',
    net: m?.net,
    best_trade: m?.bestTrade,
    second_trade: m?.secondTrade,
    third_trade: m?.thirdTrade,
    worst_trade: m?.worstTrade,
    mean_net: m?.meanNet,
    median_net: m?.medianNet,
    wins: m?.wins ?? '',
    losses: m?.losses ?? '',
    loss_sum: m?.lossSum,
    occupied_days: m?.occupiedDays,
    interest: m?.interest,
    friction: m?.friction,
    minute_dd: m?.minuteDrawdown,
    daily_dd: m?.dailyDrawdown,
    best_year_share: m?.bestYearShare,
    j_s: m?.score,
    top1_share: d?.top1Share,
    top3_share: d?.top3Share,
    net_per_occupied_day: d?.netPerOccupiedDay,
    net_per_million_dollar_days: d?.netPerMillionDollarDays,
    exit_years: d?.exitYears ?? '',
    years_positive: d?.yearsPositive ?? '',
    years_with_10k: d?.yearsWith10k ?? '',
    nb_draws: nb?.draws ?? '',
    nb_median_j: nb?.medianJ,
    nb_p10_j: nb?.p10J,
    nb_min_j: nb?.minJ,
    nb_credible_share: nb?.credibleShare,
    library_size: row.library.length,
    library: row.library.map((entry) => `${entry.role}:${entry.candidateId}`).join(' '),
    r1_position: row.ranks.R1,
    r2_position: row.ranks.R2,
    pooled_memberships: row.pooledFolds
      .filter((entry) => entry.member)
      .map((entry) => entry.procedure)
      .join(' '),
    coverage_median: row.liquidity.coverageMedian,
    median_dollar_volume: row.liquidity.medianDollarVolume,
    yearly: m
      ? Object.entries(m.yearly)
          .map(([year, value]) => `${year}:${Math.round(value)}`)
          .join(' ')
      : ''
  };
};

export const writeCensus = async () => {
  const census = await buildCensus();
  const flat = census.rows.map(flatRow);
  const columns = Object.keys(flat[0]!);
  const csv = [
    columns.join(','),
    ...flat.map((row) => columns.map((column) => csvCell((row as never)[column])).join(','))
  ]
    .join('\n')
    .concat('\n');

  await fs.ensureDir(path.dirname(censusFile));
  await fs.writeFile(
    censusFile,
    `${JSON.stringify(
      {
        schema: 'd1-standalone-opportunity-census',
        schemaVersion: 1,
        source: 'research/d1-ranked-preemption (sealed Stage A of fold-a, fold-b, final)',
        windows: windowKeys,
        stageRecords: census.stageRecords,
        rows: census.rows
      },
      jsonReplacer,
      1
    )}\n`
  );
  await fs.writeFile(censusCsvFile, csv);
  await fs.writeFile(sourceChecksFile, `${JSON.stringify(census.checks, null, 1)}\n`);

  for (const check of census.checks) {
    log(`${check.pass ? 'PASS' : 'FAIL'} ${check.name}: ${check.detail}`);
  }

  if (census.checks.some((check) => !check.pass)) {
    throw new Error('a source check failed: the census is not reliable');
  }

  log(`census: ${census.rows.length} rows → ${censusFile}, ${censusCsvFile}`);

  return census;
};
