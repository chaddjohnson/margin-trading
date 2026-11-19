// gpu-backend: the binary layout of protocol v2 (src/gpu-backend/cuda/gb.h), declared once as ordered field lists with
// natural alignment (#pragma pack(8)). Every offset is checked against the C++ compiler's own offsetof by
// src/gpu-backend/tests/layout.test.ts (tools/gpu-backend/layout-dump.cpp), so the two sides cannot drift silently.
export type FieldType = 'f64' | 'i32' | 'u32' | 'i64' | 'u64' | 'u8' | 'i8';
export interface Field {
  name: string;
  type: FieldType;
  count?: number; // an array of `count` elements
  struct?: Layout; // an embedded struct (or an array of them)
}
export interface Layout {
  name: string;
  size: number;
  align: number;
  offsets: Record<string, number>;
  fields: Field[];
}

const sizeOf: Record<FieldType, number> = { f64: 8, i32: 4, u32: 4, i64: 8, u64: 8, u8: 1, i8: 1 };

export const layout = (name: string, fields: Field[]): Layout => {
  let o = 0;
  let align = 1;
  const offsets: Record<string, number> = {};

  for (const f of fields) {
    const a = f.struct ? f.struct.align : sizeOf[f.type];
    const size = f.struct ? f.struct.size : sizeOf[f.type];

    align = Math.max(align, a);
    o = Math.ceil(o / a) * a;
    offsets[f.name] = o;
    o += size * (f.count ?? 1);
  }

  return { name, size: Math.ceil(o / align) * align, align, offsets, fields };
};

const f = (name: string, count?: number): Field => ({ name, type: 'f64', count });
const i = (name: string, count?: number): Field => ({ name, type: 'i32', count });
const u = (name: string, count?: number): Field => ({ name, type: 'u32', count });
const u8 = (name: string, count?: number): Field => ({ name, type: 'u8', count });
const s = (name: string, struct: Layout, count?: number): Field => ({ name, type: 'u8', struct, count });

export const DatasetHeader = layout('GbDatasetHeader', [
  u8('magic', 8), u('version'), u('nSym'), u('sessions'), u('flags'), u('bars', 2), u('full', 2),
  { name: 'checksum', type: 'u64' }, { name: 'payloadBytes', type: 'u64' }, { name: 'reserved', type: 'u64' }
]);
export const BatchHeader = layout('GbBatchHeader', [
  u8('magic', 8), u('version'), u('nCand'), u('flags'), u('tradeCapD1'), u('tradeCapG'), u('lotCap'), u('fundCap'), u('nRanges'),
  { name: 'batchNonce', type: 'u64' }, u('endIndex'), u('reserved'), { name: 'reserved2', type: 'u64' }
]);
export const D1In = layout('GbD1In', [
  f('X'), f('Y'), f('tsp'), f('hold'), f('buffer'), f('pullback'), f('costBps'), f('rate'), f('slipBps'),
  i('L'), i('W'), i('enabled'), i('stopTenths'), i('entryDay'), i('holdMode'), i('extHold'), i('progTenths'), i('gateOn'),
  i('gateK'), i('gateR'), i('gateC'), i('armStart'), i('stopFill')
]);
export const GrowthIn = layout('GbGrowthIn', [
  f('riseFactor'), f('tsp'), f('hold'), f('buffer'), f('costBps'), f('rate'), f('slipBps'), f('trM'), f('trM2'), f('trSlopePct'),
  f('elA'), f('elE'), f('elD'), f('elRD'), f('elRR'), f('ddD'), f('ddR'), f('atrMultiple'), f('retF'),
  f('coY'), f('coP'), f('coB'), f('coRise'), f('coPmin'), f('coPmax'), f('coRec'), f('coSlope'), f('coMargin'),
  i('enabled'), i('entry'), i('riseN'), i('boL'), i('boK'), i('boN'), i('stopFill'), i('trend'), i('trN'), i('trK'), i('elig'),
  i('elW'), i('ddOn'), i('ddN'), i('ddY'), i('istopOn'), i('atrL'), i('retOn'), i('retL'), i('retK'), i('cont'), i('coW'),
  i('coF'), i('coL'), i('coM'), i('pad')
]);
export const CandIn = layout('GbCandIn', [
  u('id'), u('pad0'), { name: 'features', type: 'u64' }, i('first'), i('tie', 4), i('present', 4), i('fundFrom'), i('wholeShares'),
  i('detail'), i('risk'), i('blackoutOff'), i('blackoutN'), i('periodOff'), i('periodN'), i('pad1'), f('budget'), f('poolRate'),
  s('d1', D1In, 2), s('g', GrowthIn, 2)
]);
export const Fill = layout('GbFill', [f('t'), f('raw'), f('price'), f('f'), i('s'), i('k'), i('partial'), i('reason')]);
export const Trade = layout('GbTrade', [
  f('dT'), f('dPrice'), f('eT'), f('eRaw'), f('ePrice'), f('vNet'), f('vInterest'),
  i('id'), i('dS'), i('eS'), i('eK'), i('kind'), i('open'), i('nFills'), i('pad'), s('fills', Fill, 2)
]);
export const BookOut = layout('GbBookOut', [
  f('net'), f('realized'), f('minuteDd'), f('dailyDd'), i('nTrades'), i('signals'), i('protectiveExits'), i('protectiveGapExits'),
  i('maximumHoldExits'), i('adaptiveExtensions'), i('episodes'), i('blocks'), i('blockedSessions'), i('blockedMinutes'),
  i('entryDayExits'), i('firstDS'), i('status'), i('errInfo'), i('pad', 2)
]);
export const DD = layout('GbDD', [f('max'), f('peakT'), f('troughT'), f('recoveryT')]);
export const CandOut = layout('GbCandOut', [
  u('id'), i('status'), i('errInfo'), i('nLots'), s('book', BookOut, 4), f('net'), f('realized'), f('unrealized'),
  f('peakPrincipal'), f('peakValue'), s('dd', DD), s('ddDaily', DD), i('sessionsHeld'), i('nFunding'), { name: 'marks', type: 'i64' },
  i('decisions', 12), i('refusals', 5), i('executed'), f('bdMarked'), f('bdLiq'), f('plMarked'), f('plLiq')
]);
export const LotFill = layout('GbLotFill', [
  f('t'), f('raw'), f('price'), f('shares'), f('principal'), f('interest'), f('proceeds'), f('net'), i('s'), i('k'), i('partial'), i('reason')
]);
export const Lot = layout('GbLot', [
  f('principal0'), f('shares0'), f('shares'), f('principal'), f('entryT'), f('entryRaw'), f('entryPrice'), f('entryTs'), f('realized'),
  f('interest'), f('net'), f('unrealized'), f('costs'), f('worst'), f('worstT'), f('best'), f('bestT'),
  i('book'), i('tradeIdx'), i('entryS'), i('open'), i('nFills'), i('id'), s('fills', LotFill, 2)
]);
export const Funding = layout('GbFunding', [
  f('t'), f('price'), f('occupantPrincipal'), i('book'), i('trade'), i('s'), i('kind'), i('granted'), i('reason'), i('occupantBook'), i('occupantLot')
]);
export const Period = layout('GbPeriod', [f('equity'), s('dd', DD), i('boundary'), i('pad')]);
export const Range = layout('GbRange', [i('first'), i('last')]);
export const Receipt = layout('GbReceipt', [
  { name: 'batchNonce', type: 'u64' }, u8('uuid', 16), u('nCand'), u('booksLaunched'), u('d1Executed'), u('gExecuted'), u('poolExecuted'),
  u('kernels'), { name: 'outChecksum', type: 'u64' }, f('h2dMs'), f('d1Ms'), f('gMs'), f('poolMs'), f('d2hMs'), f('totalMs'),
  f('deviceBytes'), u8('pad', 16)
]);
export const ResultHeader = layout('GbResultHeader', [
  u8('magic', 8), u('version'), u('nCand'), u('flags'), u('tradeCapD1'), u('tradeCapG'), u('lotCap'), u('fundCap'), u('sessions'),
  { name: 'nTrades', type: 'u64' }, { name: 'nLots', type: 'u64' }, { name: 'nFunding', type: 'u64' }
]);

export const LAYOUTS = [DatasetHeader, BatchHeader, D1In, GrowthIn, CandIn, Fill, Trade, BookOut, DD, CandOut, LotFill, Lot, Funding, Period, Range, Receipt, ResultHeader];

export const PROTOCOL_VERSION = 2;
export const DATASET_VERSION = 2;
export const REQ_MAGIC = 0x51324247;
export const RES_MAGIC = 0x52324247;
export const TYPE = { LOAD: 1, EVAL: 2, INFO: 3, QUIT: 4, FAULT: 5, SMOKE: 6 } as const;
export const FLAGS = { RETURN_TRADES: 1, RETURN_LOTS: 2, RUN_POOL: 4, RETURN_SERIES: 8, RETURN_DAILY: 16 } as const;

// capability bits (gb.h GbFeature), as BigInt
const bit = (n: number) => 1n << BigInt(n);
export const FEATURE = {
  D1_BOOK: bit(0), RC_CONTROLS: bit(1), NEXT_OPEN: bit(2), SLIPPAGE: bit(3), ARM_START: bit(4),
  G_RISE: bit(5), G_BREAKOUT: bit(6), G_TREND_PRICE_CHANGE: bit(7), G_TREND_REGRESSION: bit(8), G_TREND_RISING_SMA: bit(9),
  G_TREND_HHL: bit(10), G_TREND_MOMENTUM: bit(11), G_ELIG_TIME_LIMITED: bit(12), G_ELIG_MIN_STRENGTH: bit(13),
  G_ELIG_MAX_EXTENSION: bit(14), G_ELIG_DETERIORATION: bit(15), G_ELIG_RESET_RENEW: bit(16), G_DRAWDOWN_GATE: bit(17),
  G_MAX_HOLD: bit(18), G_BUFFER: bit(19), G_INITIAL_STOP: bit(20), G_RETENTION: bit(21), G_CONT_CLASSIC: bit(22),
  G_CONT_BREAKOUT: bit(23), G_CONT_SHALLOW: bit(24), G_CONT_MA_CROSS: bit(25), POOL: bit(26), POOL_FUND_FROM: bit(27),
  POOL_ENABLED: bit(28), POOL_WHOLE_SHARES: bit(29), POOL_BLACKOUTS: bit(30), POOL_PERIODS: bit(31), POOL_TIE_ORDER: bit(32),
  POOL_GROWTH_FIRST: bit(33), POOL_DETAIL: bit(34), RISK_METRICS: bit(35),
  RECORD_MARKS: bit(48), D1_SWING: bit(49), D1_BREAKEVEN: bit(50), G_INTRADAY_RESOLUTION: bit(51), LIFECYCLE_L1_L2: bit(52),
  SHADOW_ELIGIBILITY: bit(53), SESSION_HOLD_UNIT: bit(54)
} as const;
export type FeatureName = keyof typeof FEATURE;
export const SUPPORTED = (1n << 36n) - 1n; // GB_SUPPORTED
export const featureNames = (mask: bigint): FeatureName[] => (Object.keys(FEATURE) as FeatureName[]).filter((k) => (mask & FEATURE[k]) !== 0n);

export const STATUS: Record<number, string> = {
  0: 'ok', 100: 'bad frame', 101: 'bad version', 102: 'bad size', 103: 'unsupported feature', 104: 'no dataset',
  105: 'GPU memory', 106: 'CUDA error', 107: 'dataset check failed', 108: 'fault injection refused', 109: 'receipt mismatch'
};
export const CAND_STATUS: Record<number, string> = {
  0: 'ok', 1: 'trade capacity', 2: 'lot capacity', 3: 'fill capacity', 4: 'invalid parameter', 5: 'funding-log capacity',
  10: 'decisions not strictly ordered', 11: 'decision while the decline gate is blocked', 12: 'setup or continuation while blocked',
  13: 'a profitable protective exit', 14: 'carried sale minute missing', 15: 'protective level not below the fill',
  16: 'unexpected legacy exit', 17: 'entry-day interest', 18: 'a profitable exit while blocked', 20: 'pool decision while holding',
  21: 'pool exit fill skipped', 22: 'book decisions not strictly ordered', 30: 'Growth decision after the close',
  31: 'continuation bar after the close', 32: 'eligibility bar after the close', 33: 'more than two exit fills at one bar',
  34: 'order placed without an available initial risk stop', 35: 'drawdown gate observations not processed',
  36: 'continuation evaluated while not flat', 37: 'an exit while a continuation episode is open',
  38: 'D1 window opening disagrees with the qualifying-exit rule', 39: 'a drawdown release outside its session',
  40: 'unexpected D1 arming', 41: 'filled without its decision-time initial-stop check', 42: 'a partial sale outside stage full',
  43: 'D1 window expiry disagrees with the episode state', 44: 'no completed bar'
};
// capacity statuses: re-evaluated on the GPU with larger capacities (never on the CPU)
export const CAPACITY_STATUSES = new Set([1, 2, 3, 5]);

// exit reasons (gb.h GbReason) → the CPU engine's strings
export const REASONS = ['maximum hold', 'trailing stop', 'trailing stop gap', 'buffered intraday loss', 'protective stop', 'protective stop gap', 'initial stop', 'initial stop gap', 'trend exit'];
// trade kinds (gb.h GbKind)
export const KINDS = ['deep', 'continuation', 'rise', 'trend_breakout', 'breakout', 'shallow_pullback', 'ma_cross'];
// funding refusal reasons (gb.h GbRefusal) → runPool's strings
export const REFUSALS = ['', 'slot occupied', 'component disabled', 'before the funding start', 'blackout'];
export const BOOKS = ['D1:GDX', 'D1:VGT', 'G:GDX', 'G:VGT'] as const;
