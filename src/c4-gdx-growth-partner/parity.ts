// The engineering gates (PROTOCOL.md §12), sealed in results/parity/parity.json before the freeze. A failure stops every
// dependent stage (the stages refuse to run without a sealed 0-failure record).
//
// E1 Priority 3's evaluation code is the code its sealed parity verified (digest).
// E2 L0 anchor and control reproduction through THIS study's configuration path, field for field: C4-refined = Priority
//    3B's sealed development centre; C4, A, S4 (VGT #4 alone), GP4, E, D = Priority 5A's sealed L0 centres; VG #2 native
//    = Study 8 F24 ($260,223.13 / $17,280.74 / 36 lots / 14 refusals).
// E3 Priority 3B's fresh confirmation instrument (its namespace, labels ('confirm', rep, 'C24'), joint scope) reproduces
//    3B's sealed statistics of C4 and C4-refined exactly (the "archived instrument" of this study).
// E4 Priority 3's independent reference on random configurations of every arm, with the identities (Σ lots = net, one
//    slot, principal ≤ $100,000, a disabled book never funded, funded lots copy their virtual fills).
// E5 single-family identities: VG #2's D1 pair = Study 8's runNAllocator; VGT Growth #4 alone (the G baseline) and random
//    GDX Growth books = runRiseTrading.
// E6 prefix causality on D19, D21 and D23 against D24 for random configurations of every arm (decisions, lots, marks).
// E7 GDX OFF identity: a partner with Growth·GDX disabled equals its arm's baseline field for field (bar the id); inactive
//    GDX genes never change the identity; an unfunded GDX book leaves the baseline's ledger.
// E8 paired draws: a partner's whole-portfolio rows move the anchors exactly as its baseline's rows do (row by row), and
//    its GDX-only rows keep the anchors at their frozen values.
import fs from 'node:fs';
import path from 'node:path';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { type Check, checkD1, checkGrowth, checkReference, nativeArm } from '../vg-d1-growth-joint/parity.ts';
import { type EvalOptions, type Rec, evaluate, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import {
  canonicalOf as p3bCanonicalOf,
  incOfEnabled as p3bIncOf,
  neighbourhood as p3bNeighbourhood
} from '../vg-d1-growth-expanded/config.ts';
import { log, resultsDir } from './context.ts';
import { c4Refined, c4Targets, loadControls, readPinned, sources } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { nbStats } from './fitness.ts';
import { p3EvaluationDigest } from './lab.ts';
import { plain, sealJson } from './records.ts';
import {
  type Arm,
  type Built,
  type GConfig,
  arms,
  build,
  decodeGdx,
  entries,
  gId,
  pinEntry,
  pinStratum,
  rowsOf,
  screenGenomes
} from './space.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

const same = (a: unknown, b: unknown) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));
const firstDiff = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(plain(a[k])) !== JSON.stringify(plain(b[k])));

// random GDX books (parity labels, never study labels), both entries and every stratum
export const randomGdx = (n: number, label: string): GConfig[] => {
  const out: GConfig[] = [];

  for (const [i, g] of screenGenomes(n * 8, 'parity', label).entries()) {
    if (out.length >= n) break;

    const entry = entries[i % 2]!;

    try {
      out.push(decodeGdx(pinStratum(pinEntry(g, entry), entry, Math.floor(i / 2))));
    } catch {
      // invalid draw
    }
  }
  return out;
};

export const randomBuilt = (perArm: number, label: string): Built[] => {
  const { anchors } = loadControls();

  return arms.flatMap((arm: Arm) => randomGdx(perArm, `${label}-${arm}`).map((g) => build(anchors[arm], g)));
};

const causality = (early: Door, late: Door, bs: readonly Built[]): Check[] =>
  bs.map((b, i) => {
    const a = run(early, b.quad, b.options, true).result;
    const z = run(late, b.quad, b.options, true).result;
    const end = early.sessions - 1;
    const problems: string[] = [];

    for (let s = 0; s <= end; s++)
      if (a.daily[s] !== z.daily[s]) {
        problems.push(`daily mark ${early.dates[s]}: ${a.daily[s]} vs ${z.daily[s]}`);
        break;
      }

    const fa = a.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);
    const fz = z.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);

    if (fa.join() !== fz.join()) problems.push('funding decisions differ');

    const la = a.lots.map((l) => `${l.book}${l.entryT}`);
    const lz = z.lots.filter((l) => l.entryS <= end).map((l) => `${l.book}${l.entryT}`);

    if (la.join() !== lz.join()) problems.push('funded lots differ');

    return { name: `E6 ${early.name}→${late.name} ${b.cfg.arm} #${i}`, pass: problems.length === 0, detail: problems };
  });

interface P3BEvidence {
  label: string;
  centre: Rec;
  confirm: Record<string, unknown>;
}

export const runParity = async () => {
  if (fs.existsSync(parityFile)) throw new Error('the engineering gates are sealed: parity.json is never rewritten');

  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    if (!c.pass) log(`FAIL ${c.name}: ${JSON.stringify(c.detail).slice(0, 300)}`);
  };
  const t0 = Date.now();

  // E1
  add({
    name: 'E1 Priority 3 evaluation digest',
    pass: p3EvaluationDigest() === p3.evaluationDigest,
    detail: p3EvaluationDigest()
  });

  const d24 = await openStudyDoor('D24', 'engineering gates E2–E8');
  const { controls, subjects } = loadControls();
  const ctl = (k: string) => controls.find((c) => c.key === k)!;

  // E2
  const p5a = readPinned<{ centres: Record<string, { modes: { L0: { rec: Rec } } }>; native: { rec: Rec } }>(
    sources.p5aCentres
  );
  const p3bSel = readPinned<{ evidence: P3BEvidence[] }>(sources.p3bSelection.C24);
  const refinedEv = p3bSel.evidence.find((e) => e.label === c4Refined.label3B)!;
  const c4Ev = p3bSel.evidence.find((e) => e.label === 'control: C4')!;
  const targets: [string, string, Rec][] = [
    ['R0', "C4-refined = Priority 3B's sealed development centre", refinedEv.centre],
    ['O0', "C4 = Priority 5A's sealed L0 centre", p5a.centres.C4!.modes.L0.rec],
    ['OA', "A = Priority 5A's sealed L0 centre", p5a.centres.A!.modes.L0.rec],
    ['G0', "VGT Growth #4 alone (S4) = Priority 5A's sealed L0 centre", p5a.centres.S4!.modes.L0.rec],
    ['GA', "GP4 = Priority 5A's sealed L0 centre", p5a.centres.GP4!.modes.L0.rec],
    ['E', "E = Priority 5A's sealed L0 centre", p5a.centres.E!.modes.L0.rec],
    ['D', "D (VG #2 harmonized) = Priority 5A's sealed L0 centre", p5a.centres.D!.modes.L0.rec]
  ];

  for (const [k, name, target] of targets) {
    const c = ctl(k);
    const mine = evaluate(d24, c.quad, c.options);
    const diff = firstDiff(mine as unknown as Record<string, unknown>, target as unknown as Record<string, unknown>);

    add({
      name: `E2 ${k}: ${name}`,
      pass: diff.length === 0,
      detail: { net: mine.net, dd: mine.dd, lots: mine.lots, differing: diff }
    });
  }

  const r0 = evaluate(d24, ctl('R0').quad, ctl('R0').options);
  const o0 = evaluate(d24, ctl('O0').quad, ctl('O0').options);

  add({
    name: `E2 known development targets: C4 $${c4Targets.development.net} / $${c4Targets.development.dd}; C4-refined $${c4Refined.targets.development.net} / $${c4Refined.targets.development.dd}`,
    pass:
      o0.net === c4Targets.development.net &&
      o0.dd === c4Targets.development.dd &&
      r0.net === c4Refined.targets.development.net &&
      r0.dd === c4Refined.targets.development.dd,
    detail: { C4: [o0.net, o0.dd], C4refined: [r0.net, r0.dd] }
  });

  const d = ctl('D');
  const native = evaluate(d24, d.quad, { ...d.options, d1Arm: 'native' });
  const refused = native.books['D1:GDX'].refused + native.books['D1:VGT'].refused;

  add({
    name: 'E2 VG #2 native = Study 8 F24 centre ($260,223.13 / $17,280.74 / 36 lots / 14 refusals)',
    pass:
      same(native, p5a.native.rec) &&
      native.net === 260223.13 &&
      native.dd === 17280.74 &&
      native.lots === 36 &&
      refused === 14,
    detail: { net: native.net, dd: native.dd, lots: native.lots, refused }
  });

  // E3: Priority 3B's fresh confirmation instrument (384 draws each; evaluated in-process here)
  for (const [k, ev] of [
    ['O0', c4Ev],
    ['R0', refinedEv]
  ] as const) {
    const c = ctl(k);
    const inc = p3bIncOf(c.enabled)!;
    const cfg = p3bCanonicalOf(inc, c.quad);
    const seen = new Set<string>();
    const recs: Rec[] = [];
    const clipped: number[] = [];

    for (let rep = 1; rep <= 3; rep++)
      for (const p of p3bNeighbourhood(cfg, { name: 'confirm', n: 128, labels: ['confirm', rep, 'C24'] })) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        recs.push(evaluate(d24, p.cfg.quad, c.options));
        clipped.push(p.clipped);
      }

    const centre = evaluate(d24, c.quad, c.options);
    const mine = nbStats(centre, recs, clipped);

    add({
      name: `E3 ${k} Priority 3B fresh confirmation statistics (its instrument, ${recs.length} unique draws)`,
      pass: same(mine, ev.confirm),
      detail: { median: mine.median, p10: mine.p10, p90Dd: mine.p90Dd, breachShare: mine.breachShare }
    });
  }

  // E4: the independent reference (16 random configurations per arm)
  const rnd = randomBuilt(16, 'reference');

  rnd.forEach((b, i) => {
    const r = checkReference(d24, b.quad, b.options.enabled ?? {}, `E4 ${b.cfg.arm} #${i}`);

    add({ ...r, name: `E4 reference ${b.cfg.arm} #${i} (${b.id})` });
  });

  // E5: single-family identities
  const vg2 = d.quad.d1;

  add({ ...checkD1(d24, vg2, 0, 'VG #2 harmonized'), name: 'E5 D1 VG #2 harmonized vs runNAllocator' });
  add({ ...checkD1(d24, vg2, nativeArm(d24), 'VG #2 native'), name: 'E5 D1 VG #2 native vs runNAllocator' });
  add({
    ...checkGrowth(d24, 'VGT', loadControls().anchors.G.vgt, 'VGT #4'),
    name: 'E5 Growth VGT #4 alone vs runRiseTrading'
  });
  add({
    ...checkGrowth(d24, 'VGT', loadControls().anchors.R.vgt, 'C4-refined VGT'),
    name: "E5 Growth C4-refined's VGT book vs runRiseTrading"
  });
  randomGdx(12, 'e5').forEach((g, i) =>
    add({ ...checkGrowth(d24, 'GDX', g, `random ${i}`), name: `E5 Growth GDX random ${i} vs runRiseTrading` })
  );

  // E6: prefix causality (6 random configurations per arm) on D19, D21, D23 against D24
  const causal = randomBuilt(6, 'causality');

  for (const name of ['D19', 'D21', 'D23'] as const) {
    const early = await openStudyDoor(name, `engineering gates E6 (${name} prefix)`);

    for (const c of causality(early, d24, causal)) add(c);
  }

  // E7: GDX OFF identity, inactive-gene canonicalization, unfunded = baseline ledger
  const base: Record<Arm, Rec> = {
    R: r0,
    O: o0,
    G: evaluate(d24, ctl('G0').quad, ctl('G0').options)
  };

  randomBuilt(4, 'off-identity').forEach((b, i) => {
    const off: EvalOptions = { ...b.options, enabled: { ...(b.options.enabled ?? {}), 'G:GDX': false } };
    const r = evaluate(d24, b.quad, off);
    const diff = firstDiff(
      r as unknown as Record<string, unknown>,
      base[b.cfg.arm] as unknown as Record<string, unknown>
    ).filter((k) => k !== 'id');
    const withInactive = build(loadControls().anchors[b.cfg.arm], { ...b.cfg.gdx!, ...inactiveNoise(b.cfg.gdx!) });

    add({
      name: `E7 GDX OFF = baseline ${b.cfg.arm} #${i}`,
      pass: diff.length === 0 && withInactive.id === b.id,
      detail: { differing: diff, sameIdWithInactiveNoise: withInactive.id === b.id }
    });
  });
  for (const b of rnd) {
    const r = evaluate(d24, b.quad, b.options);

    if (r.books['G:GDX'].lots === 0) {
      add({
        name: `E7 an unfunded GDX book leaves the baseline ledger (${b.cfg.arm} ${b.id})`,
        pass: r.signature === base[b.cfg.arm].signature && r.net === base[b.cfg.arm].net,
        detail: { net: r.net, base: base[b.cfg.arm].net }
      });
      break;
    }
  }

  // E8: paired draws
  for (const arm of arms) {
    const partner = rnd.find((b) => b.cfg.arm === arm)!;
    const baseline = build(loadControls().anchors[arm], null);
    const fam = { name: 'confirm', n: 128, labels: ['parity-e8', arm], scope: 'joint' as const };
    const a = rowsOf(partner, fam);
    const z = rowsOf(baseline, fam);
    const g = rowsOf(partner, { ...fam, scope: 'gdx' });
    const anchorsSame = a.every(
      (r, i) =>
        JSON.stringify(r.quad.d1) === JSON.stringify(z[i]!.quad.d1) && gId(r.quad.g.VGT) === gId(z[i]!.quad.g.VGT)
    );
    const gdxOnly = g.every(
      (r) =>
        JSON.stringify(r.quad.d1) === JSON.stringify(partner.quad.d1) && gId(r.quad.g.VGT) === gId(partner.quad.g.VGT)
    );
    const gdxSame = a.every((r, i) => gId(r.quad.g.GDX) === gId(g[i]!.quad.g.GDX));
    const moved =
      arm === 'G'
        ? a.some((r) => gId(r.quad.g.VGT) !== gId(partner.quad.g.VGT))
        : a.some((r) => JSON.stringify(r.quad.d1) !== JSON.stringify(partner.quad.d1));

    add({
      name: `E8 paired draws ${arm}: identical anchor moves row by row; GDX-only rows keep the anchors; the GDX move is the same in both scopes; the anchors really move`,
      pass: anchorsSame && gdxOnly && gdxSame && moved,
      detail: { anchorsSame, gdxOnly, gdxSame, moved }
    });
  }

  const failed = checks.filter((c) => !c.pass);
  const record = {
    stage: 'engineering gates',
    checks: checks.length,
    failed: failed.length,
    failures: failed.map((c) => c.name),
    byGate: Object.fromEntries(
      ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8'].map((g) => [
        g,
        {
          checks: checks.filter((c) => c.name.startsWith(g)).length,
          failed: failed.filter((c) => c.name.startsWith(g)).length
        }
      ])
    ),
    results: checks,
    priority3EvaluationDigest: p3EvaluationDigest(),
    sources,
    subjects: subjects.length,
    seconds: Math.round((Date.now() - t0) / 1000),
    finished: new Date().toISOString()
  };

  sealJson(parityFile, record, 'engineering gates');
  log(`engineering gates: ${checks.length} checks, ${failed.length} failed`);
  return record;
};

// values for the inactive numeric inputs of a GDX book (they must never change its identity)
const inactiveNoise = (g: GConfig): Record<string, number> => {
  const out: Record<string, number> = {};

  if (g.drawdownRecoveryGateEnabled !== true) out.dipThresholdPercent = 9.5;
  if (g.retentionEnabled !== true) out.retentionSellPercent = 40;
  if (g.initialStopEnabled !== true) out.initialStopAtrMultiple = 2.5;
  return out;
};
