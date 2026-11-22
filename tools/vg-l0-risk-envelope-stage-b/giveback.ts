// Stage B report-only profit-giveback diagnostic (PROTOCOL.md §10; brief §6 "profit giveback") — a bounded CPU replay
// (purpose diagnostic; never official evidence, never a gate or ranking input) of every lane representative (both arms)
// and pooled primary of one cutoff on its TRAINING door, by the pilot's diag-core `diagnose`: the D3 account partition of
// the marked drawdown (unbanked-profit giveback U, banked-profit erosion E, starting-capital loss F), the lot-level
// giveback, the liquidation-basis DD^L and the CPU envelope. Every CPU record is cross-checked against the official GPU
// qualification record (centre net, marked DD and the four envelope values, to the cent); any difference stops the tool.
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types src/gpu-backend/legacyRunner.ts vg-l0reb-giveback tools/vg-l0-risk-envelope-stage-b/giveback.ts --cutoff C21
import path from 'node:path';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { canonicalCfg } from '../../src/vg-l0-full-joint/space.ts';
import { diagnose } from '../vg-l0-risk-envelope-pilot/diag-core.ts';
import { type ArmKey, type CutoffKey, armKeys, cutoffs, resultsDir } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { openStageBDoor, selectionFile } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';
import { qualificationFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import type { LaneValue } from '../../src/vg-l0-risk-envelope-stage-b/select.ts';
import { summarize, type Pair } from '../../src/vg-l0-risk-envelope-stage-b/stats.ts';
import { purposeOf, writeJson } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C19|C21|C24');

const t0 = Date.now();
const sel = readSealed<{ laneValues: Record<ArmKey, LaneValue[]>; pairs: Pair[] }>(selectionFile(cut));
const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));
const ev = new Map(q.evidence.map((e) => [e.id, e]));
const door = await openStageBDoor(cutoffs[cut].door, 'diagnostic', `report-only giveback diagnostic ${cut} (CPU)`);
const r2 = (x: number) => Math.round(x * 100) / 100;
const cache = new Map<string, Record<string, unknown>>();
let mismatches = 0;
const rowOf = (id: string) => {
  const hit = cache.get(id);

  if (hit) return hit;

  const e = ev.get(id)!;
  const d = diagnose(door, canonicalCfg(e.cfg)) as {
    net: number;
    dd: number;
    ddLiquidation: number;
    envelope: Record<string, number>;
    givebackDominated: boolean;
    unbankedGivebackShare: number | null;
    views: { marked: { D3: { account: { unbankedGiveback: number; bankedErosion: number; capitalLoss: number }; lot: { profitGiveback: number; principalLoss: number } | null } } };
    trades: { lots: number; maxGivebackAboveBreakeven: number; maxPeakProfit: number; worstNet: number | null };
    occupancy: number | null;
  };
  const gpu = { net: r2(e.centre.net), dd: r2(e.centre.dd), ...Object.fromEntries(Object.entries(e.envelope.centre).map(([k, v]) => [k, r2(v as number)])) };
  const cpu = { net: d.net, dd: d.dd, ...d.envelope };
  const same = Object.keys(gpu).every((k) => (gpu as Record<string, number>)[k] === (cpu as Record<string, number>)[k]);

  if (!same) mismatches++;

  const a = d.views.marked.D3.account;
  const row = {
    id,
    label: e.label,
    cpuEqualsGpu: same,
    net: d.net,
    dd: d.dd,
    ddLiquidation: d.ddLiquidation,
    unbankedGiveback: a.unbankedGiveback,
    bankedErosion: a.bankedErosion,
    capitalLoss: a.capitalLoss,
    unbankedGivebackShare: d.unbankedGivebackShare,
    givebackDominated: d.givebackDominated,
    lotProfitGiveback: d.views.marked.D3.lot?.profitGiveback ?? null,
    maxTradeGivebackAboveBreakeven: d.trades.maxGivebackAboveBreakeven,
    maxTradePeakProfit: d.trades.maxPeakProfit,
    worstTradeNet: d.trades.worstNet,
    lots: d.trades.lots,
    occupancy: d.occupancy
  };

  cache.set(id, row);
  return row;
};

const lanes = Object.fromEntries(armKeys.map((a) => [a, sel.laneValues[a].map((v) => ({ lane: v.lane, cell: v.cell, replicate: v.replicate, value: v.value, representative: v.representative ? rowOf(v.representative.id) : null }))]));

if (mismatches) throw new Error(`${cut}: ${mismatches} CPU replays differ from the official GPU records`);

const paired = (k: string): ReturnType<typeof summarize> | null => {
  const ps: Pair[] = sel.pairs
    .filter((p) => !p.zeroLane)
    .map((p) => {
      const v = (a: ArmKey) => (lanes[a]!.find((x) => x.cell === p.cell && x.replicate === p.replicate)!.representative as Record<string, number>)[k]!;

      return { ...p, ctrl: v('CTRL'), exp: v('EXP30'), d: v('EXP30') - v('CTRL') };
    });

  return ps.length ? summarize(ps, (p) => p.d, 0.1, ['giveback', k, cut]) : null;
};
const record = {
  kind: 'Stage B report-only profit-giveback diagnostic (CPU, purpose diagnostic; never official evidence)',
  cutoff: cut,
  door: cutoffs[cut].door,
  replays: cache.size,
  cpuEqualsGpu: mismatches === 0,
  lanes,
  paired: Object.fromEntries(['unbankedGiveback', 'bankedErosion', 'capitalLoss', 'unbankedGivebackShare', 'ddLiquidation', 'maxTradeGivebackAboveBreakeven'].map((k) => [k, paired(k)])),
  givebackDominated: Object.fromEntries(armKeys.map((a) => [a, lanes[a]!.filter((x) => (x.representative as { givebackDominated?: boolean } | null)?.givebackDominated).length])),
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: new Date().toISOString()
};

writeJson(path.join(resultsDir, 'analysis', `giveback-${cut}.json`), record);
console.log(JSON.stringify({ cutoff: cut, replays: record.replays, cpuEqualsGpu: record.cpuEqualsGpu, seconds: record.seconds }));
