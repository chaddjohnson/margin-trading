// D5 selection trace from sealed records only (PROTOCOL.md §6; no simulation). For each audited path and fold:
//   - the qualified independent set the fold primary was ranked in (its own study's role set), the primary's rank-1 margin
//     and training statistics (centre, selection and confirmation neighbourhoods, tails, episodes, years, unrealized);
//   - every row the audited fold stage evaluated on the slice under its own convention (role holders, seed-level
//     replicate primaries): training statistics joined from the selection evidence, slice P&L and DD;
//   - Spearman rank correlations of training statistics with the slice outcome among those rows (descriptive);
//   - seed-level dispersion of the replicate primaries (structure, parameters, outcomes);
//   - parameter vectors of the fold primaries beside New L0.
// Every slice figure is an already-published outcome; nothing here is selectable (hindsight, report-only).
import path from 'node:path';
import { audited, ceiling, folds, r2, readRecord, repoRoot, resultsDir, sealJson } from './common.ts';

type Ev = {
  label: string;
  inc: string;
  sh?: string;
  replicate?: number;
  entries?: string;
  cfg: { inc: string; quad: { d1: Record<string, Record<string, number>>; g: Record<string, Record<string, unknown>> }; sh?: string };
  centre: Record<string, any>;
  select: Record<string, any>;
  confirm: Record<string, any>;
  confirmTail: Record<string, any>;
  qualified: boolean;
  class?: Record<string, string>;
};
type Row = { label: string; mode?: string; unit?: string; track?: string; own?: boolean; role: string; sliceNet: number; sliceDd: number; cfg: Ev['cfg'] };

const setOf: Record<string, { file: (f: string) => string; set: string; own: (r: Row) => boolean }> = {
  '5B-L0': {
    file: (f) => path.join(audited['5B-L0'].path, 'results/folds', f, 'selection.json'),
    set: 'L0/independent',
    own: (r) => r.mode === 'L0' && r.own === true
  },
  SES: {
    file: (f) => path.join(audited.SES.path, 'results/folds', f, 'selection.json'),
    set: 'ses/independent',
    own: (r) => r.unit === 'ses' && r.own === true
  },
  B1: { file: (f) => path.join(audited.B1.path, 'results/folds', f, 'B1', 'selection.json'), set: 'B1', own: (r) => r.track === 'B1' },
  B2: { file: (f) => path.join(audited.B2.path, 'results/folds', f, 'B2-g', 'selection.json'), set: 'B2-g', own: (r) => r.track === 'B2' }
};
const evalFile = (key: string, f: string) => path.join(audited[key as keyof typeof audited].path, 'results/folds', f, 'evaluation.json');

// Spearman rank correlation (average ranks for ties)
const ranks = (x: number[]) => {
  const idx = x.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const r = new Array<number>(x.length);

  for (let i = 0; i < idx.length; ) {
    let j = i;

    while (j + 1 < idx.length && idx[j + 1]![0] === idx[i]![0]) j++;
    for (let k = i; k <= j; k++) r[idx[k]![1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return r;
};
const spearman = (a: number[], b: number[]) => {
  if (a.length < 4) return null;

  const ra = ranks(a);
  const rb = ranks(b);
  const ma = ra.reduce((s, v) => s + v, 0) / ra.length;
  const mb = rb.reduce((s, v) => s + v, 0) / rb.length;
  let num = 0;
  let da = 0;
  let db = 0;

  for (let i = 0; i < ra.length; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2;
    db += (rb[i]! - mb) ** 2;
  }
  return da && db ? r2((100 * num) / Math.sqrt(da * db)) / 100 : null;
};
const q = (x: number[], p: number) => {
  const s = [...x].sort((a, b) => a - b);
  const h = (s.length - 1) * p;
  const lo = Math.floor(h);

  return s.length ? r2(s[lo]! + (s[Math.ceil(h)]! - s[lo]!) * (h - lo)) : null;
};

const d1Keys = ['targetPercentChange', 'trailingBuyPercentage', 'trailingStopPercentage', 'maximumHoldDays', 'tickWindowSize', 'intradayLossBuffer', 'pullback', 'continuationWindow'];
const d1Vec = (b: Record<string, number>) => d1Keys.map((k) => b[k]);
const growthSummary = (g: Record<string, unknown>) => ({
  entry: g.entryMethod,
  advance: g.advanceFromRecentLowPercent ?? null,
  lookback: g.recentLowLookbackBars ?? g.breakoutLookbackSessions ?? null,
  trend: g.trendFilterEnabled ? g.trendMethod : 'off',
  eligibility: g.eligibilityEnabled ? g.eligibilityPolicy : 'off',
  gate: g.drawdownRecoveryGateEnabled ? `${g.dipThresholdPercent}%/${g.recoveryRetracementPercent}%` : 'off',
  trail: g.trailingStopPercent,
  maxHold: g.maximumHoldEnabled ? g.maximumHoldDays : 'off',
  initialStop: g.initialStopEnabled ? `${g.initialStopAtrSessions}×${g.initialStopAtrMultiple}` : 'off',
  retention: g.retentionEnabled ? `${g.retentionSellPercent}%` : 'off',
  continuation: g.continuationEnabled ? g.continuationMethod : 'off'
});

const trainStats = (e: Ev, boundaryYear: number) => {
  const c = e.centre;
  const yrs = c.years as Record<string, number>;
  const lastTwo = (yrs[String(boundaryYear - 1)] ?? 0) + (yrs[String(boundaryYear)] ?? 0);

  return {
    centreNet: c.net,
    centreDd: c.dd,
    unrealized: c.unrealized,
    unrealizedShare: c.net ? r2((100 * c.unrealized) / c.net) / 100 : null,
    lots: c.lots,
    episodes: c.episodes,
    topEpisodeShare: c.topEpisodeShare,
    worstLoss: c.worstLoss,
    years: yrs,
    lastTwoYearsShare: c.net ? r2((100 * lastTwo) / c.net) / 100 : null,
    selectRobust: e.select.robust,
    selectP90Dd: e.select.p90Dd,
    selectWorstDd: e.select.worstDd,
    confirmP10: e.confirm.p10,
    confirmMedian: e.confirm.median,
    confirmP90Dd: e.confirm.p90Dd,
    confirmBreachShare: e.confirmTail.breachShare,
    confirmWorst10Mean: e.confirmTail.worst10Mean,
    confirmWorstDd: e.confirmTail.worstDd,
    clipped: e.confirmTail.clipped ?? null
  };
};

const out: Record<string, unknown>[] = [];
const pooled: Record<string, { tn: number[]; sn: number[]; sd: number[]; p90: number[]; w10: number[]; top: number[]; unr: number[] }> = {};

for (const key of ['5B-L0', 'SES', 'B1', 'B2']) {
  for (const f of folds) {
    const s = setOf[key]!;
    const sel = readRecord<{ primary?: unknown; independentPrimary?: Record<string, string>; roles: Record<string, { members: number; qualified: number; ranked: { rank: number; label: string; net: number; robust: number; p90: number; inc: string; sh?: string }[] }>; evidence: Ev[]; compute?: unknown }>(
      path.join(repoRoot, s.file(f.fold))
    );
    const ev = readRecord<{ primary: Record<string, string>; rows: Row[] }>(path.join(repoRoot, evalFile(key, f.fold)));
    const primary = key === '5B-L0' ? ev.primary.L0! : key === 'SES' ? ev.primary.ses! : ev.primary[key]!;
    const set = sel.roles[s.set]!;
    const ranked = set.ranked;
    const byLabel = new Map(sel.evidence.map((e) => [e.label, e]));
    const boundaryYear = Number(f.boundary.slice(0, 4));
    const pe = byLabel.get(primary)!;
    const own = ev.rows.filter((r) => s.own(r) && byLabel.has(r.label));
    const rows = own.map((r) => {
      const e = byLabel.get(r.label)!;
      const rank = ranked.find((x) => x.label === r.label)?.rank ?? null;

      return { label: r.label, role: r.role, rank, inc: e.inc, sh: e.sh ?? null, ...trainStats(e, boundaryYear), sliceNet: r.sliceNet, sliceDd: r.sliceDd, breach: r.sliceDd > ceiling, acceptable: r.sliceNet > 0 && r.sliceDd <= ceiling };
    });
    const col = (k: keyof (typeof rows)[number]) => rows.map((r) => Number(r[k]));
    const corr = {
      n: rows.length,
      centreNet_vs_sliceNet: spearman(col('centreNet'), col('sliceNet')),
      centreNet_vs_sliceDd: spearman(col('centreNet'), col('sliceDd')),
      centreDd_vs_sliceDd: spearman(col('centreDd'), col('sliceDd')),
      confirmP90Dd_vs_sliceDd: spearman(col('confirmP90Dd'), col('sliceDd')),
      confirmWorst10Mean_vs_sliceDd: spearman(col('confirmWorst10Mean'), col('sliceDd')),
      confirmP10_vs_sliceNet: spearman(col('confirmP10'), col('sliceNet')),
      topEpisodeShare_vs_sliceNet: spearman(col('topEpisodeShare'), col('sliceNet')),
      unrealizedShare_vs_sliceDd: spearman(col('unrealizedShare'), col('sliceDd'))
    };
    const P = (pooled[f.fold] ??= { tn: [], sn: [], sd: [], p90: [], w10: [], top: [], unr: [] });

    for (const r of rows) {
      P.tn.push(r.centreNet);
      P.sn.push(r.sliceNet);
      P.sd.push(r.sliceDd);
      P.p90.push(r.confirmP90Dd);
      P.w10.push(r.confirmWorst10Mean);
      P.top.push(r.topEpisodeShare);
      P.unr.push(r.unrealizedShare ?? 0);
    }

    // the qualified set: unrealized share at the cutoff and the margin of the rank-1 member
    const qualifiedEv = ranked.map((x) => byLabel.get(x.label)).filter((e): e is Ev => !!e && e.qualified);
    const unrShares = qualifiedEv.map((e) => (e.centre.net ? e.centre.unrealized / e.centre.net : 0));
    const replicateRows = rows.filter((r) => /R\d+ actual-profit/.test(r.role));
    const repEv = replicateRows.map((r) => byLabel.get(r.label)!);

    out.push({
      path: key,
      fold: f.fold,
      boundary: f.boundary,
      set: { name: set.set ?? s.set, members: set.members, qualified: set.qualified },
      primary: {
        label: primary,
        inc: pe.inc,
        sh: pe.sh ?? null,
        entries: pe.entries ?? null,
        class: pe.class ?? null,
        rank1Net: ranked[0]!.net,
        rank2: ranked[1] ? { label: ranked[1].label, net: ranked[1].net, gap: r2(ranked[0]!.net - ranked[1].net) } : null,
        top10Spread: ranked.length >= 10 ? r2(ranked[0]!.net - ranked[9]!.net) : null,
        training: trainStats(pe, boundaryYear),
        d1: { VGT: d1Vec(pe.cfg.quad.d1.VGT!), GDX: d1Vec(pe.cfg.quad.d1.GDX!) },
        growth: Object.fromEntries(Object.entries(pe.cfg.quad.g).map(([k, g]) => [k, growthSummary(g)]))
      },
      qualifiedUnrealizedShare: { n: unrShares.length, median: q(unrShares, 0.5), p90: q(unrShares, 0.9), over25pct: unrShares.filter((x) => x > 0.25).length },
      evaluated: rows,
      evaluatedSummary: {
        n: rows.length,
        breaching: rows.filter((r) => r.breach).length,
        acceptable: rows.filter((r) => r.acceptable).length,
        primarySliceRankByNet: [...rows].sort((a, b) => b.sliceNet - a.sliceNet).findIndex((r) => r.label === primary) + 1
      },
      correlations: corr,
      replicatePrimaries: replicateRows.length
        ? {
            n: replicateRows.length,
            breaching: replicateRows.filter((r) => r.breach).length,
            acceptable: replicateRows.filter((r) => r.acceptable).length,
            sliceNet: { min: q(replicateRows.map((r) => r.sliceNet), 0), median: q(replicateRows.map((r) => r.sliceNet), 0.5), max: q(replicateRows.map((r) => r.sliceNet), 1) },
            sliceDd: { min: q(replicateRows.map((r) => r.sliceDd), 0), median: q(replicateRows.map((r) => r.sliceDd), 0.5), max: q(replicateRows.map((r) => r.sliceDd), 1) },
            trainingNet: { min: q(replicateRows.map((r) => r.centreNet), 0), median: q(replicateRows.map((r) => r.centreNet), 0.5), max: q(replicateRows.map((r) => r.centreNet), 1) },
            growthEntry: repEv.reduce<Record<string, number>>((a, e) => {
              const k = String(e.cfg.quad.g.VGT?.entryMethod ?? 'none');

              a[k] = (a[k] ?? 0) + 1;
              return a;
            }, {}),
            toggles: repEv.reduce<Record<string, number>>((a, e) => {
              const k = e.sh ?? 'n/a';

              a[k] = (a[k] ?? 0) + 1;
              return a;
            }, {}),
            d1: Object.fromEntries(
              ['VGT', 'GDX'].map((sym) => [
                sym,
                Object.fromEntries(d1Keys.map((k) => { const v = repEv.map((e) => e.cfg.quad.d1[sym]![k]!); return [k, { min: q(v, 0), median: q(v, 0.5), max: q(v, 1) }]; }))
              ])
            )
          }
        : null
    });
    console.log(`${key} ${f.fold}: primary ${primary} (rank-1 gap ${ranked[1] ? r2(ranked[0]!.net - ranked[1].net) : '—'}); evaluated ${rows.length}, breaching ${rows.filter((r) => r.breach).length}; ρ(train net, slice net) ${corr.centreNet_vs_sliceNet}`);
  }
}

// New L0's parameters (the shadow study's control row) for the comparison table
const nl0 = readRecord<{ rows: Row[] }>(path.join(repoRoot, evalFile('B1', 'C19'))).rows.find((r) => r.label === 'control: NL0')!;
const pooledCorr = Object.fromEntries(
  Object.entries(pooled).map(([f, p]) => [
    f,
    {
      n: p.tn.length,
      centreNet_vs_sliceNet: spearman(p.tn, p.sn),
      centreNet_vs_sliceDd: spearman(p.tn, p.sd),
      confirmP90Dd_vs_sliceDd: spearman(p.p90, p.sd),
      confirmWorst10Mean_vs_sliceDd: spearman(p.w10, p.sd),
      topEpisodeShare_vs_sliceNet: spearman(p.top, p.sn),
      unrealizedShare_vs_sliceDd: spearman(p.unr, p.sd),
      breaching: p.sd.filter((x) => x > ceiling).length
    }
  ])
);

sealJson(
  path.join(resultsDir, 'selection', 'selection.json'),
  {
    stage: 'D5 selection trace (sealed records only; descriptive, hindsight)',
    newL0: { d1: { VGT: d1Vec(nl0.cfg.quad.d1.VGT!), GDX: d1Vec(nl0.cfg.quad.d1.GDX!) }, growth: { VGT: growthSummary(nl0.cfg.quad.g.VGT!) } },
    d1Keys,
    paths: out,
    pooledByFold: pooledCorr,
    finished: new Date().toISOString()
  },
  'D5 selection'
);
console.log(JSON.stringify(pooledCorr));
