// The user-preference assessment and the three decisions (PROTOCOL.md §9; reviews M4, M5): a sealed, REPORT-ONLY stage
// after test-F24-confirm. It never changes the mechanical ranking, a status or a nomination; it reads the sealed
// FROZEN_SELECTION.json, the F24 qualification records, test.json and confirm.json, and recomputes only the daily marks
// of the F24 holders and VG #2 on the `post` door (one continuous run to 2026-10-29) for the bootstrap.
//
//   Bands: the confirmation band (training, 3 × 128) and the F24 test-family band (3 × 128), each with n, per-family
//     shares and the one-sided 95% Wilson bound; the combined band is the LOWER of the two.
//   Compelling case (conditional band only; every item required; all against VG #2 under the same track's labels):
//     (1) training confirmation median/yr AND p10/yr ≥ VG #2's, robust/yr ≥ VG #2's + max($3,000, 10%), centre net/yr
//         ≥ VG #2's; (2) every confirmation family and every F24 test family passes alone; (3) Q2b and T2b pass;
//     (4) every Q7 and T4 stress passes; (5) whole-run centre minute DD and F24 test-family p90 DD < $33,000;
//     (6) F24 test-window centre net and test-family median ≥ VG #2's.
//   Comparison with VG #2 (M5): daily P&L differences (holder − VG #2) on the F24 test window, stationary block bootstrap
//     (block 21, 5,000) on COMMON resample indices for all holders. Confirmatory (the mechanical primary nominee only,
//     one-sided): advantage iff the 5th percentile of the resampled total > 0. Every other holder: a family-wise
//     single-step max-T test (White / Romano–Wolf): t_h = d_h / s_h, M_b = max_h (T*_hb − d_h) / s_h, adjusted p_h =
//     share of M_b ≥ t_h; advantage iff p_h < 0.05. The whole-run comparison is reported as in-sample and descriptive.
//   Decisions: (1) the mechanical nomination, copied from test.json; (2) the user-preference assessment, in the
//     mechanical order, labelled descriptive; (3) deployment: research only, NOT DEPLOYED.
import fs from 'fs-extra';
import { stationaryBootstrap } from '../b4-b5-robustness/analysis.ts';
import { wilsonLower } from '../study8-expanded-regime-d1/evidence.ts';
import {
  bandOf,
  bootstrap,
  compellingCase,
  economicCriteria,
  eligibility,
  frozenSelectionFile,
  preferenceBands,
  resultFile,
  type TrackKey
} from './context.ts';
import { controlsOf } from './controls.ts';
import { openDoor } from './door.ts';
import { type Books, P9Evaluator } from './engine.ts';
import { requireIntegrity } from './integrity.ts';
import { diagnosticsFile } from './diagnostics.ts';
import { qualificationFile } from './qualify.ts';
import { log, nowIso, readSealed, writeSealed } from './records.ts';
import { rngOf } from './space.ts';
import { testConfirmFile, testFile } from './test.ts';

export const preferenceFile = () => resultFile('preference', 'preference.json');

interface Nb {
  n: number;
  share: number;
  p90Dd: number;
  medianPerYear: number;
  p10PerYear: number;
  robustPerYear: number;
}
interface EvidenceView {
  decisive: { nb: Nb; wilsonLower: number; test?: { median: number } };
  perRep: { nb: Nb }[];
  centre: { perYear: number; record: { dd: number; net: number } };
  stress: Record<string, { net: number; dd: number }>;
  alternates: Record<string, { nb: Nb }>;
}

const familyPasses = (nb: Nb) => nb.share >= eligibility.share && nb.p90Dd < eligibility.ceiling;

// The single-step max-T family-wise test on common indices (exported for the unit test).
export const maxT = (observed: readonly number[], totals: readonly (readonly number[])[]) => {
  const sd = totals.map((row) => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;

    return Math.sqrt(row.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, row.length - 1));
  });
  const resamples = totals[0]?.length ?? 0;
  const m = Array.from({ length: resamples }, (_v, b) =>
    Math.max(...observed.map((d, h) => (sd[h]! > 0 ? (totals[h]![b]! - d) / sd[h]! : -Infinity)))
  );

  return observed.map((d, h) => {
    const t = sd[h]! > 0 ? d / sd[h]! : d > 0 ? Infinity : -Infinity;

    return { observed: d, se: sd[h]!, t, adjustedP: m.filter((value) => value >= t).length / Math.max(1, resamples) };
  });
};

const percentile = (values: readonly number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))]!;
};

export const runPreference = async () => {
  const out = preferenceFile();

  if (await fs.pathExists(out)) throw new Error(`${out} exists (sealed)`);

  await requireIntegrity('preference', { canonical: true });

  const frozen = await readSealed<{
    rankedByFold: Record<
      string,
      { rank: number; track: TrackKey; role: string; id: string; books: Books; tier: string }[]
    >;
  }>(frozenSelectionFile);
  const test = await readSealed<{
    holders: {
      rank: number;
      track: string;
      id: string;
      evidence: EvidenceView;
      gates: { gates: Record<string, boolean>; status: string };
      deep: { test: { net: number } };
    }[];
    controls: Record<string, { evidence: EvidenceView; deep: { test: { net: number } } }>;
    nominations: { rank: number; track: string; role: string; id: string; status: string }[];
    outcome: { class: string; primaryNominee: { rank: number; id: string } | null } | null;
  }>(testFile('F24'));
  const confirm = await readSealed<{ confirmation: { identical: boolean } }>(testConfirmFile('F24'));
  const holders = frozen.rankedByFold.F24 ?? [];
  const vg2Test = test.controls['S8-VG2-balanced']!;
  const qualificationOfTrack: Record<
    string,
    {
      candidates: { id: string; evidence: EvidenceView; qualification: { gates: Record<string, boolean> } }[];
      controls: Record<string, { evidence: EvidenceView }>;
    }
  > = {};

  for (const track of new Set(holders.map((h) => h.track)))
    qualificationOfTrack[track] = await readSealed(qualificationFile(track, 'F24'));

  // the daily marks of every holder and VG #2 on the F24 run (recomputed; must reproduce the sealed centres)
  const vg2Books = (await controlsOf(['S8-VG2-balanced']))['S8-VG2-balanced']!;
  const symbols = [...new Set([...holders.flatMap((h) => Object.keys(h.books)), ...Object.keys(vg2Books)])];
  const door = await openDoor('post', symbols, 'user-preference assessment (report-only)');
  const ev = new P9Evaluator(door);
  const ranges = ev.ranges();
  const rangeOf = (key: string) => ranges.find((r) => r.key === key || r.key === `${key}~partial`)!;
  const vg2Marks = ev.replay(vg2Books).marks;

  if (Math.abs(vg2Marks[door.lastIndex]! - vg2Test.evidence.centre.record.net) > 0.005)
    throw new Error('preference: VG #2 does not reproduce its sealed F24 centre');

  const diffSeries = (marks: Float64Array, key: string) => {
    const range = rangeOf(key);
    const out: number[] = [];

    for (let i = range.first; i <= range.last; i++) {
      const prev = i > 0 ? marks[i - 1]! - vg2Marks[i - 1]! : 0;

      out.push(marks[i]! - vg2Marks[i]! - prev);
    }

    return out;
  };
  const marksOf = holders.map((h) => {
    const sealed = test.holders.find((t) => t.rank === h.rank)!;
    const marks = ev.replay(h.books).marks;

    if (Math.abs(marks[door.lastIndex]! - sealed.evidence.centre.record.net) > 0.005)
      throw new Error(`preference: holder #${h.rank} does not reproduce its sealed F24 centre`);

    return marks;
  });
  const comparison = (key: 'TEST-F24' | 'FULL') => {
    const series = marksOf.map((marks) => diffSeries(marks, key));
    const observed = series.map((s) => s.reduce((a, b) => a + b, 0));
    const totals = series.length
      ? stationaryBootstrap(
          series,
          bootstrap.blockLength,
          bootstrap.resamples,
          rngOf(['preference', 'F24', 'familywise', key])
        )
      : [];

    return { observed, totals, familywise: series.length ? maxT(observed, totals) : [] };
  };
  const testWindow = comparison('TEST-F24');
  const fullRun = comparison('FULL');
  const primary = test.outcome?.primaryNominee ?? null;
  const primaryIndex = primary ? holders.findIndex((h) => h.rank === primary.rank) : -1;
  const confirmatory =
    primaryIndex >= 0
      ? (() => {
          const series = diffSeries(marksOf[primaryIndex]!, 'TEST-F24');
          const totals = stationaryBootstrap(
            [series],
            bootstrap.blockLength,
            bootstrap.resamples,
            rngOf(['preference', 'F24', 'confirmatory'])
          )[0]!;
          const p05 = percentile(totals, 0.05);

          return {
            holder: `#${primary!.rank} ${primary!.id}`,
            observed: series.reduce((a, b) => a + b, 0),
            p05,
            p50: percentile(totals, 0.5),
            p95: percentile(totals, 0.95),
            shareAboveZero: totals.filter((v) => v > 0).length / totals.length,
            verdict:
              p05 > 0
                ? 'advantage (one-sided 95%)'
                : series.reduce((a, b) => a + b, 0) > 0
                  ? 'inconclusive'
                  : 'no advantage'
          };
        })()
      : null;

  // §9.3 contribution and fill criteria from the sealed post-test diagnostics (review V4)
  const diagnostics = await readSealed<{
    rows: {
      who: string;
      complementarity: { leaveOneOut: Record<string, { net: number }> };
      liquidity: { fills: number; fillsBelowNotional: number; missingFillBars: number };
    }[];
  }>(diagnosticsFile());
  const economicsOf = (rank: number) => {
    const row = diagnostics.rows.find((r) => r.who.startsWith(`#${rank} `));

    if (!row) throw new Error(`preference: no diagnostics row for holder #${rank}`);

    const leaveOneOut = Object.values(row.complementarity.leaveOneOut).map((x) => x.net);
    const share = row.liquidity.fills ? row.liquidity.fillsBelowNotional / row.liquidity.fills : 1;

    return {
      leaveOneOut: row.complementarity.leaveOneOut,
      contribution: !economicCriteria.everyBookPositiveLeaveOneOut || leaveOneOut.every((v) => v > 0),
      fillsBelowNotionalShare: share,
      missingFillBars: row.liquidity.missingFillBars,
      fills:
        share <= economicCriteria.maxFillsBelowNotionalShare &&
        row.liquidity.missingFillBars <= economicCriteria.missingFillBars
    };
  };

  const rows = holders.map((h, index) => {
    const sealed = test.holders.find((t) => t.rank === h.rank)!;
    const q = qualificationOfTrack[h.track]!;
    const candidate = q.candidates.find((c) => c.id === h.id)!;
    const vg2Training = q.controls['S8-VG2-balanced']!.evidence;
    const conf = candidate.evidence;
    const tst = sealed.evidence;
    const confBand = bandOf(conf.decisive.nb.share);
    const testBand = bandOf(tst.decisive.nb.share);
    const order = [preferenceBands.preferred, preferenceBands.conditional, preferenceBands.diagnostic];
    const level = (share: number) => order.findIndex((threshold) => share >= threshold); // 0 best, -1 below 90%
    const lower = Math.min(conf.decisive.nb.share, tst.decisive.nb.share);
    const combined = bandOf(lower); // the lower of the confirmation and the F24 test-family bands
    const need =
      vg2Training.decisive.nb.robustPerYear +
      Math.max(
        compellingCase.robustAdvantageAbsolute,
        compellingCase.robustAdvantageRelative * vg2Training.decisive.nb.robustPerYear
      );
    const items = {
      '1 training economics vs VG #2':
        conf.decisive.nb.medianPerYear >= vg2Training.decisive.nb.medianPerYear &&
        conf.decisive.nb.p10PerYear >= vg2Training.decisive.nb.p10PerYear &&
        conf.decisive.nb.robustPerYear >= need &&
        conf.centre.perYear >= vg2Training.centre.perYear,
      '2 every family alone':
        conf.perRep.every((r) => familyPasses(r.nb)) && tst.perRep.every((r) => familyPasses(r.nb)),
      '3 in-box (Q2b, T2b)': candidate.qualification.gates.Q2b === true && sealed.gates.gates.T2b === true,
      '4 stresses (Q7, T4)': candidate.qualification.gates.Q7 === true && sealed.gates.gates.T4 === true,
      '5 drawdown margin':
        tst.centre.record.dd < compellingCase.maxRunDd && tst.decisive.nb.p90Dd < compellingCase.maxRunDd,
      '6 test window vs VG #2':
        sealed.deep.test.net >= vg2Test.deep.test.net &&
        (tst.decisive.test?.median ?? -Infinity) >= (vg2Test.evidence.decisive.test?.median ?? Infinity)
    };
    const compelling = Object.values(items).every(Boolean);
    const nonFailed = sealed.gates.status !== 'fail';
    const lowerLevel = level(lower);
    const preference = !nonFailed
      ? 'not eligible (T status fail)'
      : lowerLevel === 0
        ? 'preferred band'
        : lowerLevel === 1
          ? compelling
            ? 'conditional band, compelling case met'
            : 'conditional band, compelling case NOT met'
          : lowerLevel === 2
            ? 'diagnostic band (not recommended)'
            : 'below 90%';
    const fw = testWindow.familywise[index]!;
    const isPrimary = index === primaryIndex;
    const versusVg2 = isPrimary
      ? confirmatory!.verdict
      : fw.adjustedP < 0.05
        ? 'advantage (family-wise 5%)'
        : fw.observed > 0
          ? 'inconclusive'
          : 'no advantage';

    return {
      rank: h.rank,
      track: h.track,
      role: h.role,
      id: h.id,
      status: sealed.gates.status,
      confirmation: {
        share: conf.decisive.nb.share,
        n: conf.decisive.nb.n,
        wilsonLower: conf.decisive.wilsonLower ?? wilsonLower(conf.decisive.nb.share, conf.decisive.nb.n),
        perFamily: conf.perRep.map((r) => r.nb.share),
        band: confBand
      },
      test: {
        share: tst.decisive.nb.share,
        n: tst.decisive.nb.n,
        wilsonLower: tst.decisive.wilsonLower,
        perFamily: tst.perRep.map((r) => r.nb.share),
        band: testBand
      },
      combinedBand: combined,
      compellingCase: {
        items,
        all: compelling,
        robustNeeded: need,
        vg2Training: {
          robustPerYear: vg2Training.decisive.nb.robustPerYear,
          medianPerYear: vg2Training.decisive.nb.medianPerYear,
          p10PerYear: vg2Training.decisive.nb.p10PerYear,
          centrePerYear: vg2Training.centre.perYear
        }
      },
      preference,
      versusVg2: {
        testWindow: { observed: fw.observed, se: fw.se, familywiseAdjustedP: fw.adjustedP },
        fullRunDescriptive: {
          observed: fullRun.familywise[index]?.observed ?? NaN,
          se: fullRun.familywise[index]?.se ?? NaN,
          note: 'in-sample for both (training ⊂ full run); descriptive only'
        },
        verdict: versusVg2,
        confirmatory: isPrimary
      },
      economics: economicsOf(h.rank),
      dimensionMatched: {
        d8RobustPerYear: tst.alternates.d8?.nb.robustPerYear ?? null,
        normRobustPerYear: tst.alternates.norm?.nb.robustPerYear ?? null
      }
    };
  });

  const preferred = rows.filter(
    (r) => r.preference === 'preferred band' || r.preference === 'conditional band, compelling case met'
  );
  const record = await writeSealed(out, {
    stage: 'PREFERENCE_ASSESSMENT',
    at: nowIso(),
    note: 'report-only: never changes the mechanical ranking, a status or a nomination; any ex-post preference is descriptive, not an untouched selection',
    confirmIdentical: confirm.confirmation?.identical === true,
    comparisons: {
      holders: rows.length,
      testWindowFamilywise: rows.length,
      confirmatory: confirmatory ? 1 : 0,
      fullRunDescriptive: rows.length
    },
    confirmatory,
    rows,
    decisions: {
      mechanical: { nominations: test.nominations, outcome: test.outcome },
      userPreference: {
        admitted: preferred.map((r) => ({
          rank: r.rank,
          track: r.track,
          role: r.role,
          id: r.id,
          preference: r.preference,
          versusVg2: r.versusVg2.verdict
        })),
        economicallyCompelling: preferred
          .filter((r) => /^advantage/.test(r.versusVg2.verdict) && r.economics.contribution && r.economics.fills)
          .map((r) => ({ rank: r.rank, track: r.track, role: r.role, id: r.id })),
        label: 'descriptive assessment in the mechanical order; not an independently selected winner'
      },
      deployment: 'RESEARCH ONLY — NOT DEPLOYED'
    }
  });

  log(`preference sealed ${record.file} ${record.bodyHash.slice(0, 12)}`);
};
