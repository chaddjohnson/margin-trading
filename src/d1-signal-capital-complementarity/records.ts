// Write-once sealed records (the ranked-preemption study's writeSealed/readSealed, unchanged: the body hash covers
// the JSON-safe body exactly as written), gzip JSON for the larger ledgers (deterministic bytes: Node's gzip writes
// mtime 0), the code manifest of the study's own files, and the protected-input manifest of PROTOCOL.md §2.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import fs from 'fs-extra';
import path from 'node:path';
import { hashBody, readSealed, safeJson, writeSealed } from '../d1-ranked-preemption/freeze.ts';
import { normalizedCalendarHash } from '../pools/forward/protocol.ts';
import { codeRoot, readJson, researchRoot, scriptName, source, study, testRoot } from './context.ts';
import { universeSymbols } from './doors.ts';

export { hashBody, readSealed, safeJson, writeSealed };

export const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');

export const sha256File = async (file: string) => sha256(await fs.readFile(file));

export const gitHead = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

export const environment = () => ({
  node: process.version,
  nodeExpected: study.node,
  head: gitHead(),
  testMode: Boolean(testRoot)
});

export const writeRecord = async (file: string, body: Record<string, unknown>) => {
  await fs.ensureDir(path.dirname(file));

  return writeSealed(file, {
    schema: `${study.id}:${String(body.stage ?? 'record')}`,
    ...body,
    environment: environment()
  });
};

// A gzip JSON payload (written once; its sha256 goes into the sealed stage record that lists it).
export const writeGz = async (file: string, value: unknown) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  await fs.ensureDir(path.dirname(file));

  const bytes = gzipSync(Buffer.from(JSON.stringify(safeJson(value))), { level: 9 });

  await fs.writeFile(file, bytes);

  return { file, sha256: sha256(bytes), bytes: bytes.length };
};

export const readGz = async <T>(file: string, expectedSha?: string): Promise<T> => {
  const bytes = await fs.readFile(file);

  if (expectedSha && sha256(bytes) !== expectedSha) {
    throw new Error(`${file}: sha256 ${sha256(bytes)} ≠ the sealed ${expectedSha}`);
  }

  return JSON.parse(gunzipSync(bytes).toString('utf8')) as T;
};

export const writeTextOnce = async (file: string, text: string) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  await fs.ensureDir(path.dirname(file));
  await fs.writeFile(file, text);

  return { file, sha256: sha256(text) };
};

// ----- the study's code manifest (bound by the code freeze) -----

export const codeManifest = async () => {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', codeRoot], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter((file) => file.endsWith('.ts'))
    .sort();
  const files: Record<string, string> = {};

  for (const file of listed) {
    files[file] = await sha256File(file);
  }

  const packageJson = await readJson<{ scripts: Record<string, string> }>('package.json');

  return {
    files,
    script: packageJson.scripts[scriptName] ?? null,
    digest: sha256(JSON.stringify({ files, script: packageJson.scripts[scriptName] ?? null }))
  };
};

// ----- protected inputs (PROTOCOL.md §2) -----

export const baseCommit = 'a37feaebf50ec7755edb385669c290a834ce19b5';

const allowedChanges = (file: string) =>
  file.startsWith(`${researchRoot}/`) || file.startsWith(`${codeRoot}/`) || file === 'package.json';

export const protectedManifest = async () => {
  // 1. Tracked files: nothing outside the study's folders and package.json differs from the base commit.
  const changed = execFileSync('git', ['diff', '--name-only', baseCommit, '--'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !allowedChanges(file));
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !allowedChanges(file) && !path.basename(file).startsWith('._'));

  // 2. package.json: only the study's script line may differ from the base commit.
  const baseJson = JSON.parse(execFileSync('git', ['show', `${baseCommit}:package.json`], { encoding: 'utf8' })) as {
    scripts: Record<string, string>;
    [key: string]: unknown;
  };
  const currentJson = await readJson<typeof baseJson>('package.json');
  const currentScripts = { ...currentJson.scripts };

  delete currentScripts[scriptName];
  const packageJsonOk = JSON.stringify({ ...currentJson, scripts: currentScripts }) === JSON.stringify(baseJson);

  // 3. The prospective B4/B5 freeze's pinned files.
  const freeze = await readJson<{
    protocol: { file: string; sha256: string };
    pools: Record<string, { file: string; fileSha256: string }>;
    code: { files: Record<string, string> };
    environment: { packageLockSha256: string; poolsScript: string; importsMap: string };
    data: { canonicalPins: Record<string, string>; marketEvents: Record<string, string> };
  }>(source.prospectiveFreeze);
  const pinned: Record<string, string> = {
    [freeze.protocol.file]: freeze.protocol.sha256,
    ...Object.fromEntries(Object.values(freeze.pools).map((pool) => [pool.file, pool.fileSha256])),
    ...freeze.code.files,
    ...freeze.data.marketEvents,
    'package-lock.json': freeze.environment.packageLockSha256,
    ...Object.fromEntries(
      Object.entries(freeze.data.canonicalPins).map(([symbol, sha]) => [`data/${symbol}/data.csv`, sha])
    )
  };
  const pinnedMismatches: string[] = [];
  const appendOnly: string[] = [];

  for (const [file, sha] of Object.entries(pinned)) {
    // An 'append-only' pin (the NYSE calendar) is the prospective freeze's normalized hash (code without comments and
    // date literals), checked with that freeze's own function.
    if (sha.startsWith('append-only ')) {
      appendOnly.push(file);

      if (!(await fs.pathExists(file)) || `append-only ${await normalizedCalendarHash(file)}` !== sha) {
        pinnedMismatches.push(file);
      }

      continue;
    }

    if (!(await fs.pathExists(file)) || (await sha256File(file)) !== sha) {
      pinnedMismatches.push(file);
    }
  }

  const poolsScriptOk = currentJson.scripts.pools === freeze.environment.poolsScript;
  const importsOk = JSON.stringify(currentJson.imports) === freeze.environment.importsMap;

  // 4. The 61 canonical data files and the partitions file (local, git-ignored), and the prior studies' ignored files.
  const data: Record<string, string> = { 'data/partitions.json': await sha256File('data/partitions.json') };

  for (const symbol of await universeSymbols()) {
    data[`data/${symbol}/data.csv`] = await sha256File(`data/${symbol}/data.csv`);
  }

  const ignored = execFileSync('git', ['ls-files', '--others', '--ignored', '--exclude-standard', 'research/'], {
    encoding: 'utf8'
  })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !file.startsWith(`${researchRoot}/`))
    .sort();
  const ignoredResearch: Record<string, string> = {};

  for (const file of ignored) {
    ignoredResearch[file] = await sha256File(file);
  }

  return {
    baseCommit,
    trackedChangesOutsideStudy: changed,
    untrackedOutsideStudy: untracked,
    packageJsonOnlyStudyScript: packageJsonOk,
    prospectiveFreeze: {
      file: source.prospectiveFreeze,
      pinnedFiles: Object.keys(pinned).length,
      appendOnlyNormalizedHashOk: appendOnly,
      mismatches: pinnedMismatches,
      poolsScriptOk,
      importsOk
    },
    data,
    dataDigest: sha256(JSON.stringify(data)),
    ignoredResearch,
    ignoredResearchDigest: sha256(JSON.stringify(ignoredResearch))
  };
};

export type ProtectedManifest = Awaited<ReturnType<typeof protectedManifest>>;

export const protectedOk = (manifest: ProtectedManifest) =>
  manifest.trackedChangesOutsideStudy.length === 0 &&
  manifest.untrackedOutsideStudy.length === 0 &&
  manifest.packageJsonOnlyStudyScript &&
  manifest.prospectiveFreeze.mismatches.length === 0 &&
  manifest.prospectiveFreeze.poolsScriptOk &&
  manifest.prospectiveFreeze.importsOk;
