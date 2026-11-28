// REPORT-ONLY ENGINEERING REPLAY of the P6-TSLA outcome with the identity join (DECISION_REGISTER.md U6; AMENDMENTS.md
// D1). It reads the sealed TSLA records read-only (each checked against its pinned sha256), applies the corrected
// outcomeOf (src/tsla-d1-growth/outcome.ts → src/research-outcome/identityJoin.ts) to the SEALED preDetermination and
// the SEALED validation rows, cross-checks the result against the sealed outcome, the report-only D1 reconstruction
// (reports/tables/outcome-join.json) and the D1 figures, and writes one deterministic JSON file (no timestamps) to the
// engineering directory. It evaluates no strategy, opens no data door, and never writes under research/: the sealed
// results/outcome.json stays the historical record.
//
// Run from the repository root:
//   node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
//     tools/tsla-outcome-identity-fix/replay.ts [--out <file>]
// Default output: docs/engineering/tsla-outcome-identity-fix/replay/outcome.corrected.report-only.json. An existing
// output is never overwritten: identical bytes → "unchanged" (exit 0); different bytes → refused (exit 1).
// Exit 1 when any cross-check fails.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { joinByIdentity } from '../../src/research-outcome/identityJoin.ts';
import type { ArmKey } from '../../src/tsla-d1-growth/context.ts';
import {
  type Finalist,
  type GovernedFinalist,
  type ValidationRow,
  outcomeOf
} from '../../src/tsla-d1-growth/outcome.ts';
import { plain } from '../../src/tsla-d1-growth/records.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const study = 'research/tsla-d1-growth';
const args = process.argv.slice(2);
const outArg = args.includes('--out') ? args[args.indexOf('--out') + 1] : undefined;
const out = path.resolve(
  process.env.INIT_CWD ?? process.cwd(),
  outArg ?? path.join(repo, 'docs/engineering/tsla-outcome-identity-fix/replay/outcome.corrected.report-only.json')
);

if (path.relative(path.join(repo, 'research'), out).split(path.sep)[0] !== '..')
  throw new Error(`refused: ${out} is under research/ (the replay never writes into a study)`);

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const pins = {
  frozenSelection: [
    `${study}/FROZEN_SELECTION.json`,
    '0ebb6b62ad95b1bdb9b6fb14a4a50f38ddceb49ba86b045d3cd34ef53e1a8791'
  ],
  validation: [
    `${study}/results/validation/validation.json`,
    'b0f654009960fbaca6debdb0a803885083d2a5428e206ff3234b647e126ff63f'
  ],
  sequential: [`${study}/results/sequential.json`, '2a1079a0a9d1e6dea4cd9d809e1a0413794ccc41152a02a975105c7210f28ce8'],
  sealedOutcome: [`${study}/results/outcome.json`, 'a414631e41da8285f6785e2f98dc92bca0244b24fb149da534ba36a18463bf79'],
  d1Reconstruction: [
    `${study}/reports/tables/outcome-join.json`,
    'df18bd93e85f145419ab83342707e9de51025f7f2c741cda186870c144ca0cb2'
  ]
} as const;
const inputs: Record<string, { file: string; sha256: string }> = {};
// file modes are environment state (a fresh clone has no read-only seals): printed, never part of the record
const modes: Record<string, string> = {};
const load = <T>(k: keyof typeof pins): T => {
  const [file, pin] = pins[k];
  const abs = path.join(repo, file);
  const bytes = fs.readFileSync(abs);
  const h = sha(bytes);

  if (h !== pin) throw new Error(`${file}: sha256 ${h} ≠ the pinned ${pin} (a sealed record changed: stop)`);
  inputs[k] = { file, sha256: h };
  modes[file] = (fs.statSync(abs).mode & 0o777).toString(8);
  return JSON.parse(bytes.toString('utf8')) as T;
};

type Proc = { population: string; verdict: string; supported: boolean };
const fz = load<{ finalists: Finalist[]; preDetermination: { finalists: GovernedFinalist[]; comparisons: unknown } }>(
  'frozenSelection'
);
const v = load<{ rows: (ValidationRow & { roles: string[]; sliceNet: number; sliceDd: number; wholeDd: number })[] }>(
  'validation'
);
const seq = load<{ procedures: Proc[] }>('sequential');
const sealed = load<{
  frozenSelection: { sha256: string };
  validation: { sha256: string };
  finalists: (GovernedFinalist & { validation: unknown; c: boolean; candidate: boolean; developmentOnly: boolean })[];
  candidates: { arm: ArmKey; label: string; id: string }[];
  developmentOnly: unknown[];
  comparisons: unknown;
  outcome: string;
}>('sealedOutcome');
const d1 = load<{
  finalists: {
    arm: ArmKey;
    id: string;
    candidateLabel: string;
    validation: unknown;
    c: boolean;
    candidate: boolean;
    developmentOnly: boolean;
  }[];
  candidates: unknown[];
  developmentOnly: unknown[];
  determination: string;
}>('d1Reconstruction');

// ----- the corrected outcome (the sealed preDetermination and rows, unchanged) -----
const fixed = plain(outcomeOf(fz.preDetermination, v.rows));
const checks: { check: string; pass: boolean; detail?: unknown }[] = [];
const check = (name: string, pass: boolean, detail?: unknown) =>
  checks.push({ check: name, pass, ...(detail === undefined ? {} : { detail }) });
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const without = (o: object, keys: readonly string[]) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

check(
  'the sealed outcome names the pinned frozen selection and validation records',
  sealed.frozenSelection.sha256 === pins.frozenSelection[1] && sealed.validation.sha256 === pins.validation[1]
);

// the defect: the sealed outcome is exactly what the label join produces (every finalist validation null)
const labelJoin = fz.preDetermination.finalists.map(
  (f) => v.rows.find((r) => r.label === f.label && r.arm === f.arm) ?? null
);

check(
  'defect reproduced: the label join matches no validation row for any of the 17 finalists',
  labelJoin.length === 17 && labelJoin.every((r) => r === null)
);
check(
  'defect reproduced: the sealed outcome has validation null and c false for every finalist, and an empty development-only list',
  sealed.finalists.every((f) => f.validation === null && f.c === false) && sealed.developmentOnly.length === 0
);

// chronology: (b) false for every architecture, so the defect could not change the candidate list
const arms = ['D', 'G', 'C', 'J', 'S'];

check(
  'the chronology gate failed for all five architectures (sequential.json)',
  arms.every((a) => seq.procedures.find((p) => p.population === a)?.supported === false),
  seq.procedures
    .filter((p) => arms.includes(p.population))
    .map((p) => ({ arm: p.population, supported: p.supported, verdict: p.verdict }))
);

// identity: one row per finalist, no row consumed twice; the unmatched rows are sub-population roles; controls excluded
const selected = v.rows.filter((r) => r.kind === 'selected');
const join = joinByIdentity(fz.preDetermination.finalists, v.rows, { eligible: (r) => r.kind === 'selected' });

check(
  'every finalist matches exactly one selected validation row by (arm, id); 17 distinct rows',
  join.pairs.length === 17 && new Set(join.pairs.map((p) => p.row)).size === 17
);
check(
  'the finalist identities equal FROZEN_SELECTION.json finalists (arm, id, candidate label)',
  same(
    fixed.finalists.map((f) => [f.arm, f.id, f.candidateLabel]),
    fz.finalists.map((f) => [f.arm, f.id, f.label])
  )
);

// roles: a finalist's roles are the matched row's roles of the arm's original population ('primary X' ↔ 'primary X/original')
const roleOk = join.pairs.every(({ finalist, row }) =>
  finalist.roles.every((r) =>
    (row as (typeof v.rows)[number]).roles.includes(r.startsWith('primary ') ? `${r}/original` : r)
  )
);

check('roles agree: every finalist role is carried by its matched row (one identity, several roles → one row)', roleOk);

// against the report-only D1 reconstruction
check(
  'per finalist: V1–V3, c, candidate and development-only equal reports/tables/outcome-join.json',
  same(
    fixed.finalists.map((f) => [f.arm, f.id, f.candidateLabel, f.validation, f.c, f.candidate, f.developmentOnly]),
    d1.finalists.map((f) => [f.arm, f.id, f.candidateLabel, f.validation, f.c, f.candidate, f.developmentOnly])
  )
);
check(
  'candidates and development-only lists equal outcome-join.json',
  same(fixed.candidates, d1.candidates) && same(fixed.developmentOnly, d1.developmentOnly)
);
check('the determination text equals outcome-join.json', fixed.outcome === d1.determination);

// against the sealed outcome
const dependent = ['validation', 'c', 'candidate', 'developmentOnly', 'candidateLabel'];

check(
  'only validation-dependent fields differ from the sealed outcome (a, b, primary, flags, labels, roles, metrics unchanged)',
  fixed.finalists.every((f, i) => same(without(f, dependent), without(sealed.finalists[i]!, dependent)))
);
check('the architecture comparisons equal the sealed outcome', same(fixed.comparisons, sealed.comparisons));
check('the candidate list is unchanged (empty)', fixed.candidates.length === 0 && sealed.candidates.length === 0);
check(
  'the verdict is unchanged: NO QUALIFYING TSLA CANDIDATE (the sealed text is the prefix of the corrected text)',
  fixed.outcome.startsWith('NO QUALIFYING TSLA CANDIDATE') && fixed.outcome.startsWith(sealed.outcome)
);

// the G / C development-only classification and D / J / S V1 failures (disclosure D1 figures)
const prim = (a: ArmKey) => fixed.finalists.find((f) => f.arm === a && f.primary)!;
const rowOf = (a: ArmKey) => selected.find((r) => r.arm === a && r.id === prim(a).id)!;
const r2 = (x: number) => Math.round(x * 100) / 100;

check(
  'G and C primaries: development-qualified, no chronological support, V1–V3 pass → development-only',
  same(
    fixed.developmentOnly.map((f) => f.arm),
    ['G', 'C']
  ) && (['G', 'C'] as const).every((a) => prim(a).a && !prim(a).b && prim(a).c)
);
check(
  'D, J and S primaries fail V1 (validation P&L ≤ 0)',
  (['D', 'J', 'S'] as const).every((a) => prim(a).validation.V1 === false && rowOf(a).sliceNet <= 0)
);
check(
  'D1 figures: G +$10,702.95, reset DD $18,255.00, whole-run DD $28,655.41; C +$71.05, $25,953.17, $26,287.97',
  same(
    [
      rowOf('G').sliceNet,
      r2(rowOf('G').sliceDd),
      r2(rowOf('G').wholeDd),
      rowOf('C').sliceNet,
      r2(rowOf('C').sliceDd),
      r2(rowOf('C').wholeDd)
    ],
    [10702.95, 18255, 28655.41, 71.05, 25953.17, 26287.97]
  )
);

// order independence on the sealed inputs
const reversed = plain(
  outcomeOf({ ...fz.preDetermination, finalists: [...fz.preDetermination.finalists].reverse() }, [...v.rows].reverse())
);
const keyed = (o: typeof fixed) =>
  o.finalists.map((f) => JSON.stringify([f.arm, f.id, f.validation, f.c, f.candidate, f.developmentOnly])).sort();

check(
  'reversing the finalists and the rows changes no classification, list or verdict',
  same(keyed(reversed), keyed(fixed)) &&
    same(reversed.candidates, fixed.candidates) &&
    same(reversed.developmentOnly, fixed.developmentOnly) &&
    reversed.outcome === fixed.outcome
);

const codeFiles = [
  'src/tsla-d1-growth/outcome.ts',
  'src/research-outcome/identityJoin.ts',
  'tools/tsla-outcome-identity-fix/replay.ts'
];
const record = {
  kind: 'REPORT-ONLY ENGINEERING REPLAY — not a sealed record; it does not replace research/tsla-d1-growth/results/outcome.json',
  purpose:
    'P6-TSLA outcome recomputed from the sealed preDetermination and the sealed validation rows with the identity join (arm, id): DECISION_REGISTER.md U6, AMENDMENTS.md D1',
  evaluates: 'nothing: no strategy evaluation, no market data, no data door; the sealed records are read only',
  baseCommit: '421e4c87780844e4e49c079586aa5c4945cc9e35 (research/tsla-d1-growth handoff)',
  inputs,
  code: Object.fromEntries(codeFiles.map((f) => [f, sha(fs.readFileSync(path.join(repo, f)))])),
  checks,
  pass: checks.every((c) => c.pass),
  identity: {
    joinKey: '(arm, id)',
    finalists: join.pairs.length,
    selectedRows: selected.length,
    unmatchedSelectedRows: join.unmatchedRows.map((r) => ({
      arm: r.arm,
      id: r.id,
      label: r.label,
      roles: (r as (typeof v.rows)[number]).roles
    })),
    excludedControlRows: join.excludedRows
  },
  corrected: {
    candidates: fixed.candidates,
    developmentOnly: fixed.developmentOnly,
    outcome: fixed.outcome,
    finalists: fixed.finalists.map((f) => ({
      arm: f.arm,
      id: f.id,
      candidateLabel: f.candidateLabel,
      governanceLabel: f.label,
      roles: f.roles,
      primary: f.primary,
      a: f.a,
      b: f.b,
      validation: f.validation,
      c: f.c,
      candidate: f.candidate,
      developmentOnly: f.developmentOnly,
      validationPnl: rowOfId(f.arm, f.id).sliceNet,
      validationResetDd: rowOfId(f.arm, f.id).sliceDd,
      wholeRunDd: rowOfId(f.arm, f.id).wholeDd
    }))
  },
  sealedOutcomeHad: {
    candidates: sealed.candidates,
    developmentOnly: sealed.developmentOnly,
    outcome: sealed.outcome,
    finalistsWithValidationNull: sealed.finalists.filter((f) => f.validation === null).length
  },
  ceiling: fixed.ceiling
};

function rowOfId(arm: ArmKey, id: string) {
  return selected.find((r) => r.arm === arm && r.id === id)!;
}

const text = `${JSON.stringify(record, null, 1)}\n`;

if (fs.existsSync(out)) {
  if (fs.readFileSync(out, 'utf8') !== text) {
    console.error(
      `refused: ${path.relative(repo, out)} exists with different content (sha256 ${sha(fs.readFileSync(out))} ≠ ${sha(Buffer.from(text))}); nothing written`
    );
    process.exit(1);
  }
  console.log(`unchanged: ${path.relative(repo, out)} (identical bytes)`);
} else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log(`wrote ${path.relative(repo, out)}`);
}
console.log(
  JSON.stringify(
    {
      sha256: sha(Buffer.from(text)),
      pass: record.pass,
      inputModes: modes,
      failed: checks.filter((c) => !c.pass).map((c) => c.check),
      developmentOnly: fixed.developmentOnly,
      outcome: fixed.outcome
    },
    null,
    1
  )
);
if (!record.pass) process.exitCode = 1;
