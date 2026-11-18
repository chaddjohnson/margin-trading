// Read-only access to Assignment 3's archived populations (its sealed qualification records), exactly as its own
// `allEvidence` reads them: broad, refine and (C24) informed members, de-duplicated by label in that order.
import fs from 'node:fs';
import path from 'node:path';
import { decode } from '../growth140-vgt-s8m/store.ts';
import type { Evidence } from '../vg-l0-full-joint/qualify.ts';
import { type CutoffKey, fullJoint } from './context.ts';

export const membersOf = (c: CutoffKey) => {
  const out: Evidence[] = [];
  const seen = new Set<string>();

  for (const st of ['broad', 'refine', 'informed']) {
    const f = path.join(fullJoint.dir, 'results/folds', c, `${st}-qualification.json`);

    if (!fs.existsSync(f)) continue;
    for (const e of decode<{ evidence: Evidence[] }>(fs.readFileSync(f, 'utf8')).evidence)
      if (!seen.has(e.label)) {
        seen.add(e.label);
        out.push(e);
      }
  }
  return out;
};

export const sealedSelection = (c: CutoffKey) =>
  decode<{ primaries: Record<string, Record<string, string | null>>; rankings: Record<string, Record<string, { label: string; centreNet: number }[]>>; subjects: Record<string, Evidence> }>(
    fs.readFileSync(path.join(fullJoint.dir, 'results/folds', c, 'selection.json'), 'utf8')
  );
