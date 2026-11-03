// Stage C (PROTOCOL.md §5): the frozen candidates added to the All-lowDd allocator, one continuous `--dataset all` run
// per scenario, mode and cost. It runs only from a verified FROZEN_CANDIDATES.json and only on the candidates frozen
// there; with none frozen there is no additive scenario, nothing is unlocked and nothing is run.
import { frozenCandidatesFile, log, readJson, stageDir, writeJson } from './context.ts';
import { type CandidateManifest, verifyCandidateManifest } from './freeze.ts';

export const runStageC = async () => {
  const manifest = await readJson<CandidateManifest>(frozenCandidatesFile);

  if (!verifyCandidateManifest(manifest)) {
    throw new Error(`${frozenCandidatesFile}: the body hash does not verify`);
  }

  if (manifest.candidates.length === 0) {
    const status = {
      checkedAt: new Date().toISOString(),
      manifestHash: manifest.manifestHash,
      candidates: 0,
      scenarios: manifest.scenarios.map((scenario) => scenario.key),
      outcome:
        'no frozen candidate: no additive scenario exists, no holdout/final/all figure of a candidate was computed, and the allocator was not extended'
    };

    await writeJson(stageDir('stageC', 'status.json'), status);
    log(`Stage C: ${status.outcome} (manifest ${manifest.manifestHash.slice(0, 16)})`);
    return status;
  }

  throw new Error(
    'Frozen candidates exist: Stage C needs the allocator extension of PROTOCOL.md §5, which this study did not build because Stage A selected none'
  );
};
