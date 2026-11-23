// This study's search lane is DERIVED MECHANICALLY from Stage B's lane (src/vg-l0-risk-envelope-pilot/search.ts, the
// pilot's generated lane that Stage B imported unchanged; itself Assignment 3's frozen lane plus the pilot's declared
// substitutions). The text below is that file plus exactly these declared substitutions, each required to match its
// expected number of occurrences; tests/derive.test.ts re-derives search.ts and requires byte equality:
//   - imports: the arm-independent parts of Assignment 3's space (cells, family pairs, Growth patterns, the gate states)
//     stay imported; the arm-dependent ones (genome layout and levels, decode / encode, identity, distance, patterns,
//     active genes, neighbourhoods, moves and their bound, screens, strata and pins) are read from the ARM's space
//     (`this.sp` = arm.sp, src/vg-l0-staged-stop/space.ts): CTRL's space is Assignment 3's very functions, so a CTRL lane
//     is Stage B's CTRL lane; EXP's adds the staged genes;
//   - the pilot's arm fitness (plausibility, violation, screen reason) and Arm shape are imported from the pilot.
// Nothing else changes: operators, seeds (the lane's seed key, never the arm), schedules, promotion shares, diversity,
// refinement rules, shortlist slots and the LaneResult shape are Stage B's.
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot } from './context.ts';

export const sourceSearchFile = path.join(repoRoot, 'src', 'vg-l0-risk-envelope-pilot', 'search.ts');
export const derivedSearchFile = path.join(repoRoot, 'src', 'vg-l0-staged-stop', 'search.ts');

export const header = `// GENERATED — DO NOT EDIT. Priority 4's search lane: src/vg-l0-risk-envelope-pilot/search.ts (Stage B's lane, frozen)
// with the declared substitutions of src/vg-l0-staged-stop/derive.ts applied (tools/vg-l0-staged-stop/derive.ts writes it;
// tests/derive.test.ts requires byte equality with a fresh derivation). The arm's search space (arm.sp) supplies every
// arm-dependent space function; CTRL's is Assignment 3's own. Stage B's header follows.
`;

// the arm-dependent space symbols, each replaced by `this.sp.<symbol>` inside the lane (expected occurrences)
export const spaceSymbols: Record<string, number> = {
  activeOrdinal: 1,
  cfgDistance: 4,
  cfgId: 9,
  classKeyOf: 1,
  controlPatternOf: 5,
  decode: 1,
  encode: 2,
  levelsOf: 1,
  movesOf: 1,
  nCat: 8,
  neighbourhood: 5,
  pinCell: 1,
  pinPair: 1,
  pinStratum: 2,
  pinnedOfCell: 1,
  pinnedOfPair: 1,
  screenGenomes: 2,
  maxMoves: 2
};

export const substitutions: { find: string; replace: string; count: number; why: string }[] = [
  {
    why: 'the arm-independent parts of Assignment 3’s space stay imported; the arm-dependent ones come from arm.sp',
    find: `import {
  type Cell,
  type Cfg,
  type PairId,
  type Resolution,
  activeOrdinal,
  cellOf,
  cellOfPairGate,
  cfgDistance,
  cfgId,
  classKeyOf,
  controlPatternOf,
  decode,
  encode,
  gEntryOf,
  gGateOf,
  gStratumOf,
  gateStates,
  levelsOf,
  movesOf,
  nCat,
  nGenes,
  neighbourhood,
  pairOf,
  pinCell,
  pinPair,
  pinStratum,
  pinnedOfCell,
  pinnedOfPair,
  screenGenomes
} from '../vg-l0-full-joint/space.ts';`,
    replace: `import {
  type Cell,
  type PairId,
  type Resolution,
  cellOf,
  cellOfPairGate,
  gEntryOf,
  gGateOf,
  gStratumOf,
  gateStates,
  nGenes,
  pairOf
} from '../vg-l0-full-joint/space.ts';
import type { PCfg as Cfg, SpaceDef } from './space.ts';`,
    count: 1
  },
  {
    why: 'the arm fitness is the pilot’s (P0 in both arms), unchanged',
    find: "import { fitOfArm, plausibleArm, screenReason, screenViolation } from './fitness.ts';",
    replace:
      "import { fitOfArm, plausibleArm, screenReason, screenViolation } from '../vg-l0-risk-envelope-pilot/fitness.ts';",
    count: 1
  },
  {
    why: 'the move bound is the arm’s (CTRL: Assignment 3’s 230; EXP: 257)',
    find: "import { maxMoves } from '../vg-l0-full-joint/budgets.ts';\n",
    replace: '',
    count: 1
  },
  {
    why: 'the lane reads its arm’s space',
    find: '  private readonly pinnedSet: Set<number>;\n',
    replace:
      '  private readonly pinnedSet: Set<number>;\n' +
      '  private get sp(): SpaceDef {\n' +
      '    return this.arm.sp;\n' +
      '  }\n',
    count: 1
  }
];

const occurrences = (s: string, find: string) => {
  let n = 0;

  for (let i = s.indexOf(find); i >= 0; i = s.indexOf(find, i + find.length)) n++;
  return n;
};

export const deriveSearch = (source: string) => {
  let s = source;

  for (const x of substitutions) {
    const n = occurrences(s, x.find);

    if (n !== x.count) throw new Error(`derive: "${x.find.slice(0, 60)}…" occurs ${n} times, expected ${x.count}`);
    s = s.split(x.find).join(x.replace);
  }

  // every arm-dependent symbol inside the class body → this.sp.<symbol> (word-bounded, not a property access)
  const start = s.indexOf('export class Lane {');
  const end = s.indexOf('\nexport const genomeLength');

  if (start < 0 || end < 0) throw new Error('derive: the Lane class was not found');

  let body = s.slice(start, end);

  for (const [sym, count] of Object.entries(spaceSymbols)) {
    const re = new RegExp(`(?<![.\\w])${sym}\\b`, 'g');
    const n = (body.match(re) ?? []).length;

    if (n !== count) throw new Error(`derive: ${sym} occurs ${n} times in the lane, expected ${count}`);
    body = body.replace(re, `this.sp.${sym}`);
  }
  s = s.slice(0, start) + body + s.slice(end);

  // no arm-dependent symbol may remain outside `this.sp` in the class, nor be imported
  for (const sym of Object.keys(spaceSymbols))
    if (
      new RegExp(`(?<![.\\w])${sym}\\b`).test(
        s.slice(s.indexOf('export class Lane {'), s.indexOf('\nexport const genomeLength'))
      )
    )
      throw new Error(`derive: ${sym} remains outside the arm's space`);
  return header + s;
};

export const deriveSearchFromDisk = () => deriveSearch(fs.readFileSync(sourceSearchFile, 'utf8'));
