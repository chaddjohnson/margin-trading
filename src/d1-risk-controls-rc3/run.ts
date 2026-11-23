// One pooled evaluation with RC 2 controls and the optional S1 staged trailing stop (staged-stop@1,
// research/vg-l0-staged-stop/RULE_SPECIFICATION.md). With the stage OFF on every book the evaluation IS the existing one:
// evaluateStaged calls Assignment 2's evaluate (RC 2's pooled runner, Priority 3's pool and compact record) itself, and
// booksWithStaged returns RC 2's books. With some book ON, only that book is built differently — a D1 book by RC 3's
// runD1BookRc3, Growth·VGT by runGrowthBookStaged (growth.ts: Priority 3's runGrowthBook with the Growth engine revision
// 1.5.0 option) — and every other
// book, the pool (unchanged code) and the compact record (unchanged code) are the existing ones. The record of an ON
// configuration carries the staged identity ("st1-…") and the per-book counters `staged`.
import {
  type BookId,
  type Friction,
  type VBook,
  baseFriction,
  bookIds,
  symbolOf
} from '../vg-d1-growth-joint/books.ts';
import { runGrowthBookStaged } from './growth.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { indexOnOrAfter } from '../vg-d1-growth-joint/data.ts';
import {
  type EvalOptions,
  type Rec,
  datasetsOf,
  growthNextOpenSupported,
  isEnabled,
  poolOptionsOf,
  recordOf
} from '../vg-d1-growth-joint/evaluate.ts';
import { type PoolResult, runPool } from '../vg-d1-growth-joint/pool.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { type RiskConfig2, canonicalConfig2, riskEvalKey2, riskId2 } from '../d1-risk-controls-rc2/config.ts';
import type { RcLog2 } from '../d1-risk-controls-rc2/book.ts';
import { booksWithControls2 } from '../d1-risk-controls-rc2/run.ts';
import {
  type D1BookId,
  type DRec,
  type RcLite,
  type SRec,
  evaluate as evaluateOff,
  evaluateDetail as evaluateDetailOff,
  riskInputsOf
} from '../vg-l0-risk-families/evaluate.ts';
import {
  type StagedBook,
  type StagedConfig,
  bookKeySuffix,
  canonicalStaged,
  stagedErrors,
  StagedConfigError,
  stagedId,
  stagedKeySuffix,
  tau1TenthsOfD1,
  tau1TenthsOfGrowth
} from '../staged-stop/config.ts';
import type { StagedLite, StagedRow } from '../staged-stop/tracker.ts';
import { type RiskVBook3, runD1BookRc3 } from './book.ts';

export type StagedRec = SRec & { staged?: Partial<Record<StagedBook, StagedLite>> };
export type StagedDRec = DRec & { staged?: Partial<Record<StagedBook, StagedLite>> };

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

// Assignment 2's RcLite of one D1 book's RC log (src/vg-l0-risk-families/evaluate.ts `lite`, the same fields in the
// same order; a test checks the equality on OFF configurations).
export const liteOf = (l: RcLog2): RcLite => ({
  virtualTrades: l.trades.length,
  protective: l.summary.protectiveExits,
  protectiveGap: l.summary.protectiveGapExits,
  entryDay: l.summary.entryDayExits ?? 0,
  maximumHold: l.summary.maximumHoldExits,
  adaptive: l.summary.adaptiveExtensions,
  episodes: l.summary.episodes,
  blocks: l.summary.blocks,
  blockedSessions: l.summary.blockedSessions
});

// Every book's stage-1 distance in tenths (the staged validation's reference: a configuration property, independent of
// which books an evaluation option enables; Growth·VGT only when its configuration has a trailing stop).
export const tau1Of = (q: Quad, _o: EvalOptions = {}): Partial<Record<StagedBook, number>> => {
  const out: Partial<Record<StagedBook, number>> = {
    'D1:GDX': tau1TenthsOfD1(q.d1.GDX.trailingStopPercentage),
    'D1:VGT': tau1TenthsOfD1(q.d1.VGT.trailingStopPercentage)
  };

  if (typeof q.g.VGT?.trailingStopPercent === 'number') out['G:VGT'] = tau1TenthsOfGrowth(q.g.VGT.trailingStopPercent);
  return out;
};

// The books whose stage actually runs in an evaluation: ON and enabled by the options (an option that disables a book —
// a causal-removal rerun, a one-family scope — leaves its stage inert). The record's identity stays the configuration's.
export const effectiveStaged = (st: StagedConfig | null, o: EvalOptions = {}): StagedConfig | null => {
  if (!st) return null;

  const books: StagedConfig['books'] = {};

  for (const [b, c] of Object.entries(st.books)) if (c && isEnabled(o, b as BookId)) books[b as StagedBook] = c;
  return canonicalStaged({ version: 1, books });
};

export const validateStagedFor = (q: Quad, staged: StagedConfig | null | undefined, o: EvalOptions = {}) => {
  const errors = stagedErrors(staged ?? null, tau1Of(q, o));

  if (errors.length) throw new StagedConfigError(errors);
  return canonicalStaged(staged);
};

// A bounded per-process cache of staged books (RC 2's cache pattern; keys carry the staged suffix).
class Cache {
  private readonly map = new Map<string, VBook>();

  constructor(public capacity: number) {}

  get(key: string, make: () => VBook) {
    const v = this.map.get(key);

    if (v) {
      this.map.delete(key);
      this.map.set(key, v);
      return v;
    }

    const made = make();

    this.map.set(key, made);
    while (this.map.size > this.capacity) this.map.delete(this.map.keys().next().value!);
    return made;
  }

  clear() {
    this.map.clear();
  }
}

export const stagedBookCache = new Cache(64);

export interface StagedRunOptions {
  cache?: boolean; // default true; fixture doors pass false
  detail?: boolean; // CPU-only staged detail rows (diagnostics)
}

export const booksWithStaged = (
  door: Door,
  q: Quad,
  cfg: RiskConfig2 | null | undefined,
  staged: StagedConfig | null | undefined,
  o: EvalOptions = {},
  ro: StagedRunOptions = {}
): VBook[] => {
  const st = effectiveStaged(validateStagedFor(q, staged, o), o);

  if (!st) return booksWithControls2(door, q, cfg, o, { cache: ro.cache });

  const on = (b: BookId) => Boolean(st.books[b as StagedBook]) && isEnabled(o, b);
  const offEnabled = Object.fromEntries(bookIds.filter(on).map((b) => [b, false]));
  const base = booksWithControls2(
    door,
    q,
    cfg,
    { ...o, enabled: { ...o.enabled, ...offEnabled } },
    { cache: ro.cache }
  );
  const byBook = new Map<BookId, VBook>(base.map((b) => [b.book, b]));
  const fr = frictionOf(o);
  const c = canonicalConfig2(cfg);
  const detail = ro.detail === true;

  for (const b of bookIds) {
    if (!on(b)) continue;

    const s = symbolOf(b) as 'GDX' | 'VGT';
    const sd = door.sym[s];
    const book = st.books[b as StagedBook]!;
    let make: () => VBook;
    let key: string;

    if (b.startsWith('D1')) {
      const end = sd.ds.sessionCount - 1;
      const armStart = o.d1Arm === 'native' ? indexOnOrAfter(door, '2017-06-15') : 0;
      const controls = c?.books[b as D1BookId];

      make = () =>
        runD1BookRc3(sd.ds, s, q.d1[s], controls, book, {
          armStart,
          accountingStart: 0,
          endIndex: end,
          friction: fr,
          detail
        }) as unknown as VBook;
      key = `${door.name}|${fr.costBps}|${fr.rate}|${fr.stopFill}|${fr.stopSlippageBps}|${armStart}|${b}|${JSON.stringify(q.d1[s])}|${JSON.stringify(controls ?? null)}${bookKeySuffix(book)}`;
    } else {
      const g = q.g[s];
      const gfr: Friction =
        fr.stopFill === 'next-open' && !growthNextOpenSupported(g) ? { ...fr, stopFill: 'stop' } : fr;

      make = () =>
        runGrowthBookStaged(sd, door, g, { friction: gfr, costBps: gfr.costBps, staged: book, stagedDetail: detail });
      key = `G|${door.name}|${gfr.costBps}|${gfr.rate}|${gfr.stopFill}|${gfr.stopSlippageBps}|${JSON.stringify(Object.entries(g).sort(([x], [y]) => (x < y ? -1 : 1)))}${bookKeySuffix(book)}`;
    }
    byBook.set(b, ro.cache === false || detail ? make() : stagedBookCache.get(key, make));
  }

  return bookIds.filter((b) => byBook.has(b)).map((b) => byBook.get(b)!);
};

export const runWithStaged = (
  door: Door,
  q: Quad,
  cfg: RiskConfig2 | null | undefined,
  staged: StagedConfig | null | undefined,
  o: EvalOptions = {},
  detail = false,
  recordMarks = false,
  ro: StagedRunOptions = {}
): { books: VBook[]; result: PoolResult } => {
  const books = booksWithStaged(door, q, cfg, staged, o, ro);
  const result = runPool(datasetsOf(door), books, q.first, {
    ...poolOptionsOf(door, o, detail),
    recordMarks,
    endIndex: door.sessions - 1
  });

  return { books, result };
};

// The staged counters of a run's books (the books whose stage ran: ON and enabled; canonical book order).
export const stagedLitesOf = (
  books: readonly VBook[],
  st: StagedConfig | null
): Partial<Record<StagedBook, StagedLite>> => {
  const out: Partial<Record<StagedBook, StagedLite>> = {};

  for (const b of ['D1:GDX', 'D1:VGT', 'G:VGT'] as const) {
    if (!st?.books[b]) continue;

    const vb = books.find((x) => x.book === b) as (VBook & { staged?: StagedLite }) | undefined;

    if (!vb?.staged) throw new Error(`${b}: the staged book carries no counters`);
    out[b] = { ...vb.staged };
  }
  return out;
};

export const stagedRowsOf = (books: readonly VBook[]): Partial<Record<StagedBook, StagedRow[]>> => {
  const out: Partial<Record<StagedBook, StagedRow[]>> = {};

  for (const b of books as (VBook & { stagedRows?: StagedRow[] })[])
    if (b.stagedRows) out[b.book as StagedBook] = b.stagedRows;
  return out;
};

// The staged identity and evaluation key (OFF: RC 2's, unchanged).
export const stagedCfgId = (q: Quad, cfg: RiskConfig2 | null | undefined, staged: StagedConfig | null | undefined) =>
  stagedId(riskId2(q, cfg), staged);
export const stagedEvalKey = (
  door: string,
  q: Quad,
  o: EvalOptions,
  cfg: RiskConfig2 | null | undefined,
  staged: StagedConfig | null | undefined
) => `${riskEvalKey2(door, q, o, cfg)}${stagedKeySuffix(staged)}`;

// The compact record of an ON run: the existing record, the staged identity, the RC summaries, the staged counters.
export const stagedRecordOf = (
  door: Door,
  q: Quad,
  cfg: RiskConfig2 | null | undefined,
  st: StagedConfig,
  x: { books: VBook[]; result: PoolResult },
  o: EvalOptions
): StagedRec => {
  const rec: Rec = recordOf(door, q, x, o);
  const rc: SRec['rc'] = {};

  for (const b of x.books)
    if ((b as unknown as RiskVBook3).rc) rc[b.book as D1BookId] = liteOf((b as unknown as RiskVBook3).rc as RcLog2);
  return { ...rec, id: stagedCfgId(q, cfg, st), rc, staged: stagedLitesOf(x.books, effectiveStaged(st, o)) };
};

export const evaluateStaged = (
  door: Door,
  q: Quad,
  cfg: RiskConfig2 | null | undefined,
  staged: StagedConfig | null | undefined,
  o: EvalOptions = {},
  ro: StagedRunOptions = {}
): StagedRec => {
  const st = validateStagedFor(q, staged, o);

  if (!st) return evaluateOff(door, q, cfg ?? null, o);

  const x = runWithStaged(door, q, cfg, st, o, false, false, { cache: ro.cache });

  return stagedRecordOf(door, q, cfg, st, x, o);
};

export const evaluateStagedDetail = (
  door: Door,
  q: Quad,
  cfg: RiskConfig2 | null | undefined,
  staged: StagedConfig | null | undefined,
  o: EvalOptions = {}
): StagedDRec => {
  const st = validateStagedFor(q, staged, o);

  if (!st) return evaluateDetailOff(door, q, cfg ?? null, o);

  const x = runWithStaged(door, q, cfg, st, o, true, false);
  const rec = recordOf(door, q, x, o);
  const base = evaluateStaged(door, q, cfg, st, o);

  if (base.net !== rec.net || base.dd !== rec.dd || base.signature !== rec.signature)
    throw new Error('the detailed replay differs from the search record');
  return { ...base, risk: riskInputsOf(door, x, rec) } as StagedDRec;
};
