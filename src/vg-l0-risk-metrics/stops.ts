// Stop-aware conditional protection of an open lot at a session close (PROTOCOL.md §6.5; METRIC_SPECIFICATION.md §6).
// The exit state is RECONSTRUCTED from the raw bars with the exit managers' own rules, never assumed:
//   - the trailing stop of both families (src/shared-margin-portfolio/strategy.ts ExitManager, net-profit policy): the
//     post-entry high from the fill minute (onEntry: max(raw fill, the session close, every minute high from the fill
//     minute)), raised by each later session's high (afterSession skips the entry session; src/multi-etf-allocator/
//     shadow.ts); level = high × (1 − ts); ARMED iff shares × level − principal − interest(next session) > 0;
//   - RC 2's protective stop (D1 families B, C, D): entry raw × (1 − d ÷ 1000), unconditional;
//   - Growth's initial risk stop: entry raw − m × ATR(L completed sessions before the fill) (optionalRules.ts atrBefore);
//   - not price protection: maximum-hold and buffered-loss exits, retention's trend exit (a retained remainder gets no
//     price-protection credit).
// verifyExit() checks the reconstruction against an actual historical exit (gate G-S).
import { atrBefore } from '../growth-trading/optionalRules.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import type { Lot } from '../vg-d1-growth-joint/pool.ts';
import { secondsPerYear } from '../shared-margin-portfolio/strategy.ts';
import type { Subject } from './engine.ts';

export interface BookParams {
  book: string;
  trailing: number; // fraction below the post-entry high
  hold: { mode: 'calendar' | 'adaptive' | 'disabled' | 'off'; days: number | null; extendedDays?: number | null };
  protective: { fraction: number; activation: 'next-session' | 'entry-day' } | null;
  initialStop: { atrSessions: number; atrMultiple: number } | null;
  retention: { sellFraction: number } | null; // trend retention: the first armed trailing-stop event sells this fraction only
}

export const bookParamsOf = (subject: Subject, book: string): BookParams => {
  if (book.startsWith('D1:')) {
    const s = book.slice(3) as 'GDX' | 'VGT';
    const g = subject.quad.d1[s];
    const c = subject.controls?.books[book as 'D1:GDX' | 'D1:VGT'];
    const ps = c?.protectiveStop;
    const hm = c?.hold?.mode ?? 'legacy';

    return {
      book,
      trailing: g.trailingStopPercentage / 1000,
      hold:
        hm === 'disabled'
          ? { mode: 'disabled', days: null }
          : hm === 'adaptive'
            ? { mode: 'adaptive', days: g.maximumHoldDays, extendedDays: (c!.hold as { extendedHoldDays: number }).extendedHoldDays }
            : { mode: 'calendar', days: g.maximumHoldDays },
      protective: ps?.mode === 'on' ? { fraction: ps.stopDistanceTenths / 1000, activation: (ps as { activation?: 'next-session' | 'entry-day' }).activation ?? 'next-session' } : null,
      initialStop: null,
      retention: null
    };
  }

  const g = subject.quad.g[book.slice(2) as 'GDX' | 'VGT'] as Record<string, unknown>;

  return {
    book,
    trailing: (g.trailingStopPercent as number) / 100,
    hold: g.maximumHoldEnabled === true ? { mode: 'calendar', days: g.maximumHoldDays as number } : { mode: 'off', days: null },
    protective: null,
    initialStop: g.initialStopEnabled === true ? { atrSessions: g.initialStopAtrSessions as number, atrMultiple: g.initialStopAtrMultiple as number } : null,
    retention: g.retentionEnabled === true ? { sellFraction: (g.retentionSellPercent as number) / 100 } : null
  };
};

// Every funded book of the configuration has an executable loss exit: D1 always (a maximum-hold loss exit, or a
// protective stop); Growth·VGT iff its maximum hold or its initial stop is ON.
export const boundedLossExit = (subject: Subject) => {
  const g = bookParamsOf(subject, 'G:VGT');

  return g.hold.mode !== 'off' || g.initialStop !== null;
};

const dayMs = 86_400_000;
const nextWeekday = (date: string) => {
  let t = Date.parse(`${date}T00:00:00Z`) + dayMs;

  while ([0, 6].includes(new Date(t).getUTCDay())) t += dayMs;
  return new Date(t).toISOString().slice(0, 10);
};

// The post-entry high through session c (inclusive), with the managers' entry-session rule.
export const postEntryHigh = (door: Door, lot: Lot, c: number) => {
  const ds = door.sym[lot.symbol as 'GDX' | 'VGT'].ds;
  const eS = lot.entryS;
  const eK = lot.trade.eK;
  const start = ds.sBarStart[eS]!;
  const count = ds.sBarCount[eS]!;
  let h = Math.max(lot.entryRaw, ds.sClose[eS]!);

  for (let k = Math.max(0, eK); k < count; k++) h = Math.max(h, ds.bHigh[start + k]!);
  for (let s = eS + 1; s <= c; s++) h = Math.max(h, ds.sHigh[s]!);
  return h;
};

export interface StopState {
  date: string; // the session close c
  nextSession: string; // the assumed next session (the next weekday; holidays ignored)
  book: string;
  entry: string;
  entryRaw: number;
  close: number;
  shares: number;
  principal: number;
  realizedPartial: number;
  retainedRemainder: boolean;
  marked: number; // the lot's marked P&L at the close (π)
  liquidation: number; // λ: marked − the open shares' sale cost
  multiple: number; // market value ÷ the original principal
  postEntryHigh: number;
  trailingLevel: number;
  trailingArmed: boolean;
  protectiveLevel: number | null;
  initialLevel: number | null;
  effectiveLevel: number | null; // the highest ARMED executable price level (null: no executable price stop)
  effectiveKind: string | null;
  levelBelowClosePct: number | null;
  hold: BookParams['hold'];
  holdDueDate: string | null; // entry date + hold days (calendar), when a calendar/adaptive hold applies
  retentionSellFraction: number | null; // the share an armed trailing-stop event sells (stage full under retention)
  valueAtStop: number | null; // g = 0
  valueStressed10: number | null; // g = 10% (the protocol's stress)
  valueStressed20: number | null;
  valueGap30: number; // the lot's liquidation value if the next session opens 30% below the close
  conservativeValue: number; // CV: min(λ, V_10) when an executable stop is armed, else min(0, λ)
  protectedProfit: number; // max(0, V_10) (armed) else 0
  profitAtRisk: number; // max(0, λ) − max(0, V_10) (armed) else max(0, λ)
}

export const stopStateAt = (door: Door, lot: Lot, c: number, p: BookParams, rate: number, costBps: number): StopState => {
  const ds = door.sym[lot.symbol as 'GDX' | 'VGT'].ds;
  let shares = lot.shares0;
  let principal = lot.principal0;
  let realized = 0;
  let partials = 0;

  for (const f of lot.fills) {
    if (f.s > c) break;
    if (!f.partial) throw new Error(`lot ${lot.id} is closed at ${door.dates[c]}`);
    shares -= f.shares;
    principal -= f.principal;
    realized += f.net;
    partials++;
  }

  const date = door.dates[c]!;
  const next = nextWeekday(date);
  const yearsTo = (d: string) => (Date.parse(`${d}T00:00:00Z`) / 1000 - lot.entryTs) / secondsPerYear;
  const close = ds.sClose[c]!;
  const marked = realized + shares * close - principal - principal * rate * yearsTo(date);
  const liquidation = marked - (shares * close * costBps) / 10_000;
  const interestNext = principal * rate * yearsTo(next);
  const valueAt = (price: number) => realized + shares * price * (1 - costBps / 10_000) - principal - interestNext;
  const h = postEntryHigh(door, lot, c);
  const trailingLevel = h * (1 - p.trailing);
  const retained = partials > 0;
  const trailingArmed = !retained && shares * trailingLevel - principal - interestNext > 0;
  const protectiveLevel = p.protective ? lot.entryRaw * (1 - p.protective.fraction) : null;
  let initialLevel: number | null = null;

  if (p.initialStop) {
    const a = atrBefore(ds, lot.entryS, p.initialStop.atrSessions);

    if (!a.ok) throw new Error(`lot ${lot.id}: the initial stop's ATR is unavailable`);
    initialLevel = lot.entryRaw - p.initialStop.atrMultiple * a.record.atr;
  }

  const armed: [number, string][] = [];

  if (!retained) {
    if (trailingArmed) armed.push([trailingLevel, 'trailing stop (armed: profit-conditional)']);
    if (protectiveLevel !== null) armed.push([protectiveLevel, 'protective stop (RC)']);
    if (initialLevel !== null) armed.push([initialLevel, 'initial risk stop (Growth)']);
  }
  armed.sort((a, b) => b[0] - a[0]);

  const eff = armed[0] ?? null;
  // Trend retention in stage full: an armed trailing-stop event sells only the retention fraction; the remainder keeps
  // only the non-trailing executable levels (initial / protective), else it gets no price-protection credit.
  const rf = !retained && p.retention && eff?.[1].startsWith('trailing') ? p.retention.sellFraction : 1;
  const rest = armed.find((a) => !a[1].startsWith('trailing')) ?? null;
  const openLiq = shares * close * (1 - costBps / 10_000) - principal - principal * rate * yearsTo(date);
  const fillAt = (g: number) => {
    if (!eff) return null;

    const part = (level: number, w: number) => w * (shares * Math.min(level, close) * (1 - g) * (1 - costBps / 10_000) - principal - interestNext);
    const remainder = rf < 1 ? (rest ? part(rest[0], 1 - rf) : (1 - rf) * Math.min(0, openLiq)) : 0;

    return realized + part(eff[0], rf) + remainder;
  };
  const v10 = fillAt(0.1);

  return {
    date,
    nextSession: next,
    book: lot.book,
    entry: door.dates[lot.entryS]!,
    entryRaw: lot.entryRaw,
    close,
    shares,
    principal,
    realizedPartial: realized,
    retainedRemainder: retained,
    marked,
    liquidation,
    multiple: (shares * close) / lot.principal0,
    postEntryHigh: h,
    trailingLevel,
    trailingArmed,
    protectiveLevel,
    initialLevel,
    effectiveLevel: eff?.[0] ?? null,
    effectiveKind: eff?.[1] ?? null,
    levelBelowClosePct: eff ? (100 * (close - eff[0])) / close : null,
    hold: p.hold,
    holdDueDate: p.hold.days !== null ? new Date(Date.parse(`${door.dates[lot.entryS]}T00:00:00Z`) + p.hold.days * dayMs).toISOString().slice(0, 10) : null,
    retentionSellFraction: rf < 1 ? rf : null,
    valueAtStop: fillAt(0),
    valueStressed10: v10,
    valueStressed20: fillAt(0.2),
    valueGap30: valueAt(close * 0.7),
    conservativeValue: v10 !== null ? Math.min(liquidation, v10) : Math.min(0, liquidation),
    protectedProfit: v10 !== null ? Math.max(0, v10) : 0,
    profitAtRisk: v10 !== null ? Math.max(0, liquidation) - Math.max(0, v10) : Math.max(0, liquidation)
  };
};

// Gate G-S: the reconstruction against one historical final exit. Returns null when the exit is not a price stop.
export const verifyExit = (door: Door, lot: Lot, p: BookParams, rate: number, costBps: number) => {
  if (lot.open) return null;

  const f = lot.fills.at(-1)!;
  const r = f.reason;
  const ds = door.sym[lot.symbol as 'GDX' | 'VGT'].ds;
  const rel = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
  const isOpenPrint = f.k < ds.sBarCount[f.s]! && f.raw === ds.bOpen[ds.sBarStart[f.s]! + f.k]!;

  if (r === 'trailing stop' || r === 'trailing stop gap') {
    if (f.s <= lot.entryS) return { reason: r, ok: false, why: 'a trailing stop on the entry session' };

    const st = stopStateAt(door, lot, f.s - 1, p, rate, costBps);
    const level = st.trailingLevel;
    // the managers re-check the net rule at the exit session itself (interest to that session's date)
    const ok = r === 'trailing stop gap' ? ds.sOpen[f.s]! <= level + 1e-9 && f.raw === ds.sOpen[f.s] : rel(f.raw, level) < 1e-9 || (isOpenPrint && f.raw <= level + 1e-9);

    return { reason: r, ok, level, raw: f.raw, armedByRule: st.trailingArmed || st.retainedRemainder };
  }
  if (/protective/i.test(r)) {
    const level = lot.entryRaw * (1 - p.protective!.fraction);
    const ok = rel(f.raw, level) < 1e-9 || (f.raw <= level + 1e-9 && (isOpenPrint || f.raw === ds.sOpen[f.s]));

    return { reason: r, ok, level, raw: f.raw, armedByRule: true };
  }
  if (/initial/i.test(r)) {
    const a = atrBefore(ds, lot.entryS, p.initialStop!.atrSessions);
    const level = lot.entryRaw - p.initialStop!.atrMultiple * (a.ok ? a.record.atr : NaN);
    const ok = rel(f.raw, level) < 1e-9 || (f.raw <= level + 1e-9 && (isOpenPrint || f.raw === ds.sOpen[f.s]));

    return { reason: r, ok, level, raw: f.raw, armedByRule: true };
  }
  return null;
};
