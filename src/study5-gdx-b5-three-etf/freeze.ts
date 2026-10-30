// freeze-selection (PROTOCOL.md §7.1): FROZEN_SELECTION.json, written once from the sealed stage records; it binds the
// nominees, every candidate and control, the gate results, the record hashes, the protocol, the code digest and the
// final-evaluation rules. The final door opens only when its body hash verifies.
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import { doorsLog, frozenSelectionFile, protocolFile, protocolFreezeFile, resultFile } from './context.ts';
import { sha256 } from './data.ts';
import type { Books } from './engine.ts';
import type { Grid } from './grid.ts';
import { codeDigest, fileSha256, log, nowIso, readSealed, writeSealed } from './records.ts';

const records = [
  protocolFreezeFile,
  resultFile('parity', 'parity.json'),
  resultFile('studyA', 'main', 'search.json'),
  resultFile('studyA', 'main', 'validation.json'),
  resultFile('studyA', 'wf20', 'search.json'),
  resultFile('studyA', 'wf20', 'validation.json'),
  resultFile('track1', 'main', 'track1.json'),
  resultFile('track1', 'wf20', 'track1.json'),
  resultFile('track2', 'track2.json'),
  resultFile('studyB', 'candidates.json'),
  resultFile('studyB', 'validation.json')
];

interface AEvidence {
  id: string;
  grid: Grid;
  short: string;
  list: string;
  control: boolean;
  passes: boolean;
  gates: Record<string, boolean>;
  score: number;
  centre: { dev: number; val: number; metrics: { minuteDrawdown: number } };
  n1Summary: { devMedian: number; valMedian: number; ddP90: number; share35: number };
}

interface BEvidence {
  key: string;
  source: string;
  control: boolean;
  books: Books;
  passes: boolean;
  gates: Record<string, boolean>;
  score: number;
  beatsC3: boolean;
  centre: { dev: number; val: number; metrics: { minuteDrawdown: number } };
  jointSummary: { devMedian: number; valMedian: number; ddP90: number; share35: number };
}

export const runFreezeSelection = async () => {
  if (await fs.pathExists(frozenSelectionFile)) {
    throw new Error(`${frozenSelectionFile} exists (freeze-selection runs once)`);
  }

  const hashes: Record<string, { bodyHash: string; fileSha256: string }> = {};

  for (const file of records) {
    const record = await readSealed<{ bodyHash: string }>(file);

    hashes[file] = { bodyHash: record.bodyHash, fileSha256: await fileSha256(file) };
  }

  const parity = await readSealed<{ passed: Record<string, boolean> }>(resultFile('parity', 'parity.json'));

  if (!Object.values(parity.passed).every(Boolean)) {
    throw new Error(`parity failed: ${JSON.stringify(parity.passed)}`);
  }

  const a = await readSealed<{ evidence: AEvidence[]; picks: { role: string; id: string }[] }>(
    resultFile('studyA', 'main', 'validation.json')
  );
  const aWf = await readSealed<{ picks: { role: string; id: string }[] }>(
    resultFile('studyA', 'wf20', 'validation.json')
  );
  const b = await readSealed<{ evidence: BEvidence[]; picks: { role: string; key: string }[] }>(
    resultFile('studyB', 'validation.json')
  );
  const t1 = await readSealed<{ configurations: { key: string; status: string; gate: Record<string, boolean> }[] }>(
    resultFile('track1', 'main', 'track1.json')
  );
  const git = (cmd: string) => execSync(`git ${cmd}`, { encoding: 'utf8' }).trim();
  const aRow = (item: AEvidence) => ({
    id: item.id,
    grid: item.grid,
    short: item.short,
    list: item.list,
    control: item.control,
    passes: item.passes,
    gates: item.gates,
    score: item.score,
    dev: item.centre.dev,
    val: item.centre.val,
    dd: item.centre.metrics.minuteDrawdown,
    n1: item.n1Summary
  });
  const bRow = (item: BEvidence) => ({
    key: item.key,
    source: item.source,
    control: item.control,
    books: item.books,
    passes: item.passes,
    gates: item.gates,
    score: item.score,
    beatsC3: item.beatsC3,
    dev: item.centre.dev,
    val: item.centre.val,
    dd: item.centre.metrics.minuteDrawdown,
    joint: item.jointSummary
  });
  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    frozenAt: nowIso(),
    protocol: { file: protocolFile, sha256: sha256(await fs.readFile(protocolFile)) },
    git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
    code: await codeDigest(),
    doorsLogSha256: await fileSha256(doorsLog),
    records: hashes,
    amendments: [
      'A1 (reporting only): nominee-level final diagnostics for non-control candidates failing exactly one gate'
    ],
    studyA: {
      nominees: a.picks.map((pick) => ({ ...pick, ...aRow(a.evidence.find((item) => item.id === pick.id)!) })),
      nearMisses: a.evidence
        .filter((item) => !item.control && Object.values(item.gates).filter((ok) => !ok).length === 1)
        .map((item) => ({ id: item.id, failed: Object.keys(item.gates).filter((key) => !item.gates[key]) })),
      shortlistAndControls: a.evidence.map(aRow),
      wf20Picks: aWf.picks,
      outcome: a.picks.length ? `${a.picks.length} nominee(s)` : 'no nominee: no vector passed G1–G7'
    },
    studyB: {
      nominees: b.picks.map((pick) => ({ ...pick, ...bRow(b.evidence.find((item) => item.key === pick.key)!) })),
      nearMisses: b.evidence
        .filter((item) => !item.control && Object.values(item.gates).filter((ok) => !ok).length === 1)
        .map((item) => ({ key: item.key, failed: Object.keys(item.gates).filter((key) => !item.gates[key]) })),
      candidatesAndControls: b.evidence.map(bRow),
      track1: t1.configurations.map((configuration) => ({
        key: configuration.key,
        status: configuration.status,
        gate: configuration.gate
      })),
      outcome: b.picks.length ? `${b.picks.length} nominee(s)` : 'no nominee: no configuration passed PG1–PG7'
    },
    finalRules: {
      studyA:
        'holds: FULL minute DD < $35,000, FX net > 0 and FX N1 median > 0; risk breach: FULL DD ≥ $35,000; fails: FX net ≤ 0; otherwise mixed',
      studyB:
        'FULL pool minute DD < $35,000 (pass/fail); FX Δ vs C3: persists ≥ +$2,500, reverses ≤ −$2,500, else disappears',
      noTuning: 'no parameter, candidate, rule or role changes after the final door opens'
    },
    authorizedCommands: ['npm run study5 -- final', 'npm run study5 -- final --confirm']
  });

  log(`selection frozen: ${JSON.stringify(record)}`);
};
