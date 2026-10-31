// The Track V challenger trigger of PROTOCOL.md §9.5 (fold M, training only): the full standalone VGT challenger
// track runs iff some fold-M Track V diagnostic shortlist member has, on the pooled selection sets, robust profit per
// year ≥ 1.25 × VGT primary's and p90 DD ≤ primary's + $2,000.
import fs from 'fs-extra';
import { readSealed } from './records.ts';
import { searchFile } from './context.ts';

interface Compact {
  nb: { robustPerYear: number; p90Dd: number };
}

export const vTriggerOf = async () => {
  const file = searchFile('V', 'M', 'diagnostic');

  if (!(await fs.pathExists(file))) throw new Error(`the Track V fold-M diagnostic (${file}) has not run`);

  const record = await readSealed<{
    shortlist: { id: string; selection: { pooled: Compact } }[];
    controls: Record<string, { selection: { pooled: Compact } }>;
  }>(file);
  const primary = record.controls.B1!.selection.pooled.nb;
  const rows = record.shortlist.map((item) => ({
    id: item.id,
    robustPerYear: item.selection.pooled.nb.robustPerYear,
    p90Dd: item.selection.pooled.nb.p90Dd,
    gap: item.selection.pooled.nb.robustPerYear / primary.robustPerYear,
    passes:
      item.selection.pooled.nb.robustPerYear >= 1.25 * primary.robustPerYear &&
      item.selection.pooled.nb.p90Dd <= primary.p90Dd + 2000
  }));

  return { fired: rows.some((row) => row.passes), primary, rows };
};

export const requireVTrigger = async () => {
  const trigger = await vTriggerOf();

  if (!trigger.fired) throw new Error('the Track V challenger trigger did not fire (PROTOCOL.md §9.5); the full V track is not run');
};
