// The per-configuration NONBINDING diagnostics of the risk-envelope pilot (PROTOCOL.md §14; DIAGNOSTICS_SPEC.md),
// computed by the canonical CPU engine (purpose diagnostic) from one complete pooled replay: D1 peak-equity percentage
// DD, D2 capped-hybrid utilization (illustrative 40/30/60), D3 profit-component partition (account interval partition
// and lot-level attribution), DD^L (liquidation-basis conventional DD), the CPU envelope (a cross-check of the GPU's),
// trade-level giveback and principal loss, occupancy and traded notional; optionally the same over an interval window
// after a boundary. Never a search, gate, ranking, promotion or exit input.
import { runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import type { Door } from '../../src/vg-d1-growth-joint/data.ts';
import type { EvalOptions } from '../../src/vg-d1-growth-joint/evaluate.ts';
import { type Cfg, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, markedDrawdown, portfolioPath, tradeRisk, windowOf } from '../../src/vg-l0-risk-metrics/metrics.ts';
import type { PathPoint } from '../../src/vg-l0-risk-metrics/ledger.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { ILLUSTRATIVE_HYBRID, cappedHybrid, componentDrawdown, peakEquityDrawdown } from '../../src/risk-envelope/diagnostics.ts';
import { NL0_CONTROL, RE_EXPERIMENTAL, assess, limitOf } from '../../src/risk-envelope/policy.ts';

const C0 = 100_000;
const r2 = (x: number) => Math.round(x * 100) / 100;
const r4 = (x: number) => Math.round(x * 1e4) / 1e4;
const round = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'number' ? r2(v) : v]));

const views = (pts: readonly PathPoint[], c0: number, ledger: Parameters<typeof componentDrawdown>[1]) => {
  const out: Record<string, unknown> = {};

  for (const basis of ['marked', 'liquidation'] as const) {
    const d1 = peakEquityDrawdown(pts, c0, basis);
    const d2 = cappedHybrid(pts, c0, ILLUSTRATIVE_HYBRID, basis);
    const d3 = componentDrawdown(pts, ledger, basis);

    out[basis] = {
      D1: { pct: r4(d1.pct), dollars: r2(d1.dollars), peakEquity: r2(d1.peakEquity), peakDate: d1.peakDate, troughDate: d1.troughDate, illustrativePassAt40: d1.pct <= 0.4 },
      D2: { utilization: r4(d2.utilization), allowance: r2(d2.allowance), regime: d2.regime, dollars: r2(d2.dollars), peakEquity: r2(d2.peakEquity), illustrativePass: d2.pass },
      D3: {
        window: d3.window && { peakDate: d3.window.peakDate, troughDate: d3.window.troughDate, peakValue: r2(d3.window.peakValue), troughValue: r2(d3.window.troughValue), bankedHigh: r2(d3.window.bankedHigh) },
        account: round(d3.account as unknown as Record<string, number>),
        lot: d3.lot && { profitGiveback: r2(d3.lot.profitGiveback), principalLoss: r2(d3.lot.principalLoss), residual: d3.lot.residual },
        bankedDd: r2(d3.bankedDd)
      }
    };
  }
  return out;
};

export const diagnose = (door: Door, cfg: Cfg, o: { options?: EvalOptions; boundary?: string } = {}) => {
  const options = o.options ?? vOptions;
  const x = runWithControls2(door, quadOf(cfg), cfg.controls, options, false, false, { cache: false });
  const L = toLedger({ door, subject: null as never, options, books: x.books, result: x.result, rec: null as never });
  const pts = portfolioPath(L);
  const [bdM, bdL, plM, plL] = envelopeOf(door, x, options) as [number, number, number, number];
  const trades = L.lots.map((l) => tradeRisk(l, L.endT));
  const env = { bankedDdMarked: bdM, bankedDdLiquidation: bdL, principalLossMarked: plM, principalLossLiquidation: plL };
  const ddL = markedDrawdown(pts, 'liquidation').max;
  const days = door.sessions;
  const d3m = componentDrawdown(pts, L, 'marked');
  const giveback = d3m.account as unknown as { unbankedGiveback: number; bankedErosion: number; capitalLoss: number };
  const dd = x.result.dd.max;
  const row: Record<string, unknown> = {
    net: r2(x.result.net),
    dd: r2(dd),
    ddLiquidation: r2(ddL),
    envelope: round(env),
    policies: {
      CTRL: assess({ dd, envelope: env }, NL0_CONTROL).pass,
      EXP: assess({ dd, envelope: env }, RE_EXPERIMENTAL).pass
    },
    givebackDominated: dd > 0 ? giveback.unbankedGiveback >= 0.5 * dd : false,
    unbankedGivebackShare: dd > 0 ? r4(giveback.unbankedGiveback / dd) : null,
    // illustrative nonbinding D3 view (DIAGNOSTICS_SPEC: DD ≤ 60 % C0 ∧ banked DD ≤ 25 % C0 ∧ trade PL ≤ 25 %)
    d3Illustrative: dd <= limitOf(60, C0) && bdM <= limitOf(25, C0) && plL <= limitOf(25, C0),
    views: views(pts, C0, L),
    trades: {
      lots: trades.length,
      worstNet: trades.length ? r2(Math.min(...trades.map((t) => t.net))) : null,
      maxPrincipalLossLiq: r2(Math.max(0, ...trades.map((t) => t.principalLossLiq))),
      maxGivebackAboveBreakeven: r2(Math.max(0, ...trades.map((t) => t.maxGivebackAboveBreakeven))),
      maxPeakProfit: r2(Math.max(0, ...trades.map((t) => t.peakProfit))),
      byBook: Object.fromEntries(['D1:GDX', 'D1:VGT', 'G:VGT'].map((b) => [b, trades.filter((t) => t.book === b).length]))
    },
    occupancy: x.result.sessionsHeld !== undefined ? r4(x.result.sessionsHeld / days) : null,
    tradedNotional: r2(L.lots.reduce((a, l) => a + l.principal0, 0)),
    principalDays: r2(L.lots.reduce((a, l) => a + l.principal0 * ((l.open ? L.endT : l.fills.at(-1)!.t) - l.entryT) / 86400, 0))
  };

  if (o.boundary) {
    const b = door.dates.indexOf(o.boundary);

    if (b < 0) throw new Error(`${o.boundary} is not a session of ${door.name}`);

    const bT = door.sym.VGT.ds.sCloseTime[b]!;
    const w = windowOf(pts, bT, Infinity);
    const shifted = [w.start, ...w.points].map((p) => ({ ...p, m: p.m - w.start.m, liq: p.liq - w.start.liq, r: p.r - w.start.r }));
    const after = trades.filter((t) => t.entry > o.boundary!);
    const carried = trades.filter((t) => t.entry <= o.boundary! && (t.exit === null || t.exit > o.boundary!));

    row.interval = {
      boundary: o.boundary,
      boundaryEquityNet: r2(w.start.m),
      net: r2((pts.at(-1)?.m ?? 0) - w.start.m),
      ddMarked: r2(markedDrawdown(pts, 'marked', bT).max),
      ddLiquidation: r2(markedDrawdown(pts, 'liquidation', bT).max),
      bankedDdMarked: r2(bankedDrawdown(pts, 'marked', bT).max),
      bankedDdLiquidation: r2(bankedDrawdown(pts, 'liquidation', bT).max),
      newLots: after.length,
      newLotMaxPrincipalLossMarked: r2(Math.max(0, ...after.map((t) => t.principalLossMarked))),
      newLotMaxPrincipalLossLiq: r2(Math.max(0, ...after.map((t) => t.principalLossLiq))),
      carried: carried.map((t) => ({ book: t.book, entry: t.entry, exit: t.exit, net: r2(t.net), principalLossLiq: r2(t.principalLossLiq), peakProfit: r2(t.peakProfit) })),
      views: views(shifted, C0 + w.start.m, null)
    };
  }
  return row;
};
