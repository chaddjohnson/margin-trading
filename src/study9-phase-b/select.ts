// Study 9 Phase B: Study 8's selection freeze (src/study8-expanded-regime-d1/select.ts), ported line for line over this
// study's seven tracks; assignRoles and jaccard are Study 8's, imported unchanged. Additions are report-only: each
// holder's user-preference band (context.ts bandOf, on the confirmation share, never used for ranking), the comparator
// identities and Study 8's selection body hash.
//
// The selection freeze (PROTOCOL.md §8.2): for every track × fold, roles taken in the TRAINING-side order of the
// selection families (search door only), each role going to the first QUALIFIED candidate in that order (in-sample
// qualification is a veto, never a ranking), distinct at normalized L∞ ≥ 0.10, plus at most two further qualified
// members ("extra") that are also behaviourally distinct (training funded-ledger Jaccard < 0.5 against every holder
// already taken); per fold, a tier and a ranked list from the training-window confirmation figures
// (robust profit per year against B1's). Sealed in FROZEN_SELECTION.json before any test door can open; the test doors
// only flag (block-only), they never re-rank, replace or re-select.
import fs from 'fs-extra';
import { assignRoles, jaccard, maxExtraJaccard, maxExtraPerTrackFold } from '../study8-expanded-regime-d1/select.ts';
import {
  type FoldKey,
  type TrackKey,
  bandOf,
  constantsSnapshot,
  eligibility,
  insufficientTestLots,
  frozenSelectionFile,
  primaryFold,
  protocolFreezeFile,
  qualifyControlKeys,
  testControlKeys,
  testControlKeysF24,
  testGates,
  activeFolds,
  activeTracks,
  tracks
} from './context.ts';
import { controlsOf, study8Ranked } from './controls.ts';
import type { Books } from './engine.ts';
import { constantsDigest, engineDigest } from './integrity.ts';
import { qualificationFile } from './qualify.ts';
import { codeDigest, fileSha256, log, nowIso, readSealed, requirePhase, writeSealed } from './records.ts';
import { searchFile } from './search.ts';

export { assignRoles, jaccard, maxExtraJaccard, maxExtraPerTrackFold };

interface Nb {
  robustPerYear: number;
  medianPerYear: number;
  p90Dd: number;
  share: number;
  n: number;
}

interface Candidate {
  rank: number;
  id: string;
  pick: string;
  books: Books;
  trainingSelection: Nb;
  evidence: { decisive: { nb: Nb; wilsonLower: number } };
  qualification: { qualified: boolean; failed: string[]; marginal: boolean };
  ledger: string[];
}

interface Qualification {
  candidates: Candidate[];
  controls: Record<string, { evidence: { decisive: { nb: Nb } } }>;
  bodyHash: string;
}

export const runFreezeSelection = async () => {
  if (await fs.pathExists(frozenSelectionFile)) throw new Error(`${frozenSelectionFile} exists (sealed)`);

  if (!(process.env.STUDY9B_SMOKE === '1')) await requirePhase('qualify');

  const records: Record<string, { file: string; bodyHash: string; fileSha256: string }> = {};
  const qualifications: Record<string, Qualification> = {};

  for (const track of activeTracks()) {
    for (const fold of activeFolds()) {
      for (const file of [searchFile(track, fold), qualificationFile(track, fold)]) {
        const sealed = await readSealed<{ bodyHash: string }>(file);

        records[file] = { file, bodyHash: sealed.bodyHash, fileSha256: await fileSha256(file) };
      }

      qualifications[`${track}/${fold}`] = await readSealed<Qualification>(qualificationFile(track, fold));
    }
  }

  const roles: Record<string, unknown>[] = [];
  const qualification: Record<string, unknown> = {};

  for (const track of activeTracks()) {
    for (const fold of activeFolds()) {
      const record = qualifications[`${track}/${fold}`]!;
      const list = record.candidates;
      const symbols = [...tracks[track].books];

      for (const { role, holder } of assignRoles(list, symbols)) {
        roles.push(
          holder
            ? {
                track,
                fold,
                role,
                id: holder.id,
                books: holder.books,
                trainingSelection: holder.trainingSelection,
                confirmation: holder.evidence.decisive.nb,
                wilsonLower: holder.evidence.decisive.wilsonLower,
                marginal: holder.qualification.marginal,
                band: bandOf(holder.evidence.decisive.nb.share)
              }
            : { track, fold, role, id: null }
        );
      }

      qualification[`${track}/${fold}`] = list.map((c) => ({
        id: c.id,
        pick: c.pick,
        qualified: c.qualification.qualified,
        failed: c.qualification.failed,
        marginal: c.qualification.marginal
      }));
    }
  }

  // per fold: tier and ranked list from the training-window confirmation figures against B1's on the same run
  type Holder = {
    track: TrackKey;
    fold: FoldKey;
    role: string;
    id: string;
    books: Books;
    confirmation: Nb;
    marginal: boolean;
  };
  const holders = roles.filter((r) => r.id) as Holder[];
  const rankedByFold = Object.fromEntries(
    activeFolds().map((fold) => [
      fold,
      holders
        .filter((h) => h.fold === fold)
        .map((h) => {
          const b1 = qualifications[`${h.track}/${h.fold}`]!.controls.B1!.evidence.decisive.nb;

          return {
            ...h,
            tier: h.confirmation.robustPerYear >= b1.robustPerYear ? 'strong' : 'modest',
            b1RobustPerYear: b1.robustPerYear,
            robustPerYear: h.confirmation.robustPerYear
          };
        })
        .sort(
          (a, b) =>
            (a.tier === b.tier ? 0 : a.tier === 'strong' ? -1 : 1) ||
            b.robustPerYear - a.robustPerYear ||
            a.confirmation.p90Dd - b.confirmation.p90Dd ||
            (a.id < b.id ? -1 : 1)
        )
        .map((row, index) => ({ rank: index + 1, ...row }))
    ])
  );
  const testPlan = Object.fromEntries(
    activeFolds().map((fold) => [
      fold,
      {
        roleHolders: rankedByFold[fold]!.map((r) => ({ track: r.track, id: r.id, books: r.books, rank: r.rank })),
        // every shortlist member, in its track's shortlist order, with its training figures (§8.5 diagnostics)
        shortlists: activeTracks().flatMap((track) =>
          qualifications[`${track}/${fold}`]!.candidates.map((c) => ({
            track,
            id: c.id,
            order: c.rank,
            pick: c.pick,
            qualified: c.qualification.qualified,
            selectionRobustPerYear: c.trainingSelection.robustPerYear,
            confirmationRobustPerYear: c.evidence.decisive.nb.robustPerYear,
            books: c.books
          }))
        )
      }
    ])
  );
  const freeze =
    process.env.STUDY9B_SMOKE === '1'
      ? { protocol: { sha256: 'smoke (no freeze)' } }
      : await readSealed<{ protocol: { sha256: string } }>(protocolFreezeFile);
  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    frozenAt: nowIso(),
    protocol: { freeze: protocolFreezeFile, sha256: freeze.protocol.sha256 },
    code: await codeDigest(),
    engine: await engineDigest(),
    constants: { sha256: constantsDigest(), values: constantsSnapshot() },
    records,
    qualification,
    roles,
    rankedByFold,
    primaryFold,
    primaryRanked: rankedByFold[primaryFold],
    tracks,
    comparators: {
      study8Selection: (await study8Ranked()).bodyHash,
      qualification: await controlsOf(qualifyControlKeys),
      test: { allFolds: [...testControlKeys], F24: [...testControlKeysF24] }
    },
    testRules: {
      T1: 'centre minute DD over the continuous run to the test end < $35,000',
      T2: 'test sets 1–3 (fresh seeds, 128 each) pooled share < $35k ≥ 0.90 and pooled p90 < $35,000 on the run to the test end; T2b: in-box pair likewise when a coordinate is within r of a bound',
      T3: `test-window centre net ≥ $${testGates.centrePerTestYear} per test year, and pooled test-set median test-window net > 0 and ≥ $${testGates.medianPerTestYear} per test year`,
      T4: 'under 10 bps, 14% interest, next-open stops and +25 bps slippage: test-window centre net > 0 and run DD < $35,000',
      T5: `on the run to the test end: best calendar year (2026 counted as a year) ≤ ${eligibility.topYearShare * 100}% of net; ex-best-year economy ≥ $${eligibility.exBestPerYear}/yr; largest lot ≤ ${eligibility.topLotShare * 100}% of net`,
      T6: `activity: on the run to the test end the Q5 floors with y = the run's years (lots ≥ ⌈${eligibility.lotsPerYear}·y⌉, episodes ≥ ⌈${eligibility.episodesPerYear}·y⌉, lot years ≥ ${eligibility.minLotYears}, every pooled book ≥ ⌈0.4·y⌉ lots); and in the test window new funded lots ≥ ⌈${testGates.testLotsPerYear}·yTest⌉ and new episodes ≥ ⌈${testGates.testEpisodesPerYear}·yTest⌉`,
      T7: `capital efficiency: net per occupied $100k-year on the run to the test end ≥ $${eligibility.perCapitalYear}`,
      ambiguous: `passes T1–T7 but the pooled share is ≤ ${testGates.marginalShare}, at least one test set fails T2, or the centre DD is ≥ $${testGates.marginalCentreDd}`,
      blockOnly: 'the test doors flag; they never re-rank, replace or re-select',
      nomination:
        'F24 role holders with status pass (or ambiguous, labelled) in the sealed F24 order; the primary nominee is the top-ranked one; possibly none',
      outcome:
        'qualified (≥ 1 nomination) | stable-but-weaker only (an F24 role holder passes T1, T2 and T2b but fails another T gate) | none',
      persistence:
        'per fold: non-failed role holders ÷ role holders; non-failed shortlist members ÷ shortlist members (qualified and not, separately); descriptive',
      insufficient: `a fold with no role holder, or whose role holders took fewer than ${insufficientTestLots} new funded test-window lots in total, is "insufficient evidence"`
    },
    testPlan
  });

  log(
    `selection frozen: ${record.file} ${record.bodyHash.slice(0, 12)}; role holders by fold ${activeFolds()
      .map((f) => `${f} ${rankedByFold[f]!.length}`)
      .join(', ')}`
  );
};
