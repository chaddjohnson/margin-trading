// The research-only archive of the diverse-d1 study's 15 unseeded final finalists (8 J-u, 7 T-u):
// config/research-pools/diverse-d1-2026-10-26/. Each finalist's books, grids, scores, gates and labels are copied from
// the sealed final assessments (research/d1-diverse-pool-discovery/results/rounds/final/select/<arm>/assessment.json,
// checked against the hashes FROZEN_SELECTION.json binds), never from a report table. They failed the final gates and
// the study's procedure gate: they are not pools (config/pools/), not phenotypes, and no command here runs them.
//
//   npm run pools -- research list | show <ID> | verify | export (once; refuses to overwrite)
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { formatTenths } from '../phenotype/architectures.ts';
import { d1Keys, type D1Key } from '../multi-etf-allocator/phenotypes.ts';
import { gridHash } from './schema.ts';

export const researchArchiveDir = 'config/research-pools/diverse-d1-2026-10-26';
const study = 'research/d1-diverse-pool-discovery';
const frozenSelectionFile = path.join(study, 'FROZEN_SELECTION.json');
const assessmentFile = (arm: string) => path.join(study, 'results/rounds/final/select', arm, 'assessment.json');
const arms = ['J-u', 'T-u'] as const;
const expectedCounts: Record<(typeof arms)[number], number> = { 'J-u': 8, 'T-u': 7 };
const percentKeys = new Set<D1Key>([
  'targetPercentChange',
  'trailingBuyPercentage',
  'trailingStopPercentage',
  'intradayLossBuffer',
  'pullback'
]);

export const researchWarning =
  'RESEARCH-ONLY: not nominated, not validated on 2024–2026, not approved for live deployment. Failed the final gates and the study’s walk-forward procedure gate; training-window (E1) evidence only.';

const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');

interface SealedFinalist {
  key: string;
  label: string;
  arm: string;
  members: string[];
  books: { symbol: string; id: string; grid: Record<D1Key, number>; origin: string }[];
  value: number;
  pass: boolean;
  gates: { gate: string; pass: boolean; detail: string }[];
  labels: string[];
  centre: Record<string, { net: number; minuteDrawdown: number; lots: number }>;
  confirmA: Record<string, { p50: number; q25: number; feasShare: number; ddMedian: number; dd90: number }>;
  portfolio: Record<string, { endEquity: number; dailyPercent: number }>;
  ladder?: { matchedEndEquity: number };
}

// The sealed sources, verified: each assessment file must hash to the record the frozen selection bound.
export const sealedFinalists = async () => {
  const frozen = (await fs.readJson(frozenSelectionFile)) as {
    bodyHash: string;
    outcome: string;
    records: Record<string, string>;
  };
  const sources: Record<string, { file: string; sha256: string; frozenRecord: string }> = {};
  const finalists: SealedFinalist[] = [];

  for (const arm of arms) {
    const file = assessmentFile(arm);
    const hash = sha256(await fs.readFile(file));
    const bound = frozen.records[`final/${arm}/assessment.json`];

    if (hash !== bound) {
      throw new Error(`${file} hashes to ${hash}, not the ${bound} that ${frozenSelectionFile} binds`);
    }

    sources[arm] = { file, sha256: hash, frozenRecord: `final/${arm}/assessment.json` };

    const { finalists: armFinalists } = (await fs.readJson(file)) as { finalists: SealedFinalist[] };

    if (armFinalists.length !== expectedCounts[arm]) {
      throw new Error(`${file}: ${armFinalists.length} finalists, expected ${expectedCounts[arm]}`);
    }

    finalists.push(...armFinalists);
  }

  return { frozen, sources, finalists };
};

const notation = (grid: Record<D1Key, number>) =>
  Object.fromEntries(d1Keys.map((key) => [key, percentKeys.has(key) ? formatTenths(grid[key]) : grid[key]]));

// The archived JSON of one finalist: everything copied verbatim from its sealed assessment, plus derived notation.
export const archiveRecordOf = (
  finalist: SealedFinalist,
  source: { file: string; sha256: string; frozenRecord: string },
  frozenBodyHash: string
) => ({
  schemaVersion: 1,
  kind: 'research-only-d1-pool',
  id: `diverse-d1/${finalist.label}`,
  label: finalist.label,
  arm: finalist.arm,
  procedure: finalist.arm.startsWith('J') ? 'J (neighbourhood score)' : 'T (temporal score)',
  status: researchWarning,
  evidence: 'E1: training 2016-01-04 → 2023-12-29 only; never evaluated after 2023-12-29',
  key: finalist.key,
  members: finalist.members,
  books: finalist.books.map((book) => ({
    symbol: book.symbol,
    vectorId: book.id,
    origin: book.origin,
    grid: book.grid,
    parameters: notation(book.grid),
    parametersSha256: gridHash(book.grid)
  })),
  sealed: {
    procedureScore: finalist.value,
    pass: finalist.pass,
    failedGates: finalist.gates.filter((gate) => !gate.pass).map((gate) => gate.gate),
    gates: finalist.gates,
    labels: finalist.labels,
    centre5: finalist.centre['5'],
    confirmA: { nbJ: finalist.confirmA.nbJ, nbT: finalist.confirmA.nbT },
    portfolio5Symmetric: finalist.portfolio['5-symmetric'],
    ladder: finalist.ladder
  },
  provenance: {
    study,
    sealedAssessment: source.file,
    sealedAssessmentSha256: source.sha256,
    frozenSelection: frozenSelectionFile,
    frozenSelectionBodyHash: frozenBodyHash,
    frozenSelectionRecord: source.frozenRecord,
    outcome: 'no advancement — neither procedure passed its preregistered procedure gate GP (§14.5)'
  },
  restrictions: [
    'Not a pool of config/pools/ and not a phenotype of config/phenotypes/: no command runs it.',
    'Do not backtest it on data after 2023-12-29 (the study never evaluated it there).',
    'A prospective track needs a separate, user-approved protocol (research/prospective-b4-b5-shadow/PROTOCOL.md §7).'
  ]
});

const fileName = (label: string) => `${label}.json`;

const catalogOf = (entries: { id: string; members: string[]; failedGates: string[]; procedureScore: number }[]) =>
  [
    '# Research-only archive: diverse-d1 unseeded final finalists (2026-10-26)',
    '',
    `**${researchWarning}**`,
    '',
    'Generated by `npm run pools -- research export` from the sealed final assessments of',
    '`research/d1-diverse-pool-discovery/` (verified against the hashes its `FROZEN_SELECTION.json` binds). The exact',
    'eight-parameter grids are in each JSON (`books[].grid`, tenths of a percentage point / days / sessions).',
    '`npm run pools -- research verify` re-checks every field against the sealed records.',
    '',
    '| ID | Members | Procedure score (confirm-A, training) | Failed final gates |',
    '|---|---|---:|---|',
    ...entries.map(
      (entry) =>
        `| \`${entry.id}\` | ${entry.members.join(' ')} | $${Math.round(entry.procedureScore).toLocaleString('en-US')} | ${entry.failedGates.join(', ')} |`
    ),
    '',
    'Commands: `npm run pools -- research list`, `npm run pools -- research show diverse-d1/J-u-f1`.',
    ''
  ].join('\n');

export const exportArchive = async () => {
  if (await fs.pathExists(researchArchiveDir)) {
    throw new Error(`${researchArchiveDir} exists: the archive is written once`);
  }

  const { frozen, sources, finalists } = await sealedFinalists();
  const entries = [];

  for (const finalist of finalists) {
    const record = archiveRecordOf(finalist, sources[finalist.arm]!, frozen.bodyHash);
    const text = `${JSON.stringify(record, null, 2)}\n`;
    const file = path.join(researchArchiveDir, fileName(finalist.label));

    await fs.outputFile(file, text);
    entries.push({
      id: record.id,
      file,
      sha256: sha256(text),
      members: finalist.members,
      failedGates: record.sealed.failedGates,
      procedureScore: finalist.value
    });
  }

  const manifest = {
    schemaVersion: 1,
    kind: 'research-only-archive',
    createdAt: new Date().toISOString(),
    status: researchWarning,
    study,
    frozenSelection: { file: frozenSelectionFile, bodyHash: frozen.bodyHash, outcome: frozen.outcome },
    sources,
    counts: { 'J-u': expectedCounts['J-u'], 'T-u': expectedCounts['T-u'], total: finalists.length },
    entries
  };

  await fs.outputFile(path.join(researchArchiveDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.outputFile(path.join(researchArchiveDir, 'CATALOG.md'), catalogOf(manifest.entries));

  return manifest;
};

// Deep comparison of every archived file with its sealed source, and of the manifest's hashes.
export const verifyArchive = async () => {
  const { frozen, sources, finalists } = await sealedFinalists();
  const manifest = (await fs.readJson(path.join(researchArchiveDir, 'manifest.json'))) as {
    entries: { id: string; file: string; sha256: string }[];
  };
  const failures: string[] = [];

  if (manifest.entries.length !== 15) {
    failures.push(`manifest lists ${manifest.entries.length} finalists, not 15`);
  }

  for (const finalist of finalists) {
    const file = path.join(researchArchiveDir, fileName(finalist.label));
    const text = await fs.readFile(file, 'utf8');
    const entry = manifest.entries.find((item) => item.file === file);
    const expected = archiveRecordOf(finalist, sources[finalist.arm]!, frozen.bodyHash);

    if (!entry || entry.sha256 !== sha256(text)) {
      failures.push(`${file}: hash differs from the manifest`);
    }

    if (JSON.stringify(JSON.parse(text)) !== JSON.stringify(expected)) {
      failures.push(`${file}: differs from its sealed assessment`);
    }

    for (const book of finalist.books) {
      for (const key of d1Keys) {
        if (!Number.isInteger(book.grid[key])) {
          failures.push(`${file}: ${book.symbol} ${key} is not an integer grid value`);
        }
      }
    }
  }

  const poolIds = (await fs.readdir('config/pools')).map((name) => name.replace(/\.json$/, ''));
  const leaked = poolIds.filter((id) =>
    finalists.some((finalist) => finalist.label === id || id.startsWith('diverse-d1'))
  );

  if (leaked.length > 0) {
    failures.push(`research finalists appear among runnable pools: ${leaked.join(', ')}`);
  }

  return { checked: finalists.length, failures, passed: failures.length === 0 };
};

export const listResearchCatalogs = async () => {
  if (!(await fs.pathExists(researchArchiveDir))) {
    return [`(research-only archive ${researchArchiveDir} not exported yet)`];
  }

  const manifest = (await fs.readJson(path.join(researchArchiveDir, 'manifest.json'))) as {
    entries: { id: string; members: string[]; failedGates: string[] }[];
  };

  return [
    `research-only (${researchArchiveDir}; ${manifest.entries.length} finalists, metadata only — not runnable): ${manifest.entries.map((entry) => entry.id).join(', ')}`
  ];
};

const formatResearch = (record: ReturnType<typeof archiveRecordOf>) =>
  [
    `${record.id} (${record.procedure}, arm ${record.arm})`,
    `  ${record.status}`,
    `  ${record.evidence}`,
    `  members ${record.members.join(' ')}; procedure score $${Math.round(record.sealed.procedureScore).toLocaleString('en-US')}; failed ${record.sealed.failedGates.join(', ')}; labels ${record.sealed.labels.join(', ') || '—'}`,
    `  training centre (5 bps): net $${Math.round(record.sealed.centre5!.net).toLocaleString('en-US')}, minute DD $${Math.round(record.sealed.centre5!.minuteDrawdown).toLocaleString('en-US')}, ${record.sealed.centre5!.lots} lots`,
    ...record.books.map(
      (book) =>
        `  ${book.symbol.padEnd(4)} ${book.vectorId}  ${Object.entries(book.parameters)
          .map(([key, value]) => `${key} ${value}`)
          .join(', ')}`
    ),
    `  source ${record.provenance.sealedAssessment} (sha256 ${record.provenance.sealedAssessmentSha256.slice(0, 12)}…), bound by ${record.provenance.frozenSelection}`,
    ...record.restrictions.map((line) => `  - ${line}`)
  ].join('\n');

export const runResearch = async (positionals: string[], args: string[]) => {
  const [command, id] = positionals;

  switch (command) {
    case 'export': {
      const manifest = await exportArchive();

      console.info(`[pools] research archive: ${manifest.entries.length} finalists → ${researchArchiveDir}/`);
      break;
    }

    case 'verify': {
      const result = await verifyArchive();

      console.info(
        `[pools] research archive: ${result.checked} finalists checked; ${result.passed ? 'all equal to the sealed records' : result.failures.join('; ')}`
      );

      if (!result.passed) {
        throw new Error('the research archive does not match its sealed records');
      }

      break;
    }

    case 'list': {
      const manifest = (await fs.readJson(path.join(researchArchiveDir, 'manifest.json'))) as {
        entries: { id: string; members: string[]; failedGates: string[]; procedureScore: number }[];
      };

      console.log(researchWarning);

      for (const entry of manifest.entries) {
        console.log(
          `  ${entry.id.padEnd(18)} ${entry.members.join(' ').padEnd(30)} score $${Math.round(entry.procedureScore).toLocaleString('en-US').padStart(8)}  failed ${entry.failedGates.join(', ')}`
        );
      }

      break;
    }

    case 'show': {
      if (!id) {
        throw new Error('usage: research show diverse-d1/<label>');
      }

      const file = path.join(researchArchiveDir, fileName(id.replace(/^diverse-d1\//, '')));

      if (!(await fs.pathExists(file))) {
        throw new Error(`no research finalist ${id} (see npm run pools -- research list)`);
      }

      const record = await fs.readJson(file);

      console.log(args.includes('--json') ? JSON.stringify(record, null, 2) : formatResearch(record));
      break;
    }

    default:
      throw new Error('usage: research list | show <ID> [--json] | verify | export');
  }
};
