// Stage B analysis (PROTOCOL.md §1, §9, §10) — NO evaluation: reads the sealed records only and writes
// results/analysis/ (summary.json, TABLES.md, CSV tables). The decision statistic itself is sealed in each selection
// record (stats.ts primaryOf at selection time); this tool recomputes it from the sealed pairs and refuses to continue if
// the two differ. Everything else here is report-only. Run: GPU_POLICY_PURPOSE=diagnostic npm run vg-l0reb-tools -- all
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { wilson } from '../../src/vg-d1-growth-diagnostic/risk.ts';
import { type ArmKey, type CutoffKey, armKeys, arms, cutoffKeys, cutoffs, margins, repoRoot, resultsDir } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { intervalFile, selectionFile } from '../../src/vg-l0-risk-envelope-stage-b/doors.ts';
import { qualificationFile, reproFile, searchFile, e2File } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { type Pair, type Primary, intervalDdOf, intervalNetOf, outcomeLabel, pooledLabel, primaryOf, summarize } from '../../src/vg-l0-risk-envelope-stage-b/stats.ts';
import type { Evidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import type { LaneValue } from '../../src/vg-l0-risk-envelope-stage-b/select.ts';
import { isSealed, readJson } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { purposeOf, writeJson } from './common.ts';

purposeOf(['diagnostic']);

const out = path.join(resultsDir, 'analysis');
const r0 = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : Math.round(x).toLocaleString('en-US'));
const usd = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? '—' : `${x < 0 ? '−' : ''}$${Math.round(Math.abs(x)).toLocaleString('en-US')}`);
const pct = (x: number) => `${(100 * x).toFixed(1)} %`;
const csv = (file: string, rows: Record<string, unknown>[]) => {
  if (!rows.length) return;

  const keys = Object.keys(rows[0]!);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);

    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${keys.join(',')}\n${rows.map((r) => keys.map((k) => esc(r[k])).join(',')).join('\n')}\n`);
};

interface Selection {
  laneValues: Record<ArmKey, LaneValue[]>;
  pairs: Pair[];
  primary: Primary;
  pooled: { arms: Record<ArmKey, { primaries: Record<string, string | null>; members: number; qualified: number; ra1OriginalEqualsAdapted: boolean | null; rankings: Record<string, unknown[]> }>; p0CentreNet: Record<ArmKey, number | null>; delta: number | null };
  subjects: { label: string; id: string; roles: { arm: ArmKey; kind: string; lane?: string; selector?: string }[] }[];
  benchmarks: { label: string; id: string; arms: Record<ArmKey, boolean> }[];
}
interface IntervalRow {
  label: string;
  id: string;
  kind: string;
  roles: { arm: ArmKey; kind: string; lane?: string; selector?: string }[];
  sliceNet: number;
  sliceDd: number;
  wholeNet: number;
  wholeDd: number;
  wholeEnvelope: { principalLossLiquidation: number; bankedDdLiquidation: number };
  wholeAssessment: Record<ArmKey, boolean>;
  nextInterval: { lots: number; maxPrincipalLossMarked: number; worstRealized: number | null };
  neighbourhood: { medianSliceDd: number; worstSliceDd: number; above35pctC0: { breaches: number; share: number }; above40pctC0: { breaches: number; share: number }; draws: number };
  stresses: Record<string, { sliceNet: number; sliceDd: number }>;
}

const evOf = (q: { evidence: Evidence[] }) => new Map(q.evidence.map((e) => [e.id, e]));

// the per-member risk view used in every table (centre and confirmation; both bases)
const riskOf = (e: Evidence) => ({
  centreNet: e.centre.net,
  centreDd: e.centre.dd,
  plLiq: e.envelope.centre.principalLossLiquidation,
  plMarked: e.envelope.centre.principalLossMarked,
  bdLiq: e.envelope.centre.bankedDdLiquidation,
  bdMarked: e.envelope.centre.bankedDdMarked,
  confirmP10Net: e.envelope.confirmP10Unrounded,
  confirmP90Dd: e.envelope.confirm.markedDd.p90,
  confirmP95Dd: e.envelope.confirm.markedDd.p95,
  confirmWorstDd: e.envelope.confirm.markedDd.worst,
  confirmWorst10Dd: e.envelope.confirm.markedDd.worst10Mean,
  confirmP90PlLiq: e.envelope.confirm.principalLoss.liquidation.p90,
  confirmWorstPlLiq: e.envelope.confirm.principalLoss.liquidation.worst,
  confirmP90BdLiq: e.envelope.confirm.bankedDd.liquidation.p90,
  confirmWorstBdLiq: e.envelope.confirm.bankedDd.liquidation.worst,
  confirmP90BdMarked: e.envelope.confirm.bankedDd.marked.p90,
  selectRobust: e.select.robust,
  selectP90Dd: e.select.p90Dd,
  occupancy: e.risk.occupancy,
  lots: e.centre.lots,
  breach: e.envelope.confirmBreach
});
const riskKeys = ['centreDd', 'plLiq', 'plMarked', 'bdLiq', 'bdMarked', 'confirmP10Net', 'confirmP90Dd', 'confirmP95Dd', 'confirmWorstDd', 'confirmWorst10Dd', 'confirmP90PlLiq', 'confirmWorstPlLiq', 'confirmP90BdLiq', 'confirmWorstBdLiq', 'confirmP90BdMarked', 'selectRobust', 'selectP90Dd', 'occupancy', 'lots'] as const;

const analyseCutoff = (cut: CutoffKey) => {
  if (!isSealed(selectionFile(cut))) return null;

  const sel = readJson<Selection>(selectionFile(cut));
  const q = readJson<{ evidence: Evidence[]; requested: number; members: number; compute: Record<string, unknown> }>(qualificationFile(cut));
  const s = readJson<{ lanes: Record<ArmKey, { key: string; structure: string; replicate: number; requested: number; islands: unknown[]; extension: { islands: number; stop: string }; failure: { screenPlausible: number }; shortlist: unknown[]; r3: { feasible: boolean }[]; ledgers: { centres: number; feasible: number }; counts: Record<string, number> }[]>; requested: number; requestedByArm: Record<ArmKey, number>; compute: { fresh: number; archiveHits: number; wallSeconds: number }; extensionRounds: unknown[] }>(searchFile(cut));
  const ev = evOf(q);

  // 1. the primary statistic, recomputed from the sealed pairs (must equal the sealed value)
  const re = primaryOf(cut, sel.pairs);
  const sealedSha = createHash('sha256').update(JSON.stringify(sel.primary)).digest('hex');
  const reSha = createHash('sha256').update(JSON.stringify(re)).digest('hex');

  if (sealedSha !== reSha) throw new Error(`${cut}: the recomputed primary statistic differs from the sealed one`);

  // 2. pooled
  const pooled = { delta: sel.pooled.delta, label: pooledLabel(sel.pooled.delta), p0CentreNet: sel.pooled.p0CentreNet, primaries: Object.fromEntries(armKeys.map((a) => [a, sel.pooled.arms[a].primaries])) as Record<ArmKey, Record<string, string | null>>, ra1OriginalEqualsAdapted: sel.pooled.arms.EXP30.ra1OriginalEqualsAdapted, members: Object.fromEntries(armKeys.map((a) => [a, { members: sel.pooled.arms[a].members, qualified: sel.pooled.arms[a].qualified }])) };

  // 3. lane rows (seed level)
  const laneRows = sel.pairs.map((p) => {
    const lv = (a: ArmKey) => sel.laneValues[a].find((v) => v.cell === p.cell && v.replicate === p.replicate)!;
    const sl = (a: ArmKey) => s.lanes[a].find((l) => l.structure === p.cell && l.replicate === p.replicate)!;
    const row: Record<string, unknown> = { cutoff: cut, cell: p.cell, replicate: p.replicate, D: p.d };

    for (const a of armKeys) {
      const v = lv(a);
      const l = sl(a);
      const rep = v.representative ? ev.get(v.representative.id)! : null;

      Object.assign(row, {
        [`${a}_V`]: v.value,
        [`${a}_qualified`]: `${v.qualified}/${v.shortlisted}`,
        [`${a}_representative`]: v.representative?.label ?? null,
        [`${a}_requested`]: l.requested,
        [`${a}_islands`]: l.extension.islands,
        [`${a}_stop`]: l.extension.stop,
        [`${a}_screenPlausible`]: l.failure.screenPlausible,
        [`${a}_r3Feasible`]: l.r3.filter((x) => x.feasible).length,
        [`${a}_centreDd`]: rep?.centre.dd ?? null,
        [`${a}_plLiq`]: rep?.envelope.centre.principalLossLiquidation ?? null,
        [`${a}_bdLiq`]: rep?.envelope.centre.bankedDdLiquidation ?? null,
        [`${a}_confirmP90Dd`]: rep?.envelope.confirm.markedDd.p90 ?? null,
        [`${a}_confirmP90BdLiq`]: rep?.envelope.confirm.bankedDd.liquidation.p90 ?? null,
        [`${a}_occupancy`]: rep?.risk.occupancy ?? null
      });
    }
    return row;
  });

  // 4. paired risk differences of the representatives (pairs where both lanes have one)
  const both = sel.pairs.filter((p) => !p.zeroLane);
  const repOf = (a: ArmKey, p: Pair) => ev.get(sel.laneValues[a].find((v) => v.cell === p.cell && v.replicate === p.replicate)!.representative!.id)!;
  const riskDiff = Object.fromEntries(
    riskKeys.map((k) => {
      const ps: Pair[] = both.map((p) => {
        const c = riskOf(repOf('CTRL', p))[k] as number;
        const x = riskOf(repOf('EXP30', p))[k] as number;

        return { ...p, ctrl: c, exp: x, d: x - c };
      });

      return [k, ps.length ? { ...summarize(ps, (p) => p.d, 0.1, ['risk', k, cut]), ctrlMean: ps.reduce((a, p) => a + p.ctrl, 0) / ps.length, expMean: ps.reduce((a, p) => a + p.exp, 0) / ps.length } : null];
    })
  );

  // 5. per-arm distributions of the representatives
  const dist = (xs: number[]) => {
    const v = [...xs].sort((a, b) => a - b);
    const qn = (p: number) => (v.length ? v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))]! : NaN);

    return { n: v.length, min: v[0] ?? NaN, p25: qn(0.25), median: qn(0.5), p75: qn(0.75), max: v.at(-1) ?? NaN, mean: v.length ? v.reduce((a, x) => a + x, 0) / v.length : NaN };
  };
  const armDist = Object.fromEntries(
    armKeys.map((a) => {
      const reps = sel.laneValues[a].filter((v) => v.representative).map((v) => riskOf(ev.get(v.representative!.id)!));

      return [
        a,
        {
          V: dist(sel.laneValues[a].map((v) => v.value)),
          lanesWithoutQualified: sel.laneValues[a].filter((v) => v.qualified === 0).length,
          qualifiedShare: { qualified: sel.laneValues[a].reduce((x, v) => x + v.qualified, 0), shortlisted: sel.laneValues[a].reduce((x, v) => x + v.shortlisted, 0) },
          ...Object.fromEntries(riskKeys.map((k) => [k, dist(reps.map((r) => r[k] as number))]))
        }
      ];
    })
  );

  // 6. the common-candidate counterfactual (every union member under both policies)
  const members = q.evidence.filter((e) => e.shortlistedBy.some((b) => b.arm !== 'benchmark'));
  const overlap = { both: 0, ctrlOnly: 0, exp30Only: 0, neither: 0 };
  const reasons: Record<ArmKey, Record<string, number>> = { CTRL: {}, EXP30: {} };
  let offset = 0;
  let admitted = 0;

  for (const e of members) {
    const c = e.arms.CTRL.qualified;
    const x = e.arms.EXP30.qualified;

    overlap[c ? (x ? 'both' : 'ctrlOnly') : x ? 'exp30Only' : 'neither']++;
    for (const a of armKeys) for (const r of e.arms[a].reasons) reasons[a][r] = (reasons[a][r] ?? 0) + 1;
    // DD in ($35k, $40k] at the centre: admitted by P3's DD gate; offset when a PL / BD gate then fails
    if (e.centre.dd > arms.CTRL.markedDdLimit && e.centre.dd <= arms.EXP30.markedDdLimit) {
      admitted++;
      if (e.arms.EXP30.reasons.some((r) => / (PL|BD) > limit/.test(r))) offset++;
    }
  }

  const memberRows = q.evidence.map((e) => ({
    cutoff: cut,
    label: e.label,
    id: e.id,
    shortlistedBy: e.shortlistedBy.map((b) => b.label).join(' | '),
    cell: e.cell,
    CTRL_qualified: e.arms.CTRL.qualified,
    CTRL_reasons: e.arms.CTRL.reasons.join('; '),
    EXP30_qualified: e.arms.EXP30.qualified,
    EXP30_reasons: e.arms.EXP30.reasons.join('; '),
    ...Object.fromEntries(Object.entries(riskOf(e)).filter(([k]) => k !== 'breach')),
    breach_dd35: e.envelope.confirmBreach.markedDd35,
    breach_dd40: e.envelope.confirmBreach.markedDd40,
    breach_pl25: e.envelope.confirmBreach.pl25,
    breach_bd25: e.envelope.confirmBreach.bd25,
    breach_bd30: e.envelope.confirmBreach.bd30,
    confirmN: e.envelope.confirmBreach.n
  }));

  // 7. the intervals (T1, T2, T3; retrospective)
  let intervals: Record<string, unknown> | null = null;

  if (isSealed(intervalFile(cut))) {
    const iv = readJson<{ rows: IntervalRow[]; requested: number; compute: Record<string, unknown> }>(intervalFile(cut));
    const byId = new Map(iv.rows.map((r) => [r.id, r]));
    const lanePair = (f: (r: IntervalRow) => number): Pair[] =>
      sel.pairs.map((p) => {
        const val = (a: ArmKey) => {
          const v = sel.laneValues[a].find((x) => x.cell === p.cell && x.replicate === p.replicate)!;

          return v.representative ? f(byId.get(v.representative.id)!) : 0; // no qualified member: no position
        };
        const c = val('CTRL');
        const x = val('EXP30');

        return { ...p, ctrl: c, exp: x, d: x - c };
      });
    const p0 = (a: ArmKey) => {
      const label = sel.pooled.arms[a].primaries.P0;
      const subj = label ? sel.subjects.find((x) => x.roles.some((r) => r.arm === a && r.kind === 'pooled' && r.selector === 'P0')) : null;

      return subj ? byId.get(subj.id)! : null;
    };
    const t1c = p0('CTRL');
    const t1e = p0('EXP30');

    intervals = {
      interval: cutoffs[cut].slice,
      T1: t1c && t1e ? { ctrl: { label: t1c.label, sliceNet: t1c.sliceNet, sliceDd: t1c.sliceDd }, exp30: { label: t1e.label, sliceNet: t1e.sliceNet, sliceDd: t1e.sliceDd }, holds: t1e.sliceDd <= t1c.sliceDd + margins.intervalDd } : null,
      T2: intervalDdOf(cut, lanePair((r) => r.sliceDd)),
      T3: intervalNetOf(cut, lanePair((r) => r.sliceNet)),
      laneIntervalRows: lanePair((r) => r.sliceNet).map((p, i) => ({ cutoff: cut, cell: p.cell, replicate: p.replicate, ctrlSliceNet: p.ctrl, exp30SliceNet: p.exp, dNet: p.d, ctrlSliceDd: lanePair((r) => r.sliceDd)[i]!.ctrl, exp30SliceDd: lanePair((r) => r.sliceDd)[i]!.exp })),
      rows: iv.rows.map((r) => ({
        cutoff: cut,
        label: r.label,
        id: r.id,
        kind: r.kind,
        roles: r.roles.map((x) => `${x.arm}:${x.kind === 'lane' ? x.lane : x.selector}`).join(' | '),
        sliceNet: r.sliceNet,
        sliceDd: r.sliceDd,
        wholeNet: r.wholeNet,
        wholeDd: r.wholeDd,
        wholePlLiq: r.wholeEnvelope.principalLossLiquidation,
        wholeBdLiq: r.wholeEnvelope.bankedDdLiquidation,
        wholePassesCTRL: r.wholeAssessment.CTRL,
        wholePassesEXP30: r.wholeAssessment.EXP30,
        nextLots: r.nextInterval.lots,
        nextMaxPlMarked: r.nextInterval.maxPrincipalLossMarked,
        nbMedianSliceDd: r.neighbourhood.medianSliceDd,
        nbWorstSliceDd: r.neighbourhood.worstSliceDd,
        nbAbove35: `${r.neighbourhood.above35pctC0.breaches}/${r.neighbourhood.draws}`,
        nbAbove35Wilson: wilson(r.neighbourhood.above35pctC0.breaches, r.neighbourhood.draws),
        sliceNet20bps: r.stresses['cost 20 bps']?.sliceNet ?? null
      })),
      requested: iv.requested,
      compute: iv.compute
    };
  }

  const compute = {
    repro: isSealed(reproFile(cut)) ? readJson<{ requested: number; compute: unknown }>(reproFile(cut)) : null,
    e2: isSealed(e2File(cut)) ? readJson<{ identical: boolean }>(e2File(cut)).identical : null,
    search: { requested: s.requested, requestedByArm: s.requestedByArm, fresh: s.compute.fresh, archiveHits: s.compute.archiveHits, wallSeconds: s.compute.wallSeconds, extensionRounds: s.extensionRounds.length },
    qualification: { members: q.members, requested: q.requested, compute: q.compute }
  };

  return {
    cutoff: cut,
    role: cutoffs[cut].role,
    primary: re,
    pooled,
    armDist,
    riskDiff,
    counterfactual: { members: members.length, overlap, reasons, ddAdmittedBetween35and40: admitted, offsetByPlOrBd: offset },
    intervals,
    compute: { ...compute, repro: compute.repro ? { requested: compute.repro.requested, compute: compute.repro.compute } : null },
    laneRows,
    memberRows
  };
};

const tables = (res: NonNullable<ReturnType<typeof analyseCutoff>>[], label: ReturnType<typeof outcomeLabel>) => {
  const L: string[] = [];

  L.push('# Stage B — generated tables (tools/vg-l0-risk-envelope-stage-b/analyze.ts; from the sealed records only)', '');
  L.push(`**Precommitted outcome label: ${label.label}** — ${label.detail}`, '');
  L.push('## 1. The paired lane statistic D = V(EXP-30) − V(CTRL) (PROTOCOL.md §1)', '');
  L.push('| Cutoff | Role | Pairs | Mean D | L90 (stratified bootstrap) | 80 % interval | NI (L90 > −$5,000) | Superiority (mean > $2,500 ∧ L90 > 0) | D > 0 / = 0 / < 0 | V = $0 lanes (CTRL / EXP-30) |');
  L.push('|---|---|---:|---:|---:|---|---|---|---|---|');
  for (const r of res) {
    const p = r.primary;

    L.push(`| ${r.cutoff} | ${r.role} | ${p.n} | ${usd(p.mean)} | ${usd(p.l90)} | ${usd(p.ci80[0])} … ${usd(p.ci80[1])} | ${p.nonInferior ? 'yes' : 'no'} | ${p.superior ? 'yes' : 'no'} | ${p.signs.positive} / ${p.signs.zero} / ${p.signs.negative} | ${p.zeroLanes.ctrl} / ${p.zeroLanes.exp} |`);
  }
  L.push('', 'Sensitivity (report-only):', '');
  L.push('| Cutoff | Unstratified L90 | t L90 | Mean D GA0.VA0 | Mean D GB0.VD1 | Without V = $0 pairs: n / mean / L90 |');
  L.push('|---|---:|---:|---:|---:|---|');
  for (const r of res) {
    const p = r.primary;
    const w = p.sensitivity.withoutZeroLanePairs;

    L.push(`| ${r.cutoff} | ${usd(p.sensitivity.unstratifiedBound)} | ${usd(p.sensitivity.tBound)} | ${usd(p.perCell['GA0.VA0']?.mean)} | ${usd(p.perCell['GB0.VD1']?.mean)} | ${w.n} / ${usd(w.mean)} / ${usd(w.bound)} |`);
  }
  L.push('', '## 2. Per-arm distributions of the lane value V and of the representatives', '');
  L.push('| Cutoff | Arm | V min | V median | V mean | V max | Lanes w/o qualified | Qualified / shortlisted | Rep. centre DD median | Rep. PL (liq) median | Rep. BD (liq) median | Rep. conf. p90 DD median | Rep. conf. p90 BD (liq) median | Rep. occupancy median |');
  L.push('|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|');
  for (const r of res)
    for (const a of armKeys) {
      const d = r.armDist[a] as unknown as Record<string, { median: number; mean: number; min: number; max: number }> & { lanesWithoutQualified: number; qualifiedShare: { qualified: number; shortlisted: number } };

      L.push(
        `| ${r.cutoff} | ${a} | ${usd(d.V!.min)} | ${usd(d.V!.median)} | ${usd(d.V!.mean)} | ${usd(d.V!.max)} | ${d.lanesWithoutQualified} | ${d.qualifiedShare.qualified} / ${d.qualifiedShare.shortlisted} | ${usd(d.centreDd!.median)} | ${usd(d.plLiq!.median)} | ${usd(d.bdLiq!.median)} | ${usd(d.confirmP90Dd!.median)} | ${usd(d.confirmP90BdLiq!.median)} | ${pct(d.occupancy!.median)} |`
      );
    }
  L.push('', '## 3. Paired risk differences of the representatives (EXP-30 − CTRL; pairs where both lanes have one; report-only)', '');
  L.push('| Cutoff | Metric | n | CTRL mean | EXP-30 mean | Mean diff | 80 % interval |');
  L.push('|---|---|---:|---:|---:|---:|---|');
  for (const r of res)
    for (const k of riskKeys) {
      const d = r.riskDiff[k] as (ReturnType<typeof summarize> & { ctrlMean: number; expMean: number }) | null;

      if (!d) continue;
      L.push(`| ${r.cutoff} | ${k} | ${d.n} | ${k === 'occupancy' ? pct(d.ctrlMean) : r0(d.ctrlMean)} | ${k === 'occupancy' ? pct(d.expMean) : r0(d.expMean)} | ${k === 'occupancy' ? pct(d.mean) : r0(d.mean)} | ${k === 'occupancy' ? `${pct(d.ci80[0])} … ${pct(d.ci80[1])}` : `${r0(d.ci80[0])} … ${r0(d.ci80[1])}`} |`);
    }
  L.push('', '## 4. Pooled-shortlist statistic (the pilot’s Δ; $2,500 margin; reported beside D, never in its place)', '');
  L.push('| Cutoff | CTRL P0 primary | centre net | EXP-30 P0 primary | centre net | Δ | Label | CTRL RA1 | EXP-30 RA1 | EXP-30 RA1-adapted (descriptive) | RA1 = adapted |');
  L.push('|---|---|---:|---|---:|---:|---|---|---|---|---|');
  for (const r of res) {
    const p = r.pooled;

    L.push(`| ${r.cutoff} | ${p.primaries.CTRL.P0 ?? '—'} | ${usd(p.p0CentreNet.CTRL)} | ${p.primaries.EXP30.P0 ?? '—'} | ${usd(p.p0CentreNet.EXP30)} | ${usd(p.delta)} | ${p.label} | ${p.primaries.CTRL['RA1-original'] ?? '—'} | ${p.primaries.EXP30['RA1-original'] ?? '—'} | ${p.primaries.EXP30['RA1-adapted'] ?? '—'} | ${p.ra1OriginalEqualsAdapted} |`);
  }
  L.push('', '## 5. Common-candidate counterfactual (every union member under both policies)', '');
  L.push('| Cutoff | Members | Both qualify | CTRL-only | EXP-30-only | Neither | Centre DD in ($35k, $40k] | … of which offset by PL / BD |');
  L.push('|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const r of res) {
    const c = r.counterfactual;

    L.push(`| ${r.cutoff} | ${c.members} | ${c.overlap.both} | ${c.overlap.ctrlOnly} | ${c.overlap.exp30Only} | ${c.overlap.neither} | ${c.ddAdmittedBetween35and40} | ${c.offsetByPlOrBd} |`);
  }
  L.push('', 'Failure reasons (counts over union members; a member can have several):', '');
  for (const r of res) for (const a of armKeys) L.push(`- ${r.cutoff} ${a}: ${Object.entries(r.counterfactual.reasons[a]).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${v}`).join('; ') || 'none'}`);
  L.push('', '## 6. Retrospective next intervals (previously inspected history; descriptive)', '');
  L.push('| Cutoff → interval | T1: CTRL P0 interval net / DD | EXP-30 P0 interval net / DD | T1 holds (DD ≤ CTRL + $5,000) | T2: mean paired interval DD diff | U90 | T2 holds (U90 < $5,000) | T3: mean paired interval net diff | 80 % interval |');
  L.push('|---|---|---|---|---:|---:|---|---:|---|');
  for (const r of res) {
    const i = r.intervals as { interval: string[]; T1: { ctrl: { sliceNet: number; sliceDd: number }; exp30: { sliceNet: number; sliceDd: number }; holds: boolean } | null; T2: { mean: number; u90: number; nonInferior: boolean }; T3: { mean: number; ci80: number[] } } | null;

    if (!i) {
      L.push(`| ${r.cutoff} | not evaluated | | | | | | | |`);
      continue;
    }
    L.push(
      `| ${r.cutoff} → ${i.interval.join('…')} | ${i.T1 ? `${usd(i.T1.ctrl.sliceNet)} / ${usd(i.T1.ctrl.sliceDd)}` : '—'} | ${i.T1 ? `${usd(i.T1.exp30.sliceNet)} / ${usd(i.T1.exp30.sliceDd)}` : '—'} | ${i.T1 ? (i.T1.holds ? 'yes' : 'no') : '—'} | ${usd(i.T2.mean)} | ${usd(i.T2.u90)} | ${i.T2.nonInferior ? 'yes' : 'no'} | ${usd(i.T3.mean)} | ${usd(i.T3.ci80[0])} … ${usd(i.T3.ci80[1])} |`
    );
  }
  L.push('', '## 7. Compute accounting (requested includes archive hits)', '');
  L.push('| Cutoff | E2 identical | Repro requested | Search requested (CTRL / EXP-30) | Fresh | Archive hits | Search wall | Qualification members / requested | Interval requested |');
  L.push('|---|---|---:|---|---:|---:|---:|---|---:|');
  for (const r of res) {
    const c = r.compute;

    L.push(`| ${r.cutoff} | ${c.e2} | ${r0(c.repro?.requested)} | ${r0(c.search.requested)} (${r0(c.search.requestedByArm.CTRL)} / ${r0(c.search.requestedByArm.EXP30)}) | ${r0(c.search.fresh)} | ${r0(c.search.archiveHits)} | ${(c.search.wallSeconds / 60).toFixed(1)} min | ${c.qualification.members} / ${r0(c.qualification.requested)} | ${r0((r.intervals as { requested?: number } | null)?.requested)} |`);
  }
  return `${L.join('\n')}\n`;
};

const all = () => {
  const res = cutoffKeys.map(analyseCutoff).filter((x): x is NonNullable<typeof x> => x !== null);
  const get = (c: CutoffKey) => res.find((r) => r.cutoff === c)?.primary ?? null;
  const label = outcomeLabel({ C21: get('C21'), C24: get('C24') });
  const summary = {
    kind: 'Stage B analysis summary (report; the decision statistic is sealed in each selection record)',
    t: new Date().toISOString(),
    outcome: label,
    secondaryC19: get('C19') ? { nonInferior: get('C19')!.nonInferior, superior: get('C19')!.superior, mean: get('C19')!.mean, l90: get('C19')!.l90 } : null,
    cutoffs: res.map(({ laneRows: _l, memberRows: _m, ...r }) => ({ ...r, intervals: r.intervals ? { ...r.intervals, rows: undefined, laneIntervalRows: undefined } : null })),
    sources: cutoffKeys.flatMap((c) => [selectionFile(c), qualificationFile(c), searchFile(c), intervalFile(c)].filter((f) => fs.existsSync(f)).map((f) => ({ file: path.relative(repoRoot, f), sha256: createHash('sha256').update(fs.readFileSync(f)).digest('hex') })))
  };

  writeJson(path.join(out, 'summary.json'), summary);
  fs.writeFileSync(path.join(out, 'TABLES.md'), tables(res, label));
  for (const r of res) {
    csv(path.join(out, `pairs-${r.cutoff}.csv`), r.laneRows);
    csv(path.join(out, `members-${r.cutoff}.csv`), r.memberRows);
    if (r.intervals) {
      csv(path.join(out, `interval-subjects-${r.cutoff}.csv`), (r.intervals as { rows: Record<string, unknown>[] }).rows);
      csv(path.join(out, `interval-pairs-${r.cutoff}.csv`), (r.intervals as { laneIntervalRows: Record<string, unknown>[] }).laneIntervalRows);
    }
  }
  console.log(JSON.stringify({ outcome: label, cutoffs: res.map((r) => ({ cutoff: r.cutoff, mean: r.primary.mean, l90: r.primary.l90, ni: r.primary.nonInferior, sup: r.primary.superior })) }));
};

const cmd = process.argv[2] ?? 'all';

if (cmd === 'all') all();
else {
  console.error('usage: analyze.ts all');
  process.exit(2);
}
