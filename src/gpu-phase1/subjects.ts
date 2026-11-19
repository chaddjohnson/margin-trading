// The study's deterministic configuration sets (PROTOCOL.md §4). Every set is rebuilt identically from sealed records
// or seeds; nothing here is chosen by any outcome (AD7).
//   R  New L0 and N/original, read from their sealed, sha256-pinned records (src/vg-l0-risk-metrics/subjects.ts)
//   A  uniform random genomes of Assignment 3's 92-gene layout (coarse grid), decoded by its own `decode`
//   B  branch-heavy D1 designs: corners of the D1 box × every RC 2 family, gate and activation, New L0's Growth·VGT
//   N  'joint' neighbourhoods of New L0 and N/original (Assignment 3's own generator, this study's labels)
import { Rng } from '../optimizer/rng.ts';
import type { D1Grid } from '../vg-d1-growth-joint/books.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import {
  type D1RiskControls2,
  type RiskConfig2,
  canonicalConfig2,
  validateRiskConfig2
} from '../d1-risk-controls-rc2/config.ts';
import { type Cfg, decode, levelsOf, neighbourhood } from '../vg-l0-full-joint/space.ts';
import { auditSubjects } from '../vg-l0-risk-metrics/subjects.ts';
import { subjectOfCfg } from '../vg-l0-risk-metrics/engine.ts';
import { seedOf } from './context.ts';

export interface Subject {
  key: string; // stable id inside this study, e.g. "R:New L0", "A:17", "B:agg-D1e", "N:NL0#5"
  set: 'R' | 'A' | 'B' | 'N';
  quad: Quad;
  controls: RiskConfig2 | null;
  cfg?: Cfg;
}

export const referenceSubjects = (): Subject[] => {
  const all = auditSubjects();
  const pick = (key: string) => {
    const s = all.find((x) => x.key === key);

    if (!s) throw new Error(`reference subject ${key} not found`);
    return {
      key: `R:${key}`,
      set: 'R' as const,
      quad: s.subject.quad,
      controls: s.subject.controls,
      cfg: s.cfg ?? undefined
    };
  };

  return [pick('New L0'), pick('N/original')];
};

export const referenceTargets = () => {
  const all = auditSubjects();

  return Object.fromEntries(['New L0', 'N/original'].map((k) => [k, all.find((x) => x.key === k)!.target]));
};

export const randomSubjects = (n: number, label = 'A'): Subject[] => {
  const levels = levelsOf('coarse');
  const out: Subject[] = [];

  for (let i = 0; i < n; i++) {
    const rng = new Rng(seedOf(label, i));
    const genome = levels.map((l) => rng.int(l));
    const cfg = decode(genome, 'coarse');
    const s = subjectOfCfg(cfg);

    out.push({ key: `${label}:${i}`, set: 'A', quad: s.quad, controls: s.controls, cfg });
  }

  return out;
};

// D1 box (Study 8's common box, integer grid): X 80–300, Y 1–50, stop 30–150, hold 3–30, L 20–250, buffer 0–60,
// P 30–200, W 10–200 (src/multi-etf-d1/context.ts via src/vg-d1-growth-joint/space.ts d1Box).
const grids: Record<string, D1Grid> = {
  agg: {
    targetPercentChange: 80,
    trailingBuyPercentage: 1,
    trailingStopPercentage: 30,
    maximumHoldDays: 3,
    tickWindowSize: 20,
    intradayLossBuffer: 0,
    pullback: 30,
    continuationWindow: 200
  },
  long: {
    targetPercentChange: 80,
    trailingBuyPercentage: 1,
    trailingStopPercentage: 150,
    maximumHoldDays: 30,
    tickWindowSize: 20,
    intradayLossBuffer: 60,
    pullback: 200,
    continuationWindow: 10
  },
  rare: {
    targetPercentChange: 300,
    trailingBuyPercentage: 50,
    trailingStopPercentage: 150,
    maximumHoldDays: 30,
    tickWindowSize: 250,
    intradayLossBuffer: 60,
    pullback: 200,
    continuationWindow: 200
  },
  mid: {
    targetPercentChange: 120,
    trailingBuyPercentage: 5,
    trailingStopPercentage: 60,
    maximumHoldDays: 10,
    tickWindowSize: 60,
    intradayLossBuffer: 20,
    pullback: 80,
    continuationWindow: 60
  }
};

const families = ['A', 'B', 'C', 'D'] as const;

const controlsOf = (
  family: (typeof families)[number],
  gate: boolean,
  entryDay: boolean,
  hold: number,
  tight: boolean
): D1RiskControls2 | undefined => {
  const c: D1RiskControls2 = {};

  if (family !== 'A')
    c.protectiveStop = {
      mode: 'on',
      stopDistanceTenths: tight ? 30 : 250,
      ...(entryDay ? { activation: 'entry-day' as const } : {})
    };
  if (family === 'C') c.hold = { mode: 'disabled' };
  if (family === 'D')
    c.hold = {
      mode: 'adaptive',
      extendedHoldDays: Math.max(tight ? 6 : 60, hold + 3),
      progressTenths: tight ? 10 : 150
    };
  if (gate)
    c.declineGate = tight
      ? { mode: 'on', losses: 1, recoveryTenths: 100, maxBlockSessions: 5 }
      : { mode: 'on', losses: 4, recoveryTenths: 1000, maxBlockSessions: 250 };
  return Object.keys(c).length ? c : undefined;
};

export const branchHeavySubjects = (growthOf: Quad): Subject[] => {
  const out: Subject[] = [];
  const add = (
    key: string,
    gdx: D1Grid,
    vgt: D1Grid,
    cg: D1RiskControls2 | undefined,
    cv: D1RiskControls2 | undefined
  ) => {
    const books: RiskConfig2['books'] = {};

    if (cg) books['D1:GDX'] = cg;
    if (cv) books['D1:VGT'] = cv;

    const controls = canonicalConfig2(validateRiskConfig2({ version: 2, books }));
    const d1 = { GDX: { ...gdx }, VGT: { ...vgt } };

    out.push({ key: `B:${key}`, set: 'B', quad: { d1, g: growthOf.g, first: 'D1' }, controls });
  };

  for (const [name, g] of Object.entries(grids)) add(`${name}-legacy`, g, g, undefined, undefined);

  for (const fam of families)
    for (const gate of [false, true])
      for (const entryDay of [false, true]) {
        if (fam === 'A' && entryDay) continue; // activation only exists with the stop
        for (const tight of [true, false]) {
          const g = { ...grids.agg! };

          if (fam === 'C') {
            g.maximumHoldDays = 3; // the box minimum (cfgOf's convention for an inert C hold/buffer)
            g.intradayLossBuffer = 0;
          }
          add(
            `agg-${fam}${gate ? 1 : 0}${entryDay ? 'e' : 'n'}${tight ? 't' : 'w'}`,
            g,
            g,
            controlsOf(fam, gate, entryDay, g.maximumHoldDays, tight),
            controlsOf(fam, gate, entryDay, g.maximumHoldDays, tight)
          );
        }
      }

  return out;
};

export const neighbourSubjects = (centres: Subject[], n: number): Subject[] => {
  const out: Subject[] = [];

  for (const c of centres) {
    if (!c.cfg) throw new Error(`${c.key}: no Assignment 3 configuration to perturb`);

    const pts = neighbourhood(c.cfg, { name: 'gpu-phase1', n, labels: ['gpu-phase1', c.key], scope: 'joint' });

    pts.forEach((p, i) => {
      const s = subjectOfCfg(p.cfg);

      out.push({ key: `N:${c.key.slice(2)}#${i}`, set: 'N', quad: s.quad, controls: s.controls, cfg: p.cfg });
    });
  }

  return out;
};
