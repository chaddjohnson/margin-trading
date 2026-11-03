// The one-time selection freeze (PROTOCOL.md §7.1): FROZEN_SELECTION.json, written once from the training-only
// stages, before any holdout/final/all figure of a candidate exists. It holds every configuration with its books and
// vectors, nominated or comparator status and the frozen ranking, the acceptance rules, the S0 phenotype hashes, the
// code/data/input hashes, seeds, budgets, evaluation counts, the parity/controls/audit records' hashes, the training
// results, and the authorized command.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { sha256FileSync } from '#lib';
import { log, protocolFile, stageDir, study } from './context.ts';
import { allMembers } from './data.ts';
import { gitState, requireProtocolFrozen, sha256File, writeSelectionManifest } from './freeze.ts';
import { hashesOf, inputFiles, studyCodeFiles } from './audit.ts';
import { poolSeed } from './space.ts';
import { readStageC } from './stageC.ts';

const recordFiles = [
  'audit/audit.json',
  'controls/controls.json',
  'parity/parity.json',
  'stageA/pool.json',
  'stageA/run.json',
  'stageA/finalists.json',
  'stageB/champions.json',
  'stageC/stageC.json'
];

export const freezeSelection = async () => {
  const { freeze, current } = await requireProtocolFrozen();

  for (const file of ['audit/audit.json', 'controls/controls.json', 'parity/parity.json']) {
    const record = (await fs.readJson(stageDir(file))) as { passed?: boolean };

    if (record.passed !== true) {
      throw new Error(`${file} did not pass: nothing can be frozen`);
    }
  }

  const stageC = await readStageC();
  const configurations = stageC.design.configurations.map((configuration) => {
    const gate = stageC.gates[configuration.key] as
      { nominated?: boolean; deltas?: Record<string, number> } | undefined;

    return {
      ...configuration,
      status: configuration.key === 'S0' ? 'control' : gate?.nominated ? 'nominated' : 'comparator',
      trainingDelta5: configuration.key === 'S0' ? 0 : (gate?.deltas?.[study.principalCostBps] ?? NaN)
    };
  });
  const ranking = configurations
    .filter((configuration) => configuration.status === 'nominated')
    .sort((a, b) => b.trainingDelta5 - a.trainingDelta5)
    .map((configuration) => configuration.key);
  const records: Record<string, string> = {};

  for (const file of recordFiles) {
    if (await fs.pathExists(stageDir(file))) {
      records[file] = await sha256File(stageDir(file));
    }
  }

  const dataHashes = Object.fromEntries(
    allMembers.map((symbol) => [symbol, sha256FileSync(`data/${symbol}/data.csv`)])
  );
  const body = {
    version: study.version,
    frozenAt: new Date().toISOString(),
    git: gitState(),
    protocol: {
      file: protocolFile,
      sha256: current,
      frozenSha256: freeze.protocolSha256,
      frozenAt: freeze.frozenAt
    },
    lastCommonSession: study.expectedLastCommonSession,
    s0Phenotypes: await hashesOf([
      'config/phenotypes/D1/VGT.json',
      'config/phenotypes/D1/XBI.json',
      'config/phenotypes/D1/XRT.json',
      'config/phenotypes/D1/KRE.json'
    ]),
    configurations,
    ranking,
    combination: stageC.design.combination,
    substitutionCandidates: stageC.design.substitutionCandidates,
    designNotes: stageC.design.notes,
    acceptance: {
      ...study.acceptance,
      rules: [
        'nominated configurations only',
        'post-training (holdout + final, continuous all) fixed Δ@5 > 0 and Δ@10 > 0',
        'holdout fixed Δ@5 ≥ +$2,500 (persists)',
        'final fixed Δ@5 > −$2,500 (does not reverse)',
        'portfolio post-training ending-equity Δ@5 > 0 (the equity gap to S0 widens over holdout + final)',
        'full all: portfolio maximum daily % drawdown ≤ 35% and ≤ S0 + 1.0 point; fixed minute drawdown ≤ $35,000',
        'recommendation: the highest-ranked accepted configuration in `ranking`; none accepted → All-lowDd unchanged'
      ],
      gates: study.gates
    },
    seeds: {
      pool: poolSeed(),
      nsga2: 'deriveSeed("portfolio-aware-d1", ETF, track, "nsga2")'
    },
    budgets: { pool: study.pool, search: study.search, selection: study.selection, stageC: study.stageC },
    records,
    inputs: await hashesOf(inputFiles),
    dataHashes,
    code: await hashesOf(await studyCodeFiles()),
    training: Object.fromEntries(
      Object.entries(stageC.runs).map(([key, runs]) => [
        key,
        Object.fromEntries(
          Object.entries(runs).map(([run, figures]) => [
            run,
            {
              net: figures.net,
              lots: figures.lots,
              newLots: figures.newLots,
              minuteDrawdown: figures.minuteDrawdown,
              endEquity: figures.endEquity,
              dailyPercent: figures.dailyPercent,
              minutePercent: figures.minutePercent,
              borrowingDollarDays: figures.borrowingDollarDays
            }
          ])
        )
      ])
    ),
    gates: stageC.gates,
    authorizedCommands: ['npm run portfolio-aware-d1 -- evaluate', 'npm run portfolio-aware-d1 -- evaluate --confirm'],
    statement:
      'Frozen from training-only stages before any holdout, final or all figure of a candidate configuration was computed. No configuration, vector, rule or ranking may change after this point; the evaluation runs once (plus one deterministic confirmation).'
  };
  const manifest = await writeSelectionManifest(body);
  const digest = createHash('sha256').update(JSON.stringify(configurations)).digest('hex');

  log(
    `selection frozen: ${configurations.length} configurations (${ranking.length} nominated: ${ranking.join(', ') || 'none'}), manifest ${manifest.manifestHash}, configurations ${digest.slice(0, 12)}`
  );

  return manifest;
};
