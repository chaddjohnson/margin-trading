// P9-MSFT's search lane is DERIVED MECHANICALLY from the lane Priority 5 ran (src/vg-l0-risk-envelope-pilot/search.ts —
// itself Assignment 3's frozen lane plus the pilot's declared substitutions; never edited): the text of search.ts is that
// file plus exactly the substitutions below, each required to match its expected number of occurrences.
// tests/derive.test.ts re-derives search.ts and requires byte equality, so the MSFT lane cannot drift from NL0 1.0.0's
// algorithm (as Assignment 3, the pilot and Priority 5 executed it) except by these lines:
//   - imports: this study's space (the MSFT genome and its arm cells; space.ts), seeds and log (this study's namespace),
//     the arm's feasibility (fitness.ts: the arm's required families), the move bound from space.ts;
//   - every evaluation uses its arm's options (D: Growth·MSFT disabled; G: D1·MSFT disabled; J, S: both books) instead of
//     NL0's vOptions;
//   - decode receives the lane's cell (the arm and, in arm S, the frozen D1 finalist cannot be read from a genome);
//   - the seeded lanes' DESIGN neighbourhoods (new centres around a seed) never move a frozen arm-S D1 (brief §6 Stage E);
//     every MEASUREMENT neighbourhood is unchanged (the common instrument);
//   - one coverage counter names the MSFT Growth stratum ('-' when Growth is off).
// Nothing else changes: operators, schedules, promotion shares, diversity, refinement rules, shortlist slots, the
// trigger and the LaneResult shape are NL0's / Assignment 3's.
import fs from 'node:fs';
import path from 'node:path';
import { header as pilotHeader } from '../vg-l0-risk-envelope-pilot/derive.ts';
import { repoRoot } from './context.ts';

export const sourceSearchFile = path.join(repoRoot, 'src', 'vg-l0-risk-envelope-pilot', 'search.ts');
export const derivedSearchFile = path.join(repoRoot, 'src', 'msft-d1-growth', 'search.ts');

export const header = `// GENERATED — DO NOT EDIT. P9-MSFT's search lane: src/vg-l0-risk-envelope-pilot/search.ts (the lane Priority 5 ran:
// Assignment 3's frozen lane with the pilot's declared substitutions) with the declared substitutions of
// src/msft-d1-growth/derive.ts applied (tools/msft-d1-growth/derive.ts writes it; tests/derive.test.ts requires byte
// equality with a fresh derivation). The MSFT space, the arm's options and feasibility; NL0's algorithm unchanged.
`;

export const substitutions: { find: string; replace: string; count: number; why: string }[] = [
  {
    why: 'the pilot’s generated header is replaced by this study’s',
    find: pilotHeader,
    replace: '',
    count: 1
  },
  {
    why: 'seeds and log: this study’s namespace (deriveSeed("msft-d1-growth", …); the arm never enters a seed)',
    find: "import { log, seedOf } from '../vg-l0-full-joint/context.ts';",
    replace: "import { log, seedOf } from './context.ts';",
    count: 1
  },
  {
    why: 'this study’s space (the MSFT genome, arm cells, identity, neighbourhoods, moves, strata, the move bound)',
    find: "  screenGenomes\n} from '../vg-l0-full-joint/space.ts';",
    replace: "  screenGenomes,\n  designNeighbourhood,\n  maxMoves\n} from './space.ts';",
    count: 1
  },
  {
    why: 'the coverage counter’s Growth stratum ("-" when the arm has no Growth book)',
    find: '  gStratumOf,\n',
    replace: '  growthStratumOf,\n',
    count: 1
  },
  {
    why: 'the coverage counter’s Growth stratum ("-" when the arm has no Growth book)',
    find: 'this.count(`centres Growth ${gStratumOf(m.cfg)}`)',
    replace: 'this.count(`centres Growth ${growthStratumOf(m.cfg)}`)',
    count: 1
  },
  {
    why: 'the lane’s arm: P0 with the arm’s required families and options (context.ts MsftArm)',
    find: "import type { Arm } from './context.ts';",
    replace: "import type { MsftArm as Arm } from './context.ts';",
    count: 1
  },
  {
    why: 'the move bound comes from space.ts (Assignment 3’s 230)',
    find: "import { maxMoves } from '../vg-l0-full-joint/budgets.ts';\n",
    replace: '',
    count: 1
  },
  {
    why: 'NL0’s vOptions are replaced by the arm’s options',
    find: "import { vOptions } from '../vg-l0-full-joint/nl0.ts';\n",
    replace: '',
    count: 1
  },
  {
    why: 'every evaluation (screen, rung centres, rung neighbours) uses the arm’s options',
    find: 'options: vOptions',
    replace: 'options: this.arm.options',
    count: 3
  },
  {
    why: 'decode receives the lane’s cell (the arm; arm S’s frozen D1)',
    find: '      const c = decode(g, this.spec.res);',
    replace: '      const c = decode(g, this.spec.res, this.spec.cell!);',
    count: 1
  },
  {
    why: 'seeded lanes’ design neighbourhoods never move arm S’s frozen D1 (measurement neighbourhoods unchanged)',
    find: 'for (const p of neighbourhood(seed.cfg, ',
    replace: 'for (const p of designNeighbourhood(seed.cfg, ',
    count: 4
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
  // no remnant of NL0's options, Assignment 3's space or seed namespace may survive the substitutions
  for (const banned of ['vOptions', "'../vg-l0-full-joint/space.ts'", "'../vg-l0-full-joint/context.ts'", 'gStratumOf'])
    if (s.includes(banned)) throw new Error(`derive: ${banned} remains`);
  return header + s;
};

export const deriveSearchFromDisk = () => deriveSearch(fs.readFileSync(sourceSearchFile, 'utf8'));
