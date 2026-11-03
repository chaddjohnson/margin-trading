// EXPERIMENT_MATRIX.json: the machine-readable experiment (folds, triples, pools, arms, K, budgets, seeds, sample
// sizes, rules, metrics, decision rules), generated from context.ts so the matrix and the code cannot drift. Written
// before the protocol freeze, which binds it.
import fs from 'fs-extra';
import {
  decision,
  folds,
  libraryKs,
  matrixFile,
  newSearch,
  primaryK,
  rollingTrack,
  rules,
  source,
  study,
  triggers,
  triples
} from './context.ts';
import { eligibleSymbols } from './doors.ts';

export const buildMatrix = async () => {
  const symbols = await eligibleSymbols();

  return {
    schema: 'd1-wide-library-experiment-matrix',
    schemaVersion: 1,
    study: study.id,
    universe: { file: source.universeFile, symbols: symbols.length, list: symbols },
    conventions: {
      principal: study.principal,
      rate: study.rate,
      costBps: study.costBps,
      costGrid: study.costGrid,
      ddCeiling: study.ddCeiling,
      firstSession: study.firstSession,
      armingDate: study.armingDate,
      researchCap: study.researchCap,
      portfolio: { core: 300000, voog: 0.6, vgt: 0.4, fraction: 0.2, preferredDailyDd: 0.3, ceilingDailyDd: 0.35 }
    },
    folds,
    rollingTrack,
    triples,
    pools: {
      ARCH: 'every reconstructed row of the source window archive (Sobol 2,048 + local search), folds A and B only',
      'ARCH-S':
        'descriptive budget-matched ablation: the first 1,024 archived Sobol rows (vs NEW-S); enters no verdict',
      NEW: 'this study: 1,024 Sobol + ≤ 128 refinements per ETF and fold (training-only, objective T)',
      'NEW-S': 'NEW without refinements (Sobol only; the refinement ablation)',
      ALL: 'ARCH ∪ NEW (folds A and B)'
    },
    arms: {
      A0: 'sealed source representative (survivor) and library; folds A and B, ARCH only',
      A0r: 'the narrow rule on the pool: top 8 by J_s (distinct signatures), J_nb over 16 draws, representative, library ≤ 4',
      A1: 'top-K families by J_s, nominee = max J_nb (16 draws), J_nb > 0 and J_s > 0',
      A1n: 'descriptive ablation: top-K credible by J_s with distinct signatures (no family deduplication), A1’s nominee rule; enters no verdict',
      A2: 'top-K families by T, nominee = max T_nb (16 draws) among members with ≥ 2 entry years, T_nb > 0',
      A3: 'top-K families by order-independent support (credible Sobol vectors within d ≤ 0.5 of the medoid; members = medoids), 48 draws, filters (profitable ≥ 75%, DD ≤ $35k ≥ 75%, worst ≥ −$15k, ≥ 2 catalog families), nominee = max P25 > 0',
      A4: 'nested: A2(K) library, nominee = max selection-window V with ≥ 1 lot and windowed minute DD ≤ $35k, V > 0'
    },
    libraryKs,
    primaryK,
    rules,
    newSearch: { ...newSearch, maxPerEtfFold: newSearch.sobol + newSearch.refinements },
    triggers,
    decision,
    seeds: {
      sobol: `sobolVectors(symbol, ${newSearch.sobol}, '${study.seedLabel}:new-search') → deriveSeed('${source.seedLabel}', '${study.seedLabel}:new-search', symbol)`,
      refine: `Rng.from('${study.seedLabel}', 'refine', fold, symbol, start, round)`,
      draws: `neighbour(books, stage, cls, draw) with the source seed label '${source.seedLabel}'; stages: ${Object.values(
        folds
      )
        .map((fold) => `${fold.key} '${fold.drawStage}'`)
        .join(', ')}`,
      capture: `neighbour(books, 'd1-wide-library:capture:<fold>', 'N1', 0..15) (evaluation-window diagnostics only)`
    },
    sampleSizes: {
      etfs: symbols.length,
      clusters: 15,
      primaryFolds: 2,
      rollingYears: rollingTrack.length,
      comparisonsPerPrimaryFold: 3 * libraryKs.length * 4,
      nestedComparisons: {
        T1: libraryKs.length * 2 * 2,
        T2: libraryKs.length * 4 * 2,
        note: 'pools × K × 2 comparators (A2(K), baseline)'
      }
    },
    executionOrder: [
      'protocol freeze → code freeze',
      'S18: search → sample parity → libraries',
      'S19: search → sample parity → libraries',
      'fold A: fold-a census (post-freeze) → search → sample parity → libraries',
      'S20: search → sample parity → libraries',
      'phase A evaluation (→ 2021-12-31) → T1 nested selection',
      'fold B: fold-b reconstruction → census → search → sample parity → libraries',
      'phase B-sel (→ 2022-12-30) → T2 nested selection',
      'S22: search → sample parity → libraries',
      'phase B, phase T1-later, phases S18, S19, S20, S22',
      'final-window reconstruction and census (census only) → analysis → tables'
    ],
    calendarDoor:
      'a load ending E refuses unless every fold SELECTION with cutoff < E and every nested SELECTION with selection end < E is sealed and verifies',
    metrics: [
      'realized K, families, credible, A0-library family coverage, discarded families',
      'ETFs with a nominee, window lots, ETFs with any window lot',
      'Σ / mean / median V over 61 ETFs (no nominee = 0) at 0/2/5/10 bps',
      'windowed minute and daily DD, breaches > $35,000, worst window lot and MAE, ES proxy (mean of the worst 10% of window lot nets)',
      'interest, friction, lot-days, net per $1M borrowing dollar-days in the window',
      'window catalog episodes/families, dip-captured share, major-family capture, independent events, continuation trades, falling knives',
      'portfolio overlay: window equity increment over C0, max daily % DD after the boundary',
      'paired vs A0r: mean ΔV (5, 10), W/L/I, cluster CW/CL, breaches',
      'A4: selection V vs later V, random-pick expectation, rank correlation, single-lot picks',
      'top-1/3/5 profit concentration (descriptive only)'
    ],
    decisionRules: {
      baseline: 'the sealed A0 on ARCH (A0r wherever reproduced), A0r on every other pool',
      favourable: 'evaluable ∧ mean ΔV(5) > 0 ∧ mean ΔV(10) > 0 ∧ W > L ∧ CW > CL ∧ B_arm ≤ B_base + 1',
      unfavourable: 'evaluable ∧ mean ΔV(5) < 0 ∧ W < L',
      riskIncompatible: 'B_arm ≥ B_base + 3 (B = nominees with fast-path windowed minute DD > $35,000 at 5 bps)',
      insufficient:
        'W + L < 10, or CW + CL < 5, or < 10 ETFs with V ≠ 0 for the arm, or < 10 for the baseline, or < 10 eligible window catalog families (61 ETFs together); neither favourable nor unfavourable; K denominator stays 4',
      improves:
        'favourable in both primary folds at K = 8 and K = 16 and (at K = 32 in both folds or at K = 64 in both folds); never risk-incompatible',
      worse:
        'unfavourable in both primary folds at K = 8 and 16 and (at 32 in both or at 64 in both), or risk-incompatible in either fold at K = 16',
      precedence: 'improves → worse → insufficient evidence → no evidence → mixed (the first rule that holds applies)',
      insufficientVerdict: 'an insufficient K = 16 cell in either primary fold (→ mixed / inconclusive at study level)',
      noEvidence: 'favourable in neither primary fold at K = 16 (and not worse, not insufficient)',
      mixed: 'otherwise',
      acrossEtf:
        'Δ top-5 Σ V > 0 at 5 and 10 bps in both folds at K = 8, 16 and 32 or 64 (improves); < 0 at 5 bps likewise (worse); else mixed',
      nested:
        'primary cell T1/NEW; a cell (first rule first): favourable iff A4(K) favourable against both A2(K) and the baseline at K = 8, 16 and (32 or 64, the same K in both folds/comparisons); worse iff unfavourable against both likewise; insufficient iff either K = 16 comparison is insufficient; no evidence iff neither K = 16 comparison is favourable; else mixed. Verdict: retains an advantage iff T1/NEW favourable and T1/NEW-S not worse; is worse iff T1/NEW worse; else T1/NEW’s state. Nested across-ETF: improves iff improves against both top-5 comparators; worse iff worse against both; else mixed. T2 secondary, never a replication; reported beside, not inside, the study outcome',
      studyOutcome: [
        'evidence for an improved selection procedure: an arm "improves" on ARCH, is "worse" on neither NEW nor ALL, and is favourable in ≥ 3 of 5 rolling years',
        'new procedure is materially worse: A1, A2 and A3 all "worse" on ARCH',
        'mixed / inconclusive: neither, and some arm favourable at K = 16 in both primary folds on some verdict pool, or "improves" on a non-ARCH pool, or "insufficient evidence" on ARCH',
        'no demonstrated improvement: otherwise'
      ]
    }
  };
};

export const writeMatrix = async () => {
  const matrix = await buildMatrix();

  await fs.outputFile(matrixFile, `${JSON.stringify(matrix, null, 1)}\n`);

  return matrix;
};
