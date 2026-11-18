// Machine-readable tables (PROTOCOL.md §12): CSV files in results/tables/, regenerated deterministically from the sealed
// records only (no simulation, no data door). Rerunnable; the tables are derived, the sealed JSON is the authority.
//   node --experimental-transform-types tools/vg-l0-risk-metrics/tables.ts
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { readJson, sha256File } from '../../src/vg-l0-risk-metrics/records.ts';

const out = path.join(resultsDir, 'tables');
const J = <T>(rel: string) => readJson<T>(path.join(resultsDir, rel));
const c2 = (x: unknown) => (typeof x === 'number' ? (Number.isFinite(x) ? String(Math.round(x * 100) / 100) : '') : x === null || x === undefined ? '' : String(x));
const csv = (name: string, rows: Record<string, unknown>[]) => {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v: unknown) => {
    const s = c2(v);

    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  fs.writeFileSync(path.join(out, `${name}.csv`), [cols.join(','), ...rows.map((r) => cols.map((k) => esc(r[k])).join(','))].join('\n') + '\n');
  return { name: `${name}.csv`, rows: rows.length };
};

fs.mkdirSync(out, { recursive: true });

type W = { net: number; dd: { max: number; peak: string; trough: string }; ddAttribution: { profitGiveback: number; principalLoss: number; residual: number } | null; floor: { liquidation: { shortfall: number; date: string | null } }; realizedDd: { max: number; peak: string; trough: string }; bankedDd: { marked: { max: number; highDate: string; troughDate: string } }; trades: { lots: number; principalLossMax: number; principalLossMaxLot: { book: string; entry: string } | null; lotsOver10k: number; lotsOver25k: number; lotsOver35k: number; worstRealized: number | null; worstCanonicalMae: number | null; maxGiveback: { amount: number; book: string; entry: string } | null } };
type C = { rows: { key: string; label: string; provenance: string; cell: string | null; boundedLossExit: boolean; record: Record<string, number>; windows: Record<string, W>; episodes: Record<string, W>; exposures: { date: string; net: number; openShareOfNet: number | null; open: Record<string, unknown> | null; after: Record<string, unknown> }[]; trades: Record<string, unknown>[]; gapsThroughStop: Record<string, unknown>[]; realizedEpisodes: Record<string, unknown>[] }[] };
const centres = J<C>('audit/centres.json');
// amendment A3: the windows' and episodes' per-trade blocks come from the corrected record
const v2 = new Map(J<{ rows: { key: string; windows: Record<string, W>; episodes: Record<string, W> }[] }>('audit/centres-windows-v2.json').rows.map((r) => [r.key, r]));

for (const r of centres.rows) {
  const c = v2.get(r.key)!;

  for (const w of Object.keys(r.windows)) r.windows[w]!.trades = c.windows[w]!.trades;
  for (const e of Object.keys(r.episodes)) r.episodes[e]!.trades = { ...c.episodes[e]!.trades, worstCanonicalMae: null }; // see A3
}
// the development window's canonical MAE of a lot open at 2024-12-31: the sealed D24 evidence (Assignment 3's
// risk.mae.worst, carried in members-C24), causal by construction; its PL maximum equals the corrected one (checked)
{
  const m = new Map(J<{ rows: { label: string; ra1: { worstMae: number }; p2: { principalLossMax: number } }[] }>('selection/members-C24.json').rows.map((x) => [x.label, x]));

  for (const r of centres.rows) {
    const x = m.get(r.key === 'New L0' ? 'incumbent: New L0' : r.label);

    if (!x) continue;
    if (Math.abs(x.p2.principalLossMax - r.windows.development!.trades.principalLossMax) > 0.01) throw new Error(`${r.key}: development PL differs from D24`);
    r.windows.development!.trades.worstCanonicalMae = x.ra1.worstMae;
  }
}
const files: { name: string; rows: number }[] = [];
const winRow = (prefix: string, w: W) => ({
  [`${prefix}Net`]: w.net,
  [`${prefix}Dd`]: w.dd.max,
  [`${prefix}DdPeak`]: w.dd.peak,
  [`${prefix}DdTrough`]: w.dd.trough,
  [`${prefix}DdGiveback`]: w.ddAttribution?.profitGiveback ?? 0,
  [`${prefix}DdPrincipalLoss`]: w.ddAttribution?.principalLoss ?? 0,
  [`${prefix}TradePrincipalLossMax`]: w.trades.principalLossMax,
  [`${prefix}TradePrincipalLossLot`]: w.trades.principalLossMaxLot ? `${w.trades.principalLossMaxLot.book} ${w.trades.principalLossMaxLot.entry}` : '',
  [`${prefix}LotsOver25k`]: w.trades.lotsOver25k,
  [`${prefix}WorstRealizedLot`]: w.trades.worstRealized,
  [`${prefix}WorstCanonicalMae`]: w.trades.worstCanonicalMae,
  [`${prefix}FloorShortfall`]: w.floor.liquidation.shortfall,
  [`${prefix}RealizedDd`]: w.realizedDd.max,
  [`${prefix}BankedDd`]: w.bankedDd.marked.max,
  [`${prefix}MaxLotGiveback`]: w.trades.maxGiveback?.amount ?? 0
});

files.push(
  csv(
    'candidates',
    centres.rows.map((r) => ({
      key: r.key,
      label: r.label,
      provenance: r.provenance,
      cell: r.cell,
      boundedLossExit: r.boundedLossExit,
      lots: r.record.lots,
      utilization: r.record.utilization,
      interest: r.record.interest,
      costs: r.record.costs,
      ...winRow('dev', r.windows.development!),
      ...winRow('val', r.windows['2025–2026 (reset)']!),
      ...winRow('full', r.windows.full!),
      ...Object.fromEntries(Object.entries((r.record as unknown as { years: Record<string, number> }).years ?? {}).map(([y, v]) => [`net ${y}`, v]))
    }))
  )
);
files.push(csv('trades', centres.rows.flatMap((r) => r.trades.map((t) => ({ subject: r.key, ...t })))));
files.push(
  csv(
    'episodes',
    centres.rows.flatMap((r) => Object.entries(r.episodes).map(([e, w]) => ({ subject: r.key, episode: e, ...winRow('', w) })))
  )
);
files.push(
  csv(
    'exposures',
    centres.rows.flatMap((r) =>
      r.exposures.map((x) => ({ subject: r.key, close: x.date, net: x.net, openShareOfNet: x.openShareOfNet, ...(x.open ? Object.fromEntries(Object.entries(x.open).filter(([, v]) => typeof v !== 'object')) : { book: 'none open' }), afterHighest: (x.after?.highest as { pnl: number } | null)?.pnl, afterLowest: (x.after?.lowest as { pnl: number } | null)?.pnl, afterExit: (x.after?.exit as { date: string } | null)?.date, changeFromClose: x.after?.changeFromClose }))
    )
  )
);
files.push(csv('gaps-through-stop', centres.rows.flatMap((r) => r.gapsThroughStop.map((g) => ({ subject: r.key, ...g })))));
files.push(csv('realized-loss-clusters', centres.rows.flatMap((r) => r.realizedEpisodes.map((g) => ({ subject: r.key, ...g })))));

// neighbourhoods
const nb = fs
  .readdirSync(path.join(resultsDir, 'audit'))
  .filter((f) => f.startsWith('nbhd-'))
  .sort()
  .flatMap((f) => {
    const d = J<{ key: string; draws: number; distributions: Record<string, Record<string, number>>; breaches: Record<string, number | null> }>(`audit/${f}`);
    const door = f.endsWith('FULL.json') ? 'FULL' : 'D24';

    return Object.entries(d.distributions).map(([metric, t]) => ({ key: d.key, door, draws: d.draws, metric, ...t, breaches: d.breaches.count, breachShare: d.breaches.share, givebackShareOfBreachDd: d.breaches.givebackShareOfBreachDd, bankedDdOver35k: d.breaches.bankedDdOver35k, principalLossOver25k: d.breaches.principalLossOver25k }));
  });

files.push(csv('neighbourhoods', nb));

// Stage 4
const scan = J<{ cutoffs: Record<string, { screenReasons: Record<string, number>; fittedCentres: Record<string, number>; bestQualifiedTrackINet: number; ddExcluded: Record<string, number> }> }>('pipeline/exclusions-scan.json');
const cmp = J<{ cutoffs: Record<string, { screenNet: Record<string, Record<string, number>>; screenRealized: Record<string, Record<string, number>> }>; trackN: Record<string, unknown> }>('pipeline/exclusions-compare.json');

files.push(
  csv(
    'exclusions-by-cutoff',
    Object.entries(scan.cutoffs).map(([c, v]) => ({
      cutoff: c,
      ...Object.fromEntries(Object.entries(v.screenReasons).map(([k, x]) => [`screen ${k}`, x])),
      ...Object.fromEntries(Object.entries(v.fittedCentres).map(([k, x]) => [`centres ${k}`, x])),
      bestQualifiedTrackINet: v.bestQualifiedTrackINet,
      ...Object.fromEntries(Object.entries(v.ddExcluded).map(([k, x]) => [`ddExcluded ${k}`, x])),
      screenPlausibleNetMax: cmp.cutoffs[c]!.screenNet.plausible!.max,
      screenDdExcludedNetMax: cmp.cutoffs[c]!.screenNet.ddExcluded!.max,
      screenPlausibleNetP90: cmp.cutoffs[c]!.screenNet.plausible!.p90,
      screenDdExcludedNetP90: cmp.cutoffs[c]!.screenNet.ddExcluded!.p90,
      screenPlausibleRealizedMax: cmp.cutoffs[c]!.screenRealized.plausible!.max,
      screenDdExcludedRealizedMax: cmp.cutoffs[c]!.screenRealized.ddExcluded!.max
    }))
  )
);

const rep = J<{ rows: { cutoff: string; id: string; why: string[]; source: string; cell: string; boundedLossExit: boolean; bestQualifiedTrackINet: number; training: W }[] }>('pipeline/exclusions-replays.json');

files.push(csv('exclusions-replayed', rep.rows.map((r) => ({ cutoff: r.cutoff, id: r.id, why: r.why.join('; '), source: r.source, cell: r.cell, boundedLossExit: r.boundedLossExit, bestQualifiedTrackINet: r.bestQualifiedTrackINet, ...winRow('training', r.training), givebackShareOfDd: r.training.ddAttribution ? r.training.ddAttribution.profitGiveback / r.training.dd.max : null }))));

// Stage 5
const sel = J<{ cutoffs: Record<string, Record<string, { members: number; qualified: number; primaries: Record<string, string | null>; primaryInputs: Record<string, Record<string, unknown> | null>; gateFailuresAmongQualified: Record<string, number>; eligible: Record<string, number>; item9: Record<string, unknown>[] }>> }>('selection/selectors.json');

files.push(
  csv(
    'selector-primaries',
    Object.entries(sel.cutoffs).flatMap(([c, pops]) =>
      Object.entries(pops).flatMap(([pop, v]) => Object.entries(v.primaries).map(([s, l]) => ({ cutoff: c, population: pop, selector: s, members: v.members, qualified: v.qualified, eligible: v.eligible[s] ?? v.qualified, G1failQualified: v.gateFailuresAmongQualified.G1, G2failQualified: v.gateFailuresAmongQualified.G2, unboundedQualified: v.gateFailuresAmongQualified.unbounded, primary: l, ...(v.primaryInputs[s] ?? {}) })))
    )
  )
);
files.push(csv('item9-open-winners', Object.entries(sel.cutoffs).flatMap(([c, pops]) => Object.entries(pops).flatMap(([pop, v]) => v.item9.map((x) => ({ cutoff: c, population: pop, ...Object.fromEntries(Object.entries(x).filter(([, y]) => typeof y !== 'object' || Array.isArray(y))), ...(x.open ? Object.fromEntries(Object.entries(x.open as Record<string, unknown>).map(([k, y]) => [`open.${k}`, y])) : {}) }))))));

const folds = J<{ paths: Record<string, Record<string, { net: number; sequentialDd: number; ddPeak: string; ddTrough: string; verdict: string; charges: number; parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number }[] }>>; labels: Record<string, unknown>[]; attribution: Record<string, { sequentialDd: number; profitGiveback: number; principalLoss: number; chargesInWindow: number; residual: number; peak: string; trough: string }> }>('selection/folds.json');

files.push(
  csv(
    'sequential-paths',
    Object.entries(folds.paths).flatMap(([pop, m]) =>
      Object.entries(m).map(([s, p]) => ({ population: pop, selector: s, net: p.net, sequentialDd: p.sequentialDd, ddPeak: p.ddPeak, ddTrough: p.ddTrough, charges: p.charges, verdict: p.verdict, ...Object.fromEntries(p.parts.flatMap((x) => [[`${x.fold} primary`, x.label], [`${x.fold} sliceNet`, x.sliceNet], [`${x.fold} sliceDd`, x.sliceDd]])), ...((a) => (a ? { ddGiveback: a.profitGiveback, ddPrincipalLoss: a.principalLoss, ddCharges: a.chargesInWindow, ddResidual: a.residual } : {}))(folds.attribution[`${pop}/${s}`]) }))
    )
  )
);
files.push(csv('comparison-labels', folds.labels));

// Stage 2
const grid = J<{ rows: Record<string, unknown>[]; joint: Record<string, unknown>[] }>('margin/grid.json');
const ov = J<{ rows: { key: string; strategyDd: Record<string, unknown>; peakSlotMarketValue: number; scenarios: Record<string, unknown>[] }[] }>('margin/overlay.json');

files.push(csv('margin-grid', grid.rows));
files.push(csv('margin-joint-shocks', grid.joint));
files.push(csv('margin-overlay', ov.rows.flatMap((r) => r.scenarios.map((s) => ({ subject: r.key, strategyDd: (r.strategyDd as { max: number }).max, peakSlotMarketValue: r.peakSlotMarketValue, ...s })))));

const manifest = files.map((f) => ({ ...f, sha256: sha256File(path.join(out, f.name)) }));

fs.writeFileSync(path.join(out, 'MANIFEST.json'), JSON.stringify({ generatedFrom: 'the sealed records of results/ (seals.jsonl)', generator: 'tools/vg-l0-risk-metrics/tables.ts', files: manifest }, null, 1) + '\n');
for (const f of manifest) console.log(f.name, f.rows);
