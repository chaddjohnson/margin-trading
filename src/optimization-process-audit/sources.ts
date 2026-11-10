// The two audit subjects' sources (PROTOCOL.md §1, §4): their sealed records, seal logs, job archives and evaluation
// digests. Everything here is READ-ONLY: nothing is ever written into a subject's research or cache directory.
import fs from 'node:fs';
import path from 'node:path';
import { codeDigest as digest3B } from '../vg-d1-growth-expanded/lab.ts';
import { codeDigest as digest4A } from '../gdx-growth-standalone/lab.ts';
import { type Cut, repoRoot } from './context.ts';
import { readJson, rel, sha256File } from './records.ts';

export type SubjectKey = '3B' | '4A';
export const subjectKeys: SubjectKey[] = ['3B', '4A'];

export interface SubjectSource {
  key: SubjectKey;
  study: string;
  title: string;
  researchDir: string;
  resultsDir: string;
  jobsDir: string;
  foldsCacheDir: string;
  searchJob: (cut: Cut) => string;
  searchRecord: (cut: Cut) => string;
  qualifyJob: (cut: Cut) => string;
  selectionRecord: (cut: Cut) => string;
  evaluationRecord: (cut: Cut) => string;
  sequentialRecord: string;
  frozenSelection: string;
  validationRecord: string;
  verifyCommand: string;
  evaluationDigest: () => string;
}

const make = (
  key: SubjectKey,
  study: string,
  title: string,
  arm: string,
  verifyCommand: string,
  evaluationDigest: () => string
): SubjectSource => {
  const researchDir = path.join(repoRoot, 'research', study);
  const resultsDir = path.join(researchDir, 'results');
  const jobsDir = path.join(repoRoot, '.cache', study, 'jobs');

  return {
    key,
    study,
    title,
    researchDir,
    resultsDir,
    jobsDir,
    foldsCacheDir: path.join(repoRoot, '.cache', study, 'folds', 'study'),
    searchJob: (cut) => path.join(jobsDir, `search-${cut}-${arm}`, 'archive.sqlite'),
    searchRecord: (cut) => path.join(resultsDir, 'search', cut, `${arm}.json`),
    qualifyJob: (cut) => path.join(jobsDir, `qualify-${cut}`, 'archive.sqlite'),
    selectionRecord: (cut) => path.join(resultsDir, 'folds', cut, 'selection.json'),
    evaluationRecord: (cut) => path.join(resultsDir, 'folds', cut, 'evaluation.json'),
    sequentialRecord: path.join(resultsDir, 'folds', 'sequential.json'),
    frozenSelection: path.join(researchDir, 'FROZEN_SELECTION.json'),
    validationRecord: path.join(resultsDir, 'validation', 'validation.json'),
    verifyCommand,
    evaluationDigest
  };
};

export const sources: Record<SubjectKey, SubjectSource> = {
  '3B': make(
    '3B',
    'vg-d1-growth-expanded',
    'Priority 3B: VG #2 D1 books + Growth (V/G/B) in one shared $100,000 slot',
    'indep',
    'npm run vg-exp -- verify',
    digest3B
  ),
  '4A': make(
    '4A',
    'gdx-growth-standalone',
    'Priority 4A: standalone GDX Growth on one fixed $100,000 budget',
    'independent',
    'npm run gdxg -- verify',
    digest4A
  )
};

// The subject's seal log, re-verified (every sealed file re-hashes to its logged sha256 and is read-only).
export const subjectSeals = (s: SubjectSource) => {
  const log = path.join(s.resultsDir, 'seals.jsonl');
  const lines = fs
    .readFileSync(log, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l) as { stage: string; file: string; sha256: string });

  return {
    log: rel(log),
    logSha256: sha256File(log),
    records: lines.map((x) => {
      const f = path.join(repoRoot, x.file);
      const actual = fs.existsSync(f) ? sha256File(f) : null;

      return { stage: x.stage, file: x.file, sha256: x.sha256, verified: actual === x.sha256 };
    })
  };
};

export const readSelection = <T>(s: SubjectSource, cut: Cut) => readJson<T>(s.selectionRecord(cut));
