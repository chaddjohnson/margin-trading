// Shared readers of the study's sealed records for the report-only diagnostics and tables (PROTOCOL.md §13, §15).
// Post-freeze tooling: nothing here is a selection input, and nothing writes into a stage's sealed record. Run from the
// repository root.
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir } from '../../src/vg-l0-risk-families/context.ts';
import type { Evidence } from '../../src/vg-l0-risk-families/qualify.ts';
import type { LaneResult } from '../../src/vg-l0-risk-families/search.ts';
import { readJson, sealJson } from '../../src/vg-l0-risk-families/records.ts';
import type { PopulationName, SelectorName } from '../../src/vg-l0-risk-families/select.ts';

export const cutoffKeys = ['C19', 'C21', 'C23', 'C24'] as const;
export const foldKeys = ['C19', 'C21', 'C23'] as const;
export type CutoffKey = (typeof cutoffKeys)[number];

const f = (...p: string[]) => path.join(resultsDir, ...p);
export const exists = (...p: string[]) => fs.existsSync(f(...p));

export const searchRecord = (cut: string, part: string) =>
  readJson<{ lanes: LaneResult[]; compute: { unique: number; fresh: number; archiveHits: number; wallSeconds: number; tallies: Record<string, { fresh: number; hits: number }> }; minutes: number; cap: number | null; extensionRounds: unknown[]; peaks: { cgroup: number; rss: number } }>(f('search', cut, `${part}.json`));
export const qualification = (cut: string, stage: 'broad' | 'refine') =>
  readJson<{ evidence: Evidence[]; members: number; qualified: number; duplicates: unknown[]; byCell: Record<string, { members: number; qualified: number; failed: Record<string, number> }>; compute: { unique: number; fresh: number } }>(f('folds', cut, `${stage}-qualification.json`));
export const refinePlan = (cut: string) => readJson<{ cells: { cell: string; why: string[]; seeds: string[]; focus: string[] }[]; eligible: number; skipped: unknown[] }>(f('folds', cut, 'refine-plan.json'));
export const selection = (cut: string) =>
  readJson<{
    primaries: Record<PopulationName, Record<SelectorName, string | null>>;
    rankings: Record<PopulationName, Record<SelectorName, unknown[]>>;
    roles: Record<PopulationName, { roles: Record<string, string | null>; pareto: string[]; qualified: number; members: number }>;
    subjects: Record<string, Evidence>;
    control: Evidence | null;
    counts: Record<PopulationName, { members: number; qualified: number }>;
  }>(f('folds', cut, 'selection.json'));
export const foldEvaluation = (cut: string) =>
  readJson<{ rows: FoldRow[]; primaries: Record<PopulationName, Record<SelectorName, string | null>>; nextSliceNeighbourhoods: { rows: Record<string, NextNb> }; slice: [string, string] }>(f('folds', cut, 'evaluation.json'));
export const sequential = () =>
  readJson<{ procedures: { population: PopulationName; selector: SelectorName; verdict: string; supported: boolean; path: SeqPath }[]; descriptive: SeqPath[] }>(f('folds', 'sequential.json'));

export interface FoldRow {
  label: string;
  roles: string[];
  cell: string;
  id: string;
  sliceNet: number;
  sliceDd: number;
  wholeNet: number;
  wholeDd: number;
  openAtBoundary: string[];
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
export interface SeqPath {
  name: string;
  parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[];
  net: number;
  sequentialDd: number;
  ddPeak: string;
  ddTrough: string;
  withinCeiling: boolean;
}

// every qualified (and unqualified) member of a cutoff, broad and refinement, de-duplicated by identity
export const allEvidence = (cut: string) => {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const stage of ['broad', 'refine'] as const) {
    if (!exists('folds', cut, `${stage}-qualification.json`)) continue;
    for (const e of qualification(cut, stage).evidence)
      if (!seen.has(e.id)) {
        seen.add(e.id);
        out.push(e);
      }
  }
  return out;
};

export const writeDiagnostic = (name: string, value: unknown) => {
  const file = f('diagnostics', `${name}.json`);

  if (fs.existsSync(file)) throw new Error(`${name}: sealed diagnostic exists`);
  return sealJson(file, value, `diagnostics ${name}`);
};

export const r2 = (x: number) => Math.round(x * 100) / 100;
