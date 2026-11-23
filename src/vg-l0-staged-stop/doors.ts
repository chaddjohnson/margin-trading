// Priority 4's data doors (PROTOCOL.md §9) — opened only through these guards and logged in the study's own
// results/doors.jsonl (src/gpu-backend/doors.ts openStudyDoor: Priority 3's verified byte-prefix doors D19–D24 and its FULL
// door behind Priority 3's technical guard). Stage B's rules (src/vg-l0-risk-envelope-stage-b/doors.ts) plus one
// pre-registered use, the fixed-parameter ablations (Stage A) on the development door D24 between the protocol freeze and
// the first search. The fold order is strict, C19 → C21 → C24:
//   D19  C19 training (search, qualification); engineering before the freeze (benchmark seeds only)
//   D21  C19's next interval 2020-01-02 → 2021-12-31: after selection/C19.json is sealed AND committed;
//        C21's training door: after the C19 interval record is sealed AND committed
//   D23  C21's next interval 2022-01-03 → 2023-12-29: after selection/C21.json is sealed AND committed
//   D24  the ablations: after the sealed, committed freeze and before any search record; C24 training: after the C21
//        interval record is sealed AND committed; engineering before the freeze (benchmark seeds only)
//   FULL C24's next interval 2025-01-02 → 2026-10-30 and the frozen comparisons: after selection/C24.json,
//        FROZEN_SELECTION.json and doors/FULL-authorization.json are sealed AND committed; the one official validation job
//        opens it ONCE; afterwards only report-only CPU diagnostics of the same frozen subjects may read it
import fs from 'node:fs';
import path from 'node:path';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type StudyDoor, openStudyDoor } from '../gpu-backend/doors.ts';
import { type CutoffKey, STUDY_ID, freezeFile, resultsDir } from './context.ts';
import { isCommitted, isSealed, rel } from './records.ts';

export const selectionFile = (cut: CutoffKey) => path.join(resultsDir, 'selection', `${cut}.json`);
export const intervalFile = (cut: CutoffKey) => path.join(resultsDir, 'intervals', `${cut}.json`);
export const searchFile = (cut: CutoffKey) => path.join(resultsDir, 'search', `${cut}.json`);
export const frozenSelectionFile = path.join(resultsDir, '..', 'FROZEN_SELECTION.json');
export const fullAuthorizationFile = path.join(resultsDir, 'doors', 'FULL-authorization.json');
export const ablationFile = path.join(resultsDir, 'ablation', 'ablation.json');

export type DoorUse = 'training' | 'interval' | 'validation' | 'ablation' | 'engineering' | 'diagnostic';

export interface DoorState {
  exists: (file: string) => boolean;
  sealed: (file: string) => boolean;
  committed: (file: string) => boolean;
}
export const fsState: DoorState = {
  exists: (f) => fs.existsSync(f),
  sealed: (f) => isSealed(f),
  committed: (f) => isCommitted(f)
};

export const doorGuard = (name: StudyDoor, use: DoorUse, purpose: string, st: DoorState = fsState) => {
  const sealedCommitted = (file: string) => st.sealed(file) && st.committed(file);
  const require_ = (file: string, why: string) => {
    if (!st.sealed(file)) throw new Error(`${why}: ${rel(file)} is not sealed`);
    if (!st.committed(file)) throw new Error(`${why}: ${rel(file)} is not committed unchanged`);
  };
  const anySearch = (['C19', 'C21', 'C24'] as const).some((c) => st.exists(searchFile(c)));

  if (!purpose) throw new Error('a door opening needs its purpose');
  if (use === 'engineering') {
    if (!['D19', 'D21', 'D24'].includes(name)) throw new Error(`engineering reads only D19, D21 and D24 (not ${name})`);
    if (st.exists(freezeFile)) throw new Error(`engineering reads ${name} only before the freeze`);
    return;
  }
  if (use === 'ablation') {
    if (name !== 'D24') throw new Error('the ablations read the development door D24 only');
    require_(freezeFile, 'D24 (ablations)');
    if (anySearch) throw new Error('D24 (ablations): a search has started; the ablations run before any search');
    return;
  }
  if (use === 'training') {
    require_(freezeFile, `${name} (training)`);
    if (name === 'D19') return;
    if (name === 'D21') return require_(intervalFile('C19'), 'D21 (C21 training)');
    if (name === 'D24') return require_(intervalFile('C21'), 'D24 (C24 training)');
    throw new Error(`${name} is not a training door`);
  }
  if (use === 'interval') {
    if (name === 'D21') return require_(selectionFile('C19'), 'D21 (C19 next interval)');
    if (name === 'D23') return require_(selectionFile('C21'), 'D23 (C21 next interval)');
    throw new Error(`${name} is not an interval door`);
  }
  if (use === 'validation') {
    if (name !== 'FULL') throw new Error('the validation reads FULL');
    require_(selectionFile('C24'), 'FULL (C24 next interval)');
    require_(frozenSelectionFile, 'FULL (C24 next interval)');
    require_(fullAuthorizationFile, 'FULL (C24 next interval)');
    if (st.exists(intervalFile('C24'))) throw new Error('FULL: the validation is sealed; it is opened once');
    return;
  }
  // report-only diagnostics of frozen subjects
  if (name === 'FULL') {
    if (!sealedCommitted(intervalFile('C24')))
      throw new Error('FULL: diagnostics read it only after the sealed, committed validation');
  } else if (name === 'D23') {
    if (!sealedCommitted(intervalFile('C21'))) throw new Error('D23: diagnostics only after the sealed C21 interval');
  } else if (name === 'D21') {
    if (!sealedCommitted(intervalFile('C19'))) throw new Error('D21: diagnostics only after the sealed C19 interval');
  } else if (name === 'D24') {
    if (!sealedCommitted(freezeFile)) throw new Error('D24: diagnostics only after the sealed freeze');
  }
};

export const openP4Door = async (name: StudyDoor, use: DoorUse, purpose: string): Promise<Door> => {
  doorGuard(name, use, purpose);
  return openStudyDoor(STUDY_ID, name, `${use}: ${purpose}`);
};
