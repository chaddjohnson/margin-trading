// RES-A 1.0.0 stage S2 — the policy comparison of the Stage A audit (PROTOCOL.md §4 A1–A7), computed from the archive
// replays (population-<cut>, qualification-<cut>), the sealed pilot records and the bounded CPU replays (G1, G2). It
// evaluates nothing. Every verdict comes from the pilot's own code with the policy substituted (fitness.ts plausibleArm /
// violationArm through population.ts; qualify.ts verdictOf here) and src/risk-envelope/policy.ts assess.
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/vg-l0-risk-envelope-sensitivity/analyze.ts
// Outputs: research/vg-l0-risk-envelope-sensitivity/results/{analysis-C21.json, analysis-C24.json, summary.json,
//          centres-C2x.csv.gz, rungs-C2x.csv.gz, qualification-C2x.csv, neighbourhood-C2x.csv, extended-C2x.csv, …}
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { assess, limitOf, type RiskEnvelopePolicy } from '../../src/risk-envelope/policy.ts';
import { quantile } from '../../src/vg-d1-growth-joint/fitness.ts';
import { originalOrder, ra1Order } from '../../src/vg-l0-risk-families/select.ts';
import type { Evidence as A2Evidence } from '../../src/vg-l0-risk-families/qualify.ts';
import { type CutoffKey, cutoffs } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { envNbStats, plausibleArm } from '../../src/vg-l0-risk-envelope-pilot/fitness.ts';
import { type ArmVerdict, type Evidence, verdictOf } from '../../src/vg-l0-risk-envelope-pilot/qualify.ts';
import { ra1OrderWith } from '../../src/vg-l0-risk-envelope-pilot/select.ts';
import { qualificationFile } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { selectionFile } from '../../src/vg-l0-risk-envelope-pilot/doors.ts';
import { plain, readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import { cacheRoot, pilotResults, purposeOf, readJson, readJsonGz, resultsDir, utc, writeCsv, writeJson } from './common.ts';
import { type PolicyKey, arms, limits, policies, policyKeys, policyTable, primaryKeys } from './policies.ts';

purposeOf(['diagnostic']);

const C0 = 100_000;
const cutKeys: CutoffKey[] = ['C21', 'C24'];
const r0 = (x: number) => Math.round(x);
const r2 = (x: number) => Math.round(x * 100) / 100;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 10000) / 100 : null);
const wilson = (k: number, n: number) => {
  if (!n) return null;

  const z = 1.959963984540054;
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;

  return [Math.max(0, r2((c - h) * 100)), Math.min(100, r2((c + h) * 100))];
};
const dist = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);

  if (!s.length) return { n: 0, max: null, p90: null, median: null, top10Mean: null };
  return {
    n: s.length,
    max: r2(s.at(-1)!),
    p90: r2(quantile(s, 0.9)),
    median: r2(quantile(s, 0.5)),
    top10Mean: r2(s.slice(-10).reduce((a, x) => a + x, 0) / Math.min(10, s.length))
  };
};

// ----------------------------------------------------------------------------------------------- types
type Env = { bankedDdMarked: number; bankedDdLiquidation: number; principalLossMarked: number; principalLossLiquidation: number };
type CRec = { error: string | null; net: number; dd: number; lots: number; mixed: boolean; famLots: { D1: number; G: number }; signature: string; sessionsHeld: number; sessions: number; partials: number; envelope: Env | null };
type Centre = { id: string; cfg: { cell: string }; cell: string; growthBounded: boolean; sources: string[]; stageTags: string[]; rec: CRec };
type RungRow = { id: string; rung: string; n: number; unique: number; failed: number; by: string[]; robust: number; p10: number; median: number; p90DdCents: number; env: ReturnType<typeof envNbStats>; breach: Record<string, number>; feasible: Record<PolicyKey, boolean>; violation: Record<PolicyKey, number> };
type Pop = { cutoff: string; centres: Centre[]; rungs: RungRow[]; replay: unknown; requests: unknown; compute: unknown; archivedRows: number; archive: unknown; seconds: number };
type Draw = { error?: string; net: number; dd: number; plL: number; plM: number; bdL: number; bdM: number; lots: number; signature: string; mixed: boolean };
type QDraws = { members: { id: string; label: string; confirm: { drawn: number; unique: number; draws: Draw[] }; select: { drawn: number; unique: number; draws: Draw[] } }[]; reproduction: unknown; compute: unknown };

// ----------------------------------------------------------------------------------------------- helpers
const metricLabel = { markedDd: 'DD', principalLoss: 'PL', bankedDd: 'BD' } as const;
const inScope = (c: Centre) => !c.rec.error && c.rec.net > 0 && c.rec.mixed && c.rec.envelope !== null;
const passOf = (c: Centre, k: PolicyKey) => plausibleArm(c.rec as never, arms[k]);
const failingOf = (c: Centre, k: PolicyKey) => {
  const a = assess(c.rec as never, policies[k]);

  return a.checks.filter((x) => x.pass === false).map((x) => ({ metric: metricLabel[x.metric], excess: x.value - x.limit! }));
};
const bindingOf = (c: Centre, k: PolicyKey) => {
  const a = assess(c.rec as never, policies[k]);
  const gated = a.checks.filter((x) => x.pass !== null);
  const failing = gated.filter((x) => x.pass === false);

  if (failing.length) {
    const b = failing.reduce((p, x) => (x.value - x.limit! > p.value - p.limit! ? x : p));

    return { status: 'fail', metric: metricLabel[b.metric], dollars: r2(b.value - b.limit!), pctC0: r2(((b.value - b.limit!) / C0) * 100), failing: failing.map((x) => metricLabel[x.metric]).join('+') };
  }

  const b = gated.reduce((p, x) => (x.limit! - x.value < p.limit! - p.value ? x : p));

  return { status: 'pass', metric: metricLabel[b.metric], dollars: r2(b.limit! - b.value), pctC0: r2(((b.limit! - b.value) / C0) * 100), failing: '' };
};
const armsOf = (c: Centre) => [...new Set(c.sources.map((s) => s.split('|')[0]!))].sort();
const originOf = (c: Centre) => {
  const a = armsOf(c);

  return a.length === 2 ? 'both' : `${a[0]}-only`;
};
const lanesOf = (c: Centre) => [...new Set(c.sources.map((s) => s.split('|')[1]!))].sort();
const repsOf = (c: Centre) => [...new Set(lanesOf(c).map((l) => l.split('/').at(-1)!))].sort();
const stageRank: Record<string, number> = { screen: 0, 'r1-promoted-screen': 1, 'r1-island': 1, 'refine-move': 2, r2: 3, 'refine-start': 4, r3: 4, 'r3-endpoint': 4 };
const stageNames = ['screen only', 'rung 1', 'refinement move', 'rung 2', 'rung 3 / endpoint', 'shortlist'];
const highestStage = (c: Centre) => {
  let h = Math.max(...c.sources.map((s) => stageRank[s.split('|')[2]!] ?? 0));

  if (c.stageTags.some((t) => t.includes('|shortlist'))) h = 5;
  return stageNames[h]!;
};
const markedTwin = (p: RiskEnvelopePolicy): RiskEnvelopePolicy => ({
  ...p,
  id: `${p.id}-marked`,
  principalLoss: p.principalLoss && { ...p.principalLoss, basis: 'marked' },
  bankedDd: p.bankedDd && { ...p.bankedDd, basis: 'marked' }
});

// the evidence row of a member under a policy (the frozen selectors read `qualified`, `gates`, …)
const viewOf = (e: Evidence, v: ArmVerdict, label?: string) => ({ ...e, label: label ?? e.label, gates: v.gates, qualified: v.qualified, failed: v.failed, severity: v.severity });
const asA2 = (x: readonly unknown[]) => x as unknown as A2Evidence[];

// a verdict of the pilot's qualify.ts verdictOf from compact draws (identical inputs: the centre, the confirmation
// statistics and records, the 10 bps record, the unrounded p10)
const drawRec = (d: Draw) =>
  d.error
    ? { error: d.error, net: -C0, dd: Infinity }
    : { net: d.net, dd: d.dd, lots: d.lots, mixed: d.mixed, envelope: { bankedDdMarked: d.bdM, bankedDdLiquidation: d.bdL, principalLossMarked: d.plM, principalLossLiquidation: d.plL } };
const verdict = (k: PolicyKey, centre: unknown, confirmNb: unknown, draws: Draw[], s10: { net: number; dd: number; envelope: Env }, p10: number) =>
  verdictOf(arms[k], centre as never, { nb: confirmNb as never, recs: draws.map(drawRec) as never }, s10 as never, p10);
const unroundedP10 = (draws: Draw[]) => quantile(draws.map((d) => (d.error ? -C0 : d.net)).sort((a, b) => a - b), 0.1);

const tailStats = (draws: Draw[]) => {
  const col = (f: (d: Draw) => number) => draws.map((d) => (d.error ? Infinity : f(d))).sort((a, b) => a - b);
  const q = (xs: number[]) => {
    const k = Math.ceil(0.1 * xs.length);

    return { p50: r2(quantile(xs, 0.5)), p90: r2(quantile(xs, 0.9)), p95: r2(quantile(xs, 0.95)), worst: r2(xs.at(-1)!), worst10Mean: r2(xs.slice(xs.length - k).reduce((a, x) => a + x, 0) / k) };
  };
  const breach = (xs: number[], limit: number) => {
    const over = xs.filter((x) => x > limit);

    return {
      limit,
      count: over.length,
      n: xs.length,
      sharePct: pct(over.length, xs.length),
      wilson95Pct: wilson(over.length, xs.length),
      meanExcessAmongBreaches: over.length ? r2(over.reduce((a, x) => a + (x - limit), 0) / over.length) : 0,
      meanExcessOverAllDraws: r2(over.reduce((a, x) => a + (x - limit), 0) / xs.length),
      worstExcess: over.length ? r2(over.at(-1)! - limit) : 0
    };
  };
  const dd = col((d) => d.dd);
  const plL = col((d) => d.plL);
  const plM = col((d) => d.plM);
  const bdL = col((d) => d.bdL);
  const bdM = col((d) => d.bdM);

  return {
    n: draws.length,
    failed: draws.filter((d) => d.error).length,
    markedDd: { ...q(dd), breach35: breach(dd, 35_000), breach40: breach(dd, 40_000) },
    principalLossLiquidation: { ...q(plL), breach25: breach(plL, 25_000) },
    principalLossMarked: q(plM),
    bankedDdLiquidation: { ...q(bdL), breach25: breach(bdL, 25_000), breach30: breach(bdL, 30_000), breach35: breach(bdL, 35_000) },
    bankedDdMarked: q(bdM),
    drawFailSharePct: Object.fromEntries(policyKeys.map((k) => [k, pct(draws.filter((d) => d.error || !assess(drawRec(d) as never, policies[k]).pass).length, draws.length)]))
  };
};

// ----------------------------------------------------------------------------------------------- per cutoff
const analyse = (cut: CutoffKey) => {
  const pop = readJsonGz<Pop>(path.join(cacheRoot, `population-${cut}.json.gz`));
  const qd = readJsonGz<QDraws>(path.join(cacheRoot, `qualification-${cut}.json.gz`));
  const sealedQ = readSealed<{ evidence: Evidence[] }>(qualificationFile(cut)).evidence;
  const sealedSel = readSealed<{ arms: Record<'CTRL' | 'EXP', { primaries: Record<string, string | null>; qualified: number; members: number }> }>(selectionFile(cut));
  const census = readJson<{ disagreement: { screen: Record<string, number>; allCentres: Record<string, number> }; crossSummary: Record<string, { fits: number; feasibleOwn: number; feasibleUnderOther: number; feasibleBoth: number }>; cross: Record<string, { id: string; feasible: Record<string, boolean> }[]> }>(path.join(pilotResults, 'analysis', `census-${cut}.json`));
  const g1File = path.join(resultsDir, 'replays', `G1-${cut}.json.gz`);
  const g2File = path.join(resultsDir, 'replays', `G2-${cut}.json.gz`);
  const g1 = fs.existsSync(g1File) ? readJsonGz<{ rows: { id: string; sources: string[]; stageTags: string[]; centre: Record<string, unknown> & { net: number; dd: number; envelope: Env; mixed: boolean }; stress10: { net: number; dd: number; envelope: Env }; confirmNb: Record<string, number>; confirm: { draws: Draw[]; unique: number } }[]; compute: unknown; parity: unknown }>(g1File) : null;
  const g2 = fs.existsSync(g2File) ? readJsonGz<{ rows: { id: string; d3: Record<'marked' | 'liquidation', { dd: number; account: { unbankedGiveback: number; bankedErosion: number; capitalLoss: number; residual: number }; lot: { profitGiveback: number; principalLoss: number } | null; bankedDd: number }> }[]; compute: unknown; parity: unknown }>(g2File) : null;
  const intervalRows = readJson<{ rows: { id: string; label: string; sliceNet: number; sliceDd: number }[] }>(path.join(pilotResults, 'slices', cut === 'C21' ? 'C21-slice.json' : 'C24-validation.json')).rows;
  const intervalDiag = readJson<{ rows: { id: string; interval?: { bankedDdLiquidation: number; newLotMaxPrincipalLossLiq: number } }[] }>(path.join(pilotResults, 'diagnostics', `primaries-${cut}.json`)).rows;
  const checks: { check: string; pass: boolean; detail?: unknown }[] = [];
  const check = (name: string, ok: boolean, detail?: unknown) => {
    checks.push({ check: name, pass: ok, ...(detail === undefined ? {} : { detail }) });
    if (!ok) console.error(`CHECK FAILED ${cut}: ${name} ${JSON.stringify(detail ?? '')}`);
  };

  // ---------------- A1: reproduction of the census's centre counts (P0 = CTRL plausibility, P2 = EXP plausibility)
  const bucket = (c: Centre) => {
    const a = passOf(c, 'P0');
    const b = passOf(c, 'P2');

    return a && b ? 'both' : a ? 'CTRL-only' : b ? 'EXP-only' : 'neither';
  };
  const tallyAll = { centres: pop.centres.length, both: 0, 'CTRL-only': 0, 'EXP-only': 0, neither: 0 } as Record<string, number>;

  for (const c of pop.centres) tallyAll[bucket(c)]!++;
  check('A1 all-centre disagreement = census', ['centres', 'both', 'CTRL-only', 'EXP-only', 'neither'].every((k) => tallyAll[k] === census.disagreement.allCentres[k]), { audit: tallyAll, census: census.disagreement.allCentres });

  const screenCentres = pop.centres.filter((c) => c.sources.some((s) => s.startsWith('CTRL|') && s.endsWith('|screen')));
  const tallyScreen = { centres: screenCentres.length, both: 0, 'CTRL-only': 0, 'EXP-only': 0, neither: 0 } as Record<string, number>;

  for (const c of screenCentres) tallyScreen[bucket(c)]!++;
  check('A1 screen disagreement = census', ['centres', 'both', 'CTRL-only', 'EXP-only', 'neither'].every((k) => tallyScreen[k] === census.disagreement.screen[k]), { audit: tallyScreen, census: census.disagreement.screen });

  // rung-3 cross-assessment = census crossSummary (ids = each arm's r3 fits, refinement endpoints and shortlist)
  const rungsBy = new Map<string, RungRow[]>();

  for (const r of pop.rungs) (rungsBy.get(r.id) ?? rungsBy.set(r.id, []).get(r.id)!).push(r);

  const r3Of = (id: string) => rungsBy.get(id)?.find((r) => r.rung === 'r3') ?? null;

  for (const a of ['CTRL', 'EXP'] as const) {
    const ids = census.cross[a]!.map((x) => x.id);
    const own = a === 'CTRL' ? 'P0' : 'P2';
    const other = a === 'CTRL' ? 'P2' : 'P0';
    const rows = ids.map(r3Of);
    const got = { fits: ids.length, feasibleOwn: rows.filter((r) => r?.feasible[own]).length, feasibleUnderOther: rows.filter((r) => r?.feasible[other]).length, feasibleBoth: rows.filter((r) => r?.feasible[own] && r?.feasible[other]).length };

    check(`A1 rung-3 cross-assessment ${a} = census`, isDeepStrictEqual(got, census.crossSummary[a]), { audit: got, census: census.crossSummary[a] });
  }

  // ---------------- A2: centre level
  const scope = pop.centres.filter(inScope);
  const excluded = { error: pop.centres.filter((c) => c.rec.error).length, netNonPositive: pop.centres.filter((c) => !c.rec.error && c.rec.net <= 0).length, familyUnfunded: pop.centres.filter((c) => !c.rec.error && c.rec.net > 0 && !c.rec.mixed).length, missingEnvelope: pop.centres.filter((c) => !c.rec.error && c.rec.envelope === null).length };
  const V = new Map(scope.map((c) => [c.id, Object.fromEntries(policyKeys.map((k) => [k, passOf(c, k)])) as Record<PolicyKey, boolean>]));
  const groups: Record<string, Centre[]> = { all: scope };

  for (const c of scope) {
    (groups[`cell ${c.cell}`] ??= []).push(c);
    for (const r of repsOf(c)) (groups[`replicate ${r}`] ??= []).push(c);
    (groups[`origin ${originOf(c)}`] ??= []).push(c);
    (groups[`stage ${highestStage(c)}`] ??= []).push(c);
    (groups[`growth ${c.growthBounded ? 'bounded' : 'open-ended'}`] ??= []).push(c);
    for (const l of lanesOf(c)) for (const a of armsOf(c)) if (c.sources.some((s) => s.startsWith(`${a}|${l}|`))) (groups[`lane ${a} ${l.split('/').slice(2).join('/')}`] ??= []).push(c);
  }

  const groupRows = Object.entries(groups).map(([g, cs]) => ({
    group: g,
    centres: cs.length,
    ...Object.fromEntries(
      policyKeys.map((k) => {
        const ok = cs.filter((c) => V.get(c.id)![k]);

        return [k, { pass: ok.length, sharePct: pct(ok.length, cs.length), net: dist(ok.map((c) => c.rec.net)), atLeast200k: ok.filter((c) => c.rec.net >= 200_000).length }];
      })
    )
  }));
  const overlap = (ref: PolicyKey, set: Centre[] = scope) =>
    Object.fromEntries(
      policyKeys
        .filter((k) => k !== ref)
        .map((k) => {
          const m = { both: 0, refOnly: 0, altOnly: 0, neither: 0 };

          for (const c of set) {
            const v = V.get(c.id)!;

            m[v[ref] && v[k] ? 'both' : v[ref] ? 'refOnly' : v[k] ? 'altOnly' : 'neither']++;
          }
          return [k, m];
        })
    );
  const reasons = Object.fromEntries(
    policyKeys.map((k) => {
      const t: Record<string, number> = {};
      const binding: Record<string, { count: number; within1k: number; within2500: number; within5k: number; excess: ReturnType<typeof dist> }> = {};
      const ex: Record<string, number[]> = {};

      for (const c of scope) {
        if (V.get(c.id)![k]) continue;

        const b = bindingOf(c, k);

        t[b.failing] = (t[b.failing] ?? 0) + 1;
        (ex[b.metric] ??= []).push(b.dollars);
      }
      for (const [m, xs] of Object.entries(ex)) binding[m] = { count: xs.length, within1k: xs.filter((x) => x <= 1000).length, within2500: xs.filter((x) => x <= 2500).length, within5k: xs.filter((x) => x <= 5000).length, excess: dist(xs) };
      return [k, { combinations: t, binding }];
    })
  );
  const brief = (c: Centre) => ({
    id: c.id,
    net: r2(c.rec.net),
    dd: r2(c.rec.dd),
    plL: r2(c.rec.envelope!.principalLossLiquidation),
    bdL: r2(c.rec.envelope!.bankedDdLiquidation),
    bdM: r2(c.rec.envelope!.bankedDdMarked),
    cell: c.cell,
    origin: originOf(c),
    stage: highestStage(c),
    growth: c.growthBounded ? 'bounded' : 'open-ended',
    r3: r3Of(c.id) ? Object.fromEntries(primaryKeys.map((k) => [k, r3Of(c.id)!.feasible[k]])) : null
  });
  const setOf = (f: (v: Record<PolicyKey, boolean>) => boolean) => scope.filter((c) => f(V.get(c.id)!));
  const bdBand = (c: Centre) => {
    const b = c.rec.envelope!.bankedDdLiquidation;

    return b <= 25_000 ? '≤ 25k' : b <= 30_000 ? '(25k, 30k]' : b <= 35_000 ? '(30k, 35k]' : '> 35k';
  };
  const describe = (cs: Centre[], top = 10) => ({
    count: cs.length,
    net: dist(cs.map((c) => c.rec.net)),
    bdBands: cs.reduce<Record<string, number>>((a, c) => ((a[bdBand(c)] = (a[bdBand(c)] ?? 0) + 1), a), {}),
    plOver25k: cs.filter((c) => c.rec.envelope!.principalLossLiquidation > 25_000).length,
    bounded: cs.filter((c) => c.growthBounded).length,
    openEnded: cs.filter((c) => !c.growthBounded).length,
    byStage: cs.reduce<Record<string, number>>((a, c) => ((a[highestStage(c)] = (a[highestStage(c)] ?? 0) + 1), a), {}),
    byOrigin: cs.reduce<Record<string, number>>((a, c) => ((a[originOf(c)] = (a[originOf(c)] ?? 0) + 1), a), {}),
    top: [...cs].sort((a, b) => b.rec.net - a.rec.net).slice(0, top).map(brief)
  });
  // the G2 giveback attribution of a set (D3 marked account partition; giveback-dominated = U ≥ ½ DD)
  const d3 = new Map((g2?.rows ?? []).map((r) => [r.id, r.d3]));
  const giveback = (cs: Centre[]) => {
    const rows = cs.map((c) => d3.get(c.id)).filter((x) => x !== undefined);

    if (!g2) return { status: 'G2 not available' };
    if (rows.length !== cs.length) return { status: `G2 covers ${rows.length} of ${cs.length}` };

    const m = rows.map((r) => r.marked);
    const sum = (f: (x: (typeof m)[number]) => number) => m.reduce((a, x) => a + f(x), 0);

    return {
      centres: rows.length,
      givebackDominated: m.filter((x) => x.account.unbankedGiveback >= 0.5 * x.dd).length,
      bankedErosionDominated: m.filter((x) => x.account.bankedErosion >= 0.5 * x.dd).length,
      capitalLossDominated: m.filter((x) => x.account.capitalLoss >= 0.5 * x.dd).length,
      meanSharesPct: { unbankedGiveback: pct(sum((x) => x.account.unbankedGiveback), sum((x) => x.dd)), bankedErosion: pct(sum((x) => x.account.bankedErosion), sum((x) => x.dd)), capitalLoss: pct(sum((x) => x.account.capitalLoss), sum((x) => x.dd)) },
      lotLevel: { profitGivebackPct: pct(sum((x) => x.lot?.profitGiveback ?? 0), sum((x) => x.dd)), principalLossPct: pct(sum((x) => x.lot?.principalLoss ?? 0), sum((x) => x.dd)) }
    };
  };
  const transitions = {
    'admitted by P1 not P0 (DD 35→40 % alone)': setOf((v) => v.P1 && !v.P0),
    'excluded from P1 by BD > 25 % (P1 ∧ ¬P6)': setOf((v) => v.P1 && !v.P6),
    'excluded from P1 by BD > 30 % (P1 ∧ ¬P7)': setOf((v) => v.P1 && !v.P7),
    'excluded from P1 by BD > 35 % (P1 ∧ ¬P8)': setOf((v) => v.P1 && !v.P8),
    'excluded from P1 by PL > 25 % (P1 ∧ ¬P5)': setOf((v) => v.P1 && !v.P5),
    'rescued by BD 30 % (P3 ∧ ¬P2)': setOf((v) => v.P3 && !v.P2),
    'rescued by BD 35 % (P4 ∧ ¬P2)': setOf((v) => v.P4 && !v.P2),
    'rescued by BD 35 % over 30 % (P4 ∧ ¬P3)': setOf((v) => v.P4 && !v.P3),
    'P0 members P2 excludes (P0 ∧ ¬P2)': setOf((v) => v.P0 && !v.P2),
    'P0 members P3 excludes (P0 ∧ ¬P3)': setOf((v) => v.P0 && !v.P3),
    'P0 members P4 excludes (P0 ∧ ¬P4)': setOf((v) => v.P0 && !v.P4),
    'admitted by P3 not P0 (P3 ∧ ¬P0)': setOf((v) => v.P3 && !v.P0),
    'admitted by P4 not P0 (P4 ∧ ¬P0)': setOf((v) => v.P4 && !v.P0),
    'PL binds alone at BD 25 % (P6 ∧ ¬P2)': setOf((v) => v.P6 && !v.P2),
    'PL binds alone at BD 30 % (P7 ∧ ¬P3)': setOf((v) => v.P7 && !v.P3),
    'PL binds alone at BD 35 % (P8 ∧ ¬P4)': setOf((v) => v.P8 && !v.P4),
    'BD binds without PL at 25 % (P5 ∧ ¬P2)': setOf((v) => v.P5 && !v.P2)
  };
  const transitionOut = Object.fromEntries(Object.entries(transitions).map(([k, cs]) => [k, { ...describe(cs), giveback: giveback(cs) }]));
  // the canonical record stores `dd` (and `net`) to the cent while the envelope is full binary64: an ordering is only
  // counted as such beyond half a cent (the record's own resolution)
  const ordering = {
    ddStoredInCents: scope.every((c) => Math.abs(c.rec.dd * 100 - Math.round(c.rec.dd * 100)) < 1e-6),
    bdMarkedAboveDdRaw: scope.filter((c) => c.rec.envelope!.bankedDdMarked > c.rec.dd).length,
    bdMarkedAboveDd: scope.filter((c) => c.rec.envelope!.bankedDdMarked > c.rec.dd + 0.005).length,
    bdLiquidationAboveDd: scope.filter((c) => c.rec.envelope!.bankedDdLiquidation > c.rec.dd + 0.005).length,
    bdMarkedEqualsDdToTheCent: scope.filter((c) => Math.abs(c.rec.envelope!.bankedDdMarked - c.rec.dd) <= 0.005).length,
    // in one fixed slot BD ≥ PL by construction (H ≥ the realized level at a lot's entry): only floating-point noise remains
    plLiquidationAboveBdLiquidation: scope.filter((c) => c.rec.envelope!.principalLossLiquidation > c.rec.envelope!.bankedDdLiquidation + 1e-6).length,
    plAboveBdMaxRawDifference: Math.max(0, ...scope.map((c) => c.rec.envelope!.principalLossLiquidation - c.rec.envelope!.bankedDdLiquidation)),
    withPartials: scope.filter((c) => c.rec.partials > 0).length,
    bdMarkedAboveDdWithPartials: scope.filter((c) => c.rec.envelope!.bankedDdMarked > c.rec.dd + 0.005 && c.rec.partials > 0).length,
    examples: scope
      .filter((c) => c.rec.envelope!.bankedDdMarked > c.rec.dd + 0.005)
      .sort((a, b) => b.rec.envelope!.bankedDdMarked - b.rec.dd - (a.rec.envelope!.bankedDdMarked - a.rec.dd))
      .slice(0, 5)
      .map((c) => ({ id: c.id, net: r2(c.rec.net), dd: r2(c.rec.dd), bdM: r2(c.rec.envelope!.bankedDdMarked), bdL: r2(c.rec.envelope!.bankedDdLiquidation), partials: c.rec.partials }))
  };
  const basisDisagreement = Object.fromEntries(
    policyKeys
      .filter((k) => policies[k].principalLoss || policies[k].bankedDd)
      .map((k) => {
        const twin = markedTwin(policies[k]);
        const diff = scope.filter((c) => assess(c.rec as never, policies[k]).pass !== assess(c.rec as never, twin).pass);

        return [k, { centres: diff.length, liquidationPassMarkedFail: diff.filter((c) => assess(c.rec as never, policies[k]).pass).length, liquidationFailMarkedPass: diff.filter((c) => !assess(c.rec as never, policies[k]).pass).length }];
      })
  );
  const boundary = Object.fromEntries(
    policyKeys.map((k) => {
      const L = limits(k);

      return [k, { exactlyAtALimit: scope.filter((c) => c.rec.dd === L.dd || (L.pl !== null && c.rec.envelope!.principalLossLiquidation === L.pl) || (L.bd !== null && c.rec.envelope!.bankedDdLiquidation === L.bd)).length }];
    })
  );

  // ---------------- A3: rung neighbourhoods (search-stage feasibility under each policy)
  const scopeIds = new Set(scope.map((c) => c.id));
  const byId = new Map(pop.centres.map((c) => [c.id, c]));
  const rungSummary = Object.fromEntries(
    ['r1', 'refine', 'r2', 'r3'].map((rung) => {
      const rows = pop.rungs.filter((r) => r.rung === rung && scopeIds.has(r.id));
      const fe = (k: PolicyKey) => rows.filter((r) => r.feasible[k]);

      return [
        rung,
        {
          rows: rows.length,
          draws: rows[0]?.n ?? null,
          ...Object.fromEntries(
            policyKeys.map((k) => [
              k,
              {
                feasible: fe(k).length,
                centrePassAndFeasible: fe(k).filter((r) => V.get(r.id)![k]).length,
                bestNet: r2(Math.max(0, ...fe(k).map((r) => byId.get(r.id)!.rec.net))),
                top5: fe(k)
                  .map((r) => byId.get(r.id)!)
                  .sort((a, b) => b.rec.net - a.rec.net)
                  .slice(0, 5)
                  .map((c) => ({ ...brief(c), robust: r2(rungsBy.get(c.id)!.find((x) => x.rung === rung)!.robust) }))
              }
            ])
          ),
          overlapVsP0: (() => {
            const m: Record<string, Record<string, number>> = {};

            for (const k of policyKeys.filter((x) => x !== 'P0')) {
              m[k] = { both: 0, refOnly: 0, altOnly: 0, neither: 0 };
              for (const r of rows) m[k]![r.feasible.P0 && r.feasible[k] ? 'both' : r.feasible.P0 ? 'refOnly' : r.feasible[k] ? 'altOnly' : 'neither']!++;
            }
            return m;
          })(),
          overlapVsP2: (() => {
            const m: Record<string, Record<string, number>> = {};

            for (const k of policyKeys.filter((x) => x !== 'P2')) {
              m[k] = { both: 0, refOnly: 0, altOnly: 0, neither: 0 };
              for (const r of rows) m[k]![r.feasible.P2 && r.feasible[k] ? 'both' : r.feasible.P2 ? 'refOnly' : r.feasible[k] ? 'altOnly' : 'neither']!++;
            }
            return m;
          })()
        }
      ];
    })
  );
  // the unmeasured gap: centres fitted at rung 1 (or as refinement moves) that a policy admits at the centre but whose
  // neighbours neither arm requested (centre-first fidelity)
  const gap = Object.fromEntries(
    (['r1', 'refine'] as const).map((rung) => {
      const fitted = scope.filter((c) => c.sources.some((s) => (rung === 'r1' ? /\|r1-/.test(s) : s.endsWith('|refine-move'))));

      return [
        rung,
        Object.fromEntries(
          policyKeys.map((k) => {
            const adm = fitted.filter((c) => V.get(c.id)![k]);
            const unmeasured = adm.filter((c) => !rungsBy.get(c.id)?.some((r) => r.rung === rung));

            return [k, { fittedCentres: fitted.length, admittedAtCentre: adm.length, unmeasured: unmeasured.length, unmeasuredNet: dist(unmeasured.map((c) => c.rec.net)) }];
          })
        )
      ];
    })
  );

  // ---------------- A4: qualification of the union members (26: 24 shortlisted + 2 benchmarks)
  const drawsById = new Map(qd.members.map((m) => [m.id, m]));
  const memberRows: Record<string, unknown>[] = [];
  const nbRows: Record<string, unknown>[] = [];
  const qual: Record<string, Record<PolicyKey, ArmVerdict>> = {};
  const instrumentDisagreements: unknown[] = [];

  for (const e of sealedQ) {
    const d = drawsById.get(e.id)!;
    const s10 = e.envelope.stress['cost 10 bps']!;
    const p10 = unroundedP10(d.confirm.draws);

    check(`A4 ${e.label}: unrounded p10 = sealed`, p10 === e.envelope.confirmP10Unrounded);
    check(`A4 ${e.label}: envelope statistics from the draws = sealed`, isDeepStrictEqual(plain(envNbStats(d.confirm.draws.map(drawRec) as never)), plain(e.envelope.confirm)));

    const v = Object.fromEntries(policyKeys.map((k) => [k, verdict(k, e.centre, e.confirm, d.confirm.draws, s10 as never, p10)])) as Record<PolicyKey, ArmVerdict>;

    qual[e.id] = v;
    check(`A4 ${e.label}: P0 verdict = sealed CTRL`, isDeepStrictEqual(plain(v.P0), plain(e.arms.CTRL)), { audit: v.P0, sealed: e.arms.CTRL });
    check(`A4 ${e.label}: P2 verdict = sealed EXP`, isDeepStrictEqual(plain(v.P2), plain(e.arms.EXP)), { audit: v.P2, sealed: e.arms.EXP });

    // the instrument cross-check: the cents p90 DD / p10 versus the unrounded ones, against every policy's DD limit
    for (const k of policyKeys) {
      const L = limits(k);
      const q3c = e.confirm.p90Dd <= L.dd;
      const q3u = e.envelope.confirm.markedDd.p90 <= L.dd;
      const q4c = e.confirm.p10 > 0;
      const q4u = p10 > 0;

      if (q3c !== q3u || q4c !== q4u) instrumentDisagreements.push({ member: e.label, policy: k, p90DdCents: e.confirm.p90Dd, p90DdUnrounded: e.envelope.confirm.markedDd.p90, p10Cents: e.confirm.p10, p10Unrounded: p10 });
    }

    const t = tailStats(d.confirm.draws);
    const by = e.shortlistedBy.map((s) => s.arm).join('+');

    nbRows.push({
      cutoff: cut,
      member: e.label,
      id: e.id,
      shortlistedBy: by,
      draws: t.n,
      ddP50: t.markedDd.p50,
      ddP90: t.markedDd.p90,
      ddP95: t.markedDd.p95,
      ddWorst: t.markedDd.worst,
      ddWorst10Mean: t.markedDd.worst10Mean,
      plLiqP50: t.principalLossLiquidation.p50,
      plLiqP90: t.principalLossLiquidation.p90,
      plLiqP95: t.principalLossLiquidation.p95,
      plLiqWorst: t.principalLossLiquidation.worst,
      plLiqWorst10Mean: t.principalLossLiquidation.worst10Mean,
      plMarkedP90: t.principalLossMarked.p90,
      bdLiqP50: t.bankedDdLiquidation.p50,
      bdLiqP90: t.bankedDdLiquidation.p90,
      bdLiqP95: t.bankedDdLiquidation.p95,
      bdLiqWorst: t.bankedDdLiquidation.worst,
      bdLiqWorst10Mean: t.bankedDdLiquidation.worst10Mean,
      bdMarkedP90: t.bankedDdMarked.p90,
      breachDd35: t.markedDd.breach35.count,
      breachDd35Wilson: t.markedDd.breach35.wilson95Pct?.join('–'),
      breachDd35MeanExcess: t.markedDd.breach35.meanExcessAmongBreaches,
      breachDd40: t.markedDd.breach40.count,
      breachDd40MeanExcess: t.markedDd.breach40.meanExcessAmongBreaches,
      breachPl25: t.principalLossLiquidation.breach25.count,
      breachPl25MeanExcess: t.principalLossLiquidation.breach25.meanExcessAmongBreaches,
      breachBd25: t.bankedDdLiquidation.breach25.count,
      breachBd25Wilson: t.bankedDdLiquidation.breach25.wilson95Pct?.join('–'),
      breachBd25MeanExcess: t.bankedDdLiquidation.breach25.meanExcessAmongBreaches,
      breachBd30: t.bankedDdLiquidation.breach30.count,
      breachBd30Wilson: t.bankedDdLiquidation.breach30.wilson95Pct?.join('–'),
      breachBd30MeanExcess: t.bankedDdLiquidation.breach30.meanExcessAmongBreaches,
      breachBd35: t.bankedDdLiquidation.breach35.count,
      breachBd35Wilson: t.bankedDdLiquidation.breach35.wilson95Pct?.join('–'),
      breachBd35MeanExcess: t.bankedDdLiquidation.breach35.meanExcessAmongBreaches,
      ...Object.fromEntries(policyKeys.map((k) => [`drawFailPct${k}`, t.drawFailSharePct[k]]))
    });
    memberRows.push({
      cutoff: cut,
      member: e.label,
      id: e.id,
      shortlistedBy: by,
      cell: e.cell,
      growth: (e.cfg as { g: { maximumHoldEnabled?: boolean; initialStopEnabled?: boolean } }).g.maximumHoldEnabled === true || (e.cfg as { g: { initialStopEnabled?: boolean } }).g.initialStopEnabled === true ? 'bounded' : 'open-ended',
      centreNet: e.centre.net,
      centreDd: e.centre.dd,
      centrePlLiq: r2(e.envelope.centre.principalLossLiquidation),
      centreBdLiq: r2(e.envelope.centre.bankedDdLiquidation),
      centreBdMarked: r2(e.envelope.centre.bankedDdMarked),
      confP90DdCents: e.confirm.p90Dd,
      confP90DdUnrounded: e.envelope.confirm.markedDd.p90,
      confP90PlLiq: r2(e.envelope.confirm.principalLoss.liquidation.p90),
      confP90BdLiq: r2(e.envelope.confirm.bankedDd.liquidation.p90),
      confP10: e.confirm.p10,
      confRobust: e.confirm.robust,
      selectRobust: e.select.robust,
      selectP90Dd: e.select.p90Dd,
      selectWorst10MeanDd: e.selectTail.worst10Mean,
      s10Net: s10.net,
      s10Dd: s10.dd,
      s10BdLiq: r2(s10.envelope.bankedDdLiquidation),
      s10PlLiq: r2(s10.envelope.principalLossLiquidation),
      occupancy: e.risk.occupancy,
      ...Object.fromEntries(policyKeys.flatMap((k) => [[`${k}centre`, v[k].gates.Q1 && v[k].gates.Q2 && v[k].gates.Q6], [`${k}q3`, v[k].gates.Q3], [`${k}`, v[k].qualified ? 'Q' : v[k].reasons.join('; ')]]))
    });
  }

  const commonPop = sealedQ.filter((e) => e.shortlistedBy.some((s) => s.arm !== 'benchmark'));
  const armPop = (arm: 'CTRL' | 'EXP') => sealedQ.filter((e) => e.shortlistedBy.some((s) => s.arm === arm));
  const labelIn = (e: Evidence, arm?: 'CTRL' | 'EXP') => (arm ? e.shortlistedBy.find((s) => s.arm === arm)!.label : e.label);
  const select = (popE: Evidence[], k: PolicyKey, arm?: 'CTRL' | 'EXP') => {
    const view = popE.map((e) => viewOf(e, qual[e.id]![k], labelIn(e, arm)));
    const p0 = originalOrder(asA2(view));
    const ra1 = ra1Order(asA2(view));

    return { members: view.length, qualified: view.filter((x) => x.qualified).length, P0: (p0[0] as unknown as Evidence) ?? null, RA1: (ra1[0] as unknown as Evidence) ?? null, ra1Adapted: (ra1OrderWith(asA2(view), limitOf(40, C0))[0] as unknown as Evidence) ?? null, qualifiedLabels: view.filter((x) => x.qualified).map((x) => x.label) };
  };

  // A1: the counterfactual selectors reproduce the sealed selections on the arms' own populations
  const ctrlP0 = select(armPop('CTRL'), 'P0', 'CTRL');
  const expP2 = select(armPop('EXP'), 'P2', 'EXP');

  check('A1 CTRL population under P0: P0 primary = sealed', ctrlP0.P0?.label === sealedSel.arms.CTRL.primaries.P0, { audit: ctrlP0.P0?.label, sealed: sealedSel.arms.CTRL.primaries.P0 });
  check('A1 CTRL population under P0: RA1-original primary = sealed', ctrlP0.RA1?.label === sealedSel.arms.CTRL.primaries['RA1-original']);
  check('A1 EXP population under P2: P0 primary = sealed', expP2.P0?.label === sealedSel.arms.EXP.primaries.P0, { audit: expP2.P0?.label, sealed: sealedSel.arms.EXP.primaries.P0 });
  check('A1 EXP population under P2: RA1-original primary = sealed', expP2.RA1?.label === sealedSel.arms.EXP.primaries['RA1-original']);
  check('A1 EXP population under P2: RA1-adapted primary = sealed', expP2.ra1Adapted?.label === sealedSel.arms.EXP.primaries['RA1-adapted']);
  check('A1 qualified counts = sealed', ctrlP0.qualified === sealedSel.arms.CTRL.qualified && expP2.qualified === sealedSel.arms.EXP.qualified);

  const interval = (id: string | undefined) => {
    if (!id) return null;

    const r = intervalRows.find((x) => x.id === id);
    const dg = intervalDiag.find((x) => x.id === id);

    return r ? { status: 'sealed (retrospective, previously inspected)', net: r.sliceNet, dd: r.sliceDd, bdLiqWindow: dg?.interval ? r2(dg.interval.bankedDdLiquidation) : null, newLotPlLiq: dg?.interval ? r2(dg.interval.newLotMaxPrincipalLossLiq) : null } : { status: 'not evaluated' };
  };
  const pickOut = (e: Evidence | null) =>
    e ? { label: e.label, id: e.id, centreNet: e.centre.net, centreDd: e.centre.dd, plLiq: r2(e.envelope.centre.principalLossLiquidation), bdLiq: r2(e.envelope.centre.bankedDdLiquidation), selectRobust: e.select.robust, selectP90Dd: e.select.p90Dd, occupancy: e.risk.occupancy, lots: e.centre.lots, topEpisodeShare: (e.centre as unknown as { topEpisode: number }).topEpisode / e.centre.net, interval: interval(e.id) } : null;
  const selectors = Object.fromEntries(
    (['common', 'CTRL', 'EXP'] as const).map((p) => [
      p,
      Object.fromEntries(
        policyKeys.map((k) => {
          const s = p === 'common' ? select(commonPop, k) : select(armPop(p), k, p);

          return [k, { members: s.members, qualified: s.qualified, P0: pickOut(s.P0), RA1: pickOut(s.RA1), qualifiedLabels: s.qualifiedLabels }];
        })
      )
    ])
  );
  const benchmarksQ = Object.fromEntries(sealedQ.filter((e) => e.shortlistedBy.some((s) => s.arm === 'benchmark')).map((e) => [e.label, Object.fromEntries(policyKeys.map((k) => [k, qual[e.id]![k].qualified]))]));
  const flips = (a: PolicyKey, b: PolicyKey) =>
    commonPop
      .filter((e) => qual[e.id]![a].qualified !== qual[e.id]![b].qualified)
      .map((e) => ({ member: e.label, centreNet: e.centre.net, [`${a}`]: qual[e.id]![a].qualified ? 'Q' : qual[e.id]![a].reasons.join('; '), [`${b}`]: qual[e.id]![b].qualified ? 'Q' : qual[e.id]![b].reasons.join('; ') }));
  const qualSummary = Object.fromEntries(
    policyKeys.map((k) => {
      const v = commonPop.map((e) => qual[e.id]![k]);

      return [k, { members: commonPop.length, centrePass: v.filter((x) => x.gates.Q1 && x.gates.Q2 && x.gates.Q6).length, q3Pass: v.filter((x) => x.gates.Q3).length, q5Pass: v.filter((x) => x.gates.Q5).length, qualified: v.filter((x) => x.qualified).length, qualifiedNet: dist(commonPop.filter((e) => qual[e.id]![k].qualified).map((e) => e.centre.net)) }];
    })
  );
  const plAloneQ = Object.fromEntries(
    (['P2', 'P3', 'P4'] as const).map((k) => {
      const bdOnly = { P2: 'P6', P3: 'P7', P4: 'P8' }[k] as PolicyKey;

      return [k, commonPop.filter((e) => qual[e.id]![bdOnly].qualified && !qual[e.id]![k].qualified).map((e) => ({ member: e.label, reasons: qual[e.id]![k].reasons }))];
    })
  );

  // policy pairs that differ only by one gate: how often they disagree, at every level (centre, rung rows, members)
  const pairDiffs = Object.fromEntries(
    ([['P2', 'P6'], ['P3', 'P7'], ['P4', 'P8'], ['P1', 'P5'], ['P1', 'P8'], ['P3', 'P4'], ['P7', 'P8']] as [PolicyKey, PolicyKey][]).map(([a, b]) => [
      `${a} vs ${b}`,
      {
        centres: scope.filter((c) => V.get(c.id)![a] !== V.get(c.id)![b]).length,
        rungRows: Object.fromEntries(['r1', 'refine', 'r2', 'r3'].map((r) => [r, pop.rungs.filter((x) => x.rung === r && scopeIds.has(x.id) && x.feasible[a] !== x.feasible[b]).length])),
        members: sealedQ.filter((e) => qual[e.id]![a].qualified !== qual[e.id]![b].qualified).length
      }
    ])
  );

  // ---------------- G1 extended descriptive set (rung-3 fits / endpoints not shortlisted; never selectable)
  const extended = g1
    ? g1.rows.map((r) => {
        const p10 = unroundedP10(r.confirm.draws);
        const v = Object.fromEntries(policyKeys.map((k) => [k, verdict(k, r.centre, r.confirmNb, r.confirm.draws, r.stress10, p10)])) as Record<PolicyKey, ArmVerdict>;
        const c = byId.get(r.id)!;

        return {
          id: r.id,
          origin: originOf(c),
          cell: c.cell,
          stage: highestStage(c),
          growth: c.growthBounded ? 'bounded' : 'open-ended',
          centreNet: r.centre.net,
          centreDd: r.centre.dd,
          plLiq: r2(r.centre.envelope.principalLossLiquidation),
          bdLiq: r2(r.centre.envelope.bankedDdLiquidation),
          confP90Dd: r2(envNbStats(r.confirm.draws.map(drawRec) as never).markedDd.p90),
          confP90Pl: r2(envNbStats(r.confirm.draws.map(drawRec) as never).principalLoss.liquidation.p90),
          confP90Bd: r2(envNbStats(r.confirm.draws.map(drawRec) as never).bankedDd.liquidation.p90),
          confP10: r2(p10),
          confRobust: r2((r.confirmNb as { robust: number }).robust),
          r3: r3Of(r.id) ? Object.fromEntries(policyKeys.map((k) => [k, r3Of(r.id)!.feasible[k]])) : null,
          verdicts: Object.fromEntries(policyKeys.map((k) => [k, v[k].qualified ? 'Q' : v[k].reasons.join('; ')])),
          qualified: Object.fromEntries(policyKeys.map((k) => [k, v[k].qualified]))
        };
      })
    : null;
  const extendedSummary = extended
    ? Object.fromEntries(
        policyKeys.map((k) => {
          const q = extended.filter((x) => x.qualified[k]);
          const unionQ = commonPop.filter((e) => qual[e.id]![k].qualified);
          const all = [...unionQ.map((e) => ({ id: e.label, net: e.centre.net, robust: e.confirm.robust, set: 'shortlisted' })), ...q.map((x) => ({ id: x.id, net: x.centreNet, robust: x.confRobust, set: 'G1' }))].sort((a, b) => b.net - a.net);

          return [k, { configurations: extended.length, qualified: q.length, qualifiedNet: dist(q.map((x) => x.centreNet)), combinedQualified: all.length, combinedBest: all[0] ?? null, combinedTop3: all.slice(0, 3) }];
        })
      )
    : null;

  // ---------------- A6: attribution (best qualified centre net by the P0 rule on fixed populations)
  const best = (p: 'common' | 'CTRL' | 'EXP', k: PolicyKey) => (selectors[p]![k] as { P0: { centreNet: number } | null }).P0?.centreNet ?? null;
  const d = (a: number | null, b: number | null) => (a === null || b === null ? null : r2(a - b));
  const attribution = {
    pilotDelta: d(best('EXP', 'P2'), best('CTRL', 'P0')),
    orderA: { constraintOnCtrlVectors: d(best('CTRL', 'P2'), best('CTRL', 'P0')), searchPathAtP2: d(best('EXP', 'P2'), best('CTRL', 'P2')) },
    orderB: { searchPathAtP0: d(best('EXP', 'P0'), best('CTRL', 'P0')), constraintOnExpVectors: d(best('EXP', 'P2'), best('EXP', 'P0')) },
    commonPopulation: Object.fromEntries(policyKeys.map((k) => [k, best('common', k)])),
    ctrlPopulation: Object.fromEntries(policyKeys.map((k) => [k, best('CTRL', k)])),
    expPopulation: Object.fromEntries(policyKeys.map((k) => [k, best('EXP', k)])),
    searchPathByPolicy: Object.fromEntries(policyKeys.map((k) => [k, d(best('EXP', k), best('CTRL', k))])),
    selectionEffect: Object.fromEntries(
      (['common', 'CTRL', 'EXP'] as const).map((p) => [p, Object.fromEntries(policyKeys.map((k) => { const s = selectors[p]![k] as { P0: { centreNet: number; label: string } | null; RA1: { centreNet: number; label: string } | null }; return [k, { P0: s.P0?.label ?? null, RA1: s.RA1?.label ?? null, same: s.P0?.label === s.RA1?.label, netDifference: d(s.RA1?.centreNet ?? null, s.P0?.centreNet ?? null) }]; }))])
    ),
    rung3BestByOrigin: Object.fromEntries(
      policyKeys.map((k) => {
        const rows = pop.rungs.filter((r) => r.rung === 'r3' && scopeIds.has(r.id) && r.feasible[k]);
        const bestOf = (arm: string) => r2(Math.max(0, ...rows.filter((r) => armsOf(byId.get(r.id)!).includes(arm)).map((r) => byId.get(r.id)!.rec.net)));

        return [k, { CTRL: bestOf('CTRL'), EXP: bestOf('EXP') }];
      })
    )
  };

  // ---------------- regression example (C24's control winner)
  const regression = cut === 'C24'
    ? (() => {
        const e = sealedQ.find((x) => x.shortlistedBy.some((s) => s.label === 'CTRL C24/broad/GB0.VD1/R2#1 profit'))!;
        const c = byId.get(e.id)!;

        return {
          label: e.shortlistedBy[0]!.label,
          id: e.id,
          centre: { net: e.centre.net, dd: e.centre.dd, plLiq: e.envelope.centre.principalLossLiquidation, plMarked: e.envelope.centre.principalLossMarked, bdLiq: e.envelope.centre.bankedDdLiquidation, bdMarked: e.envelope.centre.bankedDdMarked },
          confirmation: { p90DdCents: e.confirm.p90Dd, p90DdUnrounded: e.envelope.confirm.markedDd.p90, p90PlLiq: e.envelope.confirm.principalLoss.liquidation.p90, p90BdLiq: e.envelope.confirm.bankedDd.liquidation.p90, p90BdMarked: e.envelope.confirm.bankedDd.marked.p90, p10: e.confirm.p10 },
          stress10: e.envelope.stress['cost 10 bps'],
          r3: r3Of(e.id) ? { p90DdCents: r3Of(e.id)!.p90DdCents, p90BdLiq: r3Of(e.id)!.env.bankedDd.liquidation.p90, feasible: r3Of(e.id)!.feasible } : null,
          perPolicy: Object.fromEntries(policyKeys.map((k) => [k, { centre: passOf(c, k), qualified: qual[e.id]![k].qualified, reasons: qual[e.id]![k].reasons }]))
        };
      })()
    : null;

  // ---------------- candidate-level CSVs
  const centreCsv = scope.map((c) => {
    const row: Record<string, unknown> = {
      cutoff: cut,
      id: c.id,
      signature: c.rec.signature,
      cell: c.cell,
      origin: originOf(c),
      lanes: lanesOf(c).join(' '),
      highestStage: highestStage(c),
      growth: c.growthBounded ? 'bounded' : 'open-ended',
      net: c.rec.net,
      dd: c.rec.dd,
      plLiq: c.rec.envelope!.principalLossLiquidation,
      plMarked: c.rec.envelope!.principalLossMarked,
      bdLiq: c.rec.envelope!.bankedDdLiquidation,
      bdMarked: c.rec.envelope!.bankedDdMarked,
      lots: c.rec.lots,
      partials: c.rec.partials,
      occupancy: c.rec.sessions ? r2(c.rec.sessionsHeld / c.rec.sessions) : null
    };

    for (const k of policyKeys) {
      const b = bindingOf(c, k);

      row[k] = V.get(c.id)![k];
      row[`${k}binding`] = b.metric;
      row[`${k}distance`] = b.status === 'fail' ? -b.dollars : b.dollars;
    }

    const hi = ['r3', 'r2', 'refine', 'r1'].map((x) => rungsBy.get(c.id)?.find((r) => r.rung === x)).find(Boolean);

    row.rungMeasured = hi?.rung ?? '';
    for (const k of policyKeys) row[`${k}rung`] = hi ? hi.feasible[k] : '';

    const g = d3.get(c.id);

    row.d3U = g ? r2(g.marked.account.unbankedGiveback) : '';
    row.d3E = g ? r2(g.marked.account.bankedErosion) : '';
    row.d3F = g ? r2(g.marked.account.capitalLoss) : '';
    row.givebackDominated = g ? g.marked.account.unbankedGiveback >= 0.5 * g.marked.dd : '';
    return row;
  });
  const rungCsv = pop.rungs.map((r) => ({
    cutoff: cut,
    id: r.id,
    rung: r.rung,
    draws: r.unique,
    by: r.by.join('+'),
    net: byId.get(r.id)!.rec.net,
    robust: r2(r.robust),
    p90DdCents: r.p90DdCents,
    p90DdUnrounded: r2(r.env.markedDd.p90),
    p90PlLiq: r2(r.env.principalLoss.liquidation.p90),
    p90BdLiq: r2(r.env.bankedDd.liquidation.p90),
    breachDd35: r.breach.dd35,
    breachDd40: r.breach.dd40,
    breachPl25: r.breach.pl25,
    breachBd25: r.breach.bd25,
    breachBd30: r.breach.bd30,
    breachBd35: r.breach.bd35,
    ...Object.fromEntries(policyKeys.map((k) => [k, r.feasible[k]]))
  }));

  // G2 cross-check: the path's conventional DD and banked DD equal the archived record's
  if (g2) {
    let ddOk = 0;
    let bdOk = 0;

    for (const r of g2.rows) {
      const c = byId.get(r.id)!;

      if (Math.abs(r.d3.marked.dd - c.rec.dd) <= 0.005) ddOk++;
      if (Math.abs(r.d3.liquidation.bankedDd - c.rec.envelope!.bankedDdLiquidation) <= 1e-6 && Math.abs(r.d3.marked.bankedDd - c.rec.envelope!.bankedDdMarked) <= 1e-6) bdOk++;
    }
    check('G2 path DD = record DD (cents)', ddOk === g2.rows.length, { ddOk, rows: g2.rows.length });
    check('G2 path banked DD = record envelope (1e-6)', bdOk === g2.rows.length, { bdOk, rows: g2.rows.length });
  }

  const files = {
    centres: writeCsv(path.join(resultsDir, `centres-${cut}.csv.gz`), centreCsv, undefined, true),
    rungs: writeCsv(path.join(resultsDir, `rungs-${cut}.csv.gz`), rungCsv, undefined, true),
    qualification: writeCsv(path.join(resultsDir, `qualification-${cut}.csv`), memberRows),
    neighbourhood: writeCsv(path.join(resultsDir, `neighbourhood-${cut}.csv`), nbRows),
    ...(extended ? { extended: writeCsv(path.join(resultsDir, `extended-${cut}.csv`), extended.map((x) => ({ cutoff: cut, ...x, r3: undefined, verdicts: undefined, qualified: undefined, ...Object.fromEntries(policyKeys.map((k) => [k, x.verdicts[k]])), ...Object.fromEntries(policyKeys.map((k) => [`${k}r3`, x.r3?.[k] ?? ''])) }))) } : {})
  };

  return {
    cutoff: cut,
    inventory: {
      archivedRows: pop.archivedRows,
      requests: pop.requests,
      compute: pop.compute,
      replay: pop.replay,
      uniqueCentres: pop.centres.length,
      bySource: {
        CTRL: pop.centres.filter((c) => armsOf(c).includes('CTRL')).length,
        EXP: pop.centres.filter((c) => armsOf(c).includes('EXP')).length,
        both: pop.centres.filter((c) => armsOf(c).length === 2).length
      },
      uniqueLedgers: new Set(pop.centres.map((c) => c.rec.signature)).size,
      scopeLedgers: new Set(scope.map((c) => c.rec.signature)).size,
      excluded,
      scope: scope.length,
      byHighestStage: scope.reduce<Record<string, number>>((a, c) => ((a[highestStage(c)] = (a[highestStage(c)] ?? 0) + 1), a), {}),
      allByHighestStage: pop.centres.reduce<Record<string, number>>((a, c) => ((a[highestStage(c)] = (a[highestStage(c)] ?? 0) + 1), a), {}),
      measuredRungs: Object.fromEntries(['r1', 'refine', 'r2', 'r3'].map((x) => [x, pop.rungs.filter((r) => r.rung === x).length])),
      neighbourDrawsRead: (pop.requests as { neighbourhoodReads: number }).neighbourhoodReads,
      shortlistMembers: commonPop.length,
      qualificationMembers: sealedQ.length,
      g1: g1 ? { configurations: g1.rows.length, compute: g1.compute, parity: g1.parity } : null,
      g2: g2 ? { centres: g2.rows.length, compute: g2.compute, parity: g2.parity } : null
    },
    checks,
    centre: { groups: groupRows, overlapVsP0: overlap('P0'), overlapVsP2: overlap('P2'), overlapVsP0Rung3Stage: overlap('P0', scope.filter((c) => highestStage(c) === 'rung 3 / endpoint' || highestStage(c) === 'shortlist')), reasons, transitions: transitionOut, ordering, basisDisagreement, boundary },
    rungs: { summary: rungSummary, gap },
    pairDiffs,
    qualification: { summary: qualSummary, flips: { 'P2→P3': flips('P2', 'P3'), 'P3→P4': flips('P3', 'P4'), 'P2→P4': flips('P2', 'P4'), 'P6→P7': flips('P6', 'P7'), 'P7→P8': flips('P7', 'P8'), 'P0→P1': flips('P0', 'P1'), 'P0→P3': flips('P0', 'P3'), 'P0→P4': flips('P0', 'P4') }, plAlone: plAloneQ, instrumentDisagreements, benchmarks: benchmarksQ },
    selectors,
    attribution,
    extended: extended ? { summary: extendedSummary, rows: extended.map((x) => ({ ...x, qualified: undefined })) } : null,
    regression,
    files
  };
};

const out = Object.fromEntries(cutKeys.map((c) => [c, analyse(c)]));
const failed = cutKeys.flatMap((c) => (out[c]!.checks as { pass: boolean; check: string }[]).filter((x) => !x.pass).map((x) => `${c}: ${x.check}`));
const shas: Record<string, string> = {};

for (const c of cutKeys) shas[`analysis-${c}.json`] = writeJson(path.join(resultsDir, `analysis-${c}.json`), out[c]);
shas['policies.json'] = writeJson(path.join(resultsDir, 'policies.json'), policyTable());
console.log(JSON.stringify({ finished: utc(), checks: cutKeys.map((c) => `${c}: ${(out[c]!.checks as unknown[]).length} checks`), failed, shas }));
if (failed.length) process.exitCode = 1;
