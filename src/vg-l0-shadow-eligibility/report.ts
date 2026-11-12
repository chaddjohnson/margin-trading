// Detailed run views (PROTOCOL.md §11.3, report-only): from one detailed replay, the FUNDED-LOT LEDGER (fresh and delayed
// lots apart), the SHADOW-EPISODE LEDGER (every refused opportunity of a toggled book: its original signal, occupant,
// hypothetical trade, eligibility window, release checks, losses, end and any delayed real entry), the annual P&L and
// annual (reset) minute drawdowns, the per-strategy attribution and the capital utilization. Shadow records are kept
// apart from funded-trade results; hypothetical nets are descriptive only and never summed into an achievable figure.
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type BookId, bookIds } from '../vg-d1-growth-joint/books.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../vg-d1-growth-joint/evaluate.ts';
import type { ShadowPoolResult } from './allocator.ts';
import { r2 } from './context.ts';
import type { Cfg } from './config.ts';
import { type SRec, recordOf, run } from './evaluate.ts';

const iso = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ') : '');

export interface LotRow {
  id: number;
  book: BookId;
  kind: 'fresh' | 'delayed';
  trade: number;
  setup: string;
  decision: string;
  entry: string;
  entryPrice: number;
  exit: string;
  exitPrice: number | null;
  exitReason: string;
  open: boolean;
  principal: number;
  net: number;
  interest: number;
  costs: number;
  mae: number; // the lot's worst mark (realized fills + remainder), dollars
  mfe: number;
  days: number; // calendar days held (to the end while open)
  year: string;
  episode: number | null;
  displaced: number; // decisions refused while this (delayed) lot or its order held the slot
}

export interface EpisodeRow {
  index: number;
  book: BookId;
  trade: number;
  kind: string;
  refused: string; // the original signal's decision time
  decisionPrice: number;
  occupant: string;
  occupantDelayed: boolean;
  ownOccupant: boolean;
  hypEntry: string;
  hypEntryPrice: number | null;
  hypExit: string;
  hypExitPrice: number | null;
  hypExitReason: string;
  hypNet: number; // descriptive only
  eligibleFrom: string;
  eligibleTo: string;
  endReason: string;
  releases: number;
  persistedToRelease: boolean;
  losses: string; // reason@time;…
  delayedDecision: string;
  delayedFill: string;
  delayedFillPrice: number | null;
  lotId: number | null;
  lotNet: number | null;
  lotExitReason: string;
  waitSessions: number | null;
  waitDays: number | null;
}

export const detailOf = (door: Door, cfg: Cfg, o: EvalOptions) => {
  const x = run(door, cfg.quad, o, cfg.sh, true, true);
  const r = x.result as ShadowPoolResult;
  const rec: SRec = recordOf(door, cfg.quad, x, o, cfg.sh);
  const ds = door.sym.VGT.ds;
  const sh = r.shadow;
  const lotEpisode = new Map<number, number>();

  if (sh) for (const [id, info] of sh.delayedLots) lotEpisode.set(id, info.episode);

  const lots: LotRow[] = r.lots.map((l) => {
    const last = l.fills.at(-1);
    const exitS = l.open ? r.endIndex : last!.s;
    const ep = lotEpisode.get(l.id);

    return {
      id: l.id,
      book: l.book,
      kind: ep === undefined ? 'fresh' : 'delayed',
      trade: l.trade.id,
      setup: l.trade.kind,
      decision: iso(l.trade.dT),
      entry: iso(l.entryT),
      entryPrice: l.entryPrice,
      exit: l.open ? '' : iso(last!.t),
      exitPrice: l.open ? null : last!.price,
      exitReason: l.open ? 'open at the end' : last!.reason,
      open: l.open,
      principal: r2(l.principal0),
      net: r2(l.net),
      interest: r2(l.interest),
      costs: r2(l.costs),
      mae: r2(Number.isFinite(l.worst) ? l.worst : 0),
      mfe: r2(Number.isFinite(l.best) ? l.best : 0),
      days: Math.round((ds.sTime[exitS]! - ds.sTime[l.entryS]!) / 86400),
      year: door.dates[l.entryS]!.slice(0, 4),
      episode: ep ?? null,
      displaced: ep === undefined ? 0 : (sh!.delayedLots.get(l.id)?.displaced.length ?? 0)
    };
  });
  const lotById = new Map(r.lots.map((l) => [l.id, l]));
  const episodes: EpisodeRow[] = (sh?.episodes ?? []).map((e) => {
    const lot = e.delayed && e.delayed.lotId > 0 ? lotById.get(e.delayed.lotId) : undefined;

    return {
      index: e.index,
      book: e.book,
      trade: e.trade,
      kind: e.kind,
      refused: iso(e.dT),
      decisionPrice: e.dPrice,
      occupant: e.occupant,
      occupantDelayed: e.occupantDelayed,
      ownOccupant: e.ownOccupant,
      hypEntry: iso(e.hyp.eT),
      hypEntryPrice: Number.isFinite(e.hyp.ePrice) ? e.hyp.ePrice : null,
      hypExit: iso(e.hyp.xT),
      hypExitPrice: Number.isFinite(e.hyp.xPrice) ? e.hyp.xPrice : null,
      hypExitReason: e.hyp.xReason,
      hypNet: r2(e.hyp.vNet),
      eligibleFrom: iso(e.dT),
      eligibleTo: iso(e.end.t),
      endReason: e.end.reason,
      releases: e.releases,
      persistedToRelease: e.persistedToRelease,
      losses: e.losses.map((l) => `${l.reason}${l.winner ? ` (${l.winner})` : ''}@${iso(l.D)}`).join('; '),
      delayedDecision: e.delayed ? iso(e.delayed.D) : '',
      delayedFill: e.delayed ? iso(e.delayed.eT) : '',
      delayedFillPrice: e.delayed && Number.isFinite(e.delayed.ePrice) ? e.delayed.ePrice : null,
      lotId: lot?.id ?? null,
      lotNet: lot ? r2(lot.net) : null,
      lotExitReason: lot ? (lot.open ? 'open at the end' : lot.fills.at(-1)!.reason) : '',
      waitSessions: e.delayed?.waitSessions ?? null,
      waitDays: e.delayed ? Math.round(e.delayed.waitDays) : null
    };
  });

  // annual P&L (marked, from the session closes) and annual reset minute drawdowns (the strict tracker restarted at
  // each year's first mark with the previous close as its peak)
  const years: Record<string, { net: number; dd: number; recovered: number; delayedLots: number; lots: number }> = {};
  const mc = r.markChanges!;
  let prevClose = 0;
  let y0 = '';
  let tracker: Tracker | null = null;
  let mi = 0;

  for (let s = 0; s <= r.endIndex; s++) {
    const y = door.dates[s]!.slice(0, 4);

    if (y !== y0) {
      if (tracker && y0) years[y0]!.dd = r2(tracker.stats().maximum);
      years[y] ??= { net: 0, dd: 0, recovered: 0, delayedLots: 0, lots: 0 };
      tracker = new Tracker(prevClose, ds.sTime[s]!);
      y0 = y;
    }

    const close = ds.sCloseTime[s]!;

    while (mi < mc.t.length && mc.t[mi]! <= close) {
      tracker!.updateStrict(mc.v[mi]!, mc.t[mi]!);
      mi++;
    }

    const v = r.daily[s]!;

    years[y]!.net += v - prevClose;
    prevClose = v;
  }
  if (tracker && y0) years[y0]!.dd = r2(tracker.stats().maximum);
  for (const l of lots) {
    years[l.year]!.lots++;
    if (l.kind === 'delayed') {
      years[l.year]!.delayedLots++;
      years[l.year]!.recovered += l.net;
    }
  }
  for (const y of Object.values(years)) {
    y.net = r2(y.net);
    y.recovered = r2(y.recovered);
  }

  // per-strategy attribution: booked P&L and lots, fresh versus delayed
  const attribution = Object.fromEntries(
    bookIds.map((b) => {
      const mine = lots.filter((l) => l.book === b);
      const sum = (xs: LotRow[]) => r2(xs.reduce((a, l) => a + l.net, 0));

      return [
        b,
        {
          lots: mine.length,
          booked: sum(mine),
          fresh: {
            lots: mine.filter((l) => l.kind === 'fresh').length,
            booked: sum(mine.filter((l) => l.kind === 'fresh'))
          },
          delayed: {
            lots: mine.filter((l) => l.kind === 'delayed').length,
            booked: sum(mine.filter((l) => l.kind === 'delayed'))
          },
          wins: mine.filter((l) => !l.open && l.net > 0).length,
          principalDays: rec.books[b].principalDays,
          decisions: rec.books[b].decisions,
          refused: rec.books[b].refused
        }
      ];
    })
  );
  const calendarDays = (ds.sTime[r.endIndex]! - ds.sTime[0]!) / 86400;
  const principalDays = bookIds.reduce((a, b) => a + rec.books[b].principalDays, 0);
  const utilization = {
    sessionsHeldShare: Math.round((rec.sessionsHeld / door.sessions) * 1e4) / 1e4,
    principalDaysShare: Math.round((principalDays / (100_000 * calendarDays)) * 1e4) / 1e4,
    delayedPrincipalDaysShare: rec.shadow
      ? Math.round((rec.shadow.recoveredPrincipalDays / (100_000 * calendarDays)) * 1e4) / 1e4
      : 0
  };
  const closed = lots.filter((l) => !l.open);
  const worst = [...lots].sort((a, b) => a.net - b.net)[0];
  const winners = [...lots].filter((l) => l.net > 0).sort((a, b) => b.net - a.net);

  return {
    rec,
    lots,
    episodes,
    years,
    attribution,
    utilization,
    trades: {
      lots: lots.length,
      closed: closed.length,
      wins: closed.filter((l) => l.net > 0).length,
      winRate: closed.length ? Math.round((closed.filter((l) => l.net > 0).length / closed.length) * 1e4) / 1e4 : 0,
      gross: r2(lots.reduce((a, l) => a + l.net + l.interest + l.costs, 0)),
      costs: r2(lots.reduce((a, l) => a + l.costs, 0)),
      interest: r2(lots.reduce((a, l) => a + l.interest, 0)),
      worstTrade: worst ? { id: worst.id, book: worst.book, net: worst.net, entry: worst.entry } : null,
      worstAdverseExcursion: lots.length ? r2(Math.min(...lots.map((l) => l.mae))) : 0,
      largestWinShare: rec.net > 0 && winners[0] ? Math.round((winners[0].net / rec.net) * 1e4) / 1e4 : null,
      topFiveWinShare:
        rec.net > 0 ? Math.round((winners.slice(0, 5).reduce((a, l) => a + l.net, 0) / rec.net) * 1e4) / 1e4 : null
    }
  };
};

// CSV text of rows (header from the first row's keys).
export const csvOf = (rows: readonly object[]) => {
  if (!rows.length) return '';

  const keys = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const t = v === null || v === undefined ? '' : String(v);

    return /[",\n;]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };

  return `${keys.join(',')}\n${rows.map((r) => keys.map((k) => cell((r as Record<string, unknown>)[k])).join(',')).join('\n')}\n`;
};
