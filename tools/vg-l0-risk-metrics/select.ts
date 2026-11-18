// Stage 5b/5c (PROTOCOL.md §8 S5, §9): the selector experiment on Assignment 3's archived populations.
//   select — per cutoff and population: P0 (NL0 original), P1 (RA1) and RA2 re-derived with Assignment 3's own code from
//            its archived evidence (gate G5b: equal to every sealed primary); P2, P2b and the report-only ablations from
//            the same members joined with this study's sealed member replays; why the rules differ; brief item 9 (P0's
//            top-10 members failing only RA1's S1/S2: their stop state and stop credit).
//   folds  — every fold primary of every selector replayed on the next door with Assignment 3's foldRun; P0/P1/RA2 slices
//            and paths must equal the sealed records (gate G5c); P2-family paths chained with Assignment 3's rule and
//            labelled with its frozen comparison rule; principal-aware path metrics (the exact attribution of each
//            sequential drawdown across slices); item 9's next slices; the C24 primaries' FULL rows (descriptive).
//   node --experimental-transform-types tools/vg-l0-risk-metrics/select.ts select | folds [--dry]
import path from 'node:path';
import { sequentialDrawdown } from '../../src/vg-d1-growth-joint/post.ts';
import { foldRun } from '../../src/vg-l0-full-joint/folds.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { failedScreensOf, populations, selectors } from '../../src/vg-l0-full-joint/select.ts';
import { canonicalCfg } from '../../src/vg-l0-full-joint/space.ts';
import { membersOf, sealedSelection } from '../../src/vg-l0-risk-metrics/archive.ts';
import { closeT, windowMetrics, bundleOf } from '../../src/vg-l0-risk-metrics/bundle.ts';
import { type CutoffKey, cutoffEnd, cutoffKeys, economics, fullJoint, nextDoor, r2, resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { reconcile, replay, subjectOfCfg, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { attributeDrawdown, portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { readJson, sealJson } from '../../src/vg-l0-risk-metrics/records.ts';
import { type MemberView, p2Order, p2Specs } from '../../src/vg-l0-risk-metrics/selectors.ts';
import { codeDigest, studyGuard } from './common.ts';
import { auditOptions } from './audit-options.ts';

const dry = process.argv.includes('--dry');
const freeze = studyGuard();
const t0 = Date.now();
const emit = (rel: string, v: unknown, label: string) => {
  if (dry) return console.log(JSON.stringify(v, null, 1).slice(0, 8000));
  console.log(rel, sealJson(path.join(resultsDir, rel), v, label));
};

type Row = MemberView & { id: string; track: string; cell: string; population: Record<string, boolean>; ra1: MemberView['ra1'] & { occupancy: number; worstMae: number; openMultiple: number | null; openShare: number | null; selectWorst10Mean: number }; p2: MemberView['p2'] & Record<string, unknown> };
const membersRecord = (c: CutoffKey) => readJson<{ rows: Row[]; gates: Record<string, unknown> }>(path.join(resultsDir, 'selection', `members-${c}.json`));
const popsOf = (c: CutoffKey) => (c === 'C24' ? ['L', 'B', 'F', 'N', 'U'] : ['L', 'B', 'F']) as ('L' | 'B' | 'F' | 'N' | 'U')[];
const baseSelectors = ['original', 'RA1', 'RA2'] as const;
const p2Names = Object.keys(p2Specs);
const inputsOf = (m: Row) => ({
  label: m.label,
  cell: m.cell,
  centreNet: r2(m.centre.net),
  centreDd: r2(m.centre.dd),
  ra1ConservativeNet: r2(m.ra1.conservativeNet),
  cnStar: r2(m.p2.cnStar),
  stopCredit: r2(m.p2.cnStar - m.ra1.conservativeNet),
  bankedDd: r2(m.p2.bankedDd),
  principalLossMax: r2(m.p2.principalLossMax),
  bounded: m.p2.bounded,
  occupancy: r2(m.ra1.occupancy),
  openMultiple: m.ra1.openMultiple === null ? null : r2(m.ra1.openMultiple),
  openShare: m.ra1.openShare === null ? null : r2(m.ra1.openShare),
  selectRobust: r2(m.select.robust),
  selectP90Dd: r2(m.select.p90Dd)
});

const selectStage = () => {
  const out: Record<string, unknown> = {};
  let g5b = 0;

  for (const c of cutoffKeys) {
    const rec = membersRecord(c);
    const ev = membersOf(c);
    const rows = new Map(rec.rows.map((r) => [r.label, r]));
    const sealed = sealedSelection(c);
    const perPop: Record<string, unknown> = {};

    if (ev.length !== rec.rows.length || ev.some((e) => !rows.has(e.label))) throw new Error(`${c}: the member record does not cover the archive`);
    for (const pop of popsOf(c)) {
      const evp = ev.filter(populations[pop]);
      const views = evp.map((e) => rows.get(e.label)!);
      const prim: Record<string, string | null> = {};
      const orders: Record<string, Row[]> = {};

      for (const s of baseSelectors) {
        const o = selectors[s](evp);

        prim[s] = o[0]?.label ?? null;
        orders[s] = o.map((e) => rows.get(e.label)!);
        if (prim[s] !== (sealed.primaries[pop]?.[s] ?? null)) g5b++;
      }
      for (const s of p2Names) {
        const o = p2Order(views, p2Specs[s]!) as Row[];

        prim[s] = o[0]?.label ?? null;
        orders[s] = o;
      }

      const rankIn = (s: string, label: string | null) => (label === null ? null : orders[s]!.findIndex((m) => m.label === label) + 1 || 'ineligible');
      const spec = p2Specs.P2!;
      const g1Fail = views.filter((m) => m.qualified && m.p2.principalLossMax > spec.principalLossCap).length;
      const g2Fail = views.filter((m) => m.qualified && m.p2.bankedDd > spec.bankedDdCap).length;
      const p2bAdmitted = views.filter((m) => !m.qualified && orders.P2b!.some((x) => x.label === m.label)).map((m) => m.label);
      const p0Top = orders.original!.slice(0, 10);
      const item9 = p0Top
        .map((m, i) => ({ m, rank: i + 1, screens: failedScreensOf(evp.find((e) => e.label === m.label)!) }))
        .filter((x) => x.screens.length > 0 && x.screens.every((s) => s === 'S1' || s === 'S2'))
        .map((x) => ({ p0Rank: x.rank, failed: x.screens, ...inputsOf(x.m), open: x.m.p2.open, ra1Rank: rankIn('RA1', x.m.label), p2Rank: rankIn('P2', x.m.label) }));

      perPop[pop] = {
        members: views.length,
        qualified: views.filter((m) => m.qualified).length,
        primaries: prim,
        sealedPrimaries: sealed.primaries[pop],
        eligible: Object.fromEntries(p2Names.map((s) => [s, orders[s]!.length])),
        gateFailuresAmongQualified: { G1: g1Fail, G2: g2Fail, unbounded: views.filter((m) => m.qualified && !m.p2.bounded).length },
        p2bAdmittedBeyondQ1Q6: p2bAdmitted,
        primaryInputs: Object.fromEntries(Object.entries(prim).map(([s, l]) => [s, l ? inputsOf(rows.get(l)!) : null])),
        crossRanks: Object.fromEntries(Object.entries(prim).map(([s, l]) => [s, { underOriginal: rankIn('original', l), underRA1: rankIn('RA1', l), underP2: rankIn('P2', l) }])),
        top10: Object.fromEntries(['original', 'RA1', 'P2', 'P2b'].map((s) => [s, orders[s]!.slice(0, 10).map(inputsOf)])),
        item9
      };
    }
    out[c] = perPop;
    console.log(`${c}: selected; G5b mismatches so far ${g5b}`);
  }

  if (g5b) throw new Error(`G5b: ${g5b} re-derived P0/P1/RA2 primaries differ from the sealed ones (nothing sealed)`);
  emit('selection/selectors.json', { stage: 'S5b selectors on identical archived populations', freeze: freeze.protocol.sha256, code: codeDigest(), gates: { G5b: 'PASS' }, specs: p2Specs, cutoffs: out, seconds: (Date.now() - t0) / 1000 }, 'S5b selectors');
};

// ----- folds -----

const band = 2_500;
type SeqPath = { name: string; parts: { fold: string; label: string | null; sliceNet: number; sliceDd: number; charge: number }[]; net: number; netBeforeCharges: number; charges: number; sequentialDd: number; ddPeak: string; ddTrough: string; peakT: number; troughT: number; withinCeiling: boolean };
// Assignment 3's frozen comparison rule (tools/vg-l0-full-joint/analyses.ts label), replicated and checked on its labels
const compareLabel = (x: SeqPath, y: SeqPath) => {
  const dDd = x.sequentialDd - y.sequentialDd;
  const dNet = x.net - y.net;
  const risk = x.sequentialDd < y.sequentialDd - band && x.parts.every((p, i) => p.sliceDd <= y.parts[i]!.sliceDd + band);

  if (risk) return 'risk improvement';
  if (dNet < -band) return 'profit sacrifice without clear benefit';
  if (Math.abs(dNet) <= band && Math.abs(dDd) <= band) return 'no material difference';
  return 'mixed';
};
const stamp = (t: number) => (Number.isFinite(t) ? new Date(t * 1000).toISOString() : '—');

const foldsStage = async () => {
  const sel = readJson<{ cutoffs: Record<string, Record<string, { primaries: Record<string, string | null>; item9: { label: string }[] }>> }>(path.join(resultsDir, 'selection', 'selectors.json'));
  const folds = ['C19', 'C21', 'C23'] as const;
  const slices: Record<string, Record<string, ReturnType<typeof foldRun> & { cfgLabel: string; principal: ReturnType<typeof windowMetrics> }>> = {};
  const sealedEval = (c: string) => readJson<{ rows: { label: string; sliceNet: number; sliceDd: number }[] }>(path.join(fullJoint.dir, 'results/folds', c, 'evaluation.json'));
  let g5cSlices = 0;

  for (const c of folds) {
    const door = await openDoor(nextDoor[c], `Stage 5c: ${c} fold primaries of every selector on the next slice (retrospective)`);
    const ev = new Map(membersOf(c).map((e) => [e.label, e]));
    const labels = new Set<string>();

    for (const pop of ['L', 'B', 'F']) for (const l of Object.values(sel.cutoffs[c]![pop]!.primaries)) if (l) labels.add(l);
    for (const x of sel.cutoffs[c]!.F!.item9) labels.add(x.label);
    slices[c] = {};
    for (const label of labels) {
      const cfg = canonicalCfg(ev.get(label)!.cfg);
      const fr = foldRun(door, cfg, cutoffEnd[c]);
      const r = replay(door, subjectOfCfg(cfg), vOptions, [cutoffEnd[c]]);
      const L = toLedger(r);

      reconcile(r, L);

      const w = windowMetrics(L, portfolioPath(L), closeT(door, cutoffEnd[c]), closeT(door, door.dates.at(-1)!));

      // the record's period figures are cent-rounded (recordOf): compare to the cent
      if (Math.abs(w.net - fr.sliceNet) > 0.0051) throw new Error(`${c} ${label}: slice net ${w.net} differs from foldRun ${fr.sliceNet}`);

      const sealedRow = sealedEval(c).rows.find((x) => x.label === label);

      if (sealedRow && (r2(fr.sliceNet) !== r2(sealedRow.sliceNet) || r2(fr.sliceDd) !== r2(sealedRow.sliceDd))) g5cSlices++;
      slices[c]![label] = { ...fr, cfgLabel: label, principal: w };
    }
    console.log(`${c}: ${labels.size} fold rows replayed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  const charge = (economics.costBps / 10_000) * economics.budget;
  const chain = (name: string, pick: (c: string) => string | null): SeqPath => {
    const parts: SeqPath['parts'] = [];
    const tv: { t: number[]; v: number[]; charge: number }[] = [];
    let prev: { label: string; openAtEnd: number } | null = null;
    let charges = 0;

    for (const c of folds) {
      const label = pick(c);
      const row = label ? slices[c]![label]! : null;
      let ch = 0;

      if (row && prev && prev.label !== label) ch = charge * (prev.openAtEnd + row.openAtBoundary.length);
      if (!row && prev) ch = charge * prev.openAtEnd;
      charges += ch;
      tv.push({ t: row?.t ?? [], v: row?.v ?? [], charge: ch });
      parts.push({ fold: c, label, sliceNet: row?.sliceNet ?? 0, sliceDd: row?.sliceDd ?? 0, charge: ch });
      prev = row ? { label: label!, openAtEnd: row.openAtEnd.length } : null;
    }

    const dd = sequentialDrawdown(tv, 0);
    const before = parts.reduce((a, p) => a + p.sliceNet, 0);

    return { name, parts, netBeforeCharges: r2(before), charges: r2(charges), net: r2(before - charges), sequentialDd: r2(dd.maximum), ddPeak: stamp(dd.peakTime), ddTrough: stamp(dd.troughTime), peakT: dd.peakTime, troughT: dd.troughTime, withinCeiling: dd.maximum <= economics.ceiling };
  };
  const verdict = (p: SeqPath) => (p.parts.some((x) => x.label === null) ? 'incomplete (a fold without a primary)' : p.net > 0 && p.withinCeiling ? 'supported (retrospective, AD6)' : 'unsupported');
  const sealedSeq = readJson<{ procedures: { population: string; selector: string; verdict: string; path: { net: number; sequentialDd: number } }[] }>(path.join(fullJoint.dir, 'results/folds/sequential.json'));
  const paths: Record<string, Record<string, SeqPath & { verdict: string }>> = {};
  let g5cPaths = 0;

  for (const pop of ['L', 'B', 'F']) {
    paths[pop] = {};
    for (const s of [...baseSelectors, ...p2Names]) {
      const p = chain(`${pop}/${s}`, (c) => sel.cutoffs[c]![pop]!.primaries[s] ?? null);

      paths[pop]![s] = { ...p, verdict: verdict(p) };
      if ((baseSelectors as readonly string[]).includes(s)) {
        const sp = sealedSeq.procedures.find((x) => x.population === pop && x.selector === s)!;

        if (r2(sp.path.net) !== p.net || r2(sp.path.sequentialDd) !== p.sequentialDd) g5cPaths++;
      }
    }
  }

  // the frozen labels; Assignment 3's own labels (RA1 vs original) are re-derived as a check of the replicated rule
  const labels = ['L', 'B', 'F'].flatMap((pop) => [
    ['RA1 vs original (check: Assignment 3’s sealed label)', 'RA1', 'original'],
    ['P2 vs original (P0)', 'P2', 'original'],
    ['P2 vs RA1 (P1)', 'P2', 'RA1'],
    ['P2b vs P2', 'P2b', 'P2'],
    ['P2−tier vs P2 (ablation)', 'P2-tier', 'P2'],
    ['P2−stop vs P2 (ablation)', 'P2-stop', 'P2'],
    ['P2@25k vs P2 (sensitivity)', 'P2@25k', 'P2']
  ].map(([name, x, y]) => {
    const a = paths[pop]![x!]!;
    const b = paths[pop]![y!]!;

    return { population: pop, comparison: name, label: compareLabel(a, b), dNet: r2(a.net - b.net), dDd: r2(a.sequentialDd - b.sequentialDd) };
  }));

  // principal-aware path metrics: the exact attribution of each sequential DD window, slice by slice
  const attribution: Record<string, unknown> = {};

  for (const pop of ['L', 'B', 'F'])
    for (const s of [...baseSelectors, ...p2Names]) {
      const p = paths[pop]![s]!;

      if (!(p.sequentialDd > 0)) continue;

      const parts: Record<string, unknown>[] = [];
      let total = 0;

      for (const [i, c] of folds.entries()) {
        const label = p.parts[i]!.label;

        if (!label) continue;

        const door = await openDoor(nextDoor[c], `Stage 5c: ${c} slice re-opened for the sequential attribution`);
        const r = replay(door, subjectOfCfg(canonicalCfg(membersOf(c).find((e) => e.label === label)!.cfg)), vOptions, [cutoffEnd[c]]);
        const L = toLedger(r);
        const b = closeT(door, cutoffEnd[c]);
        const e = closeT(door, door.dates.at(-1)!);
        const a = Math.max(p.peakT, b);
        const z = Math.min(p.troughT, e);

        if (a >= z || p.troughT <= b || p.peakT >= e) continue;

        const att = attributeDrawdown(L, a, z);

        total += att.total;
        parts.push({ fold: c, label, from: stamp(a), to: stamp(z), total: r2(att.total), profitGiveback: r2(att.profitGiveback), principalLoss: r2(att.principalLoss), lots: att.rows.map((x) => ({ lot: x.lot, book: x.book, entry: x.entry, role: x.role, giveback: r2(x.profitGiveback), principalLoss: r2(x.principalLoss) })) });
      }

      const charges = p.parts.reduce((acc, x, i) => (x.charge && closeT0(folds[i]!) > p.peakT && closeT0(folds[i]!) <= p.troughT ? acc + x.charge : acc), 0);

      attribution[`${pop}/${s}`] = { sequentialDd: p.sequentialDd, peak: p.ddPeak, trough: p.ddTrough, attributed: r2(total), chargesInWindow: r2(charges), residual: r2(p.sequentialDd - total - charges), profitGiveback: r2(parts.reduce((x, q) => x + (q.profitGiveback as number), 0)), principalLoss: r2(parts.reduce((x, q) => x + (q.principalLoss as number), 0)), parts };
    }

  // the C24 primaries of every selector on FULL (previously examined history; descriptive only)
  const audit = readJson<{ rows: { label: string; windows: Record<string, unknown> }[] }>(path.join(resultsDir, 'audit', 'centres.json'));
  const full = await openDoor('FULL', 'Stage 5c: C24 primaries of every selector on FULL (previously examined; descriptive)');
  const c24 = new Map(membersOf('C24').map((e) => [e.label, e]));
  const c24Rows: Record<string, unknown> = {};

  for (const pop of ['L', 'B', 'F', 'N', 'U'])
    for (const [s, label] of Object.entries(sel.cutoffs.C24![pop]!.primaries)) {
      if (!label || c24Rows[label]) continue;

      const a = audit.rows.find((x) => x.label === label);

      if (a) {
        c24Rows[label] = { source: 'Stage 3 audit record', windows: a.windows };
        continue;
      }

      const r = replay(full, subjectOfCfg(canonicalCfg(c24.get(label)!.cfg)), vOptions, ['2024-12-31']);
      const L = toLedger(r);

      reconcile(r, L);
      c24Rows[label] = { source: `replayed (first chosen by ${pop}/${s})`, windows: bundleOf(full, r, L, portfolioPath(L), auditOptions).windows };
    }

  if (g5cSlices || g5cPaths) throw new Error(`G5c: ${g5cSlices} slice and ${g5cPaths} path mismatch(es) with the sealed records (nothing sealed)`);
  emit(
    'selection/folds.json',
    {
      stage: 'S5c fold paths of every selector (retrospective)',
      freeze: freeze.protocol.sha256,
      code: codeDigest(),
      gates: { G5c: 'PASS', labelCheck: labels.filter((l) => l.comparison.startsWith('RA1 vs original')).map((l) => `${l.population}: ${l.label}`) },
      slices: Object.fromEntries(Object.entries(slices).map(([c, m]) => [c, Object.fromEntries(Object.entries(m).map(([l, x]) => [l, { sliceNet: r2(x.sliceNet), sliceDd: r2(x.sliceDd), openAtBoundary: x.openAtBoundary, openAtEnd: x.openAtEnd, giveBack: x.giveBack, nextSlice: x.nextSlice, principal: x.principal }]))])),
      paths: Object.fromEntries(Object.entries(paths).map(([p, m]) => [p, Object.fromEntries(Object.entries(m).map(([s, x]) => [s, { ...x, peakT: undefined, troughT: undefined }]))])),
      labels,
      attribution,
      c24Full: c24Rows,
      seconds: (Date.now() - t0) / 1000
    },
    'S5c folds'
  );
};

// the instant of a fold's switch (its cutoff close), for charges inside a drawdown window
const closeT0 = (c: string) => Date.parse(`${cutoffEnd[c as CutoffKey]}T21:00:00Z`) / 1000;

if (process.argv[2] === 'select') selectStage();
else if (process.argv[2] === 'folds') await foldsStage();
else console.error('usage: select.ts select | folds [--dry]');
