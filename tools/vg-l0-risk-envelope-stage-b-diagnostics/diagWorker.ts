// RES-BD 1.0.0 Diagnostic B worker (PROTOCOL.md §4; purpose diagnostic; never official evidence). For each fixed sealed
// subject it runs the canonical CPU engine on the cutoff's TRAINING door (opened through Stage B's door guard, logged in
// this namespace) three times:
//   1. diagnose()  — the pilot's diag-core, unchanged: the existing giveback.ts design (net, DD, DD^L, the CPU envelope,
//                    the D3 account partition U / E / F and lot split on both bases, trade summary, occupancy);
//   2. evaluate()  — the canonical record (src/vg-l0-risk-families/evaluate.ts) plus the CPU envelope reference
//                    (src/gpu-phase7/envelope.ts envelopeOf), for the bit-for-bit parity check against the archived
//                    official GPU centre record (Stage A's G3 check);
//   3. one ledger replay (src/vg-l0-risk-metrics/) for the detail the report needs: the lots of the maximum-DD window
//      (attributeDrawdown rows), every trade's risk (tradeRisk), the banked-capital DD episode, and the path drawdowns
//      (a reconciliation of the engine's DD with the ledger path).
import { assertNonOfficialCpuRun } from '../../src/gpu-backend/purpose.ts';
import type { StudyDoor } from '../../src/gpu-backend/doors.ts';
import { evaluate } from '../../src/vg-l0-risk-families/evaluate.ts';
import { d1Cache2, runWithControls2 } from '../../src/d1-risk-controls-rc2/run.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { type Cfg, canonicalCfg, quadOf } from '../../src/vg-l0-full-joint/space.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { attributeDrawdown, bankedDrawdown, markedDrawdown, portfolioPath, tradeRisk } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { envelopeOf } from '../../src/gpu-phase7/envelope.ts';
import { componentDrawdown } from '../../src/risk-envelope/diagnostics.ts';
import { diagnose } from '../vg-l0-risk-envelope-pilot/diag-core.ts';
import { openDiagDoor } from './common.ts';

assertNonOfficialCpuRun('vg-l0-risk-envelope-stage-b-diagnostics giveback worker');
setA3Quiet(true);
d1Cache2.capacity = 64;

const gc = (globalThis as { gc?: () => void }).gc;

process.on('message', async (m: { door: StudyDoor; purpose: string; items: { key: string; cfg: Cfg }[] }) => {
  try {
    const door = await openDiagDoor(m.door, `${m.purpose} (giveback worker ${process.pid})`);
    const rows = [];
    let count = 0;

    for (const x of m.items) {
      const t0 = Date.now();
      const cfg = canonicalCfg(x.cfg);
      const q = quadOf(cfg);
      // 1. the existing design
      const diag = diagnose(door, cfg);
      // 2. the canonical record and its CPU envelope
      const rec = evaluate(door, q, cfg.controls ?? null, vOptions);
      const run = runWithControls2(door, q, cfg.controls ?? null, vOptions, false, false, { cache: false });
      const [bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation] = envelopeOf(door, run, vOptions) as [number, number, number, number];
      // 3. the ledger detail (from the same replay as the envelope)
      const L = toLedger({ door, subject: null as never, options: vOptions, books: run.books, result: run.result, rec: null as never });
      const pts = portfolioPath(L);
      const d3 = { marked: componentDrawdown(pts, L, 'marked'), liquidation: componentDrawdown(pts, L, 'liquidation') };
      const ddM = markedDrawdown(pts, 'marked');
      const ddL = markedDrawdown(pts, 'liquidation');
      const window = ddM.max > 0 ? attributeDrawdown(L, ddM.peakT, ddM.troughT, 'marked') : null;
      const trades = L.lots.map((l) => tradeRisk(l, L.endT));
      const netOf = new Map(L.lots.map((l) => [l.id, l.net]));
      const bdM = bankedDrawdown(pts, 'marked');
      const bdL = bankedDrawdown(pts, 'liquidation');

      rows.push({
        key: x.key,
        diag,
        rec: { ...rec, envelope: { bankedDdMarked, bankedDdLiquidation, principalLossMarked, principalLossLiquidation } },
        ext: {
          pathDd: { marked: ddM, liquidation: ddL },
          engineDd: run.result.dd.max,
          engineDdInstants: { peakT: run.result.dd.peakT, troughT: run.result.dd.troughT },
          d3: {
            marked: { dd: d3.marked.dd, window: d3.marked.window, account: d3.marked.account, lot: d3.marked.lot, bankedDd: d3.marked.bankedDd },
            liquidation: { dd: d3.liquidation.dd, window: d3.liquidation.window, account: d3.liquidation.account, lot: d3.liquidation.lot, bankedDd: d3.liquidation.bankedDd }
          },
          window: window && {
            peakDate: window.peakDate,
            troughDate: window.troughDate,
            total: window.total,
            profitGiveback: window.profitGiveback,
            principalLoss: window.principalLoss,
            grossGivebackAtPeakLots: window.grossGivebackAtPeakLots,
            grossPrincipalLoss: window.grossPrincipalLoss,
            offsets: window.offsets,
            residual: window.residual,
            rows: window.rows.map((r) => ({ ...r, lotNet: netOf.get(r.lot) ?? null }))
          },
          bankedEpisode: {
            marked: { max: bdM.max, highDate: bdM.highDate, high: bdM.high, troughDate: bdM.troughDate, troughValue: bdM.troughValue },
            liquidation: { max: bdL.max, highDate: bdL.highDate, high: bdL.high, troughDate: bdL.troughDate, troughValue: bdL.troughValue }
          },
          trades: trades.map((t) => ({
            id: t.id,
            book: t.book,
            entry: t.entry,
            exit: t.exit,
            reason: t.reason,
            open: t.open,
            days: t.days,
            net: t.net,
            peakProfit: t.peakProfit,
            peakDate: t.peakDate,
            maxGivebackAboveBreakeven: t.maxGivebackAboveBreakeven,
            givebackToExit: t.givebackToExit,
            principalLossMarked: t.principalLossMarked,
            principalLossLiq: t.principalLossLiq,
            principalLossDate: t.principalLossDate,
            realizedPrincipalLoss: t.realizedPrincipalLoss
          })),
          endNet: pts.at(-1)?.m ?? 0,
          openAtEnd: L.lots.some((l) => l.open)
        },
        seconds: Math.round((Date.now() - t0) / 100) / 10
      });
      if (++count % 8 === 0) gc?.();
    }
    process.send!({ t: 'done', rows }, () => process.exit(0));
  } catch (e) {
    process.send!({ t: 'err', e: String((e as Error).stack ?? e) }, () => process.exit(1));
  }
});
