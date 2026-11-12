// One pooled evaluation with shadow-position entry eligibility (PROTOCOL.md §5): the single evaluation path of the
// study. Priority 3's canonical virtual books (src/vg-d1-growth-joint/evaluate.ts `booksOf`, cached per process, unchanged),
// the shadow-capable replay (allocator.ts: Priority 3's runPool + the SHADOW insertions) and Priority 3's compact record
// (`recordOf`, unchanged), extended with the shadow summary. Lifecycle L0, calendar-day maximum holds (the frozen
// defaults; no hold-unit option exists on this branch).
//
// THE TOGGLES. Three independent switches, one per active book of New L0's structure, in this order: D1·GDX, D1·VGT,
// Growth·VGT ("sh" = three characters '0'/'1', e.g. '000' = all OFF, the default; '101' = D1·GDX and Growth·VGT ON).
// Growth·GDX is never enabled in this study (its toggle does not exist). With '000' the evaluation is EXACTLY Priority
// 3's (the same books, the same replay code path, the same record) and its archive key is Priority 3's key unchanged;
// any other value appends `|sh<bits>` to the key.
import { createHash } from 'node:crypto';
import {
  growthParamsOf,
  type BookId,
  type Friction,
  bookIds,
  d1StrategyParams,
  familyOf,
  symbolOf
} from '../vg-d1-growth-joint/books.ts';
import { economics } from '../vg-d1-growth-joint/context.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  type EvalOptions,
  type Rec,
  booksOf,
  datasetsOf,
  evalKey as p3EvalKey,
  growthNextOpenSupported,
  isEnabled,
  poolOptionsOf,
  recordOf as p3RecordOf
} from '../vg-d1-growth-joint/evaluate.ts';
import { baseFriction } from '../vg-d1-growth-joint/books.ts';
import type { Quad } from '../vg-d1-growth-joint/space.ts';
import { fractionOf } from '../growth-trading/optionalRules.ts';
import { bookSettingsOf, exitParamsOf } from '../growth-trading/riseTrading.ts';
import { type ShadowPoolResult, type Toggles, runShadowPool } from './allocator.ts';
import { type RealPath, type RealSpec, realPathOf } from './position.ts';

// ----- the toggles -----

export const toggleBooks = ['D1:GDX', 'D1:VGT', 'G:VGT'] as const satisfies readonly BookId[];
export type ToggleBook = (typeof toggleBooks)[number];
export type Sh = string; // '000' … '111'
export const allSh: readonly Sh[] = ['000', '100', '010', '001', '110', '101', '011', '111'];
export const offSh: Sh = '000';
export const shLabel = (sh: Sh) =>
  sh === offSh
    ? 'all OFF'
    : toggleBooks
        .filter((_b, i) => sh[i] === '1')
        .map((b) => (b === 'G:VGT' ? 'Growth·VGT' : `D1·${b.slice(3)}`))
        .join(' + ');
export const togglesOf = (sh: Sh): Toggles => {
  if (!/^[01]{3}$/.test(sh)) throw new Error(`toggle bits ${sh}`);
  return Object.fromEntries(toggleBooks.map((b, i) => [b, sh[i] === '1'])) as Toggles;
};
export const shOf = (t: Toggles) => toggleBooks.map((b) => (t[b] ? '1' : '0')).join('');

export const evalKey = (door: string, q: Quad, o: EvalOptions, sh: Sh) =>
  sh === offSh ? p3EvalKey(door, q, o) : `${p3EvalKey(door, q, o)}|sh${sh}`;

// ----- the independent real positions: each enabled book's exit configuration, exactly as booksOf builds its book -----

const frictionOf = (o: EvalOptions): Friction => ({ ...baseFriction, ...(o.friction ?? {}) });

export const realSpecsOf = (door: Door, q: Quad, o: EvalOptions = {}): Partial<Record<BookId, RealSpec>> => {
  const fr = frictionOf(o);
  const out: Partial<Record<BookId, RealSpec>> = {};

  for (const b of bookIds) {
    if (!isEnabled(o, b)) continue;

    const s = symbolOf(b);
    const ds = door.sym[s].ds;

    if (familyOf(b) === 'D1')
      out[b] = {
        family: 'D1',
        sym: s,
        ds,
        params: d1StrategyParams(s, q.d1[s]),
        settings: {
          notional: economics.notional,
          rate: fr.rate,
          stopFill: fr.stopFill,
          costBps: fr.costBps,
          stopSlippageBps: fr.stopSlippageBps
        }
      };
    else {
      const g = q.g[s];
      const gfr: Friction =
        fr.stopFill === 'next-open' && !growthNextOpenSupported(g) ? { ...fr, stopFill: 'stop' } : fr;
      const params = growthParamsOf({ ...g, costBpsPerSide: gfr.costBps }, s, door);

      out[b] = {
        family: 'G',
        sym: s,
        ds,
        exit: exitParamsOf(params),
        settings: {
          ...bookSettingsOf(params),
          rate: gfr.rate,
          stopFill: gfr.stopFill,
          stopSlippageBps: gfr.stopSlippageBps
        },
        rules:
          params.initialStop || params.retention
            ? { initialStop: params.initialStop ?? null, retention: params.retention ?? null }
            : null,
        sellFraction: params.retention ? fractionOf(params.retention.sellPercent) : 1
      };
    }
  }

  return out;
};

// ----- the run -----

export const run = (door: Door, q: Quad, o: EvalOptions, sh: Sh, detail = false, recordMarks = false) => {
  const books = booksOf(door, q, o);
  const end = door.sessions - 1;
  const specs = sh === offSh ? {} : realSpecsOf(door, q, o);
  const paths: { book: BookId; path: RealPath }[] = [];
  const result: ShadowPoolResult = runShadowPool(
    datasetsOf(door),
    books,
    q.first,
    { ...poolOptionsOf(door, o, detail), recordMarks, endIndex: end },
    sh === offSh
      ? undefined
      : {
          toggles: togglesOf(sh),
          realPath: (b, s, D) => {
            const spec = specs[b];

            if (!spec) throw new Error(`no real-position specification for ${b}`);

            const path = realPathOf(spec, s, D, end);

            if (detail) paths.push({ book: b, path });
            return path;
          }
        }
  );

  return { books, result, paths };
};

// ----- the record -----

export interface ShadowBookStats {
  episodes: number;
  persisted: number; // live at at least one release check
  recovered: number; // delayed real entries funded (lots)
  recoveredNet: number; // Σ net of the delayed lots (marked at the end while open)
  recoveredWins: number;
  recoveredLosses: number;
  waitSessions: number; // Σ sessions from the refused decision to the delayed decision (funded ones)
}

export interface ShadowSummary {
  sh: Sh;
  releaseChecks: number;
  episodes: number;
  ownOccupant: number; // episodes opened by a refusal while the book's own delayed lot/order held the slot
  expiredOccupied: number; // ended by their hypothetical exit without ever seeing a release
  persisted: number;
  recovered: number;
  recoveredNet: number;
  recoveredWins: number;
  recoveredLosses: number;
  recoveredWorst: number; // the worst delayed lot's net
  recoveredPrincipalDays: number; // Σ principal × calendar days of the delayed lots (capital occupancy)
  displaced: number; // decisions refused while a delayed lot or order held the slot
  displacedHypNet: number; // Σ of their hypothetical (virtual) nets — descriptive only, never an achievable figure
  lostToFresh: number; // release checks lost to a competing fresh entry
  lostToShadow: number; // … to a higher-priority shadow
  byBook: Partial<Record<BookId, ShadowBookStats>>;
}

export type SRec = Rec & { sh: Sh; shadow: ShadowSummary | null };

const r2 = (x: number) => Math.round(x * 100) / 100;

export const shadowSummaryOf = (r: ShadowPoolResult, door: Door): ShadowSummary | null => {
  const sh = r.shadow;

  if (!sh) return null;

  const ds = door.sym.VGT.ds;
  const lotById = new Map(r.lots.map((l) => [l.id, l]));
  const byBook: Partial<Record<BookId, ShadowBookStats>> = {};
  let recoveredNet = 0;
  let recoveredWins = 0;
  let recoveredLosses = 0;
  let recoveredWorst = 0;
  let principalDays = 0;
  let displaced = 0;
  let displacedHypNet = 0;
  let recovered = 0;

  for (const ep of sh.episodes) {
    const st = (byBook[ep.book] ??= {
      episodes: 0,
      persisted: 0,
      recovered: 0,
      recoveredNet: 0,
      recoveredWins: 0,
      recoveredLosses: 0,
      waitSessions: 0
    });

    st.episodes++;
    if (ep.persistedToRelease) st.persisted++;

    const lot = ep.delayed && ep.delayed.lotId > 0 ? lotById.get(ep.delayed.lotId) : undefined;

    if (lot) {
      recovered++;
      st.recovered++;
      st.recoveredNet += lot.net;
      st.waitSessions += ep.delayed!.waitSessions;
      recoveredNet += lot.net;
      if (!lot.open && lot.net > 0) {
        recoveredWins++;
        st.recoveredWins++;
      }
      if (!lot.open && lot.net < 0) {
        recoveredLosses++;
        st.recoveredLosses++;
      }
      recoveredWorst = Math.min(recoveredWorst, lot.net);

      let p = lot.principal0;
      let from = lot.entryS;

      for (const f of lot.fills) {
        principalDays += (p * (ds.sTime[f.s]! - ds.sTime[from]!)) / 86400;
        p -= f.principal;
        from = f.s;
      }
      if (lot.open) principalDays += (p * (ds.sTime[r.endIndex]! - ds.sTime[from]!)) / 86400;
    }
  }

  for (const info of sh.delayedLots.values()) {
    displaced += info.displaced.length;
    displacedHypNet += info.displaced.reduce((a, d) => a + d.vNet, 0);
  }

  for (const st of Object.values(byBook)) st.recoveredNet = r2(st.recoveredNet);

  return {
    sh: shOf(sh.toggles),
    releaseChecks: sh.releaseChecks,
    episodes: sh.episodes.length,
    ownOccupant: sh.episodes.filter((e) => e.ownOccupant).length,
    expiredOccupied: sh.episodes.filter((e) => !e.persistedToRelease && e.end.reason === 'hypothetical exit').length,
    persisted: sh.episodes.filter((e) => e.persistedToRelease).length,
    recovered,
    recoveredNet: r2(recoveredNet),
    recoveredWins,
    recoveredLosses,
    recoveredWorst: r2(recoveredWorst),
    recoveredPrincipalDays: Math.round(principalDays),
    displaced,
    displacedHypNet: r2(displacedHypNet),
    lostToFresh: sh.episodes.reduce(
      (a, e) => a + e.losses.filter((l) => l.reason === 'competing fresh entry').length,
      0
    ),
    lostToShadow: sh.episodes.reduce(
      (a, e) => a + e.losses.filter((l) => l.reason === 'higher-priority shadow').length,
      0
    ),
    byBook
  };
};

// Priority 3's record (unchanged; its ledger signature covers delayed lots like any lot) + the toggles and the summary.
export const recordOf = (door: Door, q: Quad, x: ReturnType<typeof run>, o: EvalOptions, sh: Sh): SRec => ({
  ...p3RecordOf(door, q, x, o),
  sh,
  shadow: shadowSummaryOf(x.result, door)
});

export const evaluate = (door: Door, q: Quad, o: EvalOptions, sh: Sh): SRec =>
  recordOf(door, q, run(door, q, o, sh), o, sh);

// The digest of a configuration with its toggles (identity hygiene for the archive and the records).
export const shConfigId = (quadIdText: string, sh: Sh) =>
  sh === offSh ? quadIdText : createHash('sha256').update(`${quadIdText}|sh${sh}`).digest('hex').slice(0, 16);
