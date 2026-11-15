// Shared readers of the study's sealed records for the report-only diagnostics and tables (PROTOCOL.md §13, §15).
// Post-freeze tooling outside the decision code (`src/vg-l0-full-joint/`): nothing here is a selection input, and nothing
// writes into a stage's sealed record. Run from the repository root. For an engineering dry test on the pilot's outputs
// set VGL0FJ_TOOLS_DIR=<pilot outDir> and VGL0FJ_TOOLS_CUTS=P18 (diagnostics are then written unsealed into that dir).
import fs from 'node:fs';
import path from 'node:path';
import { frozenSelectionFile, resultsDir } from '../../src/vg-l0-full-joint/context.ts';
import type { Evidence } from '../../src/vg-l0-full-joint/qualify.ts';
import type { LaneResult } from '../../src/vg-l0-full-joint/search.ts';
import { readJson, sealJson } from '../../src/vg-l0-full-joint/records.ts';
import type { PopulationName, SelectorName } from '../../src/vg-l0-full-joint/select.ts';
import type { Cfg } from '../../src/vg-l0-full-joint/space.ts';

export const baseDir = process.env.VGL0FJ_TOOLS_DIR ?? resultsDir;
export const isStudy = baseDir === resultsDir;
export const cutoffKeys = (process.env.VGL0FJ_TOOLS_CUTS ?? 'C19,C21,C23,C24').split(',');
export const finalKey = cutoffKeys.at(-1)!;
export const foldKeys = cutoffKeys.filter((c) => c !== 'C24' && c !== 'P18').concat(cutoffKeys.includes('P18') ? ['P18'] : []);
export const cutoffEnd: Record<string, string> = { C19: '2019-12-31', C21: '2021-12-31', C23: '2023-12-29', C24: '2024-12-31', P18: '2018-12-31' };
export const nextDoor: Record<string, 'D21' | 'D23' | 'D24' | 'D19'> = { C19: 'D21', C21: 'D23', C23: 'D24', P18: 'D19' };

const f = (...p: string[]) => path.join(baseDir, ...p);
export const exists = (...p: string[]) => fs.existsSync(f(...p));
export const frozenFile = isStudy ? frozenSelectionFile : f('FROZEN_SELECTION.json');

export interface SearchRecord {
  lanes: LaneResult[];
  compute: { unique: number; fresh: number; freshAllRuns: number; archiveHits: number; wallSeconds: number; workerSeconds: number; priorRuns: string[]; tallies: Record<string, { fresh: number; hits: number; ms: number }> };
  minutes: number;
  cap: number | null;
  perLaneCap: number;
  lanesCount: number;
  extensionRounds: { round: number; decision: string }[];
  peaks: { cgroup: number; rss: number };
  budget: Record<string, number>;
  track: 'I' | 'N';
}
export const searchParts = (cut: string): string[] =>
  ['broad1', 'broad2', 'refine', 'informed1', 'informed2', 'pilot', 'pilot-informed'].filter((p) => exists('search', cut, `${p}.json`));
export const searchRecord = (cut: string, part: string) => readJson<SearchRecord>(f('search', cut, `${part}.json`));
export type QStage = 'broad' | 'refine' | 'informed';
export const qualification = (cut: string, stage: QStage) =>
  readJson<{ evidence: Evidence[]; members: number; evaluatedMembers: number; copiedEvidence: number; qualified: number; duplicates: { label: string; sameAs: string }[]; byCell: Record<string, { members: number; qualified: number; failed: Record<string, number> }>; compute: { unique: number; fresh: number; archiveHits: number; wallSeconds: number } }>(
    f('folds', cut, `${stage}-qualification.json`)
  );
export const refinePlan = (cut: string) => readJson<{ cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[]; eligible: number; skipped: unknown[] }>(f('folds', cut, 'refine-plan.json'));
export interface Selection {
  primaries: Record<PopulationName, Record<SelectorName, string | null>>;
  rankings: Record<PopulationName, Record<SelectorName, ReturnType<typeof import('../../src/vg-l0-full-joint/select.ts').selectionSummary>[]>>;
  roles: Record<PopulationName, { roles: Record<string, string | null>; pareto: string[]; qualified: number; members: number }>;
  subjects: Record<string, Evidence>;
  control: Evidence | null;
  counts: Record<PopulationName, { members: number; qualified: number }>;
}
export const selection = (cut: string) => readJson<Selection>(f('folds', cut, 'selection.json'));
export interface FoldRow {
  label: string;
  roles: string[];
  cell: string;
  id: string;
  cfg: Cfg;
  sliceNet: number;
  sliceDd: number;
  boundaryEquity: number;
  wholeNet: number;
  wholeDd: number;
  openAtBoundary: string[];
  openAtEnd: string[];
  giveBack: Record<string, unknown> | null;
  nextSlice: Record<string, unknown>;
  years: Record<string, number>;
}
export interface NextNb {
  draws: number;
  breaches: number;
  breachShare: number;
  wilson95: number[];
  medianSliceDd: number;
  worstSliceDd: number;
  trainingBreachShare: number;
}
export const foldEvaluation = (cut: string) =>
  readJson<{ rows: FoldRow[]; primaries: Record<PopulationName, Record<SelectorName, string | null>>; nextSliceNeighbourhoods: { rows: Record<string, NextNb>; compute: Record<string, number> }; slice: [string, string] }>(f('folds', cut, 'evaluation.json'));
export interface SeqPath {
  name: string;
  parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[];
  net: number;
  netBeforeCharges: number;
  charges: number;
  sequentialDd: number;
  ddPeak: string;
  ddTrough: string;
  withinCeiling: boolean;
}
export const sequential = () =>
  readJson<{ procedures: { population: PopulationName; selector: SelectorName; verdict: string; supported: boolean; path: SeqPath }[]; descriptive: SeqPath[] }>(f('folds', 'sequential.json'));
export const frozenSelection = () =>
  readJson<{
    finalists: { label: string; cfg: Cfg; why: string[]; track: string; centreNet: number; centreDd: number }[];
    newL0: { cfg: Cfg; centreNet: number; centreDd: number };
    procedures: { population: PopulationName; selector: SelectorName; primary: string | null; status: string; verdict: string; independence: string; frontierVsNewL0: Record<string, number | boolean> | null; strongerRisk: Record<string, boolean> | null }[];
  }>(frozenFile);
export const validation = () =>
  readJson<{
    newL0: Record<string, unknown>;
    rows: { label: string; cell: string; net: number; dd: number; lots: number; developmentNet: number; validationPnl: number; resetValidationDd: number; V1: boolean; V2: boolean; V3: boolean; stresses: Record<string, { net: number; dd: number; validationPnl: number; resetValidationDd: number }> }[];
    successor: { population: PopulationName; selector: SelectorName; primary: string | null; finalStatus: string }[];
    qualifyingSuccessors: string[];
  }>(f('validation', 'validation.json'));

// every member of a cutoff (broad, refinement and, at the final cutoff, informed), de-duplicated by label
export const allEvidence = (cut: string) => {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const stage of ['broad', 'refine', 'informed'] as const) {
    if (!exists('folds', cut, `${stage}-qualification.json`)) continue;
    for (const e of qualification(cut, stage).evidence)
      if (!seen.has(e.label)) {
        seen.add(e.label);
        out.push(e);
      }
  }
  return out;
};

export const writeDiagnostic = (name: string, value: unknown) => {
  const file = f('diagnostics', `${name}.json`);

  if (fs.existsSync(file)) throw new Error(`${name}: the diagnostic exists`);
  if (isStudy) return sealJson(file, value, `diagnostics ${name}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
  return 'unsealed (engineering dry test)';
};
export const readDiagnostic = <T>(name: string) => readJson<T>(f('diagnostics', `${name}.json`));
export const diagnosticExists = (name: string) => exists('diagnostics', `${name}.json`);

export const r2 = (x: number) => Math.round(x * 100) / 100;
export const usd = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x)
    ? '—'
    : `${x < 0 ? '−' : ''}$${Math.abs(x).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${(100 * x).toFixed(d)}%`);
