// P8-GDX — THE MATCHED TOTAL-PORTFOLIO COMPARISON (PROTOCOL.md §15; brief Phase 5). REPORT-ONLY, NON-OFFICIAL (purpose
// diagnostic), run only AFTER the sealed, committed outcome, on frozen subjects. It never selects, ranks, qualifies or
// stops anything.
//
//   GPU_POLICY_PURPOSE=diagnostic npm run gdx8-port -- run
//   GPU_POLICY_PURPOSE=parity-test npm run gdx8-port -- test   (ENGINEERING TEST before the freeze: door D24, the three
//     frozen references N/original, New L0 and the ablation only; output only to the git-ignored cache/portfolio-test)
//
// Inputs (all pinned by sha256 in the output): the canonical VOOG / VGT minute files (canonical session grouping, the
// central forward split adjustment: every core price in 2016-01-04 share units), the central distribution ledger
// (config/market-events/distributions.csv), the independent Yahoo distribution events (cache/independent), the study's
// GDX FULL door and Priority 3's VGT/GDX FULL door (N/original, New L0), FROZEN_SELECTION.json, the C24 selection and the
// sealed validation record (every overlay is reconciled to the cent with its sealed GPU whole-run figures).
//
// THE ACCOUNT (one per scenario and leverage level; identical core in every scenario):
//   core      60 % VOOG / 40 % VGT bought at the 2016-01-04 close (5 bps per side), rebalanced to 60 / 40 at the last
//             session close of each calendar quarter (primary; sensitivity: drift), distributions entitled by the shares
//             held at the close before the ex-date, a receivable from the ex-date, reinvested in the same fund at the
//             pay-date close (or the next session's)
//   overlay   the engine's own continuous run of the frozen configuration (CPU reference engine = the sealed GPU record):
//             marked net at every session close (realized + open lot shares × close − outstanding principal − accrued
//             interest; costs and the 11 % interest INSIDE — charged once), the open lot's market value and outstanding
//             principal (+ accrued interest = margin debt)
//   cash      the realized overlay P&L; positive cash earns 0 %; a negative balance is margin debt at 11 % simple per
//             calendar day (booked at each quarter end); sensitivity: positive cash swept into the 60 / 40 core at each
//             quarterly rebalance
//   equity    core value + receivables + cash + overlay open mark (= core + receivables + overlay marked net + the
//             negative-cash interest, reconciled at every close)
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { MarketSession } from '#types';
import { resolveDataset } from '../../src/lib/dataset.ts';
import { loadDatasetSessions } from '../../src/lib/evaluation.ts';
import { readSplits, splitFactor } from '../../src/lib/corporateActions.ts';
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import type { PoolResult } from '../../src/vg-d1-growth-joint/pool.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import { quadOf as a3QuadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { references } from '../../src/vg-l0-n-successor/incumbents.ts';
import { openStudyDoor } from '../../src/gpu-backend/doors.ts';
import { type ArmKey, STUDY_ID, armOptions, chronology, repoRoot, researchDir, resultsDir } from '../../src/gdx-d1-growth/context.ts';
import { openGdxDoor } from '../../src/gdx-d1-growth/doors.ts';
import { d1Incumbent } from '../../src/gdx-d1-growth/controls.ts';
import { type Cfg, canonicalCfg, cfgId, quadOf } from '../../src/gdx-d1-growth/space.ts';
import { ensureAllFrozen } from '../../src/gdx-d1-growth/stages.ts';
import { purposeOf, writeJson } from './common.ts';

const args = process.argv.slice(2);
const cmd = args[0];
const TEST = cmd === 'test';
const outDir = TEST ? path.join(researchDir, 'cache', 'portfolio-test') : path.join(researchDir, 'reports', 'portfolio');
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const readJ = <T>(f: string) => JSON.parse(fs.readFileSync(f, 'utf8')) as T;
const rate = 0.11;
const costBps = 5;
const leverage = [250_000, 500_000, 1_000_000] as const;
const PRIMARY_CORE = 500_000;
const devEnd = chronology.developmentEnd;
const day = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

// ----- the core's data -----

interface CoreData {
  dates: string[];
  close: Record<'VOOG' | 'VGT', number[]>; // 2016-01-04 share units (central forward split adjustment)
  low: Record<'VOOG' | 'VGT', number[]>;
  files: Record<string, { file: string; sha256: string; sessions: number }>;
}

const loadCore = async (dates: string[]): Promise<CoreData> => {
  const endDate = dates.at(-1)!;

  const out = { dates, close: {}, low: {}, files: {} } as CoreData;

  for (const s of ['VOOG', 'VGT'] as const) {
    const file = path.join('data', s, 'data.csv');
    const r = await loadDatasetSessions({ dataset: resolveDataset(s, file), startDate: chronology.firstSession, endDate, warmupSessions: 0 });
    const h: MarketSession[] = r.history;

    if (h.length !== dates.length || h.some((x, i) => x.date !== dates[i])) throw new Error(`${s}: its sessions differ from the trading calendar (${h.length} vs ${dates.length})`);
    out.close[s] = h.map((x) => x.close);
    out.low[s] = h.map((x) => x.low);
    out.files[s] = { file, sha256: sha(path.join(repoRoot, file)), sessions: h.length };
  }
  return out;
};

// ----- distributions -----

interface Dist {
  etf: string;
  ex: string;
  pay: string;
  amount: number; // per 2016-unit share
  rawAmount: number;
  method: string;
  source: string;
}

const ledgerFile = path.join(repoRoot, 'config', 'market-events', 'distributions.csv');
const independentFile = (s: string) => path.join(researchDir, 'cache', 'independent', `yahoo-${s}-dividends-2016-2026.json`);

const yahooDividends = (s: string) => {
  const f = independentFile(s);

  if (!fs.existsSync(f)) return null;

  const y = readJ<{ chart: { result: { events?: { dividends?: Record<string, { date: number; amount: number }> } }[] } }>(f);

  // Yahoo's chart API states every historical amount per CURRENT share (adjusted for every later split: VOOG 6:1, VGT 8:1
  // on 2026-04-21). The ledger and the accounting use the raw amount per share held on the ex-date, so the Yahoo amount is
  // converted back by the splits effective after the ex-date (report-only correction found at the stage, DECISION_REGISTER R)
  const splits = readSplits();

  return Object.values(y.chart.result[0]!.events?.dividends ?? {})
    .map((d) => {
      const exDate = new Date((d.date - 5 * 3600) * 1000).toISOString().slice(0, 10);

      return { exDate, amount: d.amount * splitFactor(splits, s, exDate, '9999-12-31'), yahooAdjusted: d.amount };
    })
    .sort((a, b) => (a.exDate < b.exDate ? -1 : 1));
};

const loadDistributions = () => {
  const lines = fs.readFileSync(ledgerFile, 'utf8').trim().split('\n');
  const head = lines[0]!.split(',');
  const splits = readSplits();
  const rows = lines.slice(1).map((l) => {
    const c = l.split(',');
    const o = Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])) as Record<string, string>;

    return o;
  });
  const checks: Record<string, unknown>[] = [];
  const replaced: Record<string, unknown>[] = [];
  const out: Dist[] = [];

  for (const o of rows) {
    if (o.etf !== 'VOOG' && o.etf !== 'VGT') continue;

    const ys = yahooDividends(o.etf);
    // the independent event nearest the ledger's ex-date (± 10 calendar days)
    const near = ys?.map((y) => ({ ...y, gap: Math.abs(day(y.exDate) - day(o.ex_date!)) })).filter((y) => y.gap <= 10).sort((a, b) => a.gap - b.gap)[0] ?? null;
    let rawAmount = Number(o.amount);
    let method = o.amount_method!;
    let source = o.source!;

    // PROTOCOL §15.3: an "estimated" ledger amount is replaced by an independently observed amount (same quarter, ±10 days)
    if (o.amount_method === 'estimated') {
      if (near) {
        replaced.push({ etf: o.etf, ex: o.ex_date, ledgerEstimate: rawAmount, independent: near.amount, independentYahooAdjusted: near.yahooAdjusted, independentExDate: near.exDate });
        rawAmount = near.amount;
        method = 'independent (Yahoo event; replaces the ledger estimate)';
        source = `Yahoo Finance chart API dividend event ${near.exDate}`;
      } else replaced.push({ etf: o.etf, ex: o.ex_date, ledgerEstimate: rawAmount, independent: null, note: 'unverified: kept and bounded (zero variant)' });
    }
    checks.push({ etf: o.etf, ex: o.ex_date, ledger: Number(o.amount), method: o.amount_method, independent: near?.amount ?? null, independentYahooAdjusted: near?.yahooAdjusted ?? null, independentExDate: near?.exDate ?? null, relDiff: near ? r4(Number(o.amount) / near.amount - 1) : null });
    out.push({ etf: o.etf, ex: o.ex_date!, pay: o.pay_date!, amount: rawAmount * splitFactor(splits, o.etf, chronology.firstSession, o.ex_date!), rawAmount, method, source });
  }
  return { dists: out, checks, replaced };
};

// ----- an overlay: the engine's continuous run -----

interface Overlay {
  key: string;
  label: string;
  marked: number[]; // marked net at each close
  value: number[]; // open lot market value at each close (0 when flat)
  debt: number[]; // outstanding principal + accrued interest at each close (0 when flat)
  realized: number[];
  symbolHeld: (string | null)[]; // the open lot's symbol at each close
  lowMark: number[]; // the open lot's value at the session low − its value at the close (≤ 0)
  net: number;
  dd: number;
  lots: { book: string; symbol: string; entry: string; exit: string | null; principal0: number; days: number; net: number; sharesAtEx?: unknown }[];
  principalDays: number;
  sessionsHeld: number;
  funding: { refused: number; granted: number; byOccupant: Record<string, number> };
  raw: PoolResult;
}

const overlayOf = (key: string, label: string, door: Door, quad: ReturnType<typeof quadOf>, controls: Cfg['controls'], options: Record<string, unknown>): Overlay => {
  const { result: r } = runWithControls2(door, quad, controls, options as never, true, false);
  const n = door.sessions;
  const realized = new Array<number>(n).fill(0);
  const symbolHeld = new Array<string | null>(n).fill(null);
  const lowMark = new Array<number>(n).fill(0);
  const fillNet = new Array<number>(n).fill(0);

  for (const l of r.lots) for (const f of l.fills) fillNet[f.s] = (fillNet[f.s] ?? 0) + f.net;

  let cum = 0;

  for (let s = 0; s < n; s++) {
    cum += fillNet[s]!;
    realized[s] = cum;
  }
  for (const l of r.lots) {
    const last = l.fills.at(-1)?.s ?? n;
    const exitS = l.open ? n : last;

    for (let s = l.entryS; s < exitS; s++) {
      symbolHeld[s] = l.symbol;

      const h = door.sym[l.symbol].history[s]!;

      lowMark[s] = r.valueAtClose[s]! * (h.low / h.close - 1);
    }
  }

  const value = Array.from(r.valueAtClose);
  const marked = Array.from(r.daily);
  const debt = value.map((v, s) => (v > 0 ? v - (marked[s]! - realized[s]!) : 0));

  // reconciliation: at every close marked = realized + (value − debt); Σ lot nets = net
  for (let s = 0; s < n; s++) if (Math.abs(realized[s]! + value[s]! - debt[s]! - marked[s]!) > 0.005) throw new Error(`${key}: marked net does not reconcile at ${door.dates[s]}`);
  if (Math.abs(r.lots.reduce((a, l) => a + l.net, 0) - r.net) > 0.05) throw new Error(`${key}: Σ lot nets ≠ net`);

  const byOccupant: Record<string, number> = {};
  let refused = 0;
  let granted = 0;

  for (const f of r.funding) {
    if (f.outcome === 'refused') {
      refused++;
      byOccupant[`${f.book} refused (occupant ${f.occupantBook ?? f.occupant})`] = (byOccupant[`${f.book} refused (occupant ${f.occupantBook ?? f.occupant})`] ?? 0) + 1;
    } else granted++;
  }

  const lots = r.lots.map((l) => {
    const exitS = l.open ? null : l.fills.at(-1)!.s;

    return {
      book: l.book,
      symbol: l.symbol,
      entry: door.dates[l.entryS]!,
      exit: exitS === null ? null : door.dates[exitS]!,
      entryS: l.entryS,
      exitS,
      principal0: l.principal0,
      shares0: l.shares0,
      fills: l.fills.map((f) => ({ s: f.s, shares: f.shares, partial: f.partial })),
      days: (exitS === null ? day(door.dates.at(-1)!) : day(door.dates[exitS]!)) - day(door.dates[l.entryS]!),
      net: l.net
    };
  });

  return {
    key,
    label,
    marked,
    value,
    debt,
    realized,
    symbolHeld,
    lowMark,
    net: r.net,
    dd: r.dd.max,
    lots,
    principalDays: lots.reduce((a, l) => a + l.principal0 * l.days, 0),
    sessionsHeld: r.sessionsHeld,
    funding: { refused, granted, byOccupant },
    raw: r
  };
};

// ----- the account -----

interface Series {
  equity: number[];
  equityLow: number[]; // the conservative intraday bound (every holding at its session low)
  core: number[];
  receivables: number[];
  cash: number[];
  debt: number[];
  gross: number[];
  overlayValue: number[];
  vgtValue: number[]; // the core's VGT + any open VGT overlay lot
  gdxValue: number[];
  voogValue: number[];
  negInterest: number;
  coreTrades: number;
  coreCosts: number;
}

const simulate = (core: CoreData, dists: Dist[], ov: Overlay | null, initial: number, o: { rebalance: boolean; sweep: boolean; zeroUnverified?: Set<string> }): Series => {
  const n = core.dates.length;
  const funds = ['VOOG', 'VGT'] as const;
  const w = { VOOG: 0.6, VGT: 0.4 } as const;
  const sh = { VOOG: 0, VGT: 0 };
  const paid = { VOOG: 0, VGT: 0 }; // paid distributions awaiting reinvestment, by paying fund
  let residual = 0; // the core's cash residual (trading costs of rebalances; ≤ 0)
  const recv: { etf: 'VOOG' | 'VGT'; pay: string; cash: number }[] = [];
  const out: Series = { equity: [], equityLow: [], core: [], receivables: [], cash: [], debt: [], gross: [], overlayValue: [], vgtValue: [], gdxValue: [], voogValue: [], negInterest: 0, coreTrades: 0, coreCosts: 0 };
  let swept = 0;
  let negInt = 0; // booked interest on negative overlay cash (≤ 0)
  let pendingInt = 0; // accrued, not yet booked (≥ 0)
  const quarterOf = (d: string) => `${d.slice(0, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3)}`;
  const quarterEnd = (i: number) => i === n - 1 || quarterOf(core.dates[i]!) !== quarterOf(core.dates[i + 1]!);
  // buy (dollars > 0) or sell (< 0) at the close, 5 bps per side; returns the cash change
  const trade = (f: 'VOOG' | 'VGT', dollars: number, price: number) => {
    const cost = Math.abs(dollars) * (costBps / 10_000);

    sh[f] += dollars / price;
    out.coreCosts += cost;
    out.coreTrades++;
    return -dollars - cost;
  };

  for (let i = 0; i < n; i++) {
    const d = core.dates[i]!;
    const px = { VOOG: core.close.VOOG[i]!, VGT: core.close.VGT[i]! };

    // 1. ex-dates: entitlement by the shares held at the previous close
    if (i > 0)
      for (const dd of dists)
        if (dd.ex === d) {
          const f = dd.etf as 'VOOG' | 'VGT';
          const amt = o.zeroUnverified?.has(`${f}|${dd.ex}`) ? 0 : dd.amount;

          recv.push({ etf: f, pay: dd.pay, cash: sh[f] * amt });
        }
    // 2. pay-dates (on or before this session): the receivable becomes cash of its fund
    for (let k = recv.length - 1; k >= 0; k--)
      if (recv[k]!.pay <= d) {
        paid[recv[k]!.etf] += recv[k]!.cash;
        recv.splice(k, 1);
      }

    // 3. the overlay's cash and the negative-cash interest (11 % simple per calendar day, booked each quarter end)
    const realizedNow = ov ? ov.realized[i]! : 0;

    if (i > 0) {
      const prevCash = (ov ? ov.realized[i - 1]! : 0) - swept + negInt - pendingInt;

      if (prevCash < 0) pendingInt += -prevCash * rate * ((day(d) - day(core.dates[i - 1]!)) / 365);
    }

    // 4. at the close: the initial allocation, the quarterly rebalance (and the sweep), or the distribution reinvestment
    if (i === 0) {
      for (const f of funds) residual += trade(f, initial * w[f] * (1 - costBps / 10_000), px[f]) + initial * w[f];
    } else if (quarterEnd(i)) {
      negInt -= pendingInt;
      pendingInt = 0;

      const cashNow = realizedNow - swept + negInt;
      let add = 0;

      if (o.sweep && cashNow > 0) {
        add = cashNow;
        swept += cashNow;
      }

      const extra = paid.VOOG + paid.VGT + residual + add;
      const held = sh.VOOG * px.VOOG + sh.VGT * px.VGT;

      paid.VOOG = 0;
      paid.VGT = 0;
      residual = extra;
      for (const f of funds) {
        const target = o.rebalance ? (held + extra) * w[f] : sh[f] * px[f] + extra * ((sh[f] * px[f]) / held);
        const delta = target - sh[f] * px[f];

        if (Math.abs(delta) > 0.005) residual += trade(f, delta, px[f]);
      }
    } else {
      for (const f of funds)
        if (paid[f] > 0) {
          const c = paid[f];

          // the cost comes out of the reinvested amount
          residual += trade(f, c / (1 + costBps / 10_000), px[f]) + c;
          paid[f] = 0;
        }
    }

    const coreV = sh.VOOG * px.VOOG + sh.VGT * px.VGT + residual + paid.VOOG + paid.VGT;
    const rec = recv.reduce((a, r) => a + r.cash, 0);
    const cash = realizedNow - swept + negInt - pendingInt;
    const oValue = ov ? ov.value[i]! : 0;
    const oDebt = ov ? ov.debt[i]! : 0;
    const lowCore = sh.VOOG * core.low.VOOG[i]! + sh.VGT * core.low.VGT[i]! + residual + paid.VOOG + paid.VGT;

    out.equity.push(coreV + rec + cash + oValue - oDebt);
    out.equityLow.push(lowCore + rec + cash + oValue + (ov ? ov.lowMark[i]! : 0) - oDebt);
    out.core.push(coreV);
    out.receivables.push(rec);
    out.cash.push(cash);
    out.debt.push(oDebt + Math.max(0, -cash));
    out.gross.push(sh.VOOG * px.VOOG + sh.VGT * px.VGT + oValue);
    out.overlayValue.push(oValue);
    out.voogValue.push(sh.VOOG * px.VOOG);
    out.vgtValue.push(sh.VGT * px.VGT + (ov && ov.symbolHeld[i] === 'VGT' ? oValue : 0));
    out.gdxValue.push(ov && ov.symbolHeld[i] === 'GDX' ? oValue : 0);
  }
  out.negInterest = negInt - pendingInt;
  return out;
};

// ----- metrics -----

interface Dd {
  dd: number;
  pct: number; // of the running peak
  peak: string;
  trough: string;
  recovery: string | null;
  sessions: number;
}

// the strict drawdown of a series on [a, b] (peak reset at a)
const drawdownOf = (x: number[], dates: string[], a = 0, b = x.length - 1, lows?: number[]): Dd => {
  let peak = x[a]!;
  let peakI = a;
  let best: Dd = { dd: 0, pct: 0, peak: dates[a]!, trough: dates[a]!, recovery: null, sessions: 0 };
  let bestPeakI = a;

  for (let i = a; i <= b; i++) {
    const v = lows ? Math.min(lows[i]!, x[i]!) : x[i]!;
    const dd = peak - v;

    if (dd > best.dd) {
      best = { dd, pct: peak > 0 ? dd / peak : 0, peak: dates[peakI]!, trough: dates[i]!, recovery: null, sessions: i - peakI };
      bestPeakI = peakI;
    }
    if (x[i]! > peak) {
      peak = x[i]!;
      peakI = i;
    }
  }
  // recovery: the first close at or above the peak after the trough
  const pv = x[bestPeakI]!;
  const ti = dates.indexOf(best.trough);

  for (let i = ti + 1; i <= b; i++)
    if (x[i]! >= pv) {
      best.recovery = dates[i]!;
      break;
    }
  return { ...best, dd: r2(best.dd), pct: r4(best.pct) };
};

// the worst k non-overlapping drawdown episodes (peak → trough → recovery or the end)
const episodesOf = (x: number[], dates: string[], k = 5) => {
  const eps: { dd: number; pct: number; peak: string; trough: string; recovery: string | null }[] = [];
  let peak = x[0]!;
  let peakI = 0;
  let trough = x[0]!;
  let troughI = 0;

  const close = (endI: number | null) => {
    if (peak - trough > 0.005) eps.push({ dd: r2(peak - trough), pct: r4((peak - trough) / peak), peak: dates[peakI]!, trough: dates[troughI]!, recovery: endI === null ? null : dates[endI]! });
  };

  for (let i = 1; i < x.length; i++) {
    if (x[i]! >= peak) {
      close(i);
      peak = x[i]!;
      peakI = i;
      trough = x[i]!;
      troughI = i;
    } else if (x[i]! < trough) {
      trough = x[i]!;
      troughI = i;
    }
  }
  close(null);
  return eps.sort((a, b) => b.dd - a.dd).slice(0, k);
};

const lastIdx = (dates: string[], d: string) => {
  let j = -1;

  for (let i = 0; i < dates.length; i++) if (dates[i]! <= d) j = i;
  return j;
};
const corr = (a: number[], b: number[]) => {
  const n = a.length;

  if (n < 3) return null;

  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;

  for (let i = 0; i < n; i++) {
    sab += (a[i]! - ma) * (b[i]! - mb);
    saa += (a[i]! - ma) ** 2;
    sbb += (b[i]! - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? { corr: r4(sab / Math.sqrt(saa * sbb)), beta: r4(sab / saa), n } : { corr: null, beta: null, n };
};

const windowMetrics = (s: Series, base: Series | null, dates: string[], a: number, b: number, initial: number) => {
  const eq = s.equity;
  const start = a === 0 ? initial : eq[a - 1]!; // the window's starting equity (the previous close; the initial equity at the start)
  const startI = a === 0 ? 0 : a - 1;
  const ddClose = drawdownOf(eq, dates, startI, b);
  const ddLow = drawdownOf(eq, dates, startI, b, s.equityLow);

  return {
    window: `${dates[a]} → ${dates[b]}`,
    startEquity: r2(start),
    endEquity: r2(eq[b]!),
    pnl: r2(eq[b]! - start),
    return: r4(eq[b]! / start - 1),
    incrementalVsCore: base ? r2(eq[b]! - start - (base.equity[b]! - (a === 0 ? initial : base.equity[a - 1]!))) : null,
    maxDrawdown: ddClose,
    maxDrawdownIntradayBound: ddLow,
    maxDebt: r2(Math.max(0, ...s.debt.slice(a, b + 1))),
    maxLtv: r4(Math.max(0, ...s.debt.slice(a, b + 1).map((d, i) => d / Math.max(1, s.gross[a + i]!)))),
    minEquityToGross: r4(Math.min(...eq.slice(a, b + 1).map((e, i) => e / Math.max(1, s.gross[a + i]!))))
  };
};

const years = (dates: string[]) => [...new Set(dates.map((d) => d.slice(0, 4)))];

const annual = (s: Series, base: Series | null, dates: string[], initial: number) =>
  years(dates).map((y) => {
    const a = dates.findIndex((d) => d.startsWith(y));
    const b = lastIdx(dates, `${y}-12-31`);
    const start = a === 0 ? initial : s.equity[a - 1]!;
    const dd = drawdownOf(s.equity, dates, a === 0 ? 0 : a - 1, b);

    return {
      year: y,
      pnl: r2(s.equity[b]! - start),
      return: r4(s.equity[b]! / start - 1),
      incrementalVsCore: base ? r2(s.equity[b]! - start - (base.equity[b]! - (a === 0 ? initial : base.equity[a - 1]!))) : null,
      maxDrawdown: dd.dd,
      maxDrawdownPct: dd.pct
    };
  });

const marginOf = (s: Series, dates: string[]) => {
  const levels = [0.25, 0.3, 0.4];
  const rows = levels.map((m) => {
    let min = Infinity;
    let at = '';

    s.equity.forEach((e, i) => {
      const h = e - m * s.gross[i]!;

      if (h < min) {
        min = h;
        at = dates[i]!;
      }
    });
    return { requirement: `${m * 100} % of every long position`, minHeadroom: r2(min), at };
  });
  let minC = Infinity;
  let atC = '';

  s.equity.forEach((e, i) => {
    const h = e - (0.25 * (s.gross[i]! - s.overlayValue[i]!) + 0.5 * s.overlayValue[i]!);

    if (h < minC) {
      minC = h;
      atC = dates[i]!;
    }
  });
  rows.push({ requirement: '25 % of the core + 50 % of the overlay position (concentrated)', minHeadroom: r2(minC), at: atC });
  return rows;
};

// hypothetical instantaneous shocks at a given close (labelled hypothetical; never a historical observation)
const shocks = {
  technologyDecline: { VGT: -0.3, VOOG: -0.2, GDX: -0.1 },
  broadEquityCrash: { VGT: -0.35, VOOG: -0.3, GDX: -0.25 },
  goldMinerSelloff: { VGT: 0, VOOG: 0, GDX: -0.4 },
  combined: { VGT: -0.35, VOOG: -0.3, GDX: -0.4 }
} as const;
const stressAt = (s: Series, i: number, dates: string[]) =>
  Object.fromEntries(
    Object.entries(shocks).map(([k, sh]) => {
      const loss = s.voogValue[i]! * sh.VOOG + s.vgtValue[i]! * sh.VGT + s.gdxValue[i]! * sh.GDX;
      const eq = s.equity[i]! + loss;
      const gross = s.gross[i]! + loss;

      return [k, { at: dates[i], equityBefore: r2(s.equity[i]!), loss: r2(loss), equityAfter: r2(eq), lossPctOfEquity: r4(-loss / s.equity[i]!), headroom25AfterShock: r2(eq - 0.25 * gross), headroom40AfterShock: r2(eq - 0.4 * gross) }];
    })
  );

// ----- subjects -----

interface Subject {
  key: string; // a stable scenario key
  population: string; // D, G, C, J, S, D+, G+, C+, or a reference
  roles: string[];
  label: string;
  id: string;
  recordArm: ArmKey | 'REF';
  primary: boolean;
  native: boolean; // evaluated on Priority 3's own VGT/GDX door (N/original, New L0)
}

const subjectsOf = () => {
  const fz = readJ<{ preDetermination: { finalists: { arm: string; id: string; candidateLabel: string; recordArm: ArmKey; roles: string[]; primary: boolean; governanceLabel: string; informed: boolean }[] } }>(path.join(researchDir, 'FROZEN_SELECTION.json'));
  const subs: Subject[] = [
    { key: 'S1', population: 'N/original', roles: ['frozen benchmark'], label: 'N/original (VGT D1 + GDX D1 + VGT Growth)', id: references().NORIG.id, recordArm: 'REF', primary: true, native: true },
    { key: 'S2', population: 'New L0', roles: ['frozen benchmark'], label: 'New L0', id: references().NL0.id, recordArm: 'REF', primary: true, native: true },
    { key: 'S3', population: 'ablation', roles: ['fixed ablation: N/original with both VGT books disabled'], label: 'control: N/original GDX D1 (ablation)', id: d1Incumbent('NORIG').cell, recordArm: 'D', primary: true, native: false }
  ];
  let k = 4;

  for (const f of fz.preDetermination.finalists) subs.push({ key: `S${k++}`, population: f.arm, roles: f.roles, label: f.candidateLabel, id: f.id, recordArm: f.recordArm, primary: f.primary, native: false });
  return { subs, finalists: fz.preDetermination.finalists };
};

const subjectsOfTest = (): Subject[] => [
  { key: 'S1', population: 'N/original', roles: ['frozen benchmark'], label: 'N/original (VGT D1 + GDX D1 + VGT Growth)', id: references().NORIG.id, recordArm: 'REF', primary: true, native: true },
  { key: 'S2', population: 'New L0', roles: ['frozen benchmark'], label: 'New L0', id: references().NL0.id, recordArm: 'REF', primary: true, native: true },
  { key: 'S3', population: 'ablation', roles: ['fixed ablation'], label: 'control: N/original GDX D1 (ablation)', id: 'ablation', recordArm: 'D', primary: true, native: false }
];

const cfgOfSubject = (s: Subject): Cfg => {
  if (s.key === 'S3') return d1Incumbent('NORIG');

  const sel = readJ<{ subjects: { label: string; cfg: Cfg }[]; controls: { label: string; cfg: Cfg }[] }>(path.join(resultsDir, 'selection', `C24-${s.recordArm}.json`));
  const e = [...sel.subjects, ...sel.controls].find((x) => x.label === s.label);

  if (!e) throw new Error(`${s.label}: not in the C24 ${s.recordArm} selection`);
  return canonicalCfg(e.cfg);
};

// ----- the run -----

const run = async () => {
  purposeOf(TEST ? ['parity-test'] : ['diagnostic']);
  // arm S cells name a sealed frozen D1 finalist (S.C24F1…): register every cutoff's before any S configuration is read
  if (!TEST) ensureAllFrozen();

  const validation = path.join(resultsDir, 'validation', 'validation.json');
  const outcome = path.join(resultsDir, 'outcome.json');

  if (!TEST && !fs.existsSync(outcome)) throw new Error('the portfolio stage runs only after the sealed outcome (PROTOCOL §15.1)');

  const doorName = TEST ? 'D24' : 'FULL';
  const gdxDoor = await openGdxDoor(doorName, TEST ? 'engineering' : 'diagnostic', TEST ? 'portfolio tool engineering test (the three frozen references only; output to cache)' : 'portfolio stage (PROTOCOL §15): frozen subjects, report-only');
  const nativeDoor = await openStudyDoor(STUDY_ID, doorName, TEST ? 'parity-test: portfolio tool engineering test (N/original, New L0 on their own D24)' : 'diagnostic: portfolio stage (PROTOCOL §15) — N/original and New L0 overlays on their own door (report-only)');
  const dates = gdxDoor.dates;

  if (nativeDoor.dates.length !== dates.length || nativeDoor.dates.some((d, i) => d !== dates[i])) throw new Error('the two doors have different calendars');

  const core = await loadCore(dates);
  const { dists, checks, replaced } = loadDistributions();
  const unverified = new Set(replaced.filter((r) => r.independent === null).map((r) => `${r.etf}|${r.ex}`));
  const subs = TEST ? subjectsOfTest() : subjectsOf().subs;
  const vrows = TEST ? [] : readJ<{ rows: { label: string; id: string; arm: string; kind: string; wholeNet: number; wholeDd: number; wholeEnvelope?: Record<string, unknown>; sliceNet: number; sliceDd: number }[] }>(validation).rows;

  // overlays (CPU reference = the sealed GPU whole-run record, to the cent)
  const overlays = new Map<string, Overlay>();
  const recon: Record<string, unknown>[] = [];

  for (const s of subs) {
    const ovKey = s.native ? `${s.population}` : `${s.recordArm}|${s.key === 'S3' ? 'ablation' : s.id}`;

    if ([...overlays.values()].some((o) => o.key === ovKey)) continue;

    let ov: Overlay;

    if (s.native) {
      const ref = references()[s.key === 'S1' ? 'NORIG' : 'NL0'];

      ov = overlayOf(ovKey, s.label, nativeDoor, a3QuadOf(ref.cfg) as never, ref.cfg.controls as never, vOptions as never);

      const target = TEST ? ref.sealed.development : ref.sealed.full;
      const ok = Math.round(ov.net * 100) === Math.round(target.net * 100) && Math.round(ov.dd * 100) === Math.round(target.dd * 100);

      recon.push({ subject: s.label, cpuNet: r2(ov.net), cpuDd: r2(ov.dd), sealed: target, equal: ok });
      if (!ok) throw new Error(`${s.label}: the CPU reference differs from the sealed figures`);
    } else {
      const cfg = cfgOfSubject(s);

      ov = overlayOf(ovKey, s.label, gdxDoor, quadOf(cfg), cfg.controls, armOptions[s.recordArm as ArmKey] as never);
      // the study's trading slot is the engine's VGT-named slot carrying GDX
      ov.symbolHeld = ov.symbolHeld.map((x) => (x === null ? null : 'GDX'));
      ov.lots = ov.lots.map((l) => ({ ...l, symbol: 'GDX', book: l.book === 'D1:VGT' ? 'D1·GDX' : l.book === 'G:VGT' ? 'Growth·GDX' : l.book }));

      const row = TEST ? { wholeNet: ov.net, wholeDd: ov.dd } : vrows.find((r) => r.id === cfgId(cfg) && r.arm === s.recordArm);

      if (!row) throw new Error(`${s.label}: no sealed validation row`);

      const ok = Math.round(ov.net * 100) === Math.round(row.wholeNet * 100) && Math.round(ov.dd * 100) === Math.round(row.wholeDd * 100);

      recon.push({ subject: s.label, cpuNet: r2(ov.net), cpuDd: r2(ov.dd), sealedGpu: { wholeNet: row.wholeNet, wholeDd: row.wholeDd }, equal: ok });
      if (!ok) throw new Error(`${s.label}: the CPU reference differs from the sealed GPU validation record`);
    }
    overlays.set(s.key, ov);
  }

  const ovOf = (s: Subject) => overlays.get(s.key) ?? [...overlays.values()].find((o) => o.key === (s.native ? s.population : `${s.recordArm}|${s.key === 'S3' ? 'ablation' : s.id}`))!;
  const n = dates.length;
  const devB = TEST ? n - 1 : lastIdx(dates, devEnd);
  const valA = TEST ? Math.floor(n / 2) : devB + 1;
  const variants = [
    { name: 'primary (quarterly rebalance, cash at 0 %)', rebalance: true, sweep: false },
    { name: 'sensitivity: drift (no rebalance)', rebalance: false, sweep: false },
    { name: 'sensitivity: realized overlay profits swept into the core quarterly', rebalance: true, sweep: true }
  ];
  const results: Record<string, unknown>[] = [];
  const seriesDir = path.join(outDir, 'series');

  fs.mkdirSync(seriesDir, { recursive: true });

  for (const L of leverage)
    for (const v of variants) {
      const base = simulate(core, dists, null, L, v);
      const baseRow = { key: 'S0', population: 'core only', label: '60 % VOOG / 40 % VGT core only' };
      const rowsOf = (s: Series, ov: Overlay | null) => ({
        full: windowMetrics(s, ov ? base : null, dates, 0, n - 1, L),
        development: windowMetrics(s, ov ? base : null, dates, 0, devB, L),
        validation: windowMetrics(s, ov ? base : null, dates, valA, n - 1, L),
        annual: annual(s, ov ? base : null, dates, L),
        worstEpisodes: episodesOf(s.equity, dates),
        margin: marginOf(s, dates),
        negativeCashInterest: r2(s.negInterest)
      });

      results.push({ leverage: L, variant: v.name, ...baseRow, ...rowsOf(base, null) });
      if (L === PRIMARY_CORE && v.rebalance && !v.sweep) writeSeries(path.join(seriesDir, 'S0-core.csv'), dates, base, null);

      for (const s of subs) {
        const ov = ovOf(s);
        const x = simulate(core, dists, ov, L, v);

        // reconciliation: equity − core-only equity = the overlay's marked net + the negative-cash interest (no sweep)
        if (!v.sweep)
          for (let i = 0; i < n; i++)
            if (Math.abs(x.equity[i]! - base.equity[i]! - ov.marked[i]! - (x.cash[i]! - ov.realized[i]!)) > 0.01) throw new Error(`${s.label}: the account does not reconcile at ${dates[i]}`);
        results.push({ leverage: L, variant: v.name, key: s.key, population: s.population, roles: s.roles, label: s.label, primary: s.primary, ...rowsOf(x, ov) });
        if (L === PRIMARY_CORE && v.rebalance && !v.sweep) writeSeries(path.join(seriesDir, `${s.key}.csv`), dates, x, ov);
      }
    }

  // the unverified-distribution bound (PROTOCOL §15.3): the core with the unverified amounts at zero
  const bound = unverified.size ? windowMetrics(simulate(core, dists, null, PRIMARY_CORE, { rebalance: true, sweep: false, zeroUnverified: unverified }), null, dates, 0, n - 1, PRIMARY_CORE) : null;

  // ----- the risk decomposition and the sleeve (primary leverage, primary variant) -----
  const base = simulate(core, dists, null, PRIMARY_CORE, variants[0]!);
  const coreDaily = base.equity.map((e, i) => (i === 0 ? e - PRIMARY_CORE : e - base.equity[i - 1]!));
  const coreEpisodes = episodesOf(base.equity, dates);
  const gdxClose = gdxDoor.sym.VGT.history.map((h) => h.close);
  const quarters = [...new Set(dates.map((d) => `${d.slice(0, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}`))];
  const qEnd = quarters.map((q) => {
    let j = -1;

    dates.forEach((d, i) => {
      if (`${d.slice(0, 4)}Q${Math.floor((Number(d.slice(5, 7)) - 1) / 3) + 1}` === q) j = i;
    });
    return j;
  });
  const qRet = quarters.map((q, k) => {
    const b = qEnd[k]!;
    const a = k === 0 ? 0 : qEnd[k - 1]!;

    return { quarter: q, a, b, vgt: core.close.VGT[b]! / core.close.VGT[a]! - 1, gdx: gdxClose[b]! / gdxClose[a]! - 1 };
  });
  const divergence = [...qRet].sort((x, y) => Math.abs(y.vgt - y.gdx) - Math.abs(x.vgt - x.gdx)).slice(0, 6);
  const decomposition = subs.map((s) => {
    const ov = ovOf(s);
    const x = simulate(core, dists, ov, PRIMARY_CORE, variants[0]!);
    const ovDaily = ov.marked.map((m, i) => (i === 0 ? m : m - ov.marked[i - 1]!));
    const held = dates.map((_d, i) => ov.value[i]! > 0 || (i > 0 && ov.value[i - 1]! > 0));
    const all = corr(coreDaily, ovDaily);
    const whileHeld = corr(coreDaily.filter((_x, i) => held[i]), ovDaily.filter((_x, i) => held[i]));
    const techShare = x.vgtValue.map((v, i) => v / Math.max(1, x.gross[i]!));
    const gdxShare = x.gdxValue.map((v, i) => v / Math.max(1, x.gross[i]!));
    const vgtLotDays = ov.symbolHeld.map((y, i) => (y === 'VGT' ? i : -1)).filter((i) => i >= 0);
    const gdxLotDays = ov.symbolHeld.map((y, i) => (y === 'GDX' ? i : -1)).filter((i) => i >= 0);
    let peak = -Infinity;
    const coreDdNow = base.equity.map((e) => {
      peak = Math.max(peak, e);
      return peak - e;
    });
    const maxIdx = (xs: number[]) => xs.reduce((bi, v, i) => (v > xs[bi]! ? i : bi), 0);

    return {
      key: s.key,
      population: s.population,
      label: s.label,
      sleeve: {
        net: r2(ov.net),
        minuteDd: r2(ov.dd),
        lots: ov.lots.length,
        sessionsHeld: ov.sessionsHeld,
        occupancy: r4(ov.sessionsHeld / n),
        principalDays: Math.round(ov.principalDays),
        netPer100kYear: ov.principalDays > 0 ? r2(ov.net / (ov.principalDays / 365 / 100_000)) : null,
        netPerBorrowingDollarDay: ov.principalDays > 0 ? r4(ov.net / ov.principalDays) : null,
        developmentNet: r2(ov.marked[devB]!),
        validationNet: r2(ov.marked[n - 1]! - ov.marked[devB]!),
        funding: ov.funding,
        lotsBySymbol: ov.lots.reduce<Record<string, number>>((a, l) => ((a[l.symbol] = (a[l.symbol] ?? 0) + 1), a), {}),
        worstLot: ov.lots.reduce<number | null>((a, l) => (a === null || l.net < a ? l.net : a), null)
      },
      correlation: { allSessions: all, sessionsWithAnOpenLot: whileHeld, basis: 'daily $ change of the core-only account vs daily $ change of the overlay’s marked net' },
      overlayInCoreWorstEpisodes: coreEpisodes.map((e) => ({ ...e, overlayPnl: r2(ov.marked[dates.indexOf(e.trough)]! - ov.marked[dates.indexOf(e.peak)]!) })),
      exposure: {
        meanTechShareOfGross: r4(techShare.reduce((a, y) => a + y, 0) / n),
        maxTechShareOfGross: r4(Math.max(...techShare)),
        meanGdxShareOfGross: r4(gdxShare.reduce((a, y) => a + y, 0) / n),
        vgtLotSessions: vgtLotDays.length,
        gdxLotSessions: gdxLotDays.length,
        coreDrawdownOnVgtLotSessions: vgtLotDays.length ? { mean: r2(vgtLotDays.reduce((a, i) => a + coreDdNow[i]!, 0) / vgtLotDays.length), max: r2(Math.max(...vgtLotDays.map((i) => coreDdNow[i]!))) } : null,
        coreDrawdownOnGdxLotSessions: gdxLotDays.length ? { mean: r2(gdxLotDays.reduce((a, i) => a + coreDdNow[i]!, 0) / gdxLotDays.length), max: r2(Math.max(...gdxLotDays.map((i) => coreDdNow[i]!))) } : null,
        note: 'VOOG is reported apart (a broad US growth fund with a large technology weight), never assumed non-technology'
      },
      divergenceQuarters: divergence.map((q) => ({ quarter: q.quarter, vgt: r4(q.vgt), gdx: r4(q.gdx), accountPnl: r2(x.equity[q.b]! - x.equity[q.a]!), corePnl: r2(base.equity[q.b]! - base.equity[q.a]!), overlayPnl: r2(ov.marked[q.b]! - ov.marked[q.a]!) })),
      hypotheticalStress: {
        atMaximumOverlayValue: stressAt(x, maxIdx(x.overlayValue), dates),
        atMaximumDebt: stressAt(x, maxIdx(x.debt), dates),
        label: 'HYPOTHETICAL instantaneous shocks (PROTOCOL §15.6) — not historical observations; margin figures illustrative only'
      },
      lotDistributions: lotDistributionsOf(ov, dates)
    };
  });

  // ----- the ablation's chronology and funding against N/original (brief Phase 1.2; report-only) -----
  const ablationChronology = (() => {
    const no = overlays.get('S1');
    const ab = overlays.get('S3');

    if (!no || !ab) return null;

    const noGdx = no.lots.filter((l) => l.book === 'D1:GDX');
    const key = (l: { entry: string }) => l.entry;
    const inNo = new Set(noGdx.map(key));
    const inAb = new Set(ab.lots.map(key));
    const both = ab.lots.filter((l) => inNo.has(key(l)));
    const onlyAb = ab.lots.filter((l) => !inNo.has(key(l)));
    const onlyNo = noGdx.filter((l) => !inAb.has(key(l)));
    const sum = (xs: { net: number }[]) => r2(xs.reduce((a, l) => a + l.net, 0));
    const sameNet = both.filter((l) => {
      const m = noGdx.find((x) => x.entry === l.entry)!;

      return Math.abs(m.net - l.net) < 0.005;
    }).length;

    return {
      nOriginalGdxD1Lots: noGdx.length,
      ablationLots: ab.lots.length,
      sameEntryDate: both.length,
      sameEntryDateAndNet: sameNet,
      onlyInAblation: { lots: onlyAb.length, net: sum(onlyAb), entries: onlyAb.map((l) => ({ entry: l.entry, exit: l.exit, net: r2(l.net) })) },
      onlyInNOriginal: { lots: onlyNo.length, net: sum(onlyNo), entries: onlyNo.map((l) => ({ entry: l.entry, exit: l.exit, net: r2(l.net) })) },
      nOriginalGdxD1Net: sum(noGdx),
      ablationNet: r2(ab.net),
      nOriginalRefusals: Object.fromEntries(Object.entries(no.funding.byOccupant).filter(([k]) => k.startsWith('D1:GDX'))),
      note: 'N/original funds its GDX D1 book only when neither VGT book holds the slot; with both VGT books disabled the same book (same signals, shadow lifecycle) is funded at every decision. Lots identified by entry date'
    };
  })();

  // ----- the decision labels (PROTOCOL §15.8) -----
  const prim = results.filter((r) => r.leverage === PRIMARY_CORE && r.variant === variants[0]!.name) as unknown as { key: string; population: string; label: string; primary: boolean; full: ReturnType<typeof windowMetrics>; development: ReturnType<typeof windowMetrics>; validation: ReturnType<typeof windowMetrics> }[];
  const s1 = prim.find((r) => r.key === 'S1')!;
  const labels = prim
    .filter((r) => r.key !== 'S0' && r.key !== 'S1' && r.key !== 'S2')
    .map((r) => {
      const d = (w: 'full' | 'development') => s1[w].maxDrawdown.dd - r[w].maxDrawdown.dd;
      const rel = (w: 'full' | 'development') => d(w) / s1[w].maxDrawdown.dd;
      const reduction = d('full') >= 5_000 && rel('full') >= 0.1 && d('development') >= 5_000 && rel('development') >= 0.1;
      const increase = -d('full') >= 5_000 && -rel('full') >= 0.1 && -d('development') >= 5_000 && -rel('development') >= 0.1;

      return {
        key: r.key,
        population: r.population,
        label: r.label,
        primary: r.primary,
        deltaVsNOriginal: {
          terminalWealthFull: r2(r.full.endEquity - s1.full.endEquity),
          incrementalFull: r.full.incrementalVsCore !== null && s1.full.incrementalVsCore !== null ? r2(r.full.incrementalVsCore - s1.full.incrementalVsCore) : null,
          maxDdFull: r2(r.full.maxDrawdown.dd - s1.full.maxDrawdown.dd),
          maxDdFullRelative: r4(-rel('full')),
          maxDdDevelopment: r2(r.development.maxDrawdown.dd - s1.development.maxDrawdown.dd),
          maxDdDevelopmentRelative: r4(-rel('development')),
          maxDdValidation: r2(r.validation.maxDrawdown.dd - s1.validation.maxDrawdown.dd)
        },
        label158: reduction ? 'material total-portfolio drawdown reduction' : increase ? 'material total-portfolio drawdown increase' : 'no material difference',
        rule: 'PROTOCOL §15.8: ≥ $5,000 AND ≥ 10 % relative in BOTH the full and the development period (report label only)'
      };
    });

  const record = {
    kind: 'P8-GDX matched total-portfolio comparison (report-only; PROTOCOL §15)',
    written: new Date().toISOString(),
    label: 'retrospective, previously examined history (2016–2026); illustrative normalization ($500,000 initial core equity), NOT the user’s balance; margin requirements illustrative, not Vanguard’s',
    inputs: {
      core: core.files,
      distributionsLedger: { file: path.relative(repoRoot, ledgerFile), sha256: sha(ledgerFile) },
      independent: Object.fromEntries(['VOOG', 'VGT', 'GDX'].map((x) => [x, fs.existsSync(independentFile(x)) ? { file: path.relative(repoRoot, independentFile(x)), sha256: sha(independentFile(x)) } : null])),
      ...(TEST
        ? { test: 'ENGINEERING TEST on D24 (references only; the validation window column is a split of D24 for the test only)' }
        : {
            validation: { file: path.relative(repoRoot, validation), sha256: sha(validation) },
            outcome: { file: path.relative(repoRoot, outcome), sha256: sha(outcome) },
            frozenSelection: { file: 'research/gdx-d1-growth/FROZEN_SELECTION.json', sha256: sha(path.join(researchDir, 'FROZEN_SELECTION.json')) }
          })
    },
    conventions: {
      core: '60 % VOOG / 40 % VGT at the 2016-01-04 close; 5 bps per side; quarterly rebalance at the last close of each calendar quarter (primary); distributions entitled at the close before the ex-date, receivable from the ex-date, reinvested in the paying fund at the pay-date close; prices in 2016-01-04 share units (central split ledger)',
      overlay: 'the engine’s marked net (costs and 11 % interest inside, charged once); open lot value and outstanding principal + accrued interest from the same continuous run',
      cash: 'realized overlay P&L; 0 % on positive cash; 11 % simple per calendar day on negative cash (booked quarterly)',
      leverage: leverage.map((x) => `$${x.toLocaleString('en-US')} initial core, $100,000 maximum overlay position`)
    },
    distributions: { checks, replaced, unverifiedBound: bound },
    reconciliation: recon,
    subjects: subs,
    results,
    decomposition,
    ablationChronology,
    labels
  };

  writeJson(path.join(outDir, 'portfolio.json'), record);
  console.log(JSON.stringify({ subjects: subs.length, reconciled: recon.every((r) => r.equal), labels: labels.map((l) => `${l.key} ${l.population} ${l.label158}`) }));
};


const writeSeries = (file: string, dates: string[], s: Series, ov: Overlay | null) => {
  const head = 'date,coreValue,receivables,cash,overlayMarkedNet,overlayValue,overlayDebt,debt,grossLong,equity,equityIntradayBound';
  const lines = dates.map((d, i) =>
    [d, r2(s.core[i]!), r2(s.receivables[i]!), r2(s.cash[i]!), r2(ov ? ov.marked[i]! : 0), r2(s.overlayValue[i]!), r2(ov ? ov.debt[i]! : 0), r2(s.debt[i]!), r2(s.gross[i]!), r2(s.equity[i]!), r2(s.equityLow[i]!)].join(',')
  );

  fs.writeFileSync(file, `${head}\n${lines.join('\n')}\n`);
};

// the cash distributions each overlay lot would have been entitled to (PROTOCOL §15.7; report-only — never restated)
const lotDistributionsOf = (ov: Overlay, dates: string[]) => {
  const splits = readSplits();
  const events: Record<string, { ex: string; amount: number }[]> = {};

  for (const sym of ['GDX', 'VGT']) {
    const y = yahooDividends(sym) ?? [];

    events[sym] = y.map((e) => ({ ex: e.exDate, amount: e.amount * (sym === 'VGT' ? splitFactor(splits, 'VGT', chronology.firstSession, e.exDate) : 1) }));
  }

  const rows: { symbol: string; entry: string; exit: string | null; ex: string; shares: number; cash: number }[] = [];

  for (const l of ov.lots as unknown as { symbol: string; entry: string; exit: string | null; shares0: number; fills: { s: number; shares: number }[] }[])
    for (const e of events[l.symbol] ?? []) {
      if (!(l.entry < e.ex && (l.exit === null || l.exit >= e.ex))) continue;

      const exI = dates.indexOf(e.ex);
      const sold = l.fills.filter((f) => f.s < exI).reduce((a, f) => a + f.shares, 0);
      const shares = l.shares0 - sold;

      if (shares > 0) rows.push({ symbol: l.symbol, entry: l.entry, exit: l.exit, ex: e.ex, shares: r4(shares), cash: r2(shares * e.amount) });
    }
  return { total: r2(rows.reduce((a, r) => a + r.cash, 0)), rows, note: 'report-only: the engine credits no distribution to a trading lot (all strategies); never added to the trading results' };
};

switch (cmd) {
  case 'run':
  case 'test':
    await run();
    break;
  default:
    throw new Error('usage: portfolio.ts run');
}
