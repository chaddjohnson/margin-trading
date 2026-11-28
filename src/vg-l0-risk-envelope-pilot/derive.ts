// The pilot's search lane is DERIVED MECHANICALLY from Assignment 3's frozen lane (src/vg-l0-full-joint/search.ts, never
// edited): the text below is that file plus exactly the declared substitutions, each required to match its expected
// number of occurrences. tests/derive.test.ts re-derives search.ts from the frozen source and requires byte equality, so
// the pilot lane cannot drift from Assignment 3's algorithm except by these lines (PROTOCOL.md §6, IMPLEMENTATION_PLAN):
//   - imports: the frozen modules by their paths (Assignment 3's space, seeds, statistics, operators, vOptions), the
//     arm's feasibility from ./fitness.ts, the GPU EvalLab type;
//   - the lane takes its ARM (the risk policy) and its deterministic per-lane bound;
//   - every evaluation requests the risk envelope (`risk: true`), tagged by arm and lane for the accounting;
//   - plausibility, the screen's violation and reason, the rung fits' violation and the hypervolume / stagnation /
//     extension reference point (0, the arm's marked-DD limit) come from the arm;
//   - a request beyond the lane's deterministic bound, or a move set beyond Assignment 3's 230-move bound, fails closed;
//   - progress-checkpoint keys and two log lines name the arm.
// Nothing else changes: operators, seeds (the lane's seed key, never the arm), schedules, promotion shares, diversity,
// refinement rules, shortlist slots and the LaneResult shape are Assignment 3's.
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './context.ts';

export const frozenSearchFile = path.join(repoRoot, 'src', 'vg-l0-full-joint', 'search.ts');
export const derivedSearchFile = path.join(repoRoot, 'src', 'vg-l0-risk-envelope-pilot', 'search.ts');

export const header = `// GENERATED — DO NOT EDIT. The pilot's search lane: src/vg-l0-full-joint/search.ts (Assignment 3, frozen) with the
// declared substitutions of src/vg-l0-risk-envelope-pilot/derive.ts applied (tools/vg-l0-risk-envelope-pilot/derive.ts
// writes it; tests/derive.test.ts requires byte equality with a fresh derivation). The arm (risk policy) changes only
// plausibility, violation and the hypervolume reference; every evaluation requests the risk envelope.
`;

export const substitutions: { find: string; replace: string; count: number; why: string }[] = [
  {
    why: 'seeds and log: Assignment 3’s own namespace (the arm never enters a seed)',
    find: "import { economics, log, seedOf } from './context.ts';",
    replace: "import { log, seedOf } from '../vg-l0-full-joint/context.ts';",
    count: 1
  },
  {
    why: 'Assignment 3’s space (genome, identity, neighbourhoods, moves, strata), unchanged',
    find: "} from './space.ts';",
    replace: "} from '../vg-l0-full-joint/space.ts';",
    count: 1
  },
  {
    why: 'Assignment 3’s statistics unchanged; the arm’s feasibility from the pilot fitness',
    find: "import { type Fit, bandedOrder, fitOf, fundedOf, nbStats, p90Of, plausible, robustOf } from './fitness.ts';",
    replace:
      "import { type Fit, bandedOrder, fundedOf, nbStats, p90Of, robustOf } from '../vg-l0-full-joint/fitness.ts';\n" +
      "import { fitOfArm, plausibleArm, screenReason, screenViolation } from './fitness.ts';\n" +
      "import type { Arm } from './context.ts';\n" +
      "import { maxMoves } from '../vg-l0-full-joint/budgets.ts';",
    count: 1
  },
  {
    why: 'NL0’s evaluation options (Growth·GDX disabled), unchanged',
    find: "import { vOptions } from './nl0.ts';",
    replace: "import { vOptions } from '../vg-l0-full-joint/nl0.ts';",
    count: 1
  },
  {
    why: 'the GPU EvalLab (official) or the same Lab over a non-official CPU pool (engineering gate E3)',
    find: "import type { Lab } from './lab.ts';",
    replace: "import type { EvalLab as Lab } from '../gpu-backend/lab.ts';",
    count: 1
  },
  {
    why: 'the screen reason under the arm (CTRL: the identical strings)',
    find:
      "const reasonOf = (r: Rec) =>\n  r.error ? 'error' : r.lots === 0 ? 'no funded lot' : !r.mixed ? 'a family unfunded' : r.net <= 0 ? 'net ≤ 0' : r.dd > economics.ceiling ? 'DD > ceiling' : 'plausible';",
    replace: 'const reasonOf = (r: Rec, arm: Arm) => screenReason(r, arm);',
    count: 1
  },
  {
    why: 'the lane takes its arm and its deterministic per-lane bound; a request beyond the bound fails closed',
    find:
      '    readonly b: Budget\n  ) {\n    this.levels = levelsOf(spec.res);',
    replace:
      '    readonly b: Budget,\n    readonly arm: Arm,\n    readonly laneCap: number\n  ) {\n    this.levels = levelsOf(spec.res);',
    count: 1
  },
  {
    why: 'the bound check (never fires within the deterministic worst case; a defect otherwise)',
    find: "  private count(k: string, n = 1) {",
    replace:
      "  private reserve(n: number) {\n" +
      "    if (this.requested + n > this.laneCap)\n" +
      "      throw new Error(`${this.spec.key} (${this.arm.key}): ${this.requested} + ${n} requested evaluations exceed the lane's deterministic bound ${this.laneCap}`);\n" +
      "  }\n\n" +
      "  private count(k: string, n = 1) {",
    count: 1
  },
  {
    why: 'rung centres: the envelope requested, tagged by arm and lane',
    find:
      "    const centres = await this.lab.evalMany(\n      cfgs.map((c) => ({ cfg: c, options: vOptions })),\n      `${rung}:centre`\n    );",
    replace:
      "    this.reserve(cfgs.length);\n    const centres = await this.lab.evalMany(\n      cfgs.map((c) => ({ cfg: c, options: vOptions, risk: true })),\n      `${this.arm.key} ${this.spec.key} ${rung}:centre`\n    );",
    count: 1
  },
  {
    why: 'centre-first fidelity under the arm’s plausibility',
    find: '      !full && (!plausible(centres[i]!) || (gate && !gate(centres[i]!))) ? { c, nb: null } : { c, nb: neighbourhood(c, fam) }',
    replace: '      !full && (!plausibleArm(centres[i]!, this.arm) || (gate && !gate(centres[i]!))) ? { c, nb: null } : { c, nb: neighbourhood(c, fam) }',
    count: 1
  },
  {
    why: 'rung neighbours: the envelope requested, tagged by arm and lane',
    find:
      "    const items = plans.flatMap((p) => (p.nb ?? []).map((x) => ({ cfg: x.cfg, options: vOptions })));\n    const recs = await this.lab.evalMany(items, `${rung}:neighbours`);",
    replace:
      "    const items = plans.flatMap((p) => (p.nb ?? []).map((x) => ({ cfg: x.cfg, options: vOptions, risk: true })));\n    this.reserve(items.length);\n    const recs = await this.lab.evalMany(items, `${this.arm.key} ${this.spec.key} ${rung}:neighbours`);",
    count: 1
  },
  {
    why: 'the rung fit’s violation under the arm (the neighbour records give the envelope p90s)',
    find:
      '      const nb = p.nb\n        ? nbStats(\n            centre,\n            p.nb.map(() => recs[at++]!),\n            p.nb.map((x) => x.clipped)\n          )\n        : null;\n\n      out.push(fitOf(rung, id, centre, nb));',
    replace:
      '      const nbRecs = p.nb ? p.nb.map(() => recs[at++]!) : null;\n      const nb = p.nb\n        ? nbStats(\n            centre,\n            nbRecs!,\n            p.nb.map((x) => x.clipped)\n          )\n        : null;\n\n      out.push(fitOfArm(rung, id, centre, nb, nbRecs, this.arm));',
    count: 1
  },
  {
    why: 'screen evaluations: the envelope requested, tagged by arm and lane',
    find:
      "    const recs = await this.lab.evalMany(\n      cfgs.map((c) => ({ cfg: c, options: vOptions })),\n      'screen'\n    );",
    replace:
      "    this.reserve(cfgs.length);\n    const recs = await this.lab.evalMany(\n      cfgs.map((c) => ({ cfg: c, options: vOptions, risk: true })),\n      `${this.arm.key} ${this.spec.key} screen`\n    );",
    count: 1
  },
  {
    why: 'screen plausibility, violation and reason under the arm',
    find:
      '      const ok = plausible(r);\n      const violation = ok\n        ? 0\n        : (r.error ? 1 : Math.max(0, -r.net) / economics.budget + (r.net > 0 ? 0 : 0.01)) +\n          Math.max(0, r.dd - economics.ceiling) / economics.ceiling +\n          (r.mixed ? 0 : 0.5);\n      const row = this.classRow(c);\n      const why = reasonOf(r);',
    replace:
      '      const ok = plausibleArm(r, this.arm);\n      const violation = ok ? 0 : screenViolation(r, this.arm);\n      const row = this.classRow(c);\n      const why = reasonOf(r, this.arm);',
    count: 1
  },
  {
    why: 'the hypervolume / stagnation / extension reference point (0, the arm’s marked-DD limit)',
    find: '[0, economics.ceiling]',
    replace: '[0, this.arm.markedDdLimit]',
    count: 3
  },
  {
    why: 'progress checkpoint keys name the arm (the two arms of a cutoff share one job)',
    find: '        [`lane ${this.spec.key}`]: {',
    replace: '        [`lane ${this.arm.key} ${this.spec.key}`]: {',
    count: 1
  },
  {
    why: 'log lines name the arm',
    find: '    log(`${this.spec.key} island ${index}:',
    replace: '    log(`${this.arm.key} ${this.spec.key} island ${index}:',
    count: 1
  },
  {
    why: 'log lines name the arm',
    find: '    log(`lane ${s.key} (${s.kind}) starts`);',
    replace: '    log(`lane ${this.arm.key} ${s.key} (${s.kind}) starts`);',
    count: 1
  },
  {
    why: 'Assignment 3’s 230-move bound of its worst case, asserted (fails closed)',
    find: '        const moves = movesOf(cur, { gateSwitches });\n',
    replace:
      '        const moves = movesOf(cur, { gateSwitches });\n\n' +
      '        if (moves.length > maxMoves) throw new Error(`${this.spec.key}: ${moves.length} refinement moves exceed the bound ${maxMoves}`);\n',
    count: 1
  }
];

const occurrences = (s: string, find: string) => {
  let n = 0;

  for (let i = s.indexOf(find); i >= 0; i = s.indexOf(find, i + find.length)) n++;
  return n;
};

export const deriveSearch = (frozen: string) => {
  let s = frozen;

  for (const x of substitutions) {
    const n = occurrences(s, x.find);

    if (n !== x.count) throw new Error(`derive: "${x.find.slice(0, 60)}…" occurs ${n} times, expected ${x.count}`);
    s = s.split(x.find).join(x.replace);
  }
  // no remnant of the frozen file's own ceiling, plausibility or fit may survive the substitutions
  for (const banned of ['economics', 'plausible(', 'fitOf(']) if (s.includes(banned)) throw new Error(`derive: ${banned} remains`);
  return header + s;
};

export const deriveSearchFromDisk = () => deriveSearch(fs.readFileSync(frozenSearchFile, 'utf8'));
