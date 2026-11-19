// Stage P: the development verdicts (PROTOCOL.md §11) — the interpretation rules frozen before any result, applied
// mechanically to the sealed development records (C, N, S) and sealed BEFORE the FULL manifest opens FULL. Every label
// here is descriptive and report-only: no gate, no tolerance on risk, no new threshold for any study. Validation can
// later challenge a development verdict; it can never change a rule.
import { r2 } from './context.ts';
import { readJson, sealJson } from './records.ts';
import type { Rec } from '../vg-d1-growth-joint/evaluate.ts';
import type { Nb } from '../vg-d1-growth-joint/fitness.ts';
import type { Tail } from '../vg-d1-growth-diagnostic/risk.ts';
import type { Mode } from './lifecycle.ts';
import { guards, stageFiles } from './stages.ts';
import fs from 'node:fs';

// The report-only band (2.5% of the fixed $100,000 budget) that separates "little" from a change worth naming.
export const band = 2_500;

type Paired = { net: { median: number }; dd: unknown; sameLedger: number; n: number };

interface NFile {
  subjects: Record<
    string,
    {
      families: Record<
        string,
        { modes: Record<Mode, { nb: Nb; tail: Tail }>; paired: Record<'L1vsL0' | 'L2vsL0' | 'L2vsL1', Paired> }
      >;
    }
  >;
}

interface CFile {
  centres: Record<string, { modes: Record<Mode, { rec: Rec }> }>;
}

interface SFile {
  subjects: Record<string, { families: Record<string, { nb: Nb; tail: Tail }> }>;
}

export interface Point {
  key: string;
  centreNet: number;
  centreDd: number;
  p10: number;
  p90Dd: number;
}

// a dominates b on (centre net ↑, centre DD ↓, p10 net ↑, p90 DD ↓): at least as good on all, better on one
export const dominates = (a: Point, b: Point) =>
  a.centreNet >= b.centreNet &&
  a.centreDd <= b.centreDd &&
  a.p10 >= b.p10 &&
  a.p90Dd <= b.p90Dd &&
  (a.centreNet > b.centreNet || a.centreDd < b.centreDd || a.p10 > b.p10 || a.p90Dd < b.p90Dd);

export const paretoOf = (pts: Point[]) =>
  pts.filter((p) => !pts.some((q) => q !== p && dominates(q, p))).map((p) => p.key);

// R2's label of a lifecycle change (median paired Δ net, change of the p90 DD), bands of ±$2,500.
export const effectLabel = (dNet: number, dP90: number) => {
  if (dNet >= band) return dP90 >= band ? 'mixed: more profit, more tail risk' : 'helps';
  if (dNet <= -band) return 'hurts';
  if (dP90 >= band) return 'hurts (tail risk)';
  if (dP90 <= -band) return 'helps (tail risk)';
  return 'little';
};

export const computeVerdicts = () => {
  const C = readJson<CFile>(stageFiles.C);
  const N = readJson<NFile>(stageFiles.N);
  const S = readJson<SFile>(stageFiles.S);
  const modes: Mode[] = ['L0', 'L1', 'L2'];
  const point = (k: string, m: Mode): Point => {
    const c = C.centres[k]!.modes[m].rec;
    const nb = N.subjects[k]?.families.confirm!.modes[m].nb;

    return { key: k, centreNet: c.net, centreDd: c.dd, p10: nb ? nb.p10 : NaN, p90Dd: nb ? nb.p90Dd : NaN };
  };

  // R1 and R4: VG #2 + GDX Growth (E), + VGT Growth (C4, C85), + both (A, B); D is the reference
  const combos = ['E', 'C4', 'C85', 'A', 'B'];
  const r1 = Object.fromEntries(
    modes.map((m) => {
      const pts = combos.map((k) => point(k, m));
      const pareto = paretoOf(pts);
      const single = pareto.length === 1 ? pareto[0]! : null;

      return [
        m,
        {
          points: pts,
          pareto,
          strongest: single ?? `no single combination dominates: non-dominated ${pareto.join(', ')}`,
          byFamily: {
            'VG #2 + GDX Growth': ['E'],
            'VG #2 + VGT Growth': ['C4', 'C85'],
            'VG #2 + both Growth books': ['A', 'B']
          },
          referenceD: { centreNet: C.centres.D!.modes[m].rec.net, centreDd: C.centres.D!.modes[m].rec.dd }
        }
      ];
    })
  );
  const r4 = Object.fromEntries(
    modes.map((m) => {
      const e = point('E', m);

      return [
        m,
        {
          nonDominated: paretoOf(combos.map((k) => point(k, m))).includes('E'),
          versus: Object.fromEntries(
            ['A', 'B', 'C4', 'C85'].map((k) => {
              const o = point(k, m);

              return [
                k,
                {
                  relation: dominates(e, o) ? 'E dominates' : dominates(o, e) ? `${k} dominates` : 'trade-off',
                  centreNet: r2(e.centreNet - o.centreNet),
                  centreDd: r2(e.centreDd - o.centreDd),
                  p10: r2(e.p10 - o.p10),
                  p90Dd: r2(e.p90Dd - o.p90Dd)
                }
              ];
            })
          )
        }
      ];
    })
  );

  // R2: the lifecycle effect per subject (paired confirmation draws)
  const growthCore = ['E', 'C4', 'C85', 'A', 'B', 'GP4', 'GP85', 'V4', 'V85'];
  const r2x = Object.fromEntries(
    growthCore.map((k) => {
      const f = N.subjects[k]!.families.confirm!;
      const lab = (cmp: 'L1vsL0' | 'L2vsL0' | 'L2vsL1', a: Mode, b: Mode) => {
        const dNet = f.paired[cmp].net.median;
        const dP90 = r2(f.modes[a].nb.p90Dd - f.modes[b].nb.p90Dd);

        return {
          medianPairedNet: dNet,
          p90DdChange: dP90,
          breachShareChange: Math.round((f.modes[a].nb.breachShare - f.modes[b].nb.breachShare) * 1e4) / 1e4,
          sameLedger: `${f.paired[cmp].sameLedger}/${f.paired[cmp].n}`,
          label: effectLabel(dNet, dP90)
        };
      };

      return [
        k,
        { L1vsL0: lab('L1vsL0', 'L1', 'L0'), L2vsL0: lab('L2vsL0', 'L2', 'L0'), L2vsL1: lab('L2vsL1', 'L2', 'L1') }
      ];
    })
  );

  // R3: the cost of admitting GDX Growth (complete reruns at the centre: with − without)
  const pairs = [
    ['A', 'C4'],
    ['B', 'C85'],
    ['GP4', 'S4'],
    ['GP85', 'S85']
  ] as const;
  const r3 = Object.fromEntries(
    pairs.map(([w, wo]) => {
      const per = Object.fromEntries(
        modes.map((m) => {
          const a = C.centres[w]!.modes[m].rec;
          const b = C.centres[wo]!.modes[m].rec;

          return [
            m,
            {
              admission: r2(a.net - b.net),
              vgtGrowth: r2(a.books['G:VGT'].booked - b.books['G:VGT'].booked),
              d1: r2(a.fam.D1.booked - b.fam.D1.booked),
              gdxGrowthBooked: r2(a.books['G:GDX'].booked)
            }
          ];
        })
      );
      const verdict = (m: 'L1' | 'L2') => {
        const lessCostly = per[m]!.vgtGrowth > per.L0!.vgtGrowth;
        const d1Kept = per[m]!.d1 >= per.L0!.d1;

        return lessCostly && d1Kept
          ? 'yes'
          : lessCostly
            ? 'partly: less costly to VGT, more D1 displaced'
            : d1Kept
              ? 'no: not less costly to VGT'
              : 'no';
      };

      return [`${w} vs ${wo}`, { per, L1: verdict('L1'), L2: verdict('L2') }];
    })
  );

  // R5: the standalone matched neighbourhoods (common instrument, confirm family)
  const stand = ['SG', 'S4', 'S85'].map((k) => {
    const nb = S.subjects[k]!.families.confirm!.nb;
    const t = S.subjects[k]!.families.confirm!.tail;
    const c = C.centres[k]!.modes.L0.rec;

    return {
      key: k,
      centreNet: c.net,
      centreDd: c.dd,
      retention: Math.round((nb.p10 / c.net) * 1e4) / 1e4,
      inflation: Math.round((nb.p90Dd / c.dd) * 1e4) / 1e4,
      breachShare: nb.breachShare,
      positiveShare: t.positiveShare
    };
  });
  const stronger = (x: (typeof stand)[number], y: (typeof stand)[number]) =>
    x.retention > y.retention && x.inflation < y.inflation
      ? 'stronger'
      : x.retention < y.retention && x.inflation > y.inflation
        ? 'weaker'
        : 'mixed';
  const r5 = {
    subjects: stand,
    pairwise: Object.fromEntries(
      stand.flatMap((x) => stand.filter((y) => y !== x).map((y) => [`${x.key} vs ${y.key}`, stronger(x, y)]))
    ),
    strongest:
      stand.find((x) => stand.every((y) => y === x || stronger(x, y) === 'stronger'))?.key ??
      'no single standalone configuration has uniformly stronger matched local stability evidence'
  };

  // R6: which lifecycle(s) deserve optimization in 3B (provisional, development)
  const two = ['A', 'B', 'GP4', 'GP85'];
  const qualifies = (cmp: 'L1vsL0' | 'L2vsL0') => {
    const helps = two.filter((k) => (r2x[k] as Record<string, { label: string }>)[cmp]!.label.startsWith('helps'));
    const hurts = growthCore.filter((k) =>
      (r2x[k] as Record<string, { label: string }>)[cmp]!.label.startsWith('hurts')
    );

    return { helps, hurts, deserves: helps.length >= 2 && hurts.length === 0 };
  };
  const q1 = qualifies('L1vsL0');
  const q2 = qualifies('L2vsL0');
  const r6 = {
    L1: q1,
    L2: q2,
    recommendation:
      q1.deserves && q2.deserves
        ? 'keep L0 as the benchmark and both L1 and L2 as explicit 3B comparison arms (L2 constants unchanged)'
        : q1.deserves
          ? 'keep L0 as the benchmark and L1 as an explicit 3B comparison arm'
          : q2.deserves
            ? 'keep L0 as the benchmark and L2 as an explicit 3B comparison arm (its constants unchanged)'
            : 'run 3B under L0 with protected both-symbol exploration; neither experimental lifecycle is recommended for 3B'
  };

  return { band, R1: r1, R2: r2x, R3: r3, R4: r4, R5: r5, R6: r6 };
};

export const stageP = () => {
  const { digest } = guards();

  for (const s of ['V', 'C', 'N', 'S'] as const) if (!fs.existsSync(stageFiles[s])) throw new Error(`stage ${s} first`);
  if (fs.existsSync(stageFiles.P)) throw new Error('stage P is sealed: it never reruns');

  const v = computeVerdicts();

  return sealJson(
    stageFiles.P,
    {
      stage: 'P',
      kind: 'development verdicts (frozen rules, development evidence only; sealed before FULL opens)',
      codeDigest: digest,
      ...v,
      counts: { development: 0, full: 0, retries: 0, rounds: 0, growthSims: 0, archiveReads: 0, bookRuns: 0 }
    },
    'P development verdicts'
  );
};
