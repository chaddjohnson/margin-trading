// vg-d1-growth-diagnostic (Priority 3A): a bounded, read-only diagnostic of Priority 3's frozen subjects — why searched
// VGT + GDX Growth pools rarely funded Growth·GDX, and what the unchanged four-component combinations' neighbourhood
// drawdown failures consist of. research/vg-d1-growth-diagnostic/PROTOCOL.md is the authority; this file holds its
// constants. Nothing here searches, selects or changes Priority 3's engine, records or archives.
import path from 'node:path';

export const STUDY = 'vg-d1-growth-diagnostic';
export const repoRoot = path.resolve(import.meta.dirname, '../..');
export const researchDir = path.join(repoRoot, 'research', STUDY);
export const resultsDir = path.join(researchDir, 'results');
export const cacheRoot = path.join(repoRoot, '.cache', STUDY);
export const sealsLog = path.join(resultsDir, 'seals.jsonl');
export const doorLog = path.join(resultsDir, 'doors.jsonl');
export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');
export const manifestFile = path.join(researchDir, 'DIAGNOSTIC_MANIFEST.json');
export const codeDir = import.meta.dirname;

// Priority 3 (research/vg-d1-growth-joint/, complete and frozen): its evaluation code, closure and sealed records are
// verified against these pins before any of them is read or any evaluation runs.
export const p3 = {
  study: 'vg-d1-growth-joint',
  dir: path.join(repoRoot, 'research', 'vg-d1-growth-joint'),
  cache: path.join(repoRoot, '.cache', 'vg-d1-growth-joint'),
  evaluationDigest: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88',
  closureDigest: 'f7fc49aae5d35e6aef67096ddf211572779712796a1ab1e58a5c206b2923e69b',
  frozenSelectionSha256: 'e29e35e290c1f9a424410b02c048889021fa818f16c324085bae8bf5bdcebfe2',
  records: {
    'CONTROL_MANIFEST.json': '0f40efd76aec8ec10a504fb2cf508891a572061df51db065363a910fb68adaa1',
    'FROZEN_SELECTION.json': 'e29e35e290c1f9a424410b02c048889021fa818f16c324085bae8bf5bdcebfe2',
    'results/protocol-freeze.json': '69d30c4183850698b138b1d9f168d7704c0ef83a6709f205b8829867090eb704',
    'results/search/C24/indep.json': '813fb96a2d95be0a9fb55a864545f74e766e12d467a7d0ea7b6b0fcaf8e77e94',
    'results/search/C24/gpair.json': 'ffe03d0e60ead0fbadc49b7ea1cbd71c90302d6daddbddea26d28432ced2cdd9',
    'results/search/C24/informed.json': 'b30fd648af06f4ca0d11c812d7b1585da5fa21fa4e21800f1a0dd54a810ba06e',
    'results/gpair/C24/selection.json': 'c833c85dcecd6cd678d23ecbd81f6e11d45e294de3f9995e8c1dec281f2c47fb',
    'results/folds/C24/selection.json': '32953b919363002a1b7a87a7e5643941068685782948e80a44064c20b76f76b1',
    'results/diagnostics/D24/diagnostics.json': '3e18a20fb022dc42557e0dcb5df846645b2fd1d09ad14c87151eb8347f585252',
    'results/validation/validation.json': '77328e9cb7154939d9b455c2d62b48de5bfdb8e051a31ad790c3ade40bc4dad1'
  } as Record<string, string>,
  // the job archives read (read-only) by the audit and the risk reconstruction; their sha256 is pinned at the freeze
  archives: ['search-C24-indep', 'search-C24-gpair', 'search-C24-informed', 'qualify-C24', 'qualify-gpair-C24']
};

export const archiveFile = (job: string) => path.join(p3.cache, 'jobs', job, 'archive.sqlite');

// The frozen ceilings (the brief §3; ceilings, not targets). Fresh pooled simulations on the development door and on
// FULL; the probes are a subset of the development count. Observer book simulations (the Growth engine re-run for its
// decision log, and the single-crossing gate checks) are counted apart.
export const ceilings = { development: 4000, full: 64, probes: 256, observerBooks: 4000 };

export const economics = { budget: 100_000, ceiling: 35_000 };
export const boundary = '2024-12-31'; // the development / validation boundary close (continuous runs)
export const episodeGap = 10; // sessions: a new independent episode starts more than 10 sessions after the last one

// Containment (the user's limits; the standard §6.2): every heavy stage is a transient user unit in this slice.
export const resources = {
  slice: 'vgdiag.slice',
  memoryHigh: '44G',
  memoryMax: '48G',
  memorySwapMax: '0'
};

export const r2 = (x: number) => Math.round(x * 100) / 100;

let quiet = false;
export const setQuiet = (v: boolean) => {
  quiet = v;
};
export const log = (message: string) => {
  if (!quiet) console.log(`[${STUDY} ${new Date().toISOString().slice(11, 19)}Z] ${message}`);
};
