// Report tables (report-only code; it reads sealed records and writes results/tables/*.md and *.csv; it can change
// no sealed record): census, new search, libraries, fold comparisons, verdicts, nested, rolling track, events and
// tails, references, and the readable CSV exports (nominees, comparisons, metrics, funded-trade ledgers).
import path from 'node:path';
import fs from 'fs-extra';
import {
  type FoldKey,
  type PoolKey,
  clusterOf,
  foldKeys,
  folds,
  formatDollars,
  libraryKs,
  primaryK,
  resultFile
} from './context.ts';
import { analysisFile } from './analysis.ts';
import { censusFile } from './census.ts';
import { type PhaseKey, readEngineRows, readFastRows } from './evaluation.ts';
import { requireChronology } from './chronology.ts';
import { requireFrozen } from './freeze.ts';
import { readSealed } from './records.ts';
import { searchFile } from './search.ts';
import { readSelection } from './selection.ts';

const tablesDir = resultFile('tables');
const money = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? formatDollars(value) : '—');
const pct = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : '—';
const md = (header: string[], rows: (string | number)[][]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');
const csvCell = (value: unknown) => {
  if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
    return '';
  }

  const text = typeof value === 'number' ? String(Math.round(value * 100) / 100) : String(value);

  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const csv = (header: string[], rows: unknown[][]) =>
  `${[header.join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\n')}\n`;

type Analysis = {
  bodyHash: string;
  cells: {
    key: string;
    phase: PhaseKey;
    window: number;
    fold: FoldKey;
    start: string;
    end: string;
    pools: PoolKey[];
    nested?: string;
  }[];
  metrics: Record<string, any>[];
  comparisons: Record<string, Record<string, Record<string, Record<string, Record<string, any>>>>>;
  across: Record<
    string,
    Record<
      string,
      Record<string, Record<string, { arm5: number; arm10: number; base5: number; base10: number; members: string[] }>>
    >
  >;
  verdicts: Record<string, Record<string, string>>;
  acrossVerdicts: Record<string, Record<string, string>>;
  nestedCells: Record<string, Record<string, string>>;
  nestedVerdict: string;
  nestedAcross: Record<string, Record<string, string>>;
  ablations: Record<string, Record<string, Record<string, Record<string, any>>>>;
  subsets: Record<string, { median: number; sharePositive: number; p10: number; p90: number }>;
  discardedGroups: Record<string, Record<string, { n: number; mean: number; median: number; positive: number }>>;
  rolling: Record<string, Record<string, string>>;
  outcome: string;
  degreesOfFreedom: Record<string, number>;
};

export const writeTables = async () => {
  await requireFrozen();
  await requireChronology();

  const analysis = await readSealed<Analysis>(analysisFile);
  const files: Record<string, string> = {};

  // ----- census -----
  const census: string[] = [];

  for (const window of ['fold-a', 'fold-b', 'final'] as const) {
    if (!(await fs.pathExists(censusFile(window)))) {
      continue;
    }

    const record = await readSealed<{ bodyHash: string; summary: Record<string, any>; rows: Record<string, any>[] }>(
      censusFile(window)
    );

    census.push(
      `### ${window}`,
      '',
      md(
        [
          'ETF',
          'rows (Sobol+local)',
          'credible',
          'families',
          'largest family',
          'top-32 share of largest',
          'sealed status',
          'A0 reproduced',
          'rep family rank by T',
          'penalty-displaced top-T families',
          'excess DD',
          'too few trades',
          'near-duplicates in top 32'
        ],
        record.rows.map((r) => [
          r.symbol,
          `${r.evaluated} (${r.sobol}+${r.local})`,
          r.credible,
          r.families,
          r.largestFamily,
          pct(r.largestFamilyShareOfTop32),
          r.sealed.status,
          Object.values(r.reproduction).every(Boolean) ? 'yes' : 'NO',
          r.oldPenalty.representativeFamilyRankByT ?? '—',
          r.discarded.bestTradePenaltyDisplacedTopTFamilies,
          r.discarded.excessDrawdown,
          r.discarded.lowTradeCount,
          r.discarded.top32NearDuplicates
        ])
      ),
      ''
    );
  }

  files['census.md'] = census.join('\n');

  // ----- new search -----
  const search: (string | number)[][] = [];

  for (const fold of foldKeys) {
    if (!(await fs.pathExists(searchFile(fold)))) {
      continue;
    }

    const record = await readSealed<{
      bodyHash: string;
      evaluations: number;
      startedAt: string;
      finishedAt: string;
      minTrades: number;
      perSymbol: Record<
        string,
        {
          sobol: number;
          refine: number;
          credible: number;
          collisionsDropped: number;
          movesSkipped: number;
          starts: number;
        }
      >;
    }>(searchFile(fold));
    const rows = Object.values(record.perSymbol);

    search.push([
      fold,
      folds[fold].cutoff,
      record.minTrades,
      record.evaluations,
      rows.reduce((t, r) => t + r.sobol, 0),
      rows.reduce((t, r) => t + r.refine, 0),
      rows.reduce((t, r) => t + r.credible, 0),
      rows.filter((r) => r.credible === 0).length,
      rows.reduce((t, r) => t + r.collisionsDropped, 0),
      rows.reduce((t, r) => t + r.starts, 0),
      `${record.startedAt.slice(11, 19)}→${record.finishedAt.slice(11, 19)}`
    ]);
  }

  files['new-search.md'] = md(
    [
      'fold',
      'cutoff',
      'min trades',
      'evaluations',
      'Sobol',
      'refinements',
      'credible',
      'ETFs with no credible',
      'collisions dropped',
      'refinement starts',
      'UTC'
    ],
    search
  );

  // ----- libraries: realized K -----
  const libraryRows: (string | number)[][] = [];

  for (const fold of foldKeys) {
    const selection = await readSelection(fold).catch(() => undefined);

    if (!selection) {
      continue;
    }

    for (const pool of folds[fold].pools) {
      const symbols = Object.values(selection.selections[pool]!);
      const families = symbols.map((s) => s.families).sort((a, b) => a - b);

      libraryRows.push([
        fold,
        pool,
        symbols.filter((s) => s.credible > 0).length,
        families[Math.floor(families.length / 2)] ?? 0,
        ...libraryKs.map((k) => symbols.filter((s) => s.families >= k).length),
        symbols.filter((s) => s.a0r.nominee).length,
        ...(['A1', 'A1n', 'A2', 'A3'] as const).map(
          (arm) => symbols.filter((s) => s.arms[arm].nominees[String(primaryK)]).length
        ),
        symbols.filter((s) => s.a0?.equalsA0r === false).length
      ]);
    }
  }

  files['libraries.md'] = md(
    [
      'fold',
      'pool',
      'ETFs with credible',
      'median families',
      'ETFs ≥ 8',
      '≥ 16',
      '≥ 32',
      '≥ 64',
      'A0r nominees',
      'A1(16)',
      'A1n(16)',
      'A2(16)',
      'A3(16)',
      'A0 ≠ A0r'
    ],
    libraryRows
  );

  // ----- descriptive ablations, ETF-subset sensitivity, discarded groups -----
  const ablationRows: (string | number)[][] = [];

  for (const [cell, byPool] of Object.entries(analysis.ablations)) {
    for (const [pool, byName] of Object.entries(byPool)) {
      for (const [name, byK] of Object.entries(byName)) {
        for (const [k, c] of Object.entries(byK)) {
          ablationRows.push([
            cell,
            pool,
            name,
            k,
            money(c.meanD5),
            money(c.meanD10),
            `${c.wins}/${c.losses}/${c.identical}`,
            `${c.clusterWins}/${c.clusterLosses}`,
            c.evaluable ? (c.favourable ? 'favourable' : c.unfavourable ? 'unfavourable' : '—') : 'insufficient'
          ]);
        }
      }
    }
  }

  files['ablations.md'] = md(
    ['window', 'pool', 'comparison', 'K', 'mean ΔV 5', 'mean ΔV 10', 'W/L/identical', 'clusters W/L', 'state'],
    ablationRows
  );
  files['etf-subsets.md'] = md(
    ['window|pool|arm|subset size', 'median Δ top-5 Σ V', 'share > 0', 'P10', 'P90'],
    Object.entries(analysis.subsets).map(([key, v]) => [
      key,
      money(v.median),
      pct(v.sharePositive),
      money(v.p10),
      money(v.p90)
    ])
  );
  files['discarded-groups.md'] = md(
    ['window', 'group', 'vectors', 'mean V', 'median V', 'V > 0'],
    Object.entries(analysis.discardedGroups).flatMap(([cell, groups]) =>
      Object.entries(groups).map(([group, v]) => [cell, group, v.n, money(v.mean), money(v.median), v.positive])
    )
  );

  // ----- fold comparisons -----
  const comparisonRows: unknown[][] = [];
  const comparisonMd: string[] = [];

  for (const cell of analysis.cells) {
    const rows: (string | number)[][] = [];

    for (const m of analysis.metrics.filter((row) => row.cell === cell.key)) {
      const cmp = analysis.comparisons[cell.key]?.[m.pool]?.[m.arm]?.[m.k === '-' ? String(primaryK) : m.k];

      rows.push([
        m.pool,
        m.arm,
        m.k,
        m.nominees,
        m.etfsWithWindowLots,
        money(m.v['5'].sum),
        money(m.v['10'].sum),
        money(m.v['5'].median),
        m.breaches,
        cmp ? money(cmp.meanD5) : 'baseline',
        cmp ? `${cmp.wins}/${cmp.losses}/${cmp.identical}` : '',
        cmp ? `${cmp.clusterWins}/${cmp.clusterLosses}` : '',
        cmp
          ? cmp.evaluable
            ? cmp.favourable
              ? 'favourable'
              : cmp.unfavourable
                ? 'unfavourable'
                : '—'
            : 'insufficient'
          : ''
      ]);
      comparisonRows.push([
        cell.key,
        m.pool,
        m.arm,
        m.k,
        m.nominees,
        m.etfsWithWindowLots,
        m.windowLots,
        m.v['0'].sum,
        m.v['2'].sum,
        m.v['5'].sum,
        m.v['10'].sum,
        m.v['5'].median,
        m.breaches,
        cmp?.meanD5,
        cmp?.meanD10,
        cmp?.wins,
        cmp?.losses,
        cmp?.identical,
        cmp?.clusterWins,
        cmp?.clusterLosses,
        cmp?.activeEtfs,
        cmp?.favourable,
        cmp?.unfavourable,
        cmp?.riskIncompatible
      ]);
    }

    comparisonMd.push(
      `### ${cell.key} (${cell.start} → ${cell.end})`,
      '',
      md(
        [
          'pool',
          'arm',
          'K',
          'nominees',
          'ETFs with window lots',
          'Σ V 5 bps',
          'Σ V 10 bps',
          'median V',
          'DD > $35k',
          'mean ΔV vs A0r',
          'W/L/identical',
          'clusters W/L',
          'state'
        ],
        rows
      ),
      ''
    );
  }

  files['comparisons.md'] = comparisonMd.join('\n');
  files['comparisons.csv'] = csv(
    [
      'cell',
      'pool',
      'arm',
      'K',
      'nominees',
      'etfsWithWindowLots',
      'windowLots',
      'sumV0',
      'sumV2',
      'sumV5',
      'sumV10',
      'medianV5',
      'breaches',
      'meanD5',
      'meanD10',
      'wins',
      'losses',
      'identical',
      'clusterWins',
      'clusterLosses',
      'activeEtfs',
      'favourable',
      'unfavourable',
      'riskIncompatible'
    ],
    comparisonRows
  );

  // ----- verdicts -----
  files['verdicts.md'] = [
    md(
      ['pool', 'A1', 'A2', 'A3'],
      Object.entries(analysis.verdicts).map(([pool, v]) => [pool, v.A1!, v.A2!, v.A3!])
    ),
    '',
    '**Across-ETF (top 5):**',
    '',
    md(
      ['pool', 'A1', 'A2', 'A3'],
      Object.entries(analysis.acrossVerdicts).map(([pool, v]) => [pool, v.A1!, v.A2!, v.A3!])
    ),
    '',
    `**Nested verdict (T1/NEW primary; T2 secondary, never a replication):** ${analysis.nestedVerdict}`,
    '',
    md(
      ['later window', 'pool', 'cell (A4 vs A2 and vs baseline)', 'across-ETF'],
      Object.entries(analysis.nestedCells).flatMap(([cell, byPool]) =>
        Object.entries(byPool).map(([pool, v]) => [cell, pool, v, analysis.nestedAcross[cell]?.[pool] ?? ''])
      )
    ),
    '',
    '**Rolling track (NEW, K = 16, vs A0r(NEW)):**',
    '',
    md(
      ['year', 'A1', 'A2', 'A3'],
      Object.entries(analysis.rolling).map(([year, v]) => [year, v.A1!, v.A2!, v.A3!])
    ),
    '',
    `**Study outcome:** ${analysis.outcome}`
  ].join('\n');

  // ----- across-ETF -----
  const acrossRows: (string | number)[][] = [];

  for (const [cell, byPool] of Object.entries(analysis.across)) {
    for (const [pool, byArm] of Object.entries(byPool)) {
      for (const [arm, byK] of Object.entries(byArm)) {
        for (const [k, entry] of Object.entries(byK)) {
          acrossRows.push([
            cell,
            pool,
            arm,
            k,
            entry.members.join(' '),
            money(entry.arm5),
            money(entry.arm10),
            money(entry.base5),
            money(entry.arm5 - entry.base5)
          ]);
        }
      }
    }
  }

  files['across-etf.md'] = md(
    ['window', 'pool', 'arm', 'K', 'top 5', 'Σ V 5 bps', 'Σ V 10 bps', 'A0r top 5 Σ V', 'Δ'],
    acrossRows
  );

  // ----- events, tails, portfolio, library diagnostics (K = 16 and the baselines) -----
  const eventRows: (string | number)[][] = [];

  for (const m of analysis.metrics.filter((row) => row.k === '-' || row.k === String(primaryK))) {
    eventRows.push([
      m.cell,
      m.pool,
      m.arm,
      m.k,
      m.events ? `${m.events.captured}/${m.events.families}` : '—',
      m.events ? pct(m.events.captureShareAll61) : '—',
      m.events ? `${m.events.majorCaptured}/${m.events.majorFamilies}` : '—',
      m.events?.fallingKnives ?? '—',
      money(m.worstLot),
      pct(m.worstMae),
      money(m.expectedShortfallProxy),
      pct(m.concentration.top1),
      pct(m.concentration.top3),
      money(m.interest),
      money(m.friction),
      money(m.netPerMillionBorrowingDollarDays),
      m.portfolio ? money(m.portfolio.meanIncrementOverC0) : '—',
      m.portfolio ? pct(m.portfolio.medianMaxDaily) : '—',
      m.portfolio ? `${m.portfolio.over30}/${m.portfolio.over35}` : '—',
      money(m.library.randomPickMeanV),
      money(m.library.oracleBestMeanV_hindsight),
      m.library.spearmanTrainingVsWindow?.toFixed?.(2) ?? '—'
    ]);
  }

  files['events-tails-portfolio.md'] = md(
    [
      'window',
      'pool',
      'arm',
      'K',
      'dip-captured families',
      'capture share (61)',
      'major captured',
      'falling knives',
      'worst lot',
      'worst MAE',
      'ES proxy (worst 10% lots)',
      'top-1 share',
      'top-3 share',
      'interest',
      'friction',
      'net per $1M borrowing-days',
      'portfolio Δ over C0 (mean)',
      'portfolio max daily DD (median)',
      'portfolio > 30% / > 35%',
      'library random-pick mean V',
      'library oracle mean V (hindsight)',
      'Spearman training vs window'
    ],
    eventRows
  );

  // ----- nominee and ledger exports -----
  const nomineeRows: unknown[][] = [];
  const ledgerRows: unknown[][] = [];

  for (const cell of analysis.cells) {
    const fast = await readFastRows(cell.phase);
    const engine = new Map(
      (await readEngineRows(cell.phase)).map((row) => [`${row.symbol}|${row.key}`, row as Record<string, any>])
    );
    const selection = await readSelection(cell.fold);
    const nested = cell.nested
      ? await readSealed<{
          bodyHash: string;
          picks: Record<string, Record<string, Record<string, { key: string } | null>>>;
        }>(resultFile('nested', cell.nested, 'SELECTION.json'))
      : undefined;

    for (const pool of cell.pools) {
      for (const [symbol, s] of Object.entries(selection.selections[pool]!)) {
        const slots: [string, string, string | null | undefined][] = [
          ['A0r', '-', s.a0r.nominee?.key],
          ...(s.a0 ? ([['A0', '-', s.a0.nominee]] as [string, string, string | null][]) : []),
          ...(['A1', 'A2', 'A3'] as const).flatMap((arm) =>
            libraryKs.map((k): [string, string, string | null | undefined] => [
              arm,
              String(k),
              s.arms[arm].nominees[String(k)]?.key
            ])
          ),
          ...(nested
            ? libraryKs.map((k): [string, string, string | null | undefined] => [
                'A4',
                String(k),
                nested.picks[pool]?.[symbol]?.[String(k)]?.key
              ])
            : [])
        ];

        for (const [arm, k, key] of slots) {
          const w5 = key ? fast.get(`${symbol}|${key}`)?.['5']?.windows[cell.window] : undefined;
          const w10 = key ? fast.get(`${symbol}|${key}`)?.['10']?.windows[cell.window] : undefined;

          nomineeRows.push([
            cell.key,
            pool,
            arm,
            k,
            symbol,
            clusterOf(symbol),
            key ?? '',
            w5?.v ?? 0,
            w10?.v ?? 0,
            w5?.minuteDd ?? 0,
            w5?.dailyDd ?? 0,
            w5?.lots ?? 0
          ]);
        }
      }
    }

    // ledgers of the primary cells' nominees (K = 16, A0, A0r, A4(16)), lots entered inside the window
    const primaryKeys = new Set(
      nomineeRows
        .filter((row) => row[0] === cell.key && (row[3] === '-' || row[3] === String(primaryK)) && row[6])
        .map((row) => `${row[4]}|${row[6]}`)
    );

    for (const id of primaryKeys) {
      const row = engine.get(id);

      if (!row) {
        continue;
      }

      let cumulative = 0;

      for (const lot of row.lots) {
        if (!(lot.entryDate > cell.start && lot.entryDate <= cell.end)) {
          continue;
        }

        cumulative += lot.net;
        ledgerRows.push([
          cell.key,
          row.symbol,
          row.key,
          row.slots.filter((slot: string) => slot.endsWith(`|${primaryK}`) || slot.endsWith('|-')).join(' '),
          new Date(lot.entryTime * 1000).toLocaleString('sv-SE', { timeZone: 'America/New_York' }),
          lot.exitIndex === -1
            ? 'open'
            : new Date(lot.exitTime * 1000).toLocaleString('sv-SE', { timeZone: 'America/New_York' }),
          lot.entryRawPrice,
          lot.exitRawPrice,
          lot.exitReason,
          lot.setup,
          lot.gross,
          lot.interest,
          lot.friction,
          lot.net,
          cumulative,
          lot.maePercent,
          lot.mfePercent,
          lot.heldDays,
          (row.capture?.captures ?? []).find((c: { lots: number[] }) => c.lots.includes(lot.id))?.episode ?? ''
        ]);
      }
    }
  }

  files['nominees.csv'] = csv(
    [
      'cell',
      'pool',
      'arm',
      'K',
      'symbol',
      'cluster',
      'grid',
      'V5',
      'V10',
      'windowMinuteDD',
      'windowDailyDD',
      'lotsInWindow'
    ],
    nomineeRows
  );
  files['ledgers.csv'] = csv(
    [
      'cell',
      'symbol',
      'grid',
      'slots',
      'entryET',
      'exitET',
      'entryPrice',
      'exitPrice',
      'reason',
      'setup',
      'gross',
      'interest',
      'friction',
      'net',
      'cumulativeNet',
      'maePercent',
      'mfePercent',
      'heldDays',
      'episode'
    ],
    ledgerRows
  );
  files['metrics.json'] = `${JSON.stringify(analysis.metrics, null, 1)}\n`;

  for (const [name, text] of Object.entries(files)) {
    await fs.outputFile(path.join(tablesDir, name), text.endsWith('\n') ? text : `${text}\n`);
  }

  return Object.keys(files);
};
