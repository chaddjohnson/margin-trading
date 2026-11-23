// gpu-backend: encodes one evaluation task (the optimizer's Task: quad, RC 2 controls, EvalOptions, detail) into the
// device's GbCandIn (gb.h), and derives its capability bits. Every parameter is the CPU engine's own value, produced by
// the CPU's own code: D1 through d1StrategyParams and RC 2's canonical controls; Growth through Priority 3's
// growthParamsOf (the Strategy Lab request mapping) and riseTrading.ts's exitParamsOf / assertTradingParams; the pool
// through Priority 3's poolOptionsOf; every percentage fraction with the module's own expression
// (Number(`${p}e-2`), falling back to p / 100). Nothing is approximated: a configuration the GPU does not implement
// raises a capability bit outside GB_SUPPORTED, which makes the server refuse the batch.
import { type Door, indexOnOrAfter } from '../vg-d1-growth-joint/data.ts';
import {
  type BookId,
  type Friction,
  baseFriction,
  bookIds,
  d1StrategyParams,
  growthParamsOf,
  symbolOf
} from '../vg-d1-growth-joint/books.ts';
import { type EvalOptions, growthNextOpenSupported, isEnabled, poolOptionsOf } from '../vg-d1-growth-joint/evaluate.ts';
import { tieOrderOf } from '../vg-d1-growth-joint/pool.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { economics, resolution } from '../vg-d1-growth-joint/context.ts';
import { type RiskConfig2, canonicalConfig2, validateAgainstGrids2 } from '../d1-risk-controls-rc2/config.ts';
import {
  assertTradingParams,
  entryMethodOf,
  exitParamsOf,
  type RiseTradingParams
} from '../growth-trading/riseTrading.ts';
import { fraction as gateFraction } from '../growth-trading/entryGates.ts';
import { fractionOf as rulesFraction } from '../growth-trading/optionalRules.ts';
import { CandIn, D1In, FEATURE, GrowthIn } from './layout.ts';
import { type StagedBook, type StagedConfig, canonicalStaged } from '../staged-stop/config.ts';
import { validateStagedFor } from '../d1-risk-controls-rc3/run.ts';

// the percentage → fraction expression of continuation.ts and drawdownGate.ts (module-private there; identical text)
const fraction = (percent: number) => {
  const f = Number(`${percent}e-2`);

  return Number.isFinite(f) ? f : percent / 100;
};

export interface Task {
  k: string;
  quad: Quad;
  controls: RiskConfig2 | null;
  options: EvalOptions;
  detail: boolean;
  risk?: boolean; // the risk-envelope inputs (trade principal loss, banked-capital drawdown)
  // GPU Phase 8 (protocol v3): the S1 staged trailing stop (staged-stop@1). Present only when some book is ON, so an
  // OFF task is the earlier task object, byte for byte.
  staged?: StagedConfig;
}

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

const TREND = { price_change: 1, regression_slope: 2, rising_sma: 3, higher_highs_lows: 4, momentum: 5 } as const;
const ELIG = { time_limited: 1, minimum_strength: 2, maximum_extension: 3, deterioration: 4, reset_renew: 5 } as const;
const CONT = { classic_d1: 1, breakout: 2, shallow_pullback: 3, ma_cross: 4 } as const;
const TREND_FEATURE = [
  0n,
  FEATURE.G_TREND_PRICE_CHANGE,
  FEATURE.G_TREND_REGRESSION,
  FEATURE.G_TREND_RISING_SMA,
  FEATURE.G_TREND_HHL,
  FEATURE.G_TREND_MOMENTUM
];
const ELIG_FEATURE = [
  0n,
  FEATURE.G_ELIG_TIME_LIMITED,
  FEATURE.G_ELIG_MIN_STRENGTH,
  FEATURE.G_ELIG_MAX_EXTENSION,
  FEATURE.G_ELIG_DETERIORATION,
  FEATURE.G_ELIG_RESET_RENEW
];
const CONT_FEATURE = [
  0n,
  FEATURE.G_CONT_CLASSIC,
  FEATURE.G_CONT_BREAKOUT,
  FEATURE.G_CONT_SHALLOW,
  FEATURE.G_CONT_MA_CROSS
];

export interface GrowthEncoding {
  values: Record<string, number>;
  features: bigint;
  params: RiseTradingParams;
  friction: Friction;
}

// The Growth book of one symbol exactly as Priority 3's booksOf / runGrowthBook / simulateGrowth set it up.
export const encodeGrowth = (door: Door, quad: Quad, b: 'G:GDX' | 'G:VGT', o: EvalOptions): GrowthEncoding => {
  const s = symbolOf(b);
  const fr = frictionOf(o);
  const g = quad.g[s];
  const gfr: Friction = fr.stopFill === 'next-open' && !growthNextOpenSupported(g) ? { ...fr, stopFill: 'stop' } : fr;
  const c = { ...g, costBpsPerSide: gfr.costBps };
  const params = growthParamsOf(c, s, door);

  assertTradingParams(params);
  let features = 0n;

  if (params.resolution !== resolution || params.resolution !== '1d') features |= FEATURE.G_INTRADAY_RESOLUTION;

  const exit = exitParamsOf(params);
  const method = entryMethodOf(params);
  const v: Record<string, number> = {
    enabled: 1,
    entry: method === 'trend_breakout' ? 1 : 0,
    riseFactor: method === 'rise_from_recent_low' ? 1 + params.advanceFromRecentLowPercent / 100 : 0,
    riseN: method === 'rise_from_recent_low' ? params.recentLowLookbackBars : 0,
    tsp: exit.trailingStopPercentage,
    hold: exit.maximumHoldDays,
    buffer: exit.intradayLossBuffer,
    costBps: params.costBpsPerSide,
    rate: gfr.rate,
    slipBps: gfr.stopSlippageBps,
    stopFill: gfr.stopFill === 'stop' ? 0 : 1
  };

  features |= method === 'trend_breakout' ? FEATURE.G_BREAKOUT : FEATURE.G_RISE;
  if (params.maximumHoldEnabled) features |= FEATURE.G_MAX_HOLD;
  if (params.maximumHoldEnabled && params.intradayLossBufferEnabled) features |= FEATURE.G_BUFFER;
  if (gfr.stopFill !== 'stop') features |= FEATURE.NEXT_OPEN;
  if (gfr.stopSlippageBps !== 0) features |= FEATURE.SLIPPAGE;
  if (params.breakout) {
    v.boL = params.breakout.smaSessions;
    v.boK = params.breakout.slopeComparisonSessions;
    v.boN = params.breakout.priorHighSessions;
  }

  const t = params.trendFilter;

  if (t) {
    v.trend = TREND[t.method];
    features |= TREND_FEATURE[v.trend]!;
    if (t.method === 'price_change') {
      v.trN = t.lookbackSessions;
      v.trM = gateFraction(t.minimumReturnPercent);
    } else if (t.method === 'regression_slope') {
      v.trN = t.lookbackSessions;
      v.trSlopePct = t.minimumSlopePercent;
    } else if (t.method === 'rising_sma') {
      v.trN = t.movingAverageSessions;
      v.trK = t.slopeComparisonSessions;
    } else if (t.method === 'higher_highs_lows') {
      v.trN = t.lookbackSessions;
      v.trM = gateFraction(t.minimumStructureIncreasePercent);
    } else {
      v.trN = t.shortLookbackSessions;
      v.trK = t.longLookbackSessions;
      v.trM = gateFraction(t.minimumShortReturnPercent);
      v.trM2 = gateFraction(t.minimumLongReturnPercent);
    }
  }

  const e = params.eligibility;

  if (e) {
    v.elig = ELIG[e.policy];
    v.elW = e.maxAgeSessions;
    features |= ELIG_FEATURE[v.elig]!;
    if (e.policy === 'minimum_strength') v.elA = gateFraction(e.minimumAdvancePercent);
    if (e.policy === 'maximum_extension') v.elE = gateFraction(e.maximumExtensionPercent);
    if (e.policy === 'deterioration') v.elD = gateFraction(e.deteriorationDropPercent);
    if (e.policy === 'reset_renew') {
      v.elRD = gateFraction(e.resetDropPercent);
      v.elRR = gateFraction(e.renewalReboundPercent);
    }
  }

  const dd = params.drawdownGate;

  if (dd) {
    v.ddOn = 1;
    v.ddN = dd.lookbackSessions;
    v.ddD = fraction(dd.dipThresholdPercent);
    v.ddR = fraction(dd.recoveryRetracementPercent);
    v.ddY = dd.confirmationSessions;
    features |= FEATURE.G_DRAWDOWN_GATE;
  }
  if (params.initialStop) {
    v.istopOn = 1;
    v.atrL = params.initialStop.atrSessions;
    v.atrMultiple = params.initialStop.atrMultiple;
    features |= FEATURE.G_INITIAL_STOP;
  }
  if (params.retention) {
    v.retOn = 1;
    v.retF = rulesFraction(params.retention.sellPercent);
    v.retL = params.retention.smaSessions;
    v.retK = params.retention.closesBelow;
    features |= FEATURE.G_RETENTION;
  }

  const k = params.continuation;

  if (k) {
    v.cont = CONT[k.method];
    v.coW = k.windowSessions;
    features |= CONT_FEATURE[v.cont]!;
    if (k.method === 'classic_d1') {
      // the D1 machine's continuation fields as exitParamsOf sets them (percentToFraction)
      v.coY = exit.trailingBuyPercentage;
      v.coP = exit.pullback;
      if (exit.continuationWindow !== k.windowSessions) throw new Error('classic_d1 window mismatch');
    } else if (k.method === 'breakout') {
      v.coB = fraction(k.bufferPercent);
      v.coF = k.formationBars;
    } else if (k.method === 'shallow_pullback') {
      v.coL = k.smaBars;
      v.coM = k.slopeBars;
      v.coRise = fraction(k.minimumRisePercent);
      v.coPmin = fraction(k.pullbackMinimumPercent);
      v.coPmax = fraction(k.pullbackMaximumPercent);
      v.coRec = fraction(k.recoveryPercent);
    } else {
      v.coL = k.smaBars;
      v.coM = k.risingBars;
      v.coSlope = fraction(k.minimumSlopePercent);
      v.coMargin = fraction(k.marginPercent);
    }
  }

  return { values: v, features, params, friction: gfr };
};

export interface D1Encoding {
  values: Record<string, number>;
  features: bigint;
}

export const encodeD1 = (
  door: Door,
  quad: Quad,
  controls: RiskConfig2 | null,
  b: 'D1:GDX' | 'D1:VGT',
  o: EvalOptions
): D1Encoding => {
  const s = symbolOf(b) as 'GDX' | 'VGT';
  const fr = frictionOf(o);
  const c = canonicalConfig2(controls);
  const p = d1StrategyParams(s, quad.d1[s]);
  const ctl = c?.books[b];
  const ps = ctl?.protectiveStop;
  const h = ctl?.hold;
  const g = ctl?.declineGate;
  let features = FEATURE.D1_BOOK;

  if (p.stopPolicy !== 'net') features |= FEATURE.D1_BREAKEVEN;
  if (p.entryMode !== 'deep' || p.postExit !== true) features |= FEATURE.D1_SWING;
  if (ctl && (ps?.mode === 'on' || (h && h.mode !== 'legacy') || g?.mode === 'on')) features |= FEATURE.RC_CONTROLS;
  if (fr.stopFill !== 'stop') features |= FEATURE.NEXT_OPEN;
  if (fr.stopSlippageBps !== 0) features |= FEATURE.SLIPPAGE;
  if (o.d1Arm === 'native') features |= FEATURE.ARM_START;

  return {
    values: {
      X: p.targetPercentChange,
      Y: p.trailingBuyPercentage,
      tsp: p.trailingStopPercentage,
      hold: p.maximumHoldDays,
      buffer: p.intradayLossBuffer,
      pullback: p.pullback,
      costBps: fr.costBps,
      rate: fr.rate,
      slipBps: fr.stopSlippageBps,
      L: p.tickWindowSize,
      W: p.continuationWindow,
      enabled: 1,
      stopTenths: ps?.mode === 'on' ? ps.stopDistanceTenths : -1,
      entryDay: ps?.mode === 'on' && ps.activation === 'entry-day' ? 1 : 0,
      holdMode: h?.mode === 'disabled' ? 1 : h?.mode === 'adaptive' ? 2 : 0,
      extHold: h?.mode === 'adaptive' ? h.extendedHoldDays : 0,
      progTenths: h?.mode === 'adaptive' ? h.progressTenths : 0,
      gateOn: g?.mode === 'on' ? 1 : 0,
      gateK: g?.mode === 'on' ? g.losses : 0,
      gateR: g?.mode === 'on' ? g.recoveryTenths : 0,
      gateC: g?.mode === 'on' ? g.maxBlockSessions : 0,
      armStart: o.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0,
      stopFill: fr.stopFill === 'stop' ? 0 : 1
    },
    features
  };
};

export interface Encoded {
  bytes: Buffer; // GbCandIn
  features: bigint;
  ranges: { first: number; last: number }[]; // blackouts, then period boundaries
  books: BookId[]; // the books given to the pool (bookIds order)
  growth: Partial<Record<'G:GDX' | 'G:VGT', GrowthEncoding>>;
}

const writeStruct = (buf: Buffer, at: number, l: typeof D1In, values: Record<string, number>) => {
  for (const f of l.fields) {
    const x = values[f.name];

    if (x === undefined) continue;
    const o = at + l.offsets[f.name]!;

    if (f.type === 'f64') buf.writeDoubleLE(x, o);
    else if (f.type === 'i32') buf.writeInt32LE(x, o);
    else throw new Error(`writeStruct: ${l.name}.${f.name} is ${f.type}`);
  }
};

// staged-stop@1 of one book (the CPU's validated canonical values): stagedOn, actTenths, st2Tenths and its feature bit
const stagedValues = (st: StagedConfig | null, b: StagedBook | 'G:GDX'): Record<string, number> => {
  const c = st && b !== 'G:GDX' ? st.books[b] : undefined;

  return c
    ? { stagedOn: 1, actTenths: c.activationTenths, st2Tenths: c.stage2Tenths }
    : { stagedOn: 0, actTenths: 0, st2Tenths: 0 };
};

// the capability bits of a staged configuration (the encoder's and the domain derivation's single source)
export const stagedFeaturesOf = (st: StagedConfig | null | undefined): bigint => {
  const c = canonicalStaged(st);
  let f = 0n;

  if (c?.books['D1:GDX'] || c?.books['D1:VGT']) f |= FEATURE.D1_STAGED_STOP;
  if (c?.books['G:VGT']) f |= FEATURE.G_STAGED_STOP;
  return f;
};

// one task → GbCandIn (id = its index in the batch; range offsets relative to the batch's range block)
export const encodeTask = (door: Door, t: Task, id: number, rangeBase: number, extraFeatures = 0n): Encoded => {
  validateAgainstGrids2(canonicalConfig2(t.controls), t.quad.d1);

  // the CPU's own staged validation (every rule of RULE_SPECIFICATION.md §2, against the enabled books' τ₁)
  const st = t.staged ? validateStagedFor(t.quad, canonicalStaged(t.staged), t.options) : null;

  if (t.staged && !st) throw new Error('a task carries an empty staged configuration (an OFF task carries none)');

  const o = t.options;
  const fr = frictionOf(o);
  const po = poolOptionsOf(door, o, t.detail);
  const buf = Buffer.alloc(CandIn.size);
  const off = CandIn.offsets;
  let features = FEATURE.POOL;
  const books: BookId[] = [];
  const growth: Encoded['growth'] = {};

  for (const b of bookIds) {
    if (!isEnabled(o, b)) continue;
    books.push(b);
    const sv = stagedValues(st, b as StagedBook);

    if (b.startsWith('D1')) {
      const e = encodeD1(door, t.quad, t.controls, b as 'D1:GDX', o);

      writeStruct(buf, off.d1! + (b === 'D1:GDX' ? 0 : D1In.size), D1In, { ...e.values, ...sv });
      features |= e.features;
    } else {
      const e = encodeGrowth(door, t.quad, b as 'G:GDX', o);

      writeStruct(buf, off.g! + (b === 'G:GDX' ? 0 : GrowthIn.size), GrowthIn as typeof D1In, { ...e.values, ...sv });
      features |= e.features;
      growth[b as 'G:GDX'] = e;
    }
  }
  // the risk inputs use the run's friction cost (engine.ts toLedger: options.friction.costBps ?? economics.costBps)
  if (!isEnabled(o, 'D1:VGT')) buf.writeDoubleLE(fr.costBps, off.d1! + D1In.size + D1In.offsets.costBps!);

  const order = po.tieOrder ?? tieOrderOf(t.quad.first);

  if (po.tieOrder) {
    if (new Set(po.tieOrder).size !== 4) throw new Error('a tie order names all four books once');
    features |= FEATURE.POOL_TIE_ORDER;
  }
  if (t.quad.first === 'G') features |= FEATURE.POOL_GROWTH_FIRST;
  if (books.length < 4) features |= FEATURE.POOL_ENABLED;
  if ((po.fundFrom ?? 0) !== 0) features |= FEATURE.POOL_FUND_FROM;
  if (po.wholeShares) features |= FEATURE.POOL_WHOLE_SHARES;
  if ((po.blackouts ?? []).length) features |= FEATURE.POOL_BLACKOUTS;
  if ((po.periods ?? []).length) features |= FEATURE.POOL_PERIODS;
  if (t.detail) features |= FEATURE.POOL_DETAIL;
  if (t.risk) features |= FEATURE.RISK_METRICS;
  features |= stagedFeaturesOf(st); // GPU Phase 8: only the books the pool is given carry a staged stop (validated)

  const blackouts = (po.blackouts ?? []).map((x) => ({ first: x.first, last: x.last }));
  const periods = (po.periods ?? []).map((p) => ({ first: p, last: p }));

  if (periods.length > 16) throw new Error('more than 16 period boundaries');

  buf.writeUInt32LE(id, off.id!);
  buf.writeBigUInt64LE(features | extraFeatures, off.features!);
  buf.writeInt32LE(t.quad.first === 'D1' ? 0 : 1, off.first!);
  order.forEach((b, j) => buf.writeInt32LE(bookIds.indexOf(b), off.tie! + j * 4));
  bookIds.forEach((b, j) => buf.writeInt32LE(books.includes(b) ? 1 : 0, off.present! + j * 4));
  buf.writeInt32LE(po.fundFrom ?? 0, off.fundFrom!);
  buf.writeInt32LE(po.wholeShares ? 1 : 0, off.wholeShares!);
  buf.writeInt32LE(t.detail ? 1 : 0, off.detail!);
  buf.writeInt32LE(t.risk ? 1 : 0, off.risk!);
  buf.writeInt32LE(rangeBase, off.blackoutOff!);
  buf.writeInt32LE(blackouts.length, off.blackoutN!);
  buf.writeInt32LE(rangeBase + blackouts.length, off.periodOff!);
  buf.writeInt32LE(periods.length, off.periodN!);
  buf.writeDoubleLE(po.budget ?? economics.budget, off.budget!);
  buf.writeDoubleLE(po.rate ?? fr.rate, off.poolRate!);

  return { bytes: buf, features: features | extraFeatures, ranges: [...blackouts, ...periods], books, growth };
};
