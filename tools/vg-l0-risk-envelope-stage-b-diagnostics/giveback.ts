// RES-BD 1.0.0 Diagnostic B — the profit-giveback and capital-loss decomposition of one cutoff (PROTOCOL.md §4; a bounded
// CPU replay, purpose diagnostic; never official evidence, never a gate or ranking input). It executes the design of
// Stage B's tools/vg-l0-risk-envelope-stage-b/giveback.ts (the pilot's diag-core `diagnose` on the TRAINING door) over
// the cutoff's sealed interval subjects — every lane representative of both arms (which include both arms' pooled
// P0 / RA1-original / RA1-adapted primaries) and the two descriptive benchmarks — in forked workers (./diagWorker.ts),
// with two blocking parity checks:
//   1. giveback.ts's check: centre net, marked DD and the four envelope values, to the cent, against the sealed official
//      GPU qualification evidence;
//   2. Stage A's G3 check: the canonical CPU record + its CPU envelope, bit for bit (deepDiff), against the archived
//      official GPU centre record read from the qualification-archive copy (./qualification.ts intermediate).
// Any mismatch stops the tool before a result is written. Outputs:
//   research/vg-l0-risk-envelope-stage-b-diagnostics/results/giveback/giveback-<cut>.json (per subject + lanes)
//   .cache/vg-l0-risk-envelope-stage-b-diagnostics/giveback-<cut>.json.gz (full rows: window lots, every trade)
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev … src/gpu-backend/legacyRunner.ts vg-l0rebd-giveback tools/…/giveback.ts --cutoff C21
import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { engineExecArgv, maglevDisabled } from '../../src/gpu-backend/runtime.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { type Cfg, canonicalCfg, cfgId } from '../../src/vg-l0-full-joint/space.ts';
import { assess } from '../../src/risk-envelope/policy.ts';
import { type ArmKey, type CutoffKey, armKeys, arms, capital, cutoffs } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { selectionFile } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';
import { qualificationFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { plain, readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import type { LaneValue } from '../../src/vg-l0-risk-envelope-stage-b/select.ts';
import type { Pair } from '../../src/vg-l0-risk-envelope-stage-b/stats.ts';
import { STUDY_ID, cacheRoot, purposeOf, r2, readJsonGz, repoRoot, resultsDir, utc, writeJson, writeJsonGz } from './common.ts';

const purpose = purposeOf(['diagnostic']);

setA3Quiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;
const WORKERS = Number(process.env.VGL0REBD_WORKERS ?? 8);

if (!cutoffs[cut]) throw new Error('--cutoff C19|C21|C24');

const t0 = Date.now();
const spec = cutoffs[cut];
type Subject = { label: string; id: string; roles?: { arm: string; kind: string; lane?: string; selector?: string }[]; arms?: Record<ArmKey, boolean>; evidence: Evidence };
const sel = readSealed<{ laneValues: Record<ArmKey, LaneValue[]>; pairs: Pair[]; subjects: Subject[]; benchmarks: Subject[]; pooled: { arms: Record<ArmKey, { primaries: Record<string, string> }> } }>(selectionFile(cut));
const q = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut));
const ev = new Map(q.evidence.map((e) => [e.id, e]));
const qrep = readJsonGz<{ members: { id: string; centreGpu: Record<string, unknown> }[] }>(path.join(cacheRoot, `qualification-${cut}.json.gz`));
const gpuCentre = new Map(qrep.members.map((m) => [m.id, m.centreGpu]));
const subjects = [...sel.subjects.map((s) => ({ ...s, kind: 'subject' as const })), ...sel.benchmarks.map((s) => ({ ...s, kind: 'benchmark' as const }))];

if (subjects.length > 70) throw new Error(`${cut}: ${subjects.length} subjects exceed the predeclared cap of 70`);
if (new Set(subjects.map((s) => s.id)).size !== subjects.length) throw new Error(`${cut}: duplicate subjects`);
for (const s of subjects) {
  if (!ev.has(s.id)) throw new Error(`${s.label}: no sealed qualification evidence`);
  if (cfgId(canonicalCfg(s.evidence.cfg)) !== s.id) throw new Error(`${s.label}: the sealed configuration's identity ≠ ${s.id}`);
  if (!gpuCentre.has(s.id)) throw new Error(`${s.label}: no archived GPU centre record in the qualification replay`);
}

// every lane representative must be a subject
for (const a of armKeys)
  for (const v of sel.laneValues[a])
    if (v.representative && !subjects.some((s) => s.id === v.representative!.id)) throw new Error(`${a} ${v.lane}: representative ${v.representative.id} is not a subject`);

console.log(`[${utc()}] giveback ${cut}: ${subjects.length} subjects on ${spec.door}, ${WORKERS} workers`);

// ----- the CPU replays -----
type Row = { key: string; diag: Record<string, unknown> & { net: number; dd: number; envelope: Record<string, number> }; rec: Record<string, unknown>; ext: Record<string, unknown>; seconds: number };
const items = subjects.map((s) => ({ key: s.id, cfg: canonicalCfg(s.evidence.cfg) as Cfg }));
const n = Math.min(WORKERS, items.length);
const chunks = Array.from({ length: n }, (_v, i) => items.filter((_x, j) => j % n === i));
const parts = await Promise.all(
  chunks.map(
    (chunk) =>
      new Promise<Row[]>((resolve, reject) => {
        const child = fork(path.join(import.meta.dirname, 'diagWorker.ts'), [], {
          execArgv: [...(maglevDisabled() ? engineExecArgv : []), '--expose-gc', '--max-old-space-size=4096', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'],
          serialization: 'advanced',
          env: { ...process.env },
          stdio: ['ignore', 'inherit', 'inherit', 'ipc']
        });

        child.on('message', (m: { t: string; rows?: Row[]; e?: string }) => (m.t === 'done' ? resolve(m.rows!) : reject(new Error(m.e))));
        child.on('exit', (code) => code !== 0 && reject(new Error(`giveback worker exited ${code}`)));
        child.send({ door: spec.door, purpose: `${STUDY_ID} giveback ${cut} (${purpose})`, items: chunk });
      })
  )
);
const byKey = new Map(parts.flat().map((r) => [r.key, r]));

if (byKey.size !== subjects.length) throw new Error(`${cut}: ${byKey.size} rows for ${subjects.length} subjects`);

// ----- parity (blocking) -----
const parity = subjects.map((s) => {
  const r = byKey.get(s.id)!;
  const e = ev.get(s.id)!;
  // 1. giveback.ts's check, to the cent
  const gpu = { net: r2(e.centre.net), dd: r2(e.centre.dd), ...Object.fromEntries(Object.entries(e.envelope.centre).map(([k, v]) => [k, r2(v as number)])) } as Record<string, number>;
  const cpu = { net: r.diag.net, dd: r.diag.dd, ...r.diag.envelope } as Record<string, number>;
  const cents = Object.keys(gpu).filter((k) => gpu[k] !== cpu[k]);
  // 2. bit for bit against the archived official GPU centre record
  //    (both in the store's encoding — the archive's own form: non-finite numbers as "__Inf" …)
  const bits = deepDiff(plain(r.rec), gpuCentre.get(s.id)!, '$', [], 10);
  // 3. the ledger path reconciles with the engine under the repository's established rule (src/vg-l0-risk-metrics/
  //    engine.ts reconcile; METRIC_SPECIFICATION §1: the rebuilt maximum DD within 1e-6 relative of the engine's, with
  //    identical peak and trough instants — AMENDMENTS D3), and the D3 partition adds up to the path DD it partitions
  const ext = r.ext as { engineDd: number; engineDdInstants: { peakT: number; troughT: number }; pathDd: { marked: { max: number; peakT: number; troughT: number } }; d3: { marked: { dd: number; account: { unbankedGiveback: number; bankedErosion: number; capitalLoss: number; residual: number } } } };
  const ddDiff = Math.abs(ext.pathDd.marked.max - ext.engineDd);
  const instantsEqual = ext.pathDd.marked.peakT === ext.engineDdInstants.peakT && ext.pathDd.marked.troughT === ext.engineDdInstants.troughT;
  const pathOk = ddDiff <= 1e-6 * Math.max(1, ext.engineDd) && instantsEqual && ext.d3.marked.dd === ext.pathDd.marked.max && Math.abs(ext.d3.marked.account.residual) < 1e-6;

  return { id: s.id, label: s.label, centsFields: Object.keys(gpu).length, centsMismatch: cents, bitDifferences: bits.map((d) => d.path), pathReconciles: pathOk, engineDd: ext.engineDd, pathDd: ext.pathDd.marked.max, ddAbsDiff: ddDiff, instantsEqual, d3Residual: ext.d3.marked.account.residual };
});
const bad = parity.filter((p) => p.centsMismatch.length || p.bitDifferences.length || !p.pathReconciles);

if (bad.length) {
  writeJson(path.join(resultsDir, 'giveback', `PARITY-FAILURE-${cut}.json`), { cutoff: cut, failures: bad, finished: utc() });
  throw new Error(`${cut}: ${bad.length} CPU replays differ from the official GPU records (or fail the path reconciliation) — blocked: ${JSON.stringify(bad.slice(0, 3))}`);
}
console.log(`[${utc()}] giveback ${cut}: parity ${subjects.length}/${subjects.length} — to the cent (giveback.ts) and bit for bit (archived GPU record)`);

// ----- rows: giveback.ts's fields, plus the extension -----
type D3 = { unbankedGiveback: number; bankedErosion: number; capitalLoss: number };
const rowOf = (s: (typeof subjects)[number]) => {
  const r = byKey.get(s.id)!;
  const d = r.diag as unknown as {
    net: number;
    dd: number;
    ddLiquidation: number;
    envelope: Record<string, number>;
    givebackDominated: boolean;
    unbankedGivebackShare: number | null;
    views: { marked: { D3: { account: D3; lot: { profitGiveback: number; principalLoss: number } | null; window: { peakDate: string; troughDate: string } | null } }; liquidation: { D3: { account: D3 } } };
    trades: { lots: number; maxGivebackAboveBreakeven: number; maxPeakProfit: number; worstNet: number | null; maxPrincipalLossLiq: number; byBook: Record<string, number> };
    occupancy: number | null;
    tradedNotional: number;
    principalDays: number;
  };
  const a = d.views.marked.D3.account;
  const al = d.views.liquidation.D3.account;
  const x = r.ext as {
    window: { rows: { lot: number; book: string; entry: string; exit: string | null; role: string; atPeak: number; atTrough: number; contribution: number; profitGiveback: number; principalLoss: number; lotNet: number | null }[]; profitGiveback: number; principalLoss: number; grossGivebackAtPeakLots: number; grossPrincipalLoss: number; offsets: number } | null;
    trades: { net: number; peakProfit: number; maxGivebackAboveBreakeven: number; principalLossLiq: number; open: boolean }[];
    bankedEpisode: { marked: { max: number; highDate: string; troughDate: string }; liquidation: { max: number; highDate: string; troughDate: string } };
  };
  const policy = (k: ArmKey) => assess({ dd: r.rec.dd as number, envelope: r.rec.envelope as never } as never, arms[k].policy, capital, 'giveback').pass;
  const w = x.window;
  // lots in the max-DD window: giveback above break-even by lots that closed profitable vs not (lot-level lens)
  const winGb = (f: (row: NonNullable<typeof w>['rows'][number]) => boolean) => (w ? w.rows.filter(f).reduce((s2, row) => s2 + row.profitGiveback, 0) : 0);
  const winPl = (f: (row: NonNullable<typeof w>['rows'][number]) => boolean) => (w ? w.rows.filter(f).reduce((s2, row) => s2 + row.principalLoss, 0) : 0);
  const gbTrades = x.trades.filter((t) => t.maxGivebackAboveBreakeven > 0);

  return {
    // giveback.ts's row
    id: s.id,
    label: s.label,
    cpuEqualsGpu: true,
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
    occupancy: d.occupancy,
    // the extension
    kind: s.kind,
    roles: s.roles ?? null,
    passesP0: policy('CTRL'),
    passesP3: policy('EXP30'),
    envelope: d.envelope,
    bankedDdLiquidation: d.envelope.bankedDdLiquidation,
    bankedDdMarked: d.envelope.bankedDdMarked,
    principalLossLiquidation: d.envelope.principalLossLiquidation,
    principalLossMarked: d.envelope.principalLossMarked,
    givebackLowerBound: Math.max(0, d.dd - d.envelope.bankedDdMarked!),
    erosionPlusCapitalLoss: a.bankedErosion + a.capitalLoss,
    liquidation: { dd: d.ddLiquidation, unbankedGiveback: al.unbankedGiveback, bankedErosion: al.bankedErosion, capitalLoss: al.capitalLoss },
    window: d.views.marked.D3.window,
    lotPrincipalLoss: d.views.marked.D3.lot?.principalLoss ?? null,
    windowLots: w ? w.rows.length : 0,
    windowGivebackClosedProfitable: winGb((row) => row.exit !== null && (row.lotNet ?? 0) > 0),
    windowGivebackClosedLoss: winGb((row) => row.exit !== null && (row.lotNet ?? 0) <= 0),
    windowGivebackOpenAtEnd: winGb((row) => row.exit === null),
    windowPrincipalLossClosedLoss: winPl((row) => row.exit !== null && (row.lotNet ?? 0) <= 0),
    windowGrossGivebackAtPeakLots: w?.grossGivebackAtPeakLots ?? 0,
    windowGrossPrincipalLoss: w?.grossPrincipalLoss ?? 0,
    windowOffsets: w?.offsets ?? 0,
    maxTradePrincipalLossLiq: d.trades.maxPrincipalLossLiq,
    tradesWithGiveback: gbTrades.length,
    tradesGivebackEndedProfitable: gbTrades.filter((t) => !t.open && t.net > 0).length,
    tradesGivebackEndedLoss: gbTrades.filter((t) => !t.open && t.net <= 0).length,
    tradesLosing: x.trades.filter((t) => !t.open && t.net < 0).length,
    sumTradeGivebackEndedProfitable: gbTrades.filter((t) => !t.open && t.net > 0).reduce((s2, t) => s2 + t.maxGivebackAboveBreakeven, 0),
    sumTradeGivebackEndedLoss: gbTrades.filter((t) => !t.open && t.net <= 0).reduce((s2, t) => s2 + t.maxGivebackAboveBreakeven, 0),
    bankedEpisode: x.bankedEpisode,
    tradedNotional: d.tradedNotional,
    principalDays: d.principalDays,
    byBook: d.trades.byBook,
    seconds: r.seconds
  };
};
const rowsById = new Map(subjects.map((s) => [s.id, rowOf(s)]));
const lanes = Object.fromEntries(
  armKeys.map((a) => [a, sel.laneValues[a].map((v) => ({ lane: v.lane, cell: v.cell, replicate: v.replicate, value: v.value, representative: v.representative ? { label: v.representative.label, id: v.representative.id } : null }))])
);
const record = {
  kind: 'RES-BD 1.0.0 profit-giveback decomposition (CPU, purpose diagnostic; never official evidence)',
  cutoff: cut,
  door: spec.door,
  replays: subjects.length,
  engineRunsPerSubject: 3,
  cpuEqualsGpu: { toTheCent: true, bitForBit: true, subjects: subjects.length, fieldsToTheCent: parity[0]!.centsFields },
  pairs: sel.pairs,
  lanes,
  pooledPrimaries: Object.fromEntries(armKeys.map((a) => [a, sel.pooled.arms[a].primaries])),
  subjects: [...rowsById.values()],
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: utc()
};
const file = path.join(resultsDir, 'giveback', `giveback-${cut}.json`);
const sha = writeJson(file, record);
const full = path.join(cacheRoot, `giveback-${cut}.json.gz`);

fs.mkdirSync(cacheRoot, { recursive: true });

const shaFull = writeJsonGz(full, { cutoff: cut, rows: [...byKey.values()], parity, finished: utc() });

writeJson(path.join(resultsDir, 'giveback', `parity-${cut}.json`), { cutoff: cut, subjects: parity.length, toTheCent: parity.every((p) => !p.centsMismatch.length), bitForBit: parity.every((p) => !p.bitDifferences.length), pathReconciles: parity.every((p) => p.pathReconciles), maxDdAbsDiff: Math.max(...parity.map((p) => p.ddAbsDiff)), pathDdExactlyEngineDd: parity.filter((p) => p.ddAbsDiff === 0).length, rows: parity, finished: utc() });
console.log(JSON.stringify({ cut, subjects: subjects.length, parity: 'identical', file: path.relative(repoRoot, file), sha256: sha, full: path.relative(repoRoot, full), shaFull, seconds: record.seconds }));
