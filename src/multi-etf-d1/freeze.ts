// The freeze (PROTOCOL.md section 8): FROZEN_CANDIDATES.json records, per ticker, the control and the nominations of
// the final development selection with their exact parameters, signatures and development metrics, the data, code
// and protocol hashes, the git state and a SHA-256 of the whole body. It refuses to overwrite an existing manifest,
// so the record that predates the holdout cannot be replaced silently; FROZEN_SELECTION.md is generated from it.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { engineVersion } from '../d1-refinement/evaluate.ts';
import { sha256File } from '../four-family/data.ts';
import {
  formatDollars,
  frozenCandidatesFile,
  log,
  protocol,
  protocolFile,
  readJson,
  researchRoot,
  stageDir,
  tickers,
  writeJson,
  writeText
} from './context.ts';
import { expectedHashes } from './data.ts';
import type { SearchRecord } from './search.ts';
import type { Policy, TickerSelection } from './selection.ts';

// Files whose change after the freeze would change a decision or a figure of the holdout.
export const decisionFiles = [
  protocol.d1Source,
  'src/d1-refinement/engine.ts',
  'src/d1-refinement/evaluate.ts',
  'src/d1-refinement/families.ts',
  'src/d1-refinement/pool.ts',
  'src/d1-refinement/worker.ts',
  'src/trailing-buy-variants/accounting.ts',
  'src/four-family/data.ts',
  'src/lib/csv.ts',
  'src/lib/session.ts',
  'src/multi-etf-d1/context.ts',
  'src/multi-etf-d1/data.ts',
  'src/multi-etf-d1/evaluation.ts',
  'src/multi-etf-d1/space.ts',
  'src/multi-etf-d1/selection.ts',
  'src/multi-etf-d1/search.ts',
  'src/multi-etf-d1/detail.ts'
];

export const hashJson = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const git = (...args: string[]) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
};

export interface Manifest {
  version: string;
  frozenAt: string;
  gitHead: string;
  gitModifiedTrackedFiles: string[];
  gitUntrackedFiles: string[];
  protocolHash: string;
  engineVersion: string;
  dataHashes: Record<string, string>;
  codeHashes: Record<string, string>;
  settings: {
    eligibilityDate: string;
    developmentEnd: string;
    holdout: { start: string; end: string; commonEndSession: string };
    investment: number;
    marginInterestRate: number;
    stopFill: string;
    drawdownCeiling: number;
    preferredDrawdown: number;
    search: typeof protocol.search;
    selection: typeof protocol.selection;
    box: typeof protocol.box;
    costSensitivities: readonly number[];
    sensitivityStopFill: string;
  };
  tickers: Record<
    string,
    TickerSelection & {
      search: Pick<SearchRecord, 'sobol' | 'ga' | 'folds' | 'candidates' | 'simulations' | 'startedAt' | 'completedAt'>;
    }
  >;
  manifestHash: string;
}

export const codeHashes = async () =>
  Object.fromEntries(await Promise.all(decisionFiles.map(async (file) => [file, await sha256File(file)])));

export const runFreeze = async () => {
  if (await fs.pathExists(frozenCandidatesFile)) {
    throw new Error(
      `${frozenCandidatesFile} exists; the freeze is one-time (delete it deliberately to re-freeze, which the audit will show)`
    );
  }

  const audit = await readJson<{ holdout: { commonEndSession: string } }>(stageDir('audit', 'summary.json'));
  const dataHashes = await expectedHashes();
  const entries: Manifest['tickers'] = {};

  for (const ticker of tickers) {
    const selectionFile = stageDir('selection', ticker, 'selection.json');
    const searchFile = stageDir('search', ticker, 'search.json');

    if (!(await fs.pathExists(selectionFile)) || !(await fs.pathExists(searchFile))) {
      throw new Error(`${ticker}: no completed search/selection (${selectionFile})`);
    }

    const selection = await readJson<TickerSelection>(selectionFile);
    const search = await readJson<SearchRecord>(searchFile);

    if (!search.completedAt) {
      throw new Error(`${ticker}: the search is not complete`);
    }

    if (selection.dataHash !== dataHashes[ticker] || search.dataHash !== dataHashes[ticker]) {
      throw new Error(`${ticker}: the selection was made on other data than the audited file`);
    }

    entries[ticker] = {
      ...selection,
      search: {
        sobol: search.sobol,
        ga: search.ga,
        folds: search.folds,
        candidates: search.candidates,
        simulations: search.simulations,
        startedAt: search.startedAt,
        completedAt: search.completedAt
      }
    };
  }

  const body: Omit<Manifest, 'manifestHash'> = {
    version: protocol.version,
    frozenAt: new Date().toISOString(),
    gitHead: git('rev-parse', 'HEAD'),
    gitModifiedTrackedFiles: git('diff', '--name-only', 'HEAD').split('\n').filter(Boolean),
    gitUntrackedFiles: git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean),
    protocolHash: await sha256File(protocolFile),
    engineVersion,
    dataHashes,
    codeHashes: await codeHashes(),
    settings: {
      eligibilityDate: protocol.eligibilityDate,
      developmentEnd: protocol.developmentEnd,
      holdout: { ...protocol.holdout, commonEndSession: audit.holdout.commonEndSession },
      investment: protocol.investment,
      marginInterestRate: protocol.marginInterestRate,
      stopFill: protocol.stopFill,
      drawdownCeiling: protocol.drawdownCeiling,
      preferredDrawdown: protocol.preferredDrawdown,
      search: protocol.search,
      selection: protocol.selection,
      box: protocol.box,
      costSensitivities: protocol.costSensitivities,
      sensitivityStopFill: protocol.sensitivityStopFill
    },
    tickers: entries
  };
  const manifest: Manifest = { ...body, manifestHash: hashJson(body) };

  await writeJson(frozenCandidatesFile, manifest);
  await writeText(`${researchRoot}/FROZEN_SELECTION.md`, frozenSelectionMarkdown(manifest));
  log(
    `Froze ${Object.keys(entries).length} tickers in ${frozenCandidatesFile}; manifest hash ${manifest.manifestHash}`
  );

  return manifest;
};

export const verifyManifestHash = (manifest: Manifest) => {
  const { manifestHash, ...body } = manifest;

  return hashJson(body) === manifestHash;
};

const years = ['2017', '2018', '2019', '2020', '2021', '2022', '2023'];

export const frozenSelectionMarkdown = (manifest: Manifest) => {
  const lines = [
    '# Frozen selection (generated by `npm run multi-etf-d1 -- freeze`)',
    '',
    `Manifest: \`FROZEN_CANDIDATES.json\`, SHA-256 of its body **\`${manifest.manifestHash}\`**, frozen at ${manifest.frozenAt} (UTC) at git HEAD \`${manifest.gitHead}\`${manifest.gitModifiedTrackedFiles.length > 0 ? ` with uncommitted changes in ${manifest.gitModifiedTrackedFiles.join(', ')}` : ''}. Protocol hash \`${manifest.protocolHash}\`. Engine \`${manifest.engineVersion}\`.`,
    '',
    "Every figure below is a development-window figure (2017-06-15 → 2023-12-29, $100,000 per entry, 11%, stop fills). No 2024–2025 figure existed when this file was written. The holdout command verifies this manifest's hash, the data hashes and the decision-code hashes before it runs, and the final report repeats the hash so the two can be compared.",
    '',
    '## Basis for selection (PROTOCOL.md section 7)',
    '',
    `- Feasible: minute-sampled DD ≤ $${manifest.settings.drawdownCeiling.toLocaleString('en-US')} and at least ⌈0.75 × training years⌉ entries on the window judged.`,
    "- Beats D1: training net above frozen D1's on the same ticker and window.",
    `- Plateau: ≥ ${manifest.settings.selection.plateauFeasibleShare * 100}% of the one-parameter probes feasible and the median probe net ≥ ${manifest.settings.selection.plateauMedianShare * 100}% of the candidate's.`,
    `- Primary: highest net among plateau candidates, preferring DD ≤ $${manifest.settings.preferredDrawdown.toLocaleString('en-US')}; alternates: a higher-net distinct phenotype (maxNet) and a lower-DD distinct phenotype keeping ≥ ${manifest.settings.selection.lowDdNetShare * 100}% of the primary's net (lowDd).`,
    `- Sparse: fewer than ${protocol.sparseTrades} closed development trades = insufficient evidence (flagged, not re-selected).`,
    '',
    '## Data and code hashes',
    '',
    '| Item | SHA-256 |',
    '|---|---|',
    ...Object.entries(manifest.dataHashes).map(([ticker, hash]) => `| data ${ticker} | \`${hash}\` |`),
    ...Object.entries(manifest.codeHashes).map(([file, hash]) => `| \`${file}\` | \`${hash}\` |`),
    '',
    '## Nominations per ticker',
    ''
  ];

  for (const ticker of tickers) {
    const entry = manifest.tickers[ticker]!;

    lines.push(`### ${ticker}`);
    lines.push('');
    lines.push(
      `Candidates evaluated ${entry.candidatesEvaluated.toLocaleString('en-US')} (Sobol ${entry.search.sobol.unique} unique of ${entry.search.sobol.requested} requested; GA ${entry.search.ga.map((summary) => `${summary.fold} ${summary.newEvaluations} (${summary.stopReason})`).join(', ')}). Data \`${entry.dataHash.slice(0, 16)}…\`.`
    );
    lines.push('');
    lines.push(
      '| Role | ID | X | Y | stop | hold | L | buffer | P | W | Net | Minute DD | Daily DD | Entries | W/L | Worst trade | Worst excursion | Net w/o best | Exposure | Avg hold | Plateau | Sparse | Signature |'
    );
    lines.push(
      '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|---|'
    );

    const row = (
      role: string,
      id: string,
      params: Record<string, number | undefined>,
      m: TickerSelection['control'],
      plateau: string,
      sparse: boolean,
      signature: string
    ) =>
      `| ${role} | \`${id}\` | ${(params.targetPercentChange! / 10).toFixed(1)}% | ${(params.trailingBuyPercentage! / 10).toFixed(1)}% | ${(params.trailingStopPercentage! / 10).toFixed(1)}% | ${params.maximumHoldDays} | ${params.tickWindowSize} | ${(params.intradayLossBuffer! / 10).toFixed(1)}% | ${(params.pullback! / 10).toFixed(1)}% | ${params.continuationWindow} | ${formatDollars(m.net)} | ${formatDollars(m.minuteDrawdown)} | ${formatDollars(m.dailyDrawdown)} | ${m.entries}${m.openAtEnd ? ' (1 open)' : ''} | ${m.wins}/${m.losses} | ${formatDollars(m.worstTrade)} | ${formatDollars(m.worstAdverseExcursion)} | ${formatDollars(m.netWithoutBestTrade)} | ${(m.exposure * 100).toFixed(0)}% | ${m.averageHoldDays.toFixed(0)} d | ${plateau} | ${sparse ? 'yes' : 'no'} | \`${signature}\` |`;

    lines.push(
      row(
        'control (D1)',
        entry.control.id,
        entry.control.params,
        entry.control,
        '—',
        entry.control.closedTrades < protocol.sparseTrades,
        entry.control.signature
      )
    );

    for (const nomination of entry.nominations) {
      lines.push(
        row(
          nomination.role,
          nomination.id,
          nomination.params,
          { ...entry.control, ...nomination.metrics },
          `${nomination.plateau.pass ? 'pass' : 'fail'} (${(nomination.plateau.feasibleShare * 100).toFixed(0)}% / ${(nomination.plateau.medianNetShare * 100).toFixed(0)}%)`,
          nomination.sparse,
          nomination.metrics.signature
        )
      );
    }

    lines.push('');
    lines.push(`| Role | ${years.join(' | ')} |`);
    lines.push(`|---|${years.map(() => '---:').join('|')}|`);
    lines.push(
      `| control (D1) | ${years.map((year) => (entry.control.years[year] ? `${formatDollars(entry.control.years[year]!.net)} (${entry.control.years[year]!.entries}e)` : '')).join(' | ')} |`
    );

    for (const nomination of entry.nominations) {
      lines.push(
        `| ${nomination.role} | ${years.map((year) => (nomination.years[year] ? `${formatDollars(nomination.years[year]!.net)} (${nomination.years[year]!.entries}e)` : '')).join(' | ')} |`
      );
    }

    lines.push('');
    lines.push(
      "Walk-forward of the selection rule (validation-window net / DD / entries; the pick of each fold was chosen on that fold's training window only):"
    );
    lines.push('');
    lines.push('| Fold | Validation | D1 | primary | lowDd | maxNet |');
    lines.push('|---|---|---|---|---|---|');

    const cell = (view?: { net: number; minuteDrawdown: number; entries: number }) =>
      view && Number.isFinite(view.net)
        ? `${formatDollars(view.net)} / ${formatDollars(view.minuteDrawdown)} / ${view.entries}e`
        : 'none';

    for (const fold of entry.walkForward.folds) {
      lines.push(
        `| ${fold.fold} | ${fold.validationStart} → ${fold.validationEnd} | ${cell(fold.d1Validation)} | ${fold.picks.map((pick) => (pick.id ? cell(pick.validation) : 'none')).join(' | ')} |`
      );
    }

    const stitched = entry.walkForward.stitched;

    lines.push(
      `| stitched | | ${formatDollars(stitched.primary.d1Net)} | ${(['primary', 'lowDd', 'maxNet'] as Policy[]).map((policy) => `${formatDollars(stitched[policy].net)} (${stitched[policy].foldsBeatingD1}/${stitched[policy].folds} folds ≥ D1; ${stitched[policy].pass ? 'pass' : 'fail'})`).join(' | ')} |`
    );
    lines.push('');

    if (entry.notes.length > 0) {
      lines.push(...entry.notes.map((note) => `- ${note}`));
      lines.push('');
    }
  }

  return lines.join('\n');
};
