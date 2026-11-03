// Every placeholder of the report templates, computed from the stored records (census, parity, shortlist and, once it
// exists, results/analysis.json). Groups are computed only when a rendered template references them, so the Stage A–B
// documents can be rendered before any Stage C outcome exists. Report-only code: it reads records, never runs.
import fs from 'fs-extra';
import path from 'node:path';
import { censusFile } from './census.ts';
import { readJson, researchRoot, resultDir, shortlistFile, templatesRoot, windowKeys } from './context.ts';
import type { CensusRow } from './inventory.ts';
import { parityFile } from './parity.ts';
import type { Candidate } from './shortlist.ts';

export const dollars = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? 'n/a'
    : `${value < 0 ? '−' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
export const cents = (value: number | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(value)
    ? 'n/a'
    : `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const percent = (value: number | null | undefined, digits = 1) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : `${(value * 100).toFixed(digits)}%`;
export const fixed = (value: number | null | undefined, digits = 2) =>
  value === null || value === undefined || !Number.isFinite(value) ? 'n/a' : value.toFixed(digits);
export const table = (header: readonly string[], rows: readonly (readonly (string | number)[])[]) =>
  [
    `| ${header.join(' | ')} |`,
    `| ${header.map((cell, index) => (index === 0 ? '---' : '---:')).join(' | ')} |`,
    ...rows.map((row) => `| ${row.join(' | ')} |`)
  ].join('\n');

const statusLabel = (row: CensusRow) =>
  `${row.status === 'survivor' ? 'surv' : row.status === 'screened-down' ? 'scr-down' : row.status}${row.uncertain ? '*' : ''}`;

// ----- census (Stage A) -----

const inventoryGroup = async () => {
  const census = await readJson<{
    rows: CensusRow[];
    stageRecords: Record<string, { bodyHash: string; evaluations: number; counts: Record<string, number> }>;
  }>(censusFile);
  const checks = await readJson<{ name: string; pass: boolean; detail: string }[]>(
    resultDir('inventory', 'source-checks.json')
  );
  const finals = census.rows.filter((row) => row.window === 'final');
  const bySymbol = (symbol: string, window: string) =>
    census.rows.find((row) => row.symbol === symbol && row.window === window)!;
  const values: Record<string, string> = {};

  values['inventory.counts'] = table(
    [
      'Window (search end)',
      'Evaluations',
      'Survivors (uncertain)',
      'Screened-down',
      'Rejected',
      'Unrankable',
      'Sealed body'
    ],
    windowKeys.map((window) => {
      const record = census.stageRecords[window]!;
      const counts = record.counts;

      return [
        `${window} (${bySymbol('VGT', window).searchEnd})`,
        record.evaluations.toLocaleString('en-US'),
        `${counts.survivors} (${counts.uncertainSurvivors})`,
        counts.screenedDown!,
        counts.rejected!,
        counts.unrankable!,
        `\`${record.bodyHash.slice(0, 12)}…\``
      ];
    })
  );
  values['inventory.checks'] = checks
    .map((check) => `- ${check.pass ? 'PASS' : 'FAIL'} — ${check.name}: ${check.detail}`)
    .join('\n');
  values['inventory.final'] = table(
    [
      'ETF',
      'cluster',
      'status a/b/final',
      'trades',
      'net',
      'min. DD',
      'worst',
      'top-3 share',
      'occ. days',
      'interest',
      'nb credible',
      'nb median J',
      'nb P10 J',
      'Sobol credible',
      'R1 / R2',
      'library',
      'note'
    ],
    finals.map((row) => {
      const rep = row.representative;
      const m = rep?.metrics;
      const nb = rep?.neighbourhood;

      return [
        row.symbol,
        row.cluster,
        windowKeys.map((window) => statusLabel(bySymbol(row.symbol, window))).join(' / '),
        m?.trades ?? '—',
        dollars(m?.net),
        dollars(m?.minuteDrawdown),
        dollars(m?.worstTrade),
        percent(rep?.derived.top3Share, 0),
        m ? Math.round(m.occupiedDays) : '—',
        dollars(m?.interest),
        nb ? `${nb.credibleDraws}/16` : '—',
        dollars(nb?.medianJ),
        dollars(nb?.p10J),
        percent(row.sobol.credibleShare, 1),
        `${row.ranks.R1 ?? '—'} / ${row.ranks.R2 ?? '—'}`,
        row.library.length,
        [
          row.semiconductor ? 'semiconductor (research-only)' : '',
          row.controlInstrument ? 'control instrument' : '',
          row.liquidity.coverageMedian < 0.75 ? `coverage ${percent(row.liquidity.coverageMedian, 0)}` : '',
          row.liquidity.medianDollarVolume < 50e6 ? `$${Math.round(row.liquidity.medianDollarVolume / 1e6)}M/day` : ''
        ]
          .filter(Boolean)
          .join('; ') || ''
      ];
    })
  );
  values['inventory.folds'] = table(
    [
      'ETF',
      'fold-a status',
      'fold-a trades / net / min. DD',
      'fold-b status',
      'fold-b trades / net / min. DD',
      'final trades / net',
      'final vector (X Y stop hold L buffer P W)'
    ],
    finals.map((row) => {
      const cell = (window: string) => {
        const m = bySymbol(row.symbol, window).representative?.metrics;

        return m ? `${m.trades} / ${dollars(m.net)} / ${dollars(m.minuteDrawdown)}` : '—';
      };
      const fm = row.representative?.metrics;

      return [
        row.symbol,
        statusLabel(bySymbol(row.symbol, 'fold-a')),
        cell('fold-a'),
        statusLabel(bySymbol(row.symbol, 'fold-b')),
        cell('fold-b'),
        fm ? `${fm.trades} / ${dollars(fm.net)}` : '—',
        row.representative ? row.representative.description.replace(/^X /, '') : '—'
      ];
    })
  );
  values['inventory.libraryCount'] = String(census.rows.reduce((total, row) => total + row.library.length, 0));
  values['inventory.unavailable'] = (census.rows[0]?.unavailable ?? []).map((item) => `- ${item}`).join('\n');

  return values;
};

// ----- parity (Stage A) -----

const parityGroup = async () => {
  const parity = await readJson<{
    checks: { group: string; name: string; pass: boolean; detail: string }[];
    passed: number;
    failed: number;
    startedAt: string;
    finishedAt: string;
  }>(parityFile);
  const groups = [...new Set(parity.checks.map((check) => check.group))];
  const values: Record<string, string> = {};

  values['parity.summary'] = table(
    ['Group', 'Checks', 'Passed'],
    groups.map((group) => {
      const mine = parity.checks.filter((check) => check.group === group);

      return [group, mine.length, mine.filter((check) => check.pass).length];
    })
  );
  values['parity.passed'] = `${parity.passed}/${parity.checks.length}`;
  values['parity.when'] = `${parity.startedAt} → ${parity.finishedAt}`;
  values['parity.netChecks'] = parity.checks
    .filter((check) => /net \(liquidation|fixed net|end equity|minute DD|max daily|max minute/.test(check.name))
    .map((check) => `| ${check.group} | ${check.name} | ${check.detail} | ${check.pass ? 'PASS' : 'FAIL'} |`)
    .join('\n');
  values['parity.causality'] = parity.checks
    .filter((check) => check.group === 'causality')
    .map((check) => `- ${check.pass ? 'PASS' : 'FAIL'} — ${check.name} (${check.detail})`)
    .join('\n');

  return values;
};

// ----- shortlist (Stage B) -----

const shortlistGroup = async () => {
  const shortlist = await readJson<{
    candidates: Candidate[];
    phenotypes: { id: string; candidateId: string; description: string; file: string; sha256: string }[];
    selected: { symbol: string; slot: string; cluster: string }[];
    writtenAt: string;
  }>(shortlistFile);
  const v1 = await readJson<{ selected: { symbol: string; slot: string }[] }>(
    resultDir('shortlist', 'SHORTLIST-v1-superseded.json')
  );
  const values: Record<string, string> = {};
  const ordered = shortlist.candidates
    .filter((candidate) => candidate.order !== null)
    .sort((a, b) => a.order! - b.order!);
  const gradeCell = (candidate: Candidate) => (candidate.grades ? Object.values(candidate.grades).join(' ') : '—');

  values['shortlist.eligible'] = table(
    [
      'order',
      'ETF',
      'cluster',
      'S1 S2 S3 S4 S5 S6',
      'score',
      'net',
      'trades',
      'nb credible',
      'survivor windows',
      'years ≥ $10k',
      'min. DD',
      'worst',
      'top-3 share (not used)',
      'decision',
      'reason'
    ],
    ordered.map((candidate) => [
      candidate.order!,
      candidate.symbol,
      candidate.cluster,
      gradeCell(candidate),
      candidate.score!,
      dollars(candidate.inputs.net as number),
      candidate.inputs.trades as number,
      percent(candidate.inputs.neighbourhoodCredibleShare as number, 1),
      candidate.inputs.statuses as string,
      candidate.inputs.yearsWith10k as number,
      dollars(candidate.inputs.minuteDrawdown as number),
      dollars(candidate.inputs.worstTrade as number),
      percent(candidate.inputs.top3Share as number, 0),
      candidate.decision,
      candidate.reason
    ])
  );
  values['shortlist.ineligible'] = table(
    ['ETF', 'cluster', 'net', 'trades', 'nb credible', 'statuses', 'gate failure'],
    shortlist.candidates
      .filter((candidate) => !candidate.eligible)
      .map((candidate) => [
        candidate.symbol,
        candidate.cluster,
        dollars(candidate.inputs.net as number),
        (candidate.inputs.trades as number) ?? '—',
        percent(candidate.inputs.neighbourhoodCredibleShare as number, 1),
        candidate.inputs.statuses as string,
        candidate.reason
      ])
  );
  values['shortlist.selected'] = shortlist.selected.map((entry) => `${entry.symbol} (${entry.slot})`).join(', ');
  values['shortlist.v1'] = v1.selected.map((entry) => entry.symbol).join(', ');
  values['shortlist.counterfactual'] = (
    (shortlist as unknown as { counterfactualIfMeritOccupiedClusters: string[] })
      .counterfactualIfMeritOccupiedClusters ?? []
  ).join(', ');
  values['shortlist.phenotypes'] = table(
    ['Phenotype', 'source candidate', 'vector', 'file sha256'],
    shortlist.phenotypes.map((entry) => [
      entry.id,
      entry.candidateId,
      entry.description,
      `\`${entry.sha256.slice(0, 12)}…\``
    ])
  );
  values['shortlist.writtenAt'] = shortlist.writtenAt;

  return values;
};

const groups: Record<string, () => Promise<Record<string, string>>> = {
  inventory: inventoryGroup,
  parity: parityGroup,
  shortlist: shortlistGroup,
  ...Object.fromEntries(
    ['cmp', 'nb', 'ev', 'cost', 'year', 'port', 'chrono'].map((prefix) => [
      prefix,
      async () => (await import('./reportTables.ts')).analysisPlaceholders()
    ])
  )
};

// Late-bound groups (the analysis) register themselves here.
export const registerGroup = (prefix: string, compute: () => Promise<Record<string, string>>) => {
  groups[prefix] = compute;
};

export const placeholdersOf = async (templates: readonly string[]) => {
  const keys = new Set<string>();

  for (const name of templates) {
    const text = await fs.readFile(path.join(templatesRoot, name), 'utf8');

    for (const match of text.matchAll(/\{\{([A-Za-z0-9_.\-:]+)\}\}/g)) {
      keys.add(match[1]!);
    }
  }

  const prefixes = new Set([...keys].map((key) => key.split('.')[0]!));
  const values: Record<string, string> = {};

  for (const prefix of prefixes) {
    const compute = groups[prefix];

    if (compute) {
      Object.assign(values, await compute());
    }
  }

  return values;
};

export { researchRoot };
