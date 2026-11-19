// The frozen-phenotype export contract (`strategy-lab.phenotype-export`, version 1): what a Claude/CLI study emits for
// the phenotypes it SELECTED, and what Strategy Lab imports into its read-only catalogue (importers/phenotypes.ts).
// Pure types and validation, shared by the importer, the server and the tests. Documented in
// docs/strategy-lab/PHENOTYPES.md.
//
// An export is a directory with:
//   phenotypes.json   a PhenotypeExport (below)
//   MANIFEST.json     { schema: 'strategy-lab.phenotype-export-manifest', schemaVersion: 1, files: { name: sha256 } }
// Each phenotype carries `recordSha256` = sha256 of its canonical JSON without that field (sorted keys, no spaces).

import type { ParamValue, Resolution } from './contract.ts';

export const PHENOTYPE_EXPORT_SCHEMA = 'strategy-lab.phenotype-export';
export const PHENOTYPE_MANIFEST_SCHEMA = 'strategy-lab.phenotype-export-manifest';
export const PHENOTYPE_EXPORT_VERSION = 1;

export type ExecutionKind = 'standalone' | 'independent-symbol batch' | 'shared-slot pool';
export const EXECUTION_KINDS: readonly ExecutionKind[] = ['standalone', 'independent-symbol batch', 'shared-slot pool'];

export interface PhenotypeRecord {
  /** Stable key, unique across all studies (e.g. "growth-demo-2026-11/off-vgt-1d"); never reused for other content. */
  id: string;
  /** The record's own version (a changed configuration is a new id or a new version). */
  version: number;
  name: string;
  /** The study's role for it (profit, robust, balanced, extra, demonstration, …) and its rank, if any. */
  role: string | null;
  rank: number | null;
  strategy: { key: string; version: string };
  executionKind: ExecutionKind;
  /** The symbols it was selected for (a pool: its books). */
  symbols: string[];
  /** Form strategies: the EFFECTIVE parameter values (inactive dimensions absent) and the bar resolution. */
  params?: Record<string, ParamValue>;
  resolution?: Resolution;
  /** Shared-slot pools: the sealed configuration the registered pool runner executes. */
  pool?: {
    runner: 'study8';
    alias: string;
    sealedId: string;
    config: { file: string; sha256: string };
    books: Record<string, Record<string, number>>;
    fixedStart: string;
  };
  engine: { version: string; commit: string | null; files?: Record<string, string> };
  execution: {
    notionalUsd: number;
    annualInterestRate: number;
    costBpsPerSide: number;
    stopFill: string;
    capital: string;
  };
  data: {
    /** The windows the study used, and which dates are already exposed (inspected) — a rerun is never a holdout. */
    selectionWindow: { from: string; to: string } | null;
    testWindows: { label: string; from: string; to: string }[];
    exposure: string;
    datasetSha256?: Record<string, string>;
  };
  selection: { method: string; metrics?: Record<string, number | string | null> };
  notes?: string;
  recordSha256: string;
}

export interface PhenotypeExport {
  schema: typeof PHENOTYPE_EXPORT_SCHEMA;
  schemaVersion: typeof PHENOTYPE_EXPORT_VERSION;
  study: {
    id: string;
    title: string;
    kind: 'optimisation' | 'sealed-study-selection' | 'demonstration';
    protocol?: { path: string; sha256: string };
    methodology?: string;
    sealedRecords?: { path: string; sha256: string }[];
    dataExposure: string;
  };
  generatedAt: string;
  generator: { tool: string; commit: string | null };
  /** ONLY the selected phenotypes: an import promotes exactly these into the runnable catalogue. */
  phenotypes: PhenotypeRecord[];
  /** Optional read-only trial history for inspection (never runnable). */
  trials?: { key: string; params: Record<string, unknown>; metrics: Record<string, unknown>; role: string | null; rank: number | null }[];
}

/** Canonical JSON: object keys sorted at every level, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value)
    .sort()
    .filter((k) => (value as Record<string, unknown>)[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson((value as Record<string, unknown>)[k])}`)
    .join(',')}}`;
}

export const recordBody = (r: PhenotypeRecord): Omit<PhenotypeRecord, 'recordSha256'> =>
  Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'recordSha256')) as Omit<PhenotypeRecord, 'recordSha256'>;

const ID = /^[a-z0-9][a-z0-9._/-]{2,120}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Structural checks of an export (hashes, the registry and the parameter values are checked by the importer). */
export function exportShapeErrors(x: unknown): string[] {
  const errors: string[] = [];
  if (typeof x !== 'object' || x === null) return ['phenotypes.json: not an object'];
  const e = x as Partial<PhenotypeExport>;
  if (e.schema !== PHENOTYPE_EXPORT_SCHEMA) errors.push(`schema: expected ${PHENOTYPE_EXPORT_SCHEMA}`);
  if (e.schemaVersion !== PHENOTYPE_EXPORT_VERSION) errors.push(`schemaVersion: expected ${PHENOTYPE_EXPORT_VERSION}`);
  if (!e.study || typeof e.study.id !== 'string' || !ID.test(e.study.id)) errors.push('study.id: a stable lower-case id');
  if (!e.study || !['optimisation', 'sealed-study-selection', 'demonstration'].includes(String(e.study.kind)))
    errors.push('study.kind: optimisation | sealed-study-selection | demonstration');
  if (!e.study || typeof e.study.dataExposure !== 'string' || !e.study.dataExposure)
    errors.push('study.dataExposure: required (which dates the study had inspected)');
  if (!Array.isArray(e.phenotypes) || e.phenotypes.length === 0) errors.push('phenotypes: at least one selected phenotype');
  const seen = new Set<string>();
  for (const [i, p] of (e.phenotypes ?? []).entries()) {
    const at = `phenotypes[${i}]`;
    if (!p || typeof p.id !== 'string' || !ID.test(p.id)) errors.push(`${at}.id: a stable lower-case id`);
    else if (seen.has(p.id)) errors.push(`${at}.id: duplicate ${p.id}`);
    else seen.add(p.id);
    if (!Number.isInteger(p?.version) || p.version < 1) errors.push(`${at}.version: integer ≥ 1`);
    if (typeof p?.name !== 'string' || !p.name) errors.push(`${at}.name: required`);
    if (!p?.strategy || typeof p.strategy.key !== 'string' || typeof p.strategy.version !== 'string')
      errors.push(`${at}.strategy: { key, version }`);
    if (!EXECUTION_KINDS.includes(p?.executionKind)) errors.push(`${at}.executionKind: ${EXECUTION_KINDS.join(' | ')}`);
    if (!Array.isArray(p?.symbols) || p.symbols.length === 0 || p.symbols.some((s) => !/^[A-Z0-9][A-Z0-9.-]{0,9}$/.test(s)))
      errors.push(`${at}.symbols: one or more symbols`);
    if (p?.executionKind === 'shared-slot pool' && !p.pool) errors.push(`${at}.pool: required for a shared-slot pool`);
    if (p?.executionKind !== 'shared-slot pool' && (!p?.params || !p.resolution))
      errors.push(`${at}.params and .resolution: required for a standalone strategy`);
    if (p?.executionKind === 'standalone' && p.symbols?.length !== 1) errors.push(`${at}: standalone = exactly one symbol`);
    if (p?.executionKind === 'independent-symbol batch' && !(p.symbols?.length > 1))
      errors.push(`${at}: an independent-symbol batch has several symbols`);
    if (!p?.engine || typeof p.engine.version !== 'string') errors.push(`${at}.engine.version: required`);
    if (!p?.data || typeof p.data.exposure !== 'string') errors.push(`${at}.data.exposure: required`);
    for (const w of [p?.data?.selectionWindow, ...(p?.data?.testWindows ?? [])])
      if (w && !(DATE.test(w.from) && DATE.test(w.to) && w.from <= w.to)) errors.push(`${at}.data: windows as YYYY-MM-DD`);
    if (typeof p?.recordSha256 !== 'string' || !/^[0-9a-f]{64}$/.test(p.recordSha256))
      errors.push(`${at}.recordSha256: sha256 of the canonical record`);
  }
  return errors;
}
