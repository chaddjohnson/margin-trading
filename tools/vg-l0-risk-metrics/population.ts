// Stage 5a (PROTOCOL.md §8 S5, §9.1): every archived member of Assignment 3 at one cutoff replayed on THAT cutoff's
// development door (training data only) through the unchanged evaluation path; gate G5a (the replay equals the member's
// archived evidence); the stop gate G-S on every exit; and the P2 inputs at the cutoff close: trade principal loss,
// banked-capital drawdown, floor shortfall, realized drawdown, giveback, the open lot's stop state, the stop-aware
// conservative net CN* and the bounded-loss-exit tier. Sealed: results/selection/members-<C>.json.
//   node --experimental-transform-types tools/vg-l0-risk-metrics/population.ts <C19|C21|C23|C24> [--dry] [--limit n]
import path from 'node:path';
import { membersOf } from '../../src/vg-l0-risk-metrics/archive.ts';
import { populations } from '../../src/vg-l0-full-joint/select.ts';
import { type CutoffKey, cutoffDoor, cutoffEnd, resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { replay, subjectOfCfg, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bankedDrawdown, floorShortfall, markedDrawdown, portfolioPath, realizedDrawdown, tradeRisk } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { sealJson } from '../../src/vg-l0-risk-metrics/records.ts';
import { bookParamsOf, boundedLossExit, stopStateAt, verifyExit } from '../../src/vg-l0-risk-metrics/stops.ts';
import { codeDigest, studyGuard } from './common.ts';

const cut = process.argv[2] as CutoffKey;
const dry = process.argv.includes('--dry');
const limitAt = process.argv.indexOf('--limit');
const limit = limitAt > 0 ? Number(process.argv[limitAt + 1]) : Infinity;
const freeze = studyGuard();
const t0 = Date.now();

if (!cutoffEnd[cut]) throw new Error('usage: population.ts <C19|C21|C23|C24>');

const door = await openDoor(cutoffDoor[cut], `Stage 5: ${cut} members replayed on their own development door (training evidence only)`);
const end = door.sessions - 1;
const rel = (a: number, b: number) => Math.abs(a - b) <= 0.0051 + 1e-9 * Math.abs(b);
const rows: Record<string, unknown>[] = [];
let g5a = 0;
let gs = { checked: 0, failed: 0 };
const members = membersOf(cut).slice(0, limit);

for (const e of members) {
  const subject = subjectOfCfg(e.cfg);
  const r = replay(door, subject);
  const L = toLedger(r);
  const pts = portfolioPath(L);
  const dd = markedDrawdown(pts);
  const rec = r.rec;
  const occupancy = rec.sessions > 0 ? rec.sessionsHeld / rec.sessions : 0;
  const maeWorst = L.lots.length ? Math.min(...L.lots.map((l) => l.canonicalMae!)) : 0;
  const parity = {
    net: rel(rec.net, e.centre.net),
    dd: rel(rec.dd, e.centre.dd) && rel(dd.max, e.centre.dd),
    realized: rel(rec.realized, e.centre.realized),
    unrealized: rel(rec.unrealized, e.centre.unrealized),
    lots: rec.lots === e.centre.lots,
    conservativeNet: rel(rec.realized + Math.min(0, rec.unrealized), e.risk.conservativeNet),
    worstMae: rel(maeWorst, e.risk.mae.worst),
    occupancy: Math.abs(occupancy - e.risk.occupancy) < 1e-9
  };
  const ok = Object.values(parity).every(Boolean);

  if (!ok) g5a++;

  for (const l of r.result.lots) {
    const v = verifyExit(door, l, bookParamsOf(subject, l.book), L.rate, L.costBps);

    if (v) {
      gs.checked++;
      if (!v.ok) gs.failed++;
    }
  }

  const trades = L.lots.map((l) => tradeRisk(l, L.endT));
  const open = r.result.lots.find((l) => l.open) ?? null;
  const st = open ? stopStateAt(door, open, end, bookParamsOf(subject, open.book), L.rate, L.costBps) : null;
  const closedNet = L.lots.filter((l) => !l.open).reduce((s, l) => s + l.net, 0);
  const cnStar = closedNet + (st ? st.conservativeValue : 0);
  const worstPl = trades.reduce<(typeof trades)[number] | null>((a, t) => (!a || t.principalLossLiq > a.principalLossLiq ? t : a), null);

  rows.push({
    label: e.label,
    id: e.id,
    track: e.track,
    stage: e.stage,
    cell: e.cell,
    base: e.base,
    qualified: e.qualified,
    failed: e.failed,
    population: Object.fromEntries(Object.entries(populations).map(([k, f]) => [k, f(e)])),
    parity: ok ? true : parity,
    centre: { net: rec.net, dd: rec.dd, realized: rec.realized, unrealized: rec.unrealized, lots: rec.lots },
    ra1: { conservativeNet: e.risk.conservativeNet, occupancy: e.risk.occupancy, worstMae: e.risk.mae.worst, openMultiple: e.risk.openLot?.multiple ?? null, openShare: e.risk.openLot ? e.risk.openShare : null, selectWorst10Mean: e.selectTail.worst10Mean },
    select: { robust: e.select.robust, p90Dd: e.select.p90Dd },
    confirm: { p90Dd: e.confirm.p90Dd, p10: e.confirm.p10 },
    stress10: e.stress['cost 10 bps'] ? { net: e.stress['cost 10 bps'].net, dd: e.stress['cost 10 bps'].dd } : null,
    p2: {
      principalLossMax: worstPl?.principalLossLiq ?? 0,
      principalLossMaxLot: worstPl ? `${worstPl.book} ${worstPl.entry}` : null,
      bankedDd: bankedDrawdown(pts).max,
      floorShortfall: floorShortfall(pts, 'liquidation').shortfall,
      realizedDd: realizedDrawdown(pts).max,
      maxGiveback: Math.max(0, ...trades.map((t) => t.maxGivebackAboveBreakeven)),
      closedNet,
      conservativeValue: st ? st.conservativeValue : 0,
      cnStar,
      bounded: boundedLossExit(subject),
      open: st
        ? { book: st.book, entry: st.entry, multiple: st.multiple, marked: st.marked, liquidation: st.liquidation, trailingArmed: st.trailingArmed, effectiveLevel: st.effectiveLevel, effectiveKind: st.effectiveKind, levelBelowClosePct: st.levelBelowClosePct, retainedRemainder: st.retainedRemainder, retentionSellFraction: st.retentionSellFraction, valueAtStop: st.valueAtStop, valueStressed10: st.valueStressed10, valueGap30: st.valueGap30, protectedProfit: st.protectedProfit, profitAtRisk: st.profitAtRisk }
        : null
    }
  });

  if (rows.length % 100 === 0) console.log(`${cut}: ${rows.length}/${members.length} members, G5a failures ${g5a}, G-S ${gs.failed}/${gs.checked}, ${((Date.now() - t0) / 1000).toFixed(0)} s, rss ${Math.round(process.memoryUsage().rss / 2 ** 20)} MB`);
}

const record = {
  stage: `S5 member replays ${cut}`,
  freeze: freeze.protocol.sha256,
  code: codeDigest(),
  cutoff: cut,
  door: { name: door.name, sessions: door.sessions, last: door.dates.at(-1) },
  members: rows.length,
  gates: { G5a: g5a === 0 ? 'PASS' : `FAIL (${g5a})`, GS: gs },
  rows,
  seconds: (Date.now() - t0) / 1000,
  memoryRssMb: Math.round(process.memoryUsage().rss / 2 ** 20)
};

if (g5a || gs.failed) {
  console.error(`gates failed: G5a ${g5a}, G-S ${gs.failed}; first failures:`, JSON.stringify(rows.filter((x) => x.parity !== true).slice(0, 3)).slice(0, 3000));
  process.exit(1);
}
if (dry || limit < Infinity) console.log(JSON.stringify({ ...record, rows: rows.slice(0, 2) }, null, 1).slice(0, 5000));
else console.log(sealJson(path.join(resultsDir, 'selection', `members-${cut}.json`), record, `S5 members ${cut}`));
