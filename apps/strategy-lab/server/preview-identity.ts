// The execution identity of an Interactive Preview (docs/strategy-lab/INTERACTIVE_PREVIEW.md §Cache key): everything
// that can change a preview's result, as one canonical JSON object whose sha256 is the cache key. Correctness first:
// anything that cannot be resolved throws (fail closed: no preview, never a guessed key).
//
//   strategy        key, exact version, kind, the allowlisted runner script, sha256 of the version's stored schema
//   params          the EFFECTIVE values only (shared/preview.ts), sorted keys, JS shortest-number form
//   symbols         in request order (the artifacts list symbols in that order), window from/to, resolution
//   data            sha256 of every regular file under data/<SYMBOL>/ (content, never names or mtimes), per symbol,
//                   plus the non-code inputs the runner reads (split events, partitions, the legacy research inputs)
//   implementation  sha256 of every file of the runner's static import closure (relative imports, the package's `#`
//                   subpath imports, every npm package it loads hashed whole with its dependencies), the Node version,
//                   platform and architecture, the runner's Node flags and fixed environment
//   format          the preview cache format and the event contract version
//
// Everything is re-hashed on every call (no timestamp memo): reading a 50–80 MB data file costs ~30–50 ms.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';

import { EVENT_CONTRACT_VERSION, type StrategySpec } from '../shared/contract.ts';
import { schemaOf } from '../shared/params.ts';
import { type PreviewConfig, canonicalJson } from '../shared/preview.ts';
import { NODE_FLAGS, RUNNER_ENV_FIXED, RUNNER_SCRIPTS } from './jobs.ts';

/** Bumped whenever the cached payload or its manifest changes incompatibly: older entries then never match. */
export const PREVIEW_CACHE_FORMAT = 1;
export const PREVIEW_IDENTITY_SCHEMA = 'strategy-lab.preview-identity';

/**
 * Non-code files the runners read at run time besides the symbols' data (found with an fs trace of both runners;
 * tests/preview-identity.test.ts re-traces them and fails if a run reads anything the identity does not cover). A
 * missing file is recorded as null: its absence is part of the identity too.
 */
export const RUNTIME_INPUTS = [
  'config/market-events/splits.json',
  'data/partitions.json',
  'config/archive/legacy-research-inputs.json'
] as const;

export class PreviewIdentityError extends Error {}

const sha256 = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const posix = (p: string) => p.split(sep).join('/');

// ----- the static import closure -----

const BUILTINS = new Set(builtinModules);
const isBuiltin = (s: string) => s.startsWith('node:') || BUILTINS.has(s) || BUILTINS.has(s.split('/')[0]!);

/**
 * The module specifiers a TypeScript/JavaScript file loads: static import/export declarations (except `import type` /
 * `export type`, which type stripping erases) and literal dynamic imports. A dynamic import of a non-literal cannot be
 * followed, so it fails closed. Declarations are recognised at the start of a line (as written in this repository);
 * comment lines are skipped, so a specifier quoted in a comment is never followed.
 */
export function moduleSpecifiers(source: string, file: string): string[] {
  const out: string[] = [];
  const lines = source.split('\n');
  let i = 0;
  let inBlockComment = false;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    i++;
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true;
      continue;
    }
    if (line.startsWith('//') || line.startsWith('*')) continue;
    for (const d of line.matchAll(/\bimport\s*\(\s*([^)]*)\)/g)) {
      const lit = /^(['"])([^'"]+)\1$/.exec(d[1]!.trim());
      if (lit) out.push(lit[2]!);
      else throw new PreviewIdentityError(`${file}: a dynamic import of a non-literal (${d[1]!.trim().slice(0, 40)}) cannot be fingerprinted`);
    }
    if (!/^(?:import|export)\b/.test(line) || /^import\s*\(/.test(line)) continue;
    if (/^(?:import|export)\s+type\b/.test(line)) continue; // erased by type stripping
    if (/^export\s+(?:default|const|let|var|function|async|class|abstract|enum|interface|declare|namespace)\b/.test(line)) continue;
    // the whole statement (a multi-line named list) up to its module specifier, or its end without one
    let text = line;
    while (!/(?:\bfrom\s*|^import\s*)(['"])[^'"]+\1/.test(text) && !/;\s*$/.test(text) && i < lines.length)
      text += ` ${lines[i++]!.trim()}`;
    const m = /(?:\bfrom\s*|^import\s*)(['"])([^'"]+)\1/.exec(text);
    if (m) out.push(m[2]!);
    else if (/^import\b/.test(text)) throw new PreviewIdentityError(`${file}: cannot read the import "${text.slice(0, 80)}"`);
  }
  return out;
}

/** The nearest package.json at or above a directory. */
function nearestPackage(dir: string): { dir: string; json: Record<string, unknown> } | null {
  for (let d = dir; ; d = dirname(d)) {
    const f = join(d, 'package.json');
    if (existsSync(f)) return { dir: d, json: JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown> };
    if (dirname(d) === d) return null;
  }
}

/** A `#name` subpath import of the importer's package (package.json "imports"; a string or a condition object). */
function resolveSubpathImport(spec: string, fromFile: string): string {
  const pkg = nearestPackage(dirname(fromFile));
  const target = (pkg?.json.imports as Record<string, unknown> | undefined)?.[spec];
  const pick = (t: unknown): string | null =>
    typeof t === 'string'
      ? t
      : t && typeof t === 'object'
        ? (pick((t as Record<string, unknown>).node) ?? pick((t as Record<string, unknown>).import) ?? pick((t as Record<string, unknown>).default))
        : null;
  const rel = pick(target);
  if (!pkg || !rel) throw new PreviewIdentityError(`${fromFile}: the subpath import ${spec} is not declared by its package`);
  const file = resolve(pkg.dir, rel);
  if (!existsSync(file)) throw new PreviewIdentityError(`${fromFile}: ${spec} → ${rel} does not exist`);
  return file;
}

/** The installed directory of an npm package, found as Node does (node_modules of each ancestor directory). */
function packageDir(name: string, fromDir: string): string {
  for (let d = fromDir; ; d = dirname(d)) {
    const candidate = join(d, 'node_modules', name);
    if (existsSync(join(candidate, 'package.json'))) return candidate;
    if (dirname(d) === d) throw new PreviewIdentityError(`npm package ${name} (needed from ${fromDir}) is not installed`);
  }
}

const packageName = (spec: string) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]!);

/** Every regular file below a directory (sorted, relative), optionally without nested node_modules. */
function filesUnder(root: string, skipNodeModules: boolean): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (!(skipNodeModules && e.name === 'node_modules')) walk(p);
      } else if (e.isFile()) out.push(posix(relative(root, p)));
      else if (e.isSymbolicLink()) {
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else out.push(posix(relative(root, p)));
      }
    }
  };
  walk(root);
  return out;
}

export interface ImplementationFingerprint {
  sha256: string;
  runner: string;
  node: string;
  platform: string;
  arch: string;
  flags: readonly string[];
  env: Readonly<Record<string, string>>;
  /** Repository-relative file → sha256 (the runner's static import closure). */
  files: Record<string, string>;
  /** Installed npm package (repository-relative directory) → version and the sha256 of all its files. */
  packages: Record<string, { version: string; sha256: string; files: number }>;
}

/** The implementation fingerprint of one runner script: its static closure, packages and runtime. Fails closed. */
export function implementationFingerprint(repoRoot: string, runnerScript: string): ImplementationFingerprint {
  const files: Record<string, string> = {};
  const packages: ImplementationFingerprint['packages'] = {};
  const pending = [resolve(repoRoot, runnerScript)];
  const pendingPackages: { name: string; from: string }[] = [];
  const seen = new Set<string>();
  while (pending.length) {
    const file = pending.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!existsSync(file)) throw new PreviewIdentityError(`${posix(relative(repoRoot, file))} does not exist`);
    const rel = posix(relative(repoRoot, file));
    if (rel.startsWith('..')) throw new PreviewIdentityError(`${file} is outside the repository`);
    const text = readFileSync(file);
    files[rel] = sha256(text);
    if (!/\.(?:[cm]?[jt]s|tsx?)$/.test(file)) continue;
    for (const spec of moduleSpecifiers(text.toString('utf8'), rel)) {
      if (spec.startsWith('.')) {
        const target = resolve(dirname(file), spec);
        if (!existsSync(target) || statSync(target).isDirectory())
          throw new PreviewIdentityError(`${rel}: import ${spec} does not resolve to a file`);
        pending.push(target);
      } else if (spec.startsWith('#')) pending.push(resolveSubpathImport(spec, file));
      else if (isBuiltin(spec)) continue;
      else pendingPackages.push({ name: packageName(spec), from: dirname(file) });
    }
  }
  // npm packages: hashed whole (every file except nested node_modules), with their runtime dependencies.
  const seenPackages = new Set<string>();
  while (pendingPackages.length) {
    const { name, from } = pendingPackages.pop()!;
    const dir = packageDir(name, from);
    const rel = posix(relative(repoRoot, dir));
    if (seenPackages.has(rel)) continue;
    seenPackages.add(rel);
    const list = filesUnder(dir, true);
    const h = createHash('sha256');
    for (const f of list) h.update(`${f}\0${sha256(readFileSync(join(dir, f)))}\n`);
    const json = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
      version?: string;
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    packages[rel] = { version: String(json.version ?? ''), sha256: h.digest('hex'), files: list.length };
    for (const dep of [...Object.keys(json.dependencies ?? {}), ...Object.keys(json.optionalDependencies ?? {})]) {
      try {
        packageDir(dep, dir);
      } catch (e) {
        if (Object.hasOwn(json.optionalDependencies ?? {}, dep)) continue; // an absent optional dependency is never loaded
        throw e;
      }
      pendingPackages.push({ name: dep, from: dir });
    }
  }
  const body = {
    runner: runnerScript,
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    flags: NODE_FLAGS,
    env: RUNNER_ENV_FIXED,
    files: sortKeys(files),
    packages: sortKeys(packages)
  };
  return { sha256: sha256(canonicalJson(body)), ...body };
}

const sortKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : 1)));

// ----- data -----

export interface DataFingerprint {
  /** Per symbol: repository-relative file → sha256 of its content. */
  symbols: Record<string, Record<string, string>>;
  /** The runtime inputs (RUNTIME_INPUTS) → sha256, or null when absent. */
  inputs: Record<string, string | null>;
}

/** Content hashes of every file of each symbol's data directory and of the runtime inputs. Fails closed. */
export function dataFingerprint(repoRoot: string, symbols: readonly string[]): DataFingerprint {
  const out: DataFingerprint = { symbols: {}, inputs: {} };
  for (const symbol of symbols) {
    if (!/^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(symbol)) throw new PreviewIdentityError(`invalid symbol ${symbol}`);
    const dir = join(repoRoot, 'data', symbol);
    if (!existsSync(join(dir, 'data.csv'))) throw new PreviewIdentityError(`no local data file data/${symbol}/data.csv`);
    out.symbols[symbol] = Object.fromEntries(
      filesUnder(dir, false).map((f) => [`data/${symbol}/${f}`, sha256(readFileSync(join(dir, f)))])
    );
  }
  for (const f of RUNTIME_INPUTS) {
    const p = join(repoRoot, f);
    out.inputs[f] = existsSync(p) ? sha256(readFileSync(p)) : null;
  }
  return out;
}

// ----- the identity -----

export interface PreviewIdentity {
  schema: typeof PREVIEW_IDENTITY_SCHEMA;
  format: number;
  eventContract: number;
  strategy: { key: string; version: string; kind: string; runner: string; schemaSha256: string };
  params: PreviewConfig['params'];
  symbols: string[];
  window: { from: string; to: string };
  resolution: string;
  data: DataFingerprint;
  implementation: ImplementationFingerprint;
}

/** The identity of one canonical preview configuration (shared/preview.ts canonicalPreviewConfig). Fails closed. */
export function previewIdentity(repoRoot: string, spec: StrategySpec, config: PreviewConfig): PreviewIdentity {
  const runner = Object.hasOwn(RUNNER_SCRIPTS, spec.key) ? RUNNER_SCRIPTS[spec.key]! : null;
  if (!runner) throw new PreviewIdentityError(`no runner for strategy ${spec.key}`);
  if (config.strategyKey !== spec.key || config.strategyVersion !== spec.version)
    throw new PreviewIdentityError('the configuration and the strategy version differ');
  return {
    schema: PREVIEW_IDENTITY_SCHEMA,
    format: PREVIEW_CACHE_FORMAT,
    eventContract: EVENT_CONTRACT_VERSION,
    strategy: { key: spec.key, version: spec.version, kind: spec.kind, runner, schemaSha256: sha256(canonicalJson(schemaOf(spec))) },
    params: config.params,
    symbols: [...config.symbols],
    window: { from: config.from, to: config.to },
    resolution: config.resolution,
    data: dataFingerprint(repoRoot, config.symbols),
    implementation: implementationFingerprint(repoRoot, runner)
  };
}

/** The cache key: sha256 of the identity's canonical JSON (64 lowercase hex). */
export const identityKey = (identity: PreviewIdentity) => sha256(canonicalJson(identity));

export const PREVIEW_ID_PATTERN = /^PV-[0-9a-f]{64}$/;
export const previewIdOf = (key: string) => `PV-${key}`;
export const keyOfPreviewId = (id: string) => (PREVIEW_ID_PATTERN.test(id) ? id.slice(3) : null);

/** What differs between two identities (for messages: why a cached entry or a saved preview no longer matches). */
export function identityDifferences(a: PreviewIdentity, b: PreviewIdentity): string[] {
  const out: string[] = [];
  const cmp = (label: string, x: unknown, y: unknown) => {
    if (canonicalJson(x) !== canonicalJson(y)) out.push(label);
  };
  cmp('cache format', [a.schema, a.format, a.eventContract], [b.schema, b.format, b.eventContract]);
  cmp('strategy', a.strategy, b.strategy);
  cmp('parameters', a.params, b.params);
  cmp('symbols', a.symbols, b.symbols);
  cmp('date range', a.window, b.window);
  cmp('resolution', a.resolution, b.resolution);
  for (const s of new Set([...Object.keys(a.data.symbols), ...Object.keys(b.data.symbols)]))
    cmp(`market data of ${s}`, a.data.symbols[s], b.data.symbols[s]);
  for (const f of new Set([...Object.keys(a.data.inputs), ...Object.keys(b.data.inputs)]))
    cmp(`input ${f}`, a.data.inputs[f], b.data.inputs[f]);
  const fa = a.implementation.files;
  const fb = b.implementation.files;
  for (const f of [...new Set([...Object.keys(fa), ...Object.keys(fb)])].sort()) cmp(`code ${f}`, fa[f], fb[f]);
  for (const p of new Set([...Object.keys(a.implementation.packages), ...Object.keys(b.implementation.packages)]))
    cmp(`package ${p}`, a.implementation.packages[p], b.implementation.packages[p]);
  cmp('Node runtime', [a.implementation.node, a.implementation.platform, a.implementation.arch], [b.implementation.node, b.implementation.platform, b.implementation.arch]);
  cmp('runner flags', [a.implementation.flags, a.implementation.env, a.implementation.runner], [b.implementation.flags, b.implementation.env, b.implementation.runner]);
  if (out.length === 0 && canonicalJson(a) !== canonicalJson(b)) out.push('identity');
  return out;
}
