// Imports the SELECTED phenotypes of a finished Claude/CLI study (a `strategy-lab.phenotype-export` directory:
// phenotypes.json + MANIFEST.json, shared/phenotypes.ts) into Strategy Lab's frozen, read-only phenotype catalogue.
// Read-only towards every study and strategy. It refuses, writing nothing, unless every check passes:
//   1. MANIFEST.json lists phenotypes.json and every listed file's sha256 matches;
//   2. the export's shape (schema, version, ids, execution kinds, windows) is valid;
//   3. every phenotype's recordSha256 = sha256 of its canonical record;
//   4. the study's protocol and sealed records, when listed, exist in this checkout with those hashes;
//   5. every phenotype's strategy version is registered and executable as declared: a form strategy (Growth,
//      signal-only) has valid EFFECTIVE parameters for that version (no inactive dimensions) and an allowed resolution,
//      its engine version equals the strategy version; a shared-slot pool names the registered Study 8 runner and a
//      pool configuration file with its hash, its symbols = its books;
//   6. no phenotype id already exists with DIFFERENT content (frozen: a change needs a new id or version).
// Idempotent: an export already imported (same MANIFEST sha256) is reported and not imported again; a phenotype
// already in the catalogue with the same record hash is skipped. Only the listed phenotypes are promoted; an export's
// optional `trials` are stored as a read-only optimisation batch, never as runnable phenotypes.
//
// Usage: node --experimental-transform-types apps/strategy-lab/importers/phenotypes.ts <export directory>

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

import {
  PHENOTYPE_MANIFEST_SCHEMA,
  type PhenotypeExport,
  type PhenotypeRecord,
  canonicalJson,
  exportShapeErrors,
  recordBody
} from '../shared/phenotypes.ts';
import { canonicalParams, effectiveParams, validateParams } from '../shared/params.ts';
import { findStrategy } from '../shared/strategies.ts';
import { type Config, loadConfig } from '../server/config.ts';
import { formatPublicId, now, openDb, tx } from '../server/db.ts';
import { Repo } from '../server/repo.ts';

const sha = (data: Buffer | string) => createHash('sha256').update(data).digest('hex');

export const RUNNER_OF: Record<string, string> = {
  'rise-from-recent-low-trading': 'growth-trading',
  'rise-from-recent-low': 'entry-signal',
  'study8-d1-pool': 'study8-pool'
};

export interface PhenotypeImportReport {
  importId: string | null;
  alreadyImported: boolean;
  study: string;
  imported: string[];
  skipped: string[];
  checks: string[];
}

/** Every reason the records cannot be promoted (empty = importable). Pure apart from reading the listed files. */
export function phenotypeErrors(repoRoot: string, e: PhenotypeExport): string[] {
  const errors: string[] = [];
  for (const f of [...(e.study.protocol ? [e.study.protocol] : []), ...(e.study.sealedRecords ?? [])]) {
    const file = join(repoRoot, f.path);
    if (isAbsolute(f.path) || f.path.includes('..')) errors.push(`study record ${f.path}: a repository-relative path`);
    else if (!existsSync(file)) errors.push(`study record ${f.path}: missing in this checkout`);
    else if (sha(readFileSync(file)) !== f.sha256) errors.push(`study record ${f.path}: sha256 differs from the export`);
  }
  for (const p of e.phenotypes) {
    const at = `phenotype ${p.id}`;
    if (sha(canonicalJson(recordBody(p))) !== p.recordSha256) errors.push(`${at}: recordSha256 does not match its record`);
    const spec = findStrategy(p.strategy.key, p.strategy.version);
    if (!spec) {
      errors.push(`${at}: strategy ${p.strategy.key}@${p.strategy.version} is not registered`);
      continue;
    }
    if (p.executionKind === 'shared-slot pool') {
      if (spec.launch !== 'phenotype') errors.push(`${at}: ${spec.key} is not a shared-slot pool strategy`);
      const pool = p.pool!;
      if (pool.runner !== 'study8') errors.push(`${at}: unknown pool runner ${pool.runner}`);
      if (!/^s8-[a-z0-9-]{1,40}$/.test(pool.alias)) errors.push(`${at}: pool alias ${pool.alias}`);
      const cfg = join(repoRoot, pool.config.file);
      if (!existsSync(cfg)) errors.push(`${at}: pool config ${pool.config.file} missing`);
      else if (sha(readFileSync(cfg)) !== pool.config.sha256) errors.push(`${at}: pool config sha256 differs`);
      if (JSON.stringify(Object.keys(pool.books).sort()) !== JSON.stringify([...p.symbols].sort()))
        errors.push(`${at}: symbols must be the pool's books`);
    } else {
      if (spec.launch !== 'form') errors.push(`${at}: ${spec.key}@${spec.version} cannot be launched (legacy or read-only)`);
      if (p.engine.version !== spec.version) errors.push(`${at}: engine ${p.engine.version} ≠ strategy ${spec.version}`);
      const v = validateParams(spec, p.params ?? {});
      if (v.length) errors.push(...v.map((x) => `${at}: ${x}`));
      else if (canonicalParams(effectiveParams(spec, p.params!)) !== canonicalParams(p.params!))
        errors.push(`${at}: params must be the EFFECTIVE values only (an inactive dimension is present)`);
      if (!spec.resolutions.includes(p.resolution!)) errors.push(`${at}: resolution ${p.resolution} not allowed`);
    }
  }
  return errors;
}

export function importPhenotypes(cfg: Config, repo: Repo, sourceDir: string): PhenotypeImportReport {
  // relative to where the user typed the command (npm --prefix runs scripts in the package directory)
  const dir = isAbsolute(sourceDir) ? sourceDir : resolve(process.env.INIT_CWD ?? process.cwd(), sourceDir);
  const manifestFile = join(dir, 'MANIFEST.json');
  if (!existsSync(manifestFile) || !existsSync(join(dir, 'phenotypes.json')))
    throw new Error(`${dir}: needs MANIFEST.json and phenotypes.json`);
  const manifestBytes = readFileSync(manifestFile);
  const manifest = JSON.parse(manifestBytes.toString('utf8')) as {
    schema: string;
    schemaVersion: number;
    files: Record<string, string>;
  };
  const checks: string[] = [];
  if (manifest.schema !== PHENOTYPE_MANIFEST_SCHEMA || manifest.schemaVersion !== 1)
    throw new Error(`MANIFEST.json: expected ${PHENOTYPE_MANIFEST_SCHEMA} version 1`);
  if (!manifest.files?.['phenotypes.json']) throw new Error('MANIFEST.json does not list phenotypes.json');
  for (const [name, hash] of Object.entries(manifest.files)) {
    if (name.includes('/') || name.includes('..')) throw new Error(`MANIFEST.json: ${name} is not a file of the export`);
    if (sha(readFileSync(join(dir, name))) !== hash) throw new Error(`${name}: sha256 differs from MANIFEST.json`);
  }
  checks.push(`MANIFEST.json: ${Object.keys(manifest.files).length} file(s), every sha256 matches`);

  const exp = JSON.parse(readFileSync(join(dir, 'phenotypes.json'), 'utf8')) as PhenotypeExport;
  const shape = exportShapeErrors(exp);
  if (shape.length) throw new Error(`phenotypes.json: ${shape.slice(0, 5).join('; ')}`);
  checks.push(`phenotypes.json: schema ${exp.schema} v${exp.schemaVersion}, ${exp.phenotypes.length} selected phenotype(s)`);

  const manifestSha = sha(manifestBytes);
  const previous = repo.phenotypeImportBySha(manifestSha);
  if (previous)
    return { importId: previous, alreadyImported: true, study: exp.study.id, imported: [], skipped: [], checks };

  const errors = phenotypeErrors(cfg.repoRoot, exp);
  if (errors.length) throw new Error(errors.slice(0, 8).join('; '));
  checks.push('every recordSha256 matches its canonical record');
  if (exp.study.protocol || exp.study.sealedRecords?.length)
    checks.push(`study records: ${(exp.study.protocol ? 1 : 0) + (exp.study.sealedRecords?.length ?? 0)} file(s) present with matching sha256`);
  checks.push('every strategy version registered; parameters valid (effective values) or pool configuration verified');

  const fresh: PhenotypeRecord[] = [];
  const skipped: string[] = [];
  for (const p of exp.phenotypes) {
    const existing = repo.phenotypeByKey(p.id);
    if (!existing) fresh.push(p);
    else if (existing.recordSha256 === p.recordSha256) skipped.push(`${p.id} (already ${existing.publicId})`);
    else throw new Error(`phenotype ${p.id} exists (${existing.publicId}) with different content: frozen — use a new id or version`);
  }

  return tx(repo.db, () => {
    const imp = repo.createPhenotypeImport({
      studyRef: exp.study.id,
      sourcePath: relative(cfg.repoRoot, dir) || dir,
      sourceSha256: manifestSha,
      manifest: { manifest, study: exp.study, generatedAt: exp.generatedAt, generator: exp.generator },
      checks
    });
    const imported = fresh.map((p) =>
      repo.insertPhenotype({
        key: p.id,
        name: p.name,
        importId: imp.id,
        studyRef: exp.study.id,
        role: p.role,
        rank: p.rank,
        strategyKey: p.strategy.key,
        strategyVersion: p.strategy.version,
        executionKind: p.executionKind,
        runner: RUNNER_OF[p.strategy.key] ?? null,
        symbols: p.symbols,
        resolution: p.resolution ?? (p.pool ? '1m' : null),
        record: p,
        recordSha256: p.recordSha256
      })
    );
    if (exp.trials?.length) {
      const id = Number((repo.db.prepare('SELECT coalesce(max(id), 0) + 1 AS n FROM optimization_batches').get() as { n: number }).n);
      repo.db
        .prepare(
          `INSERT INTO optimization_batches (id, public_id, experiment_id, title, study_ref, methodology_ref, source_path,
             source_sha256, summary_json, imported_at) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, formatPublicId('OB', id, 4), exp.study.title, exp.study.id, exp.study.methodology ?? null, relative(cfg.repoRoot, dir), manifestSha, JSON.stringify({ trials: exp.trials.length, phenotypeImport: imp.publicId }), now());
      const ins = repo.db.prepare(
        'INSERT INTO optimization_trials (batch_id, trial_key, params_json, metrics_json, role, rank) VALUES (?, ?, ?, ?, ?, ?)'
      );
      for (const t of exp.trials) ins.run(id, t.key, JSON.stringify(t.params), JSON.stringify(t.metrics), t.role, t.rank);
    }
    return { importId: imp.publicId, alreadyImported: false, study: exp.study.id, imported, skipped, checks };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('usage: importers/phenotypes.ts <phenotype export directory>');
    process.exit(2);
  }
  const cfg = loadConfig();
  const db = openDb(cfg.dbFile);
  try {
    console.log(JSON.stringify(importPhenotypes(cfg, new Repo(db), dir), null, 2));
  } catch (e) {
    console.error(`import refused: ${(e as Error).message}`);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}
