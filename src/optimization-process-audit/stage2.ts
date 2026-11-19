// Stage 2 (PROTOCOL.md §7.1): the policy freeze. It seals the experimental policies' definitions (from policies.ts and
// POLICIES.md), checks that every policy executes deterministically on every E(s, c) (C19–C24) using only the §6
// feature menu, that P0 reproduces each subject's sealed independent primaries, and pins the code closure used for
// Stages 3 and 4. No next-period outcome is computed or read.
import fs from 'node:fs';
import path from 'node:path';
import { allCuts, codeDir, log, researchDir, stageFile } from './context.ts';
import { allPolicies, experimental } from './policies.ts';
import { assertCommitted, codeDigest, rel, sealJson, sha256File } from './records.ts';
import { sources, subjectKeys } from './sources.ts';
import { featuresAt } from './stage3.ts';
import { selectionOf } from './subjects.ts';

export const policiesDoc = path.join(researchDir, 'POLICIES.md');

export const runStage2 = async (args: string[]) => {
  if (args[0] !== 'freeze') throw new Error('stage2 freeze');
  assertCommitted(stageFile.mechanism);
  if (fs.existsSync(stageFile.policyFreeze)) throw new Error(`${rel(stageFile.policyFreeze)} is sealed`);
  if (!fs.existsSync(policiesDoc)) throw new Error('POLICIES.md is missing');
  if (experimental.length > 3) throw new Error('at most three experimental policies (PROTOCOL.md §7.1)');

  const dryRun: Record<string, unknown> = {};

  for (const s of subjectKeys)
    for (const cut of allCuts) {
      const e = featuresAt(s, cut);
      const picks = Object.fromEntries(allPolicies().map((p) => [p.key, p.choose(e).label]));
      const again = Object.fromEntries(allPolicies().map((p) => [p.key, p.choose([...e].reverse()).label]));

      if (JSON.stringify(picks) !== JSON.stringify(again)) throw new Error(`${s} ${cut}: a policy depends on the input order`);
      if (picks.P0 !== selectionOf(s, cut).roles.independent!.roles['actual-profit']) throw new Error(`${s} ${cut}: P0 does not reproduce the sealed independent primary`);
      dryRun[`${s} ${cut}`] = { eligible: e.length, picks };
    }

  const code = codeDigest(codeDir);
  const record = {
    stage: 'stage2 policy freeze (before any non-published next-slice outcome)',
    policies: allPolicies().map(({ key, family, name, formula }) => ({ key, family, name, formula })),
    document: { file: rel(policiesDoc), sha256: sha256File(policiesDoc) },
    developmentChoices: dryRun,
    note: 'developmentChoices are the policies’ choices from training-only features (C24 included); no next-period outcome exists for any non-published choice at this point',
    codeClosure: code,
    subjectDigests: Object.fromEntries(subjectKeys.map((s) => [s, sources[s].evaluationDigest()])),
    finished: new Date().toISOString()
  };

  sealJson(stageFile.policyFreeze, record, 'stage2 policy freeze');
  log(`stage2 policy freeze: ${record.policies.map((p) => p.key).join(', ')}; code ${code.digest.slice(0, 12)}…`);
  return record;
};
