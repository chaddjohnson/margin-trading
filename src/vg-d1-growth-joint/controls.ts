// The controls and incumbents (PROTOCOL.md §4): every fixed vector resolved from its canonical source and checked
// against the brief, their complete machine-readable fixtures (every StrategyParams field of D1 including the inactive
// swing fields; Growth's effective configuration and the engine parameters it maps to; the economics), and the fixed
// controls and unchanged combinations built from them.
//
// - VG #2 Balanced: s8-vg-balanced = S8-VG-F24-3 (Study 8 F24 rank 2), BOTH books (VGT d1-bd80e32ee4, GDX
//   d1-7b99d2833d), resolved through Study 8's sealed records by its runner's resolver; the two books are kept together.
// - D1 shipped VGT primary: the registry phenotype (Priority 2's control; the VGT-only comparators).
// - Growth #4 420cd989e4fa7749 (growth140-vgt-s8m control4) and Growth 08500a60ec56cfae (growth140-vgt-stable's frozen
//   finalist): VGT Growth incumbents.
// - Appendix A (GDX Growth, browser preview PV-3a29…/R-000040): no backend archive exists; the brief's active-setting
//   transcription is mapped to the Growth 1.4.0 schema below with every value explicit, validated by the browser's own
//   validator, and reduced to its effective configuration. Its known full-history standalone figures are compared at
//   the final validation stage only (brief §3; never used to steer the search).
import fs from 'node:fs';
import path from 'node:path';
import { resolvePhenotype } from '../multi-etf-allocator/phenotypes.ts';
import { resolveAlias } from '../study8-runners/resolve.ts';
import { control4 } from '../growth140-vgt-s8m/space.ts';
import { type D1Grid, d1Keys, d1StrategyParams, growthParamsOf } from './books.ts';
import { type Sym, chronology, economics, repoRoot, researchDir } from './context.ts';
import { type GConfig, type Quad, d1Placeholder, effectiveOf, gId, normalize, quadId } from './space.ts';
import { growthDefaults } from '../growth140-vgt-s8m/space.ts';

export const fixturesFile = path.join(researchDir, 'fixtures', 'controls.json');

// The brief's and the registry's values, in the registry grid's units (tenths of a percentage point, days, sessions).
export const briefD1 = {
  primary: {
    targetPercentChange: 216,
    trailingBuyPercentage: 3,
    trailingStopPercentage: 73,
    maximumHoldDays: 8,
    tickWindowSize: 74,
    intradayLossBuffer: 29,
    pullback: 90,
    continuationWindow: 60
  },
  vg2VGT: {
    targetPercentChange: 235,
    trailingBuyPercentage: 9,
    trailingStopPercentage: 74,
    maximumHoldDays: 15,
    tickWindowSize: 78,
    intradayLossBuffer: 44,
    pullback: 110,
    continuationWindow: 55
  },
  vg2GDX: {
    targetPercentChange: 276,
    trailingBuyPercentage: 1,
    trailingStopPercentage: 57,
    maximumHoldDays: 12,
    tickWindowSize: 243,
    intradayLossBuffer: 29,
    pullback: 152,
    continuationWindow: 12
  }
} satisfies Record<string, D1Grid>;

export const briefG085: GConfig = {
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 1,
  recentLowLookbackBars: 80,
  trendFilterEnabled: true,
  trendMethod: 'price_change',
  trendChangeLookbackSessions: 10,
  trendChangeMinimumReturnPercent: -5,
  eligibilityEnabled: true,
  eligibilityPolicy: 'reset_renew',
  eligibilityMaxAgeSessions: 24,
  eligibilityResetDropPercent: 5.5,
  eligibilityRenewalReboundPercent: 5,
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 90,
  dipThresholdPercent: 2,
  recoveryRetracementPercent: 30,
  recoveryConfirmationSessions: 4,
  trailingStopPercent: 9,
  maximumHoldEnabled: false,
  initialStopEnabled: true,
  initialStopAtrSessions: 55,
  initialStopAtrMultiple: 1,
  retentionEnabled: true,
  retentionSellPercent: 50,
  retentionSmaSessions: 160,
  retentionClosesBelow: 1,
  continuationEnabled: true,
  continuationMethod: 'ma_cross',
  continuationWindowSessions: 50,
  crossSmaBars: 110,
  crossRisingBars: 19,
  crossMinimumSlopePercent: 0.4,
  crossMarginPercent: 2.75,
  costBpsPerSide: 5
};

// Appendix A, row by row (every active setting of the transcription; nothing else is active):
//   entry Rise from recent low, advance 3%, lookback 22 bars; trend filter ON price change over 30 sessions, minimum
//   return −2%; persistent eligibility ON, time-limited, maximum age 20 sessions; Drawdown Recovery Gate ON, lookback
//   60, decline 10%, retracement 49%, confirmation 2; trailing stop 7%; maximum losing hold OFF (its buffered loss rule
//   inactive); initial risk stop ON, 2 × ATR(20); trend retention OFF; continuation ON, shallow pullback + recovery,
//   window 60, uptrend SMA 50 bars, slope 10 bars, minimum rise 0%, pullback 1.5%–8%, recovery 2%; 5 bps per side.
//   (Standalone principal $100,000, no compounding, 11% simple 365-day interest: the economics, not parameters.)
export const appendixA: GConfig = {
  entryMethod: 'rise_from_recent_low',
  advanceFromRecentLowPercent: 3,
  recentLowLookbackBars: 22,
  trendFilterEnabled: true,
  trendMethod: 'price_change',
  trendChangeLookbackSessions: 30,
  trendChangeMinimumReturnPercent: -2,
  eligibilityEnabled: true,
  eligibilityPolicy: 'time_limited',
  eligibilityMaxAgeSessions: 20,
  drawdownRecoveryGateEnabled: true,
  dipLookbackSessions: 60,
  dipThresholdPercent: 10,
  recoveryRetracementPercent: 49,
  recoveryConfirmationSessions: 2,
  trailingStopPercent: 7,
  maximumHoldEnabled: false,
  initialStopEnabled: true,
  initialStopAtrSessions: 20,
  initialStopAtrMultiple: 2,
  retentionEnabled: false,
  continuationEnabled: true,
  continuationMethod: 'shallow_pullback',
  continuationWindowSessions: 60,
  uptrendSmaBars: 50,
  uptrendSlopeBars: 10,
  uptrendMinimumRisePercent: 0,
  pullbackMinimumPercent: 1.5,
  pullbackMaximumPercent: 8,
  recoveryPercent: 2,
  costBpsPerSide: 5
};

// Appendix A's reproduction target (brief Appendix A): native standalone GDX, 2016-01-04 → 2026-10-30. Compared at
// the final validation stage only.
export const appendixATarget = {
  window: ['2016-01-04', '2026-10-30'],
  net: 141157.37,
  minuteDd: 17709.96,
  closedTrades: 19,
  wins: 17,
  losses: 2,
  open: 0
};

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface Controls {
  d1: { primary: D1Grid; vg2: Record<Sym, D1Grid> };
  g: { g085: GConfig; g4: GConfig; appA: GConfig };
  provenance: Record<string, unknown>;
}

export const resolveControls = async (): Promise<Controls> => {
  // D1 shipped VGT primary: the registry phenotype, checked by its resolver against the pinned D1 source.
  const primary = await resolvePhenotype('VGT', 'primary');
  const pGrid = Object.fromEntries(d1Keys.map((k) => [k, primary.grid[k]])) as unknown as D1Grid;

  if (!same(pGrid, briefD1.primary)) throw new Error(`VGT primary ${JSON.stringify(pGrid)} differs from the brief`);

  // VG #2 Balanced: s8-vg-balanced = S8-VG-F24-3, both books, through the sealed Study 8 records.
  const resolved = await resolveAlias('s8-vg-balanced');
  const cfg = resolved.pool.config;

  if (cfg.id !== 'S8-VG-F24-3') throw new Error(`s8-vg-balanced resolved to ${cfg.id}`);
  if (cfg.books.length !== 2) throw new Error(`VG #2 has ${cfg.books.length} books`);

  const vg2 = {} as Record<Sym, D1Grid>;
  const candidates: Record<string, string> = {};

  for (const s of ['GDX', 'VGT'] as const) {
    const book = cfg.books.find((b) => b.symbol === s)!;
    const want = s === 'VGT' ? 'd1-bd80e32ee4' : 'd1-7b99d2833d';

    if (book.candidateId !== want) throw new Error(`VG #2 ${s} candidate ${book.candidateId}`);

    const grid = Object.fromEntries(
      d1Keys.map((k) => [k, (book.grid as Record<string, number>)[k]])
    ) as unknown as D1Grid;

    if (!same(grid, s === 'VGT' ? briefD1.vg2VGT : briefD1.vg2GDX))
      throw new Error(`VG #2 ${s} ${JSON.stringify(grid)} differs from the registered values`);

    const poolParams = resolved.pool.phenotypes[s]!.params;
    const mine = d1StrategyParams(s, grid);

    for (const k of [...d1Keys, 'entryMode', 'postExit', 'stopPolicy'] as const)
      if ((poolParams as unknown as Record<string, unknown>)[k] !== (mine as unknown as Record<string, unknown>)[k])
        throw new Error(`VG #2 ${s} ${k}: pool ${String((poolParams as never)[k])} vs ${String((mine as never)[k])}`);

    vg2[s] = grid;
    candidates[s] = book.candidateId;
  }

  if (cfg.execution.firstEligibleDate !== chronology.nativeD1Eligibility)
    throw new Error(`VG #2 native arming ${cfg.execution.firstEligibleDate}`);
  if (cfg.funding.fundedSlots !== 1 || cfg.funding.notionalPerTrade !== economics.budget || cfg.funding.compounding)
    throw new Error('VG #2 funding conventions differ');

  // Growth 08500a60ec56cfae: growth140-vgt-stable's frozen selection (the exact effective configuration).
  const frozen = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'research/growth140-vgt-stable/FROZEN_SELECTION.json'), 'utf8')
  ) as { finalists: { id: string; config: GConfig }[] };
  const f085 = frozen.finalists.find((f) => f.id === '08500a60ec56cfae');

  if (!f085) throw new Error('08500a60ec56cfae is not a frozen finalist');

  const g085 = effectiveOf(f085.config);

  if (gId(g085) !== '08500a60ec56cfae') throw new Error(`08500a60 identity ${gId(g085)}`);
  if (!same(g085, effectiveOf(briefG085))) throw new Error('08500a60 differs from its registered values');

  // Growth #4: the canonical control4 of growth140-vgt-s8m.
  const g4 = effectiveOf(control4);

  if (gId(g4) !== '420cd989e4fa7749') throw new Error(`#4 identity ${gId(g4)}`);

  // Appendix A: the transcription's effective configuration (the validator rejects any missing active input).
  const appA = effectiveOf(appendixA);

  if (!same(Object.keys(appA).sort(), Object.keys(appendixA).sort()))
    throw new Error(`Appendix A: the effective keys differ from the transcription (${Object.keys(appA).join(',')})`);
  for (const [k, v] of Object.entries(appendixA))
    if (appA[k] !== v) throw new Error(`Appendix A ${k}: effective ${String(appA[k])} vs transcribed ${String(v)}`);

  return {
    d1: { primary: pGrid, vg2 },
    g: { g085, g4, appA },
    provenance: {
      primary: {
        file: primary.file,
        fileSha256: primary.fileHash,
        candidateId: primary.candidateId,
        checkedAgainst: primary.manifestRole
      },
      vg2: {
        alias: 's8-vg-balanced',
        configuration: cfg.id,
        configFile: 'config/research-pools/study8-expanded-regime-d1/S8-VG-F24-3.json',
        candidates,
        nativeArming: cfg.execution.firstEligibleDate,
        tieOrder: 'same-minute decisions alphabetical (GDX before VGT)',
        selection: 'Study 8 F24 (search 2016-01-04 → 2024-12-31) rank 2, tier strong, role balanced, shortlist #3'
      },
      g085: { source: 'research/growth140-vgt-stable/FROZEN_SELECTION.json finalists', id: '08500a60ec56cfae' },
      g4: { source: 'src/growth140-vgt-s8m/space.ts control4', id: '420cd989e4fa7749' },
      appA: {
        source:
          "brief Appendix A (the user's 'GDX Growth trial ledger.md', preview PV-3a29190f20a3c844263b3d4e9d17f6f7e1e7c28a8d864481c32fab0505a6610f of R-000040)",
        recovery:
          'no backend archive exists (no repository record; the run folder R-000040 is absent, the trash is empty; the preview cache and the Strategy Lab database were not opened); mapped from the transcription with every value explicit',
        id: gId(appA),
        selection:
          'browser-selected with 2016-01-04 → 2026-10-30 in view (informed only; never an earlier-cutoff seed)',
        target: appendixATarget
      }
    }
  };
};

// The complete fixtures (written once, before the protocol freeze).
export const writeFixtures = (c: Controls) => {
  const d1 = (name: string, s: Sym, g: D1Grid) => ({
    name,
    symbol: s,
    grid: g,
    strategyParams: d1StrategyParams(s, g)
  });
  const gr = (name: string, s: Sym, g: GConfig) => ({
    name,
    symbol: s,
    id: gId(g),
    effective: g,
    engineParams: growthParamsOf(g, s, { from: chronology.firstSession, to: chronology.developmentEnd })
  });
  const body = {
    kind: 'vg-d1-growth-joint control fixtures',
    economics,
    d1: {
      vg2GDX: d1("VG #2's GDX book (d1-7b99d2833d)", 'GDX', c.d1.vg2.GDX),
      vg2VGT: d1("VG #2's VGT book (d1-bd80e32ee4)", 'VGT', c.d1.vg2.VGT),
      primary: d1('VGT D1 shipped primary', 'VGT', c.d1.primary)
    },
    growth: {
      g4: gr('Growth #4 420cd989e4fa7749', 'VGT', c.g.g4),
      g085: gr('Growth 08500a60ec56cfae', 'VGT', c.g.g085),
      appA: gr(`Appendix A GDX Growth ${gId(c.g.appA)}`, 'GDX', c.g.appA)
    },
    provenance: c.provenance
  };

  fs.mkdirSync(path.dirname(fixturesFile), { recursive: true });
  fs.writeFileSync(
    fixturesFile,
    `${JSON.stringify(body, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1)}\n`
  );
  return body;
};

// ----- the control configurations (PROTOCOL.md §4.1) -----

// A placeholder Growth vector for a component that is disabled (never run, never funded).
export const gPlaceholder: GConfig = growthDefaults;

export interface ControlSpec {
  key: string;
  label: string;
  group: 'D1-only' | 'Growth-only' | 'VGT-only' | 'three-component' | 'unchanged four-component';
  quad: Quad;
  enabled: Record<string, boolean>; // the enabled components (all four unless listed false)
  selectable: boolean; // a four-component unchanged combination (selectable in the informed set)
  native?: boolean; // VG #2's native conventions (parity and the bridge only)
}

const q = (d1: Quad['d1'], g: Quad['g'], first: Quad['first']) => normalize({ d1, g, first });
const off = (...ids: string[]) => Object.fromEntries(ids.map((b) => [b, false]));

export const controlSpecs = (c: Controls): ControlSpec[] => {
  const vg2 = c.d1.vg2;
  const out: ControlSpec[] = [
    {
      key: 'vg2',
      label: 'VG #2 Balanced (D1·GDX + D1·VGT)',
      group: 'D1-only',
      quad: q(vg2, { GDX: gPlaceholder, VGT: gPlaceholder }, 'D1'),
      enabled: off('G:GDX', 'G:VGT'),
      selectable: false
    },
    {
      key: 'g4+appA',
      label: 'Growth pair: #4 (VGT) + Appendix A (GDX)',
      group: 'Growth-only',
      quad: q({ GDX: d1Placeholder, VGT: d1Placeholder }, { GDX: c.g.appA, VGT: c.g.g4 }, 'D1'),
      enabled: off('D1:GDX', 'D1:VGT'),
      selectable: false
    },
    {
      key: 'g085+appA',
      label: 'Growth pair: 08500a60 (VGT) + Appendix A (GDX)',
      group: 'Growth-only',
      quad: q({ GDX: d1Placeholder, VGT: d1Placeholder }, { GDX: c.g.appA, VGT: c.g.g085 }, 'D1'),
      enabled: off('D1:GDX', 'D1:VGT'),
      selectable: false
    },
    {
      key: 'appA',
      label: 'Appendix A GDX Growth alone',
      group: 'Growth-only',
      quad: q({ GDX: d1Placeholder, VGT: d1Placeholder }, { GDX: c.g.appA, VGT: gPlaceholder }, 'D1'),
      enabled: off('D1:GDX', 'D1:VGT', 'G:VGT'),
      selectable: false
    },
    {
      key: 'p2:primary+g4',
      label: 'VGT only: D1 primary + Growth #4 · A (Priority 2)',
      group: 'VGT-only',
      quad: q({ GDX: d1Placeholder, VGT: c.d1.primary }, { GDX: gPlaceholder, VGT: c.g.g4 }, 'D1'),
      enabled: off('D1:GDX', 'G:GDX'),
      selectable: false
    },
    {
      key: 'p2:primary+g085',
      label: 'VGT only: D1 primary + Growth 08500a60 · A (Priority 2)',
      group: 'VGT-only',
      quad: q({ GDX: d1Placeholder, VGT: c.d1.primary }, { GDX: gPlaceholder, VGT: c.g.g085 }, 'D1'),
      enabled: off('D1:GDX', 'G:GDX'),
      selectable: false
    },
    {
      key: 'vg2+g4',
      label: 'VG #2 + Growth #4 (VGT) — three components',
      group: 'three-component',
      quad: q(vg2, { GDX: gPlaceholder, VGT: c.g.g4 }, 'D1'),
      enabled: off('G:GDX'),
      selectable: false
    },
    {
      key: 'vg2+g085',
      label: 'VG #2 + Growth 08500a60 (VGT) — three components',
      group: 'three-component',
      quad: q(vg2, { GDX: gPlaceholder, VGT: c.g.g085 }, 'D1'),
      enabled: off('G:GDX'),
      selectable: false
    },
    {
      key: 'vg2+g4+appA',
      label: 'VG #2 + Growth #4 (VGT) + Appendix A (GDX)',
      group: 'unchanged four-component',
      quad: q(vg2, { GDX: c.g.appA, VGT: c.g.g4 }, 'D1'),
      enabled: {},
      selectable: true
    },
    {
      key: 'vg2+g085+appA',
      label: 'VG #2 + Growth 08500a60 (VGT) + Appendix A (GDX)',
      group: 'unchanged four-component',
      quad: q(vg2, { GDX: c.g.appA, VGT: c.g.g085 }, 'D1'),
      enabled: {},
      selectable: true
    }
  ];

  for (const x of out) if (quadId(x.quad).length !== 16) throw new Error('bad control identity');

  return out;
};

// ----- the control manifest (sealed and committed before any pooled result of a combined control exists) -----

export const controlManifestFile = path.join(researchDir, 'CONTROL_MANIFEST.json');

export const controlManifestOf = (c: Controls, extra: Record<string, unknown>) => ({
  kind: 'vg-d1-growth-joint control manifest',
  note: 'Frozen before any pooled result of a combined control (D1 + Growth) of this study existed. The vectors are immutable for the whole study; the joint-refinement arm never overwrites them.',
  conventions: {
    harmonized:
      'the study convention for every comparison: funding from 2016-01-04, D1 arming from the first session (each D1 machine arms once its L-session reference high exists), Growth warm-up 0, one exclusive $100,000 slot, same-instant tie order D1-first then GDX before VGT (Growth-first reported as a toggle)',
    native:
      "VG #2's native Study 8 convention (parity and the native-to-harmonized bridge only): D1 arming on 2017-06-15, accounting from the close of 2016-01-04, same-minute ties alphabetical (GDX before VGT)",
    economics
  },
  incumbents: {
    vg2: { GDX: c.d1.vg2.GDX, VGT: c.d1.vg2.VGT },
    d1PrimaryVGT: c.d1.primary,
    growth4: { id: gId(c.g.g4), effective: c.g.g4 },
    growth085: { id: gId(c.g.g085), effective: c.g.g085 },
    appendixA: { id: gId(c.g.appA), effective: c.g.appA, transcription: appendixA, target: appendixATarget }
  },
  provenance: c.provenance,
  controls: controlSpecs(c).map((x) => ({
    key: x.key,
    label: x.label,
    group: x.group,
    id: quadId(x.quad),
    selectable: x.selectable,
    enabled: Object.fromEntries(
      (['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const).map((b) => [b, x.enabled[b] !== false])
    ),
    first: x.quad.first,
    quad: x.quad
  })),
  ...extra
});
