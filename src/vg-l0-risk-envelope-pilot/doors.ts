// The pilot's data doors (PROTOCOL.md §11) — opened only through these guards and logged in the pilot's own
// results/doors.jsonl (src/gpu-backend/doors.ts openStudyDoor: Priority 3's verified byte-prefix doors D19–D24 and its
// FULL door behind Priority 3's technical guard):
//   D21  the C21 training door (C21 search and qualification);
//   D24  the C24 training door (C24 search and qualification);
//   D23  C21's next interval 2022-01-03 → 2023-12-29 — only after the C21 selection is sealed AND committed;
//   FULL C24's next interval 2025-01-02 → 2026-10-30 — only after the C24 selection and the frozen-selection manifest are
//        sealed and committed AND the door authorization record is sealed and committed; the one official validation job
//        opens it (a second validation job is refused by its job identity; an interrupted one resumes the same job);
//        after its sealed record, nonbinding CPU diagnostics of the same frozen subjects may read it (each opening logged);
//   D19  engineering only (the fixed-seed mini-pilot, gate E3) — never a pilot research evaluation.
import fs from 'node:fs';
import path from 'node:path';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type StudyDoor, openStudyDoor } from '../gpu-backend/doors.ts';
import { STUDY_ID, doorLog, resultsDir } from './context.ts';
import { assertCommitted, isSealed } from './records.ts';

export const selectionFile = (cut: 'C21' | 'C24') => path.join(resultsDir, 'selection', `${cut}.json`);
export const frozenSelectionFile = path.join(resultsDir, '..', 'FROZEN_SELECTION.json');
export const fullAuthorizationFile = path.join(resultsDir, 'doors', 'FULL-authorization.json');
export const validationFile = path.join(resultsDir, 'slices', 'C24-validation.json');

export const doorOpenings = () =>
  fs.existsSync(doorLog)
    ? fs
        .readFileSync(doorLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { t: string; door: string; purpose: string })
    : [];

const requireSealedCommitted = (file: string, why: string) => {
  if (!isSealed(file)) throw new Error(`${why}: ${path.basename(file)} is not sealed`);
  assertCommitted(file);
};

export const doorGuard = (name: StudyDoor, purpose: string, o: { validation?: boolean } = {}) => {
  if (name === 'D23') requireSealedCommitted(selectionFile('C21'), 'D23 (C21 next interval)');
  if (name === 'FULL') {
    requireSealedCommitted(selectionFile('C24'), 'FULL (C24 next interval)');
    requireSealedCommitted(frozenSelectionFile, 'FULL (C24 next interval)');
    requireSealedCommitted(fullAuthorizationFile, 'FULL (C24 next interval)');
    // once: the single validation job (job C24-validation; a second new job is refused by its identity, JOB_EXISTS; an
    // interrupted run resumes the SAME job) until its record is sealed; afterwards only diagnostics of the frozen subjects
    if (o.validation && fs.existsSync(validationFile)) throw new Error('FULL: the validation is sealed; it is opened once');
    if (!o.validation && !isSealed(validationFile)) throw new Error('FULL: diagnostics read it only after the sealed validation');
  }
  if (!purpose) throw new Error('a door opening needs its purpose');
};

export const openPilotDoor = async (name: StudyDoor, purpose: string, o: { validation?: boolean } = {}): Promise<Door> => {
  doorGuard(name, purpose, o);
  return openStudyDoor(STUDY_ID, name, purpose);
};
