// The controls (PROTOCOL.md §3): the four fixed family settings resolved from their canonical sources and checked
// against the brief, their complete machine-readable fixtures (every StrategyParams field of D1 including the inactive
// swing fields; Growth's effective configuration and the engine parameters it maps to; the economics), and the fixed
// combined controls built from them.
import fs from 'node:fs';
import path from 'node:path';
import { resolvePhenotype } from '../multi-etf-allocator/phenotypes.ts';
import { resolveAlias } from '../study8-runners/resolve.ts';
import { configId as gId, control4 } from '../growth140-vgt-s8m/space.ts';
import type { Allocation } from './allocator.ts';
import { type D1Grid, d1Keys, d1StrategyParams, growthParamsOf } from './books.ts';
import { chronology, economics, repoRoot, researchDir } from './context.ts';
import { type GConfig, type Joint, effectiveOf, jointId, normalize } from './space.ts';

export const fixturesFile = path.join(researchDir, 'fixtures', 'controls.json');

// The brief's table, in the registry grid's units (tenths of a percentage point, days, sessions).
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
  vg2: {
    targetPercentChange: 235,
    trailingBuyPercentage: 9,
    trailingStopPercentage: 74,
    maximumHoldDays: 15,
    tickWindowSize: 78,
    intradayLossBuffer: 44,
    pullback: 110,
    continuationWindow: 55
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

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export interface Controls {
  d1: { primary: D1Grid; vg2: D1Grid };
  g: { g085: GConfig; g4: GConfig };
  provenance: Record<string, unknown>;
}

export const resolveControls = async (): Promise<Controls> => {
  // D1 shipped primary: the registry phenotype, checked by its resolver against the pinned D1 source.
  const primary = await resolvePhenotype('VGT', 'primary');
  const pGrid = Object.fromEntries(d1Keys.map((k) => [k, primary.grid[k]])) as unknown as D1Grid;

  if (!same(pGrid, briefD1.primary)) throw new Error(`VGT primary ${JSON.stringify(pGrid)} differs from the brief`);

  // VG #2's VGT component: Study 8 F24 rank 2 (s8-vg-balanced = S8-VG-F24-3), resolved through the sealed records.
  const resolved = await resolveAlias('s8-vg-balanced');
  const cfg = resolved.pool.config;

  if (cfg.id !== 'S8-VG-F24-3') throw new Error(`s8-vg-balanced resolved to ${cfg.id}`);

  const vgtBook = cfg.books.find((b) => b.symbol === 'VGT')!;

  if (vgtBook.candidateId !== 'd1-bd80e32ee4') throw new Error(`VG #2 VGT candidate ${vgtBook.candidateId}`);

  const vGrid = Object.fromEntries(
    d1Keys.map((k) => [k, (vgtBook.grid as Record<string, number>)[k]])
  ) as unknown as D1Grid;

  if (!same(vGrid, briefD1.vg2)) throw new Error(`VG #2 VGT ${JSON.stringify(vGrid)} differs from the brief`);

  const vgParams = resolved.pool.phenotypes.VGT!.params;
  const mine = d1StrategyParams(vGrid);

  for (const k of [...d1Keys, 'entryMode', 'postExit', 'stopPolicy'] as const)
    if ((vgParams as unknown as Record<string, unknown>)[k] !== (mine as unknown as Record<string, unknown>)[k])
      throw new Error(`VG #2 VGT ${k}: pool ${String((vgParams as never)[k])} vs ${String((mine as never)[k])}`);

  // Growth 08500a60ec56cfae: growth140-vgt-stable's frozen selection (the exact effective configuration).
  const frozen = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'research/growth140-vgt-stable/FROZEN_SELECTION.json'), 'utf8')
  ) as {
    finalists: { id: string; config: GConfig }[];
  };
  const f085 = frozen.finalists.find((f) => f.id === '08500a60ec56cfae');

  if (!f085) throw new Error('08500a60ec56cfae is not a frozen finalist');

  const g085 = effectiveOf(f085.config);

  if (gId(g085) !== '08500a60ec56cfae') throw new Error(`08500a60 identity ${gId(g085)}`);
  if (!same(g085, effectiveOf(briefG085))) throw new Error('08500a60 differs from the brief');
  if ('intradayLossBufferPercent' in g085 || 'intradayLossBufferEnabled' in g085)
    throw new Error('08500a60: an inactive loss buffer leaked into the effective configuration');

  // Growth #4: the canonical control4 of growth140-vgt-s8m.
  const g4 = effectiveOf(control4);

  if (gId(g4) !== '420cd989e4fa7749') throw new Error(`#4 identity ${gId(g4)}`);

  return {
    d1: { primary: pGrid, vg2: vGrid },
    g: { g085, g4 },
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
        candidateId: vgtBook.candidateId,
        note: 'the VGT book of the VG #2 pool, run alone'
      },
      g085: { source: 'research/growth140-vgt-stable/FROZEN_SELECTION.json finalists', id: '08500a60ec56cfae' },
      g4: { source: 'src/growth140-vgt-s8m/space.ts control4', id: '420cd989e4fa7749' }
    }
  };
};

// The complete fixtures (written once, before the protocol freeze).
export const writeFixtures = (c: Controls) => {
  const d1 = (name: string, g: D1Grid) => ({ name, grid: g, strategyParams: d1StrategyParams(g) });
  const gr = (name: string, g: GConfig) => ({
    name,
    id: gId(g),
    effective: g,
    engineParams: growthParamsOf(g, { from: chronology.firstSession, to: chronology.developmentEnd })
  });
  const body = {
    kind: 'vgt-d1-growth-joint control fixtures',
    economics,
    d1: {
      primary: d1('VGT D1 shipped primary', c.d1.primary),
      vg2: d1("VG #2's VGT component (d1-bd80e32ee4)", c.d1.vg2)
    },
    growth: { g085: gr('Growth 08500a60ec56cfae', c.g.g085), g4: gr('Growth #4 420cd989e4fa7749', c.g.g4) },
    provenance: c.provenance
  };

  fs.mkdirSync(path.dirname(fixturesFile), { recursive: true });
  fs.writeFileSync(
    fixturesFile,
    `${JSON.stringify(body, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 1)}\n`
  );
  return body;
};

// The control configurations as joint configurations (PROTOCOL.md §3.4).
export const D1_FIRST: Allocation = { arch: 'A', d1Target: 1, gTarget: 1, first: 'D1' };

export interface ControlSpec {
  label: string;
  joint: Joint;
  enabled?: { D1: boolean; G: boolean };
}

export const controlSpecs = (c: Controls): ControlSpec[] => {
  const out: ControlSpec[] = [];
  const j = (d1: D1Grid, g: GConfig, a: Allocation) => normalize({ d1, g, a });

  out.push({ label: 'D1 primary alone', joint: j(c.d1.primary, c.g.g085, D1_FIRST), enabled: { D1: true, G: false } });
  out.push({ label: 'D1 VG#2-VGT alone', joint: j(c.d1.vg2, c.g.g085, D1_FIRST), enabled: { D1: true, G: false } });
  out.push({
    label: 'Growth 08500a60 alone',
    joint: j(c.d1.primary, c.g.g085, D1_FIRST),
    enabled: { D1: false, G: true }
  });
  out.push({ label: 'Growth #4 alone', joint: j(c.d1.primary, c.g.g4, D1_FIRST), enabled: { D1: false, G: true } });

  for (const [dn, d] of [
    ['primary', c.d1.primary],
    ['VG#2-VGT', c.d1.vg2]
  ] as const)
    for (const [gn, g] of [
      ['08500a60', c.g.g085],
      ['#4', c.g.g4]
    ] as const)
      for (const [an, a] of [
        ['A', D1_FIRST],
        ['B 100/100', { arch: 'B', d1Target: 1, gTarget: 1, first: 'D1' }],
        ['B 50/50', { arch: 'B', d1Target: 0.5, gTarget: 0.5, first: 'D1' }]
      ] as [string, Allocation][])
        out.push({ label: `D1 ${dn} + Growth ${gn} · ${an}`, joint: j(d, g, a) });

  return out;
};

export { jointId };
