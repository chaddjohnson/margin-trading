// Stage 1 (PROTOCOL.md §5): the archive scan, the inventory, reproduction and parity (G1–G7), failure attribution and
// the mechanism audit. Training doors, sealed records and archives only; next-slice doors only for published role
// holders.
import { type HistCut, histCuts, log } from './context.ts';
import { scanCut } from './scan.ts';
import { type SubjectKey, subjectKeys } from './sources.ts';

export const runStage1 = async (args: string[]) => {
  const [sub, ...rest] = args;

  if (sub === 'scan') {
    const subjects = (rest[0] ? [rest[0]] : subjectKeys) as SubjectKey[];
    const cutsToScan = (rest[1] ? [rest[1]] : histCuts) as HistCut[];

    for (const s of subjects) for (const c of cutsToScan) scanCut(s, c);
    return;
  }

  if (sub === 'inventory') return (await import('./inventory.ts')).runInventory();
  if (sub === 'reproduce') return (await import('./reproduce.ts')).runReproduce();
  if (sub === 'g7') return (await import('./reproduce.ts')).runG7Recheck();
  if (sub === 'mechanism') return (await import('./mechanism.ts')).runMechanism();
  throw new Error(`stage1 <scan|inventory|reproduce|mechanism>; got ${sub}`);
};

export const _log = log;
