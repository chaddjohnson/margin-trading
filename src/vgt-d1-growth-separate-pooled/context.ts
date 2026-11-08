// vgt-d1-growth-separate-pooled — the Priority 2 follow-up: the two separately optimized single-family selections of
// Priority 2 (C24/d1only#1 top and C24/gonly/breakout/off#1 top), pooled under Priority 2's frozen engine and
// conventions, as a bounded retrospective diagnostic. research/vgt-d1-growth-separate-pooled/PROTOCOL.md is the
// authority; COMPARISON_MANIFEST.json (sealed and committed before any pair evaluation) fixes every case, control and
// neighbourhood family. This study never searches and never selects.
//
// The evaluation engine is Priority 2's, imported unchanged (src/vgt-d1-growth-joint/: books, allocator, evaluate,
// space, fitness, qualify); its evaluation-code digest must equal the digest frozen there. Nothing here writes into
// research/vgt-d1-growth-joint/ or its cache.
import path from 'node:path';

export const STUDY = 'vgt-d1-growth-separate-pooled';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const codeDir = import.meta.dirname;
export const manifestFile = path.join(researchDir, 'COMPARISON_MANIFEST.json');
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');

// Priority 2: the sealed records this follow-up reads (never writes), with the sha256 recomputed and recorded before
// this study started (RESEARCH_RECOVERY.md "Inputs"). A different hash stops every stage.
export const p2 = {
  study: 'vgt-d1-growth-joint',
  dir: path.join(repoRoot, 'research', 'vgt-d1-growth-joint'),
  pins: {
    'FROZEN_SELECTION.json': 'e677e894738324f03dd17413f330d218fd5fcc0aa5fb76e7193e6c2d8e5f7d72',
    'results/folds/C24/selection.json': 'd04570f65dad650ecd66059d0e9a6db09589b645cb7b1a25b568a808057975da',
    'results/diagnostics/D24/diagnostics.json': '813c09d76a2337bf4b1194872869b1297b03231a1c6f8e6e6022d53d3f831a39',
    'results/validation/validation.json': '573c84a30e4544c2eee9bb61cc05e00711c3ac4291a9d44ffb325cafd45159b6',
    'results/protocol-freeze.json': 'd19bbe07277c894da0a2338832eb48e15117355459ccb3fbfe9f8cfabb995f20',
    'PROTOCOL.md': '7a68069290417f0e1385568ea5af5e2b96e2f74b3d10d3668ef01313382ccc74'
  } as Record<string, string>,
  evaluationDigest: 'c936f69168ca5b5fd76ffe380ba20e750771a4e2c748ac184cfe12351b07ad4c',
  // the pair, by its frozen labels (FROZEN_SELECTION.json singleFamily)
  d1Label: 'C24/d1only#1 top',
  gLabel: 'C24/gonly/breakout/off#1 top',
  jointPrimaryLabel: 'C24/informed#1 top'
} as const;

export const boundary = '2024-12-31'; // the development end; validation = the marked change after this close

// The study's resource contract (standard §6; the user's limits): one parent slice with the aggregate caps, every
// heavy stage its own transient unit inside it, one at a time.
export const resources = {
  slice: 'vgtpair.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0',
  workers: 8, // the neighbourhood stage (Priority 2 measured saturation near the 8 physical cores)
  pressureBytes: 16 * 2 ** 30, // dispatching stops at 16 GiB of the job cgroup (checkpoint and exit 75)
  coordinatorOldSpaceMb: 3072,
  workerOldSpaceMb: 1536,
  gcEveryEvaluations: 8,
  gcArrayBufferBytes: 256 * 2 ** 20,
  inflightPerWorker: 2,
  lruCapacity: 20000,
  storeCommitRows: 500,
  storeCommitMs: 2000,
  sampleEveryMs: 10000
};

export const log = (message: string) => console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
