// Read-only views of the study (`list`, `show`, `fixed`, `compare`). `fixed` runs one phenotype in the fixed $100,000
// slot and prints its funded-trade ledger; a research phenotype is limited to its authorized window (final: through
// 2023-12-29; fold-a/fold-b: through that fold's validation end) by the study's doors, and a research JSON is never
// treated as a registered phenotype. Outputs go to evaluations/standalone-opportunity-audit/ (git-ignored), never to
// research/ or config/.
import path from 'node:path';
import fs from 'fs-extra';
import { d1Keys } from '../multi-etf-allocator/phenotypes.ts';
import { analysisFile } from './analysis.ts';
import {
  type WindowKey,
  base,
  candidateCutoff,
  evaluationsRoot,
  fullHistoryEnd,
  incumbentGrid,
  jsonReplacer,
  readJson,
  shortlistFile,
  sourceStandaloneRoot,
  windows
} from './context.ts';
import { candidateUniverse, foldUniverse, fullHistoryUniverse } from './data.ts';
import type { Grid } from './inventory.ts';
import { executeSpec } from './run.ts';
import { gridLabel, specOf, vgtPrimary } from './specs.ts';
import { cents, dollars, percent } from './tables.ts';

interface Target {
  id: string;
  symbol: string;
  grid: Grid;
  registered: boolean;
  window: WindowKey;
  cutoff: string; // the last session this target may read
  source: string;
}

const researchSchema = 'ranked-preemption-standalone-phenotype';

const fromResearchFile = async (file: string): Promise<Target> => {
  const json = await readJson<{
    schema?: string;
    symbol: string;
    window: WindowKey;
    role: string;
    candidateId: string;
    grid: Grid;
  }>(file);

  if (json.schema !== researchSchema) {
    throw new Error(
      `${file} is not a research phenotype file (schema ${json.schema ?? 'none'}); registered phenotypes run only as VGT-primary here, or through npm run pools / npm run vgt-robustness`
    );
  }

  return {
    id: `${json.symbol}:${json.window}:${json.role}:${json.candidateId}`,
    symbol: json.symbol,
    grid: Object.fromEntries(d1Keys.map((key) => [key, json.grid[key]])) as Grid,
    registered: false,
    window: json.window,
    cutoff: json.window === 'final' ? candidateCutoff : windows[json.window].validationEnd!,
    source: file
  };
};

export const resolveTarget = async (id: string): Promise<Target> => {
  if (id === 'VGT-primary') {
    return {
      id,
      symbol: 'VGT',
      grid: { ...incumbentGrid },
      registered: true,
      window: 'final',
      cutoff: fullHistoryEnd,
      source: 'config/phenotypes/D1/VGT.json (registered)'
    };
  }

  if (id.endsWith('.json')) {
    if (path.resolve(id).startsWith(path.resolve('config'))) {
      throw new Error(
        `${id} is a registry file: only VGT-primary is runnable here; research phenotypes are never registered`
      );
    }

    return fromResearchFile(id);
  }

  // source:<window>:<SYMBOL>[:<role>] — any stored source library phenotype
  if (id.startsWith('source:')) {
    const [, window, symbol, role = 'representative'] = id.split(':') as [string, WindowKey, string, string?];
    const profile = await readJson<{ library: { role: string; file: string }[] }>(
      path.join(sourceStandaloneRoot, window, `${symbol}.json`)
    );
    const entry = profile.library.find((item) => item.role === role);

    if (!entry) {
      throw new Error(`${id}: no library role ${role}`);
    }

    return fromResearchFile(entry.file);
  }

  // <SYMBOL>:<role> — a shortlisted phenotype
  const shortlist = await readJson<{ phenotypes: { id: string; file: string }[] }>(shortlistFile);
  const entry = shortlist.phenotypes.find((item) => item.id === id);

  if (!entry) {
    throw new Error(
      `unknown phenotype ${id}: use VGT-primary, a shortlist id (e.g. GDX:representative), source:<window>:<SYMBOL>[:<role>] or a research JSON path`
    );
  }

  return fromResearchFile(entry.file);
};

export const fixedView = async (id: string, options: { end?: string; costBps?: number; portfolio?: boolean }) => {
  const target = await resolveTarget(id);
  const end = options.end ?? (target.registered ? candidateCutoff : target.cutoff);

  if (end > target.cutoff) {
    throw new Error(
      `${target.id} is ${target.registered ? 'registered' : 'research-only'}: it may be evaluated through ${target.cutoff} only (requested ${end})`
    );
  }

  const mode = options.portfolio ? 'portfolio' : 'fixed';
  const members = options.portfolio ? ['VOOG', 'VGT', target.symbol] : [target.symbol];
  const loaded =
    target.registered && end > candidateCutoff
      ? await fullHistoryUniverse(members)
      : target.window === 'final'
        ? await candidateUniverse(members, end)
        : await foldUniverse(target.window, members, end);
  const spec = specOf({
    key: `view:${target.id}`,
    family: 'parity',
    subject: target.id,
    window: target.window,
    mode,
    books: [{ symbol: target.symbol, phenotype: target.id, grid: target.grid }],
    meta: {}
  });
  const record = executeSpec(
    loaded.universe,
    options.costBps === undefined ? spec : { ...spec, costBps: options.costBps, scenario: `cost-${options.costBps}` }
  );
  const lines = [
    `${target.registered ? 'REGISTERED' : 'RESEARCH-ONLY, NOT DEPLOYABLE'} — ${target.id} (${gridLabel(target.grid)})`,
    `source: ${target.source}`,
    `window: ${loaded.universe.dates[0]} → ${loaded.universe.end} (armed ${loaded.universe.dates[loaded.universe.eligibilityIndex]}); ${mode}; ${options.costBps ?? base.costBps} bps per side; ${base.rate * 100}% simple interest`,
    `net (liquidation-equivalent) ${cents(record.view.net)} | engine net ${cents(record.metrics.net)} | lots ${record.view.trades} (open ${record.view.open}) | gross ${dollars(record.view.gross)} | interest ${dollars(record.view.interest)} | friction ${dollars(record.view.friction)}`,
    mode === 'fixed'
      ? `max minute DD ${cents(record.view.minuteDrawdown)} (${percent(record.view.minuteDrawdown / 100000, 2)} of $100,000) | max daily DD ${cents(record.view.dailyDrawdown)}`
      : `end equity ${cents(record.metrics.endEquity)} | max daily DD ${percent(record.metrics.dailyPercent, 2)} | max minute DD ${percent(record.metrics.minutePercent, 2)}`,
    '',
    '|  # | setup | entry | entry price | exit | exit price | reason | days | gross | interest | friction | net | MAE |',
    '|---:|---|---|---:|---|---:|---|---:|---:|---:|---:|---:|---:|',
    ...record.lots.map(
      (lot) =>
        `| ${lot.id} | ${lot.setup} | ${new Date(lot.entryTime * 1000).toISOString().slice(0, 16)} | ${lot.entryRawPrice.toFixed(2)} | ${new Date(lot.exitTime * 1000).toISOString().slice(0, 16)} | ${lot.exitRawPrice.toFixed(2)} | ${lot.exitReason} | ${lot.occupiedDays.toFixed(0)} | ${dollars(lot.gross)} | ${dollars(lot.interest)} | ${dollars(lot.friction)} | ${dollars(lot.net)} | ${percent(lot.maePercent)} |`
    )
  ];
  const dir = path.join(evaluationsRoot, target.id.replaceAll(':', '_'), `${mode}-${loaded.universe.end}`);

  await fs.outputFile(path.join(dir, 'ledger.md'), `${lines.join('\n')}\n`);
  await fs.outputFile(
    path.join(dir, 'record.json'),
    `${JSON.stringify({ target, view: record.view, lots: record.lots }, jsonReplacer, 1)}\n`
  );
  console.log(lines.join('\n'));
  console.log(`\n→ ${dir}/`);
};

export const listView = async () => {
  const shortlist = await readJson<{
    selected: { symbol: string; slot: string; cluster: string }[];
    phenotypes: { id: string; description: string }[];
  }>(shortlistFile);

  console.log('Shortlisted research phenotypes (research-only, final window, through 2023-12-29):');

  for (const entry of shortlist.phenotypes) {
    const slot = shortlist.selected.find((item) => entry.id.startsWith(`${item.symbol}:`));

    console.log(`  ${entry.id.padEnd(20)} ${slot?.slot.padEnd(9)} ${entry.description}`);
  }

  console.log(`Control: VGT-primary (${gridLabel(vgtPrimary.grid)}), registered`);
  console.log('Benchmarks: B4, B5 (config/pools), C0 (60/40 VOOG/VGT core)');
};

export const showView = async (id: string) => {
  const analysis = (await fs.pathExists(analysisFile))
    ? await readJson<{ phenotypes: Record<string, unknown>; standings: Record<string, unknown> }>(analysisFile)
    : undefined;
  const target = await resolveTarget(id);

  console.log(JSON.stringify({ target, standing: analysis?.standings[id] ?? 'not analysed' }, jsonReplacer, 1));
};

export const compareView = async () => {
  const analysis = await readJson<{
    phenotypes: Record<
      string,
      {
        base: { view: { net: number; minuteDrawdown: number; trades: number } };
        portfolio: { endEquity: number; incremental: number; dailyPercent: number; minutePercent: number };
        neighbourhoods: { jointPooled: { net: { median: number }; shareProfitable: number } };
      }
    >;
    standings: Record<string, { standing: string; blocking: string[]; stronger: boolean }>;
    incumbents: Record<
      string,
      {
        scenario: string;
        net: number;
        minuteDrawdown: number;
        lots: number;
        endEquity: number;
        incremental: number;
        dailyPercent: number;
        minutePercent: number;
      }[]
    >;
    c0: { endEquity: number; dailyPercent: number; minutePercent: number };
  }>(analysisFile);

  console.log('Same window 2016-01-04 → 2023-12-29 (armed 2017-06-15), 5 bps, 11%:');
  console.log(
    '| configuration | fixed net | min. DD | lots | portfolio equity | over C0 | daily / minute DD | joint median | joint > 0 | blocking flags | standing |'
  );

  for (const [id, result] of Object.entries(analysis.phenotypes)) {
    const standing = analysis.standings[id]!;

    console.log(
      `| ${id} | ${dollars(result.base.view.net)} | ${dollars(result.base.view.minuteDrawdown)} | ${result.base.view.trades} | ${dollars(result.portfolio.endEquity)} | ${dollars(result.portfolio.incremental)} | ${percent(result.portfolio.dailyPercent)} / ${percent(result.portfolio.minutePercent)} | ${dollars(result.neighbourhoods.jointPooled.net.median)} | ${percent(result.neighbourhoods.jointPooled.shareProfitable, 0)} | ${standing.blocking.join(' ') || '—'} | ${standing.standing}${standing.stronger ? ' (stronger than VGT primary)' : ''} |`
    );
  }

  for (const id of ['B4', 'B5']) {
    const row = analysis.incumbents[id]!.find((item) => item.scenario === 'base')!;

    console.log(
      `| ${id} | ${dollars(row.net)} | ${dollars(row.minuteDrawdown)} | ${row.lots} | ${dollars(row.endEquity)} | ${dollars(row.incremental)} | ${percent(row.dailyPercent)} / ${percent(row.minutePercent)} | — | — | — | benchmark |`
    );
  }

  console.log(
    `| C0 | — | — | — | ${dollars(analysis.c0.endEquity)} | — | ${percent(analysis.c0.dailyPercent)} / ${percent(analysis.c0.minutePercent)} | — | — | — | control |`
  );
};
