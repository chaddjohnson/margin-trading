// P5-NS's data doors (PROTOCOL.md §3, §11) — opened only through these guards and logged in the study's own
// results/doors.jsonl (src/gpu-backend/doors.ts openStudyDoor: Priority 3's verified byte-prefix doors D19–D24 and its
// FULL door behind Priority 3's technical guard). The fold order is strict, C19 → C21 → C23 → C24:
//   D19  C19 training; engineering at any time (the pilot, the reproduction gates)
//   D21  C19's next slice 2020-01-02 → 2021-12-31: only after selection/C19.json is sealed AND committed;
//        C21's training door: only after slices/C19.json is sealed AND committed
//   D23  C21's next slice 2022-01-03 → 2023-12-29: only after selection/C21.json; C23's training door: after slices/C21.json
//   D24  C23's next slice 2024-01-02 → 2024-12-31: only after selection/C23.json; C24's training door: after
//        slices/C23.json AND sequential.json are sealed AND committed
//   FULL C24's next slice 2025-01-02 → 2026-10-30 (previously examined validation history): only after selection/C24.json,
//        FROZEN_SELECTION.json and doors/FULL-authorization.json are sealed AND committed; the one official validation
//        job opens it ONCE; afterwards only report-only diagnostics of the same frozen subjects may read it.
//   Engineering before the protocol freeze: D19–D24 (pilot, benchmark, reproduction and parity gates) and FULL for the
//   known-target reproduction of the frozen references New L0 and N/original ONLY (equality output; adaptation AD5).
import fs from 'node:fs';
import path from 'node:path';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type StudyDoor, openStudyDoor } from '../gpu-backend/doors.ts';
import { type CutoffKey, STUDY_ID, doorLog, freezeFile, researchDir, resultsDir } from './context.ts';
import { isCommitted, isSealed, rel } from './records.ts';

export const selectionFile = (cut: CutoffKey) => path.join(resultsDir, 'selection', `${cut}.json`);
export const sliceFile = (cut: CutoffKey) =>
  cut === 'C24' ? path.join(resultsDir, 'validation', 'validation.json') : path.join(resultsDir, 'slices', `${cut}.json`);
export const sequentialFile = path.join(resultsDir, 'sequential.json');
export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');
export const fullAuthorizationFile = path.join(resultsDir, 'doors', 'FULL-authorization.json');

export type DoorUse = 'training' | 'slice' | 'validation' | 'engineering' | 'diagnostic';

export const doorOpenings = () =>
  fs.existsSync(doorLog)
    ? fs
        .readFileSync(doorLog, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((l) => JSON.parse(l) as { t: string; door: string; purpose: string })
    : [];

// the record state the guard reads (injectable for tests/doors.test.ts)
export interface DoorState {
  exists: (file: string) => boolean;
  sealed: (file: string) => boolean;
  committed: (file: string) => boolean;
}
export const fsState: DoorState = { exists: (f) => fs.existsSync(f), sealed: (f) => isSealed(f), committed: (f) => isCommitted(f) };

const trainingPrereq: Record<StudyDoor, CutoffKey | null> = { D19: null, D21: 'C19', D23: 'C21', D24: 'C23', FULL: null };
const sliceOf: Partial<Record<StudyDoor, CutoffKey>> = { D21: 'C19', D23: 'C21', D24: 'C23' };

// the guard of every opening
export const doorGuard = (name: StudyDoor, use: DoorUse, purpose: string, st: DoorState = fsState) => {
  const sealedCommitted = (file: string) => st.sealed(file) && st.committed(file);
  const require_ = (file: string, why: string) => {
    if (!st.sealed(file)) throw new Error(`${why}: ${rel(file)} is not sealed`);
    if (!st.committed(file)) throw new Error(`${why}: ${rel(file)} is not committed unchanged`);
  };

  if (!purpose) throw new Error('a door opening needs its purpose');
  if (use === 'engineering') {
    if (name === 'D19') return;
    if (st.exists(freezeFile)) throw new Error(`engineering reads ${name} only before the protocol freeze`);
    if (name === 'FULL' && !/^known-target reproduction of (New L0|N\/original)/.test(purpose))
      throw new Error('before the freeze FULL is read only for the known-target reproduction of New L0 and N/original');
    return;
  }
  if (use === 'training') {
    if (name === 'FULL') throw new Error('FULL is never a training door');
    const prev = trainingPrereq[name];

    if (prev) require_(sliceFile(prev), `${name} (training)`);
    if (name === 'D24') require_(sequentialFile, 'D24 (C24 training)');
    return;
  }
  if (use === 'slice') {
    const cut = sliceOf[name];

    if (!cut) throw new Error(`${name} is not a slice door`);
    require_(selectionFile(cut), `${name} (${cut} next slice)`);
    if (st.exists(sliceFile(cut))) throw new Error(`${name}: the ${cut} slice record is sealed; the official slice evaluation is not repeated`);
    return;
  }
  if (use === 'validation') {
    if (name !== 'FULL') throw new Error('the validation reads FULL');
    require_(selectionFile('C24'), 'FULL (C24 next slice)');
    require_(frozenSelectionFile, 'FULL (C24 next slice)');
    require_(fullAuthorizationFile, 'FULL (C24 next slice)');
    if (st.exists(sliceFile('C24'))) throw new Error('FULL: the validation is sealed; it is opened once');
    return;
  }
  // report-only diagnostics of frozen subjects: a door only after the sealed, committed record that last opened it
  if (name === 'FULL') {
    if (!sealedCommitted(sliceFile('C24'))) throw new Error('FULL: diagnostics read it only after the sealed, committed validation');
  } else {
    const cut = sliceOf[name];

    if (cut && !sealedCommitted(sliceFile(cut))) throw new Error(`${name}: diagnostics only after the sealed ${cut} slice record`);
  }
};

export const openP5Door = async (name: StudyDoor, use: DoorUse, purpose: string): Promise<Door> => {
  doorGuard(name, use, purpose);
  return openStudyDoor(STUDY_ID, name, `${use}: ${purpose}`);
};
