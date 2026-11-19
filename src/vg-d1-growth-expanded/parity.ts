// The engineering gates (PROTOCOL.md §12), sealed in results/parity/parity.json before the freeze. A failure stops every
// dependent stage (the stages refuse to run without a sealed 0-failure record).
//
// E1 Priority 3's evaluation code is the code its sealed parity verified (digest).
// E2 L0 control reproduction through the 3B configuration path: C4, C85, E, A, B, IP, XP, SP equal Priority 5A's sealed
//    L0 development centres field for field; VG #2 harmonized and native equal their sealed records.
// E3 the archived Priority 3 instrument reproduces C4's and A's sealed confirmation statistics exactly.
// E4 Priority 3's independent reference on random configurations of every inclusion choice, with the identities.
// E5 single-family identities against Study 8's runNAllocator (D1) and runRiseTrading (Growth).
// E6 prefix causality on D19, D21 and D23 against D24 for random configurations of every inclusion choice.
// E7 inclusion canonicalization: the disabled book's vector never matters (identity and record).
import fs from 'node:fs';
import path from 'node:path';
import { coreDraws } from '../vg-growth-funding-lifecycle/instruments.ts';
import { p3 } from '../vg-d1-growth-diagnostic/context.ts';
import { type Check, checkD1, checkGrowth, checkReference, nativeArm, randomD1, randomGrowth } from '../vg-d1-growth-joint/parity.ts';
import { type EvalOptions, type Rec, evaluate, run } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { log, repoRoot, resultsDir, symbols } from './context.ts';
import {
  type Cfg,
  type Inc,
  canonicalOf,
  cellName,
  cells,
  cfgId,
  decode,
  incs,
  optionsOf,
  pinCell,
  pinStratum,
  screenGenomes
} from './config.ts';
import { loadControls } from './controls.ts';
import { openStudyDoor } from './doors.ts';
import { nbStats } from './fitness.ts';
import { p3EvaluationDigest } from './lab.ts';
import { plain, readJson, sealJson, sha256File } from './records.ts';

export const parityFile = path.join(resultsDir, 'parity', 'parity.json');

// Priority 5A's sealed development centres (its stage C record) — the L0 reproduction targets.
const p5aCentres = {
  file: 'research/vg-growth-funding-lifecycle/results/development/centres.json',
  sha256: '09afda78f6fa40fb18a43557e4e24a3bf7fe159c148cc6858b72b2c31785feb8'
};

const same = (a: unknown, b: unknown) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));
const firstDiff = (a: Record<string, unknown>, b: Record<string, unknown>) =>
  Object.keys({ ...a, ...b }).filter((k) => JSON.stringify(plain(a[k])) !== JSON.stringify(plain(b[k])));

// random 3B configurations of every cell (parity labels, never study labels)
export const randomCfgs = (perCell: number, label: string): Cfg[] =>
  cells.flatMap((cell) => {
    const out: Cfg[] = [];

    for (const [i, g] of screenGenomes(perCell * 8, 'coarse', 'parity', label, cellName(cell)).entries()) {
      if (out.length >= perCell) break;
      try {
        out.push(decode(pinStratum(pinCell(g, cell), cell, i), 'coarse'));
      } catch {
        // invalid draw
      }
    }
    return out;
  });

const causality = (early: Door, late: Door, cfgs: readonly Cfg[]): Check[] =>
  cfgs.map((c, i) => {
    const o: EvalOptions = optionsOf(c);
    const a = run(early, c.quad, o, true).result;
    const b = run(late, c.quad, o, true).result;
    const end = early.sessions - 1;
    const problems: string[] = [];

    for (let s = 0; s <= end; s++)
      if (a.daily[s] !== b.daily[s]) {
        problems.push(`daily mark ${early.dates[s]}: ${a.daily[s]} vs ${b.daily[s]}`);
        break;
      }

    const fa = a.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);
    const fb = b.funding.filter((f) => f.s <= end).map((f) => `${f.book}${f.t}${f.outcome}`);

    if (fa.join() !== fb.join()) problems.push('funding decisions differ');

    const la = a.lots.map((l) => `${l.book}${l.entryT}`);
    const lb = b.lots.filter((l) => l.entryS <= end).map((l) => `${l.book}${l.entryT}`);

    if (la.join() !== lb.join()) problems.push('funded lots differ');

    return { name: `E6 ${early.name}→${late.name} ${c.inc} #${i}`, pass: problems.length === 0, detail: problems };
  });

export const runParity = async () => {
  if (fs.existsSync(parityFile)) throw new Error('the engineering gates are sealed: parity.json is never rewritten');

  const checks: Check[] = [];
  const add = (c: Check) => {
    checks.push(c);
    if (!c.pass) log(`FAIL ${c.name}: ${JSON.stringify(c.detail).slice(0, 300)}`);
  };
  const t0 = Date.now();

  // E1
  add({ name: 'E1 Priority 3 evaluation digest', pass: p3EvaluationDigest() === p3.evaluationDigest, detail: p3EvaluationDigest() });

  const d24 = await openStudyDoor('D24', 'engineering gates E2–E7');
  const { controls } = loadControls();

  // E2
  if (sha256File(path.join(repoRoot, p5aCentres.file)) !== p5aCentres.sha256) throw new Error("5A's centres record changed");

  const sealed = readJson<{ centres: Record<string, { modes: { L0: { rec: Rec } } }>; native: { rec: Rec } }>(
    path.join(repoRoot, p5aCentres.file)
  );

  for (const c of controls) {
    const target = sealed.centres[c.key]?.modes.L0.rec;

    if (!target) throw new Error(`no sealed L0 centre for ${c.key}`);

    const mine = c.cfg ? evaluate(d24, c.cfg.quad, optionsOf(c.cfg)) : evaluate(d24, c.subject.quad, c.subject.options);
    const diff = firstDiff(mine as unknown as Record<string, unknown>, target as unknown as Record<string, unknown>);

    add({
      name: `E2 ${c.key} L0 development centre (${c.cfg ? '3B configuration path' : 'its own options'})`,
      pass: diff.length === 0,
      detail: { net: mine.net, dd: mine.dd, lots: mine.lots, differing: diff }
    });
  }

  const d = controls.find((c) => c.key === 'D')!;
  const native = evaluate(d24, d.subject.quad, { ...d.subject.options, d1Arm: 'native' });
  const refused = native.books['D1:GDX'].refused + native.books['D1:VGT'].refused;

  add({
    name: 'E2 VG #2 native = Study 8 F24 centre ($260,223.13 / $17,280.74 / 36 lots / 14 refusals)',
    pass: same(native, sealed.native.rec) && native.net === 260223.13 && native.dd === 17280.74 && native.lots === 36 && refused === 14,
    detail: { net: native.net, dd: native.dd, lots: native.lots, refused }
  });

  // E3: the archived instrument (384 draws each; evaluated fresh here, in-process)
  for (const key of ['C4', 'A']) {
    const c = controls.find((x) => x.key === key)!;
    const draws = coreDraws({ need: 'mixed', quad: c.cfg!.quad }, 'confirm');
    const o = optionsOf(c.cfg!);
    const centre = evaluate(d24, c.cfg!.quad, o);
    const recs = draws.map((x) => evaluate(d24, x.quad, o));
    const mine = nbStats(
      centre,
      recs,
      draws.map((x) => x.clipped)
    );
    const target = (c.subject.evidence as { confirm: unknown }).confirm;

    add({
      name: `E3 ${key} archived confirmation statistics (Priority 3's instrument, ${draws.length} unique draws)`,
      pass: same(mine, target),
      detail: { median: mine.median, p10: mine.p10, p90Dd: mine.p90Dd, breachShare: mine.breachShare, target }
    });
  }

  // E4: the independent reference, 48 random configurations per inclusion choice (6 per cell × the cells)
  const rnd = randomCfgs(12, 'reference');

  for (const inc of incs) {
    const sub = rnd.filter((c) => c.inc === inc).slice(0, 48);

    sub.forEach((c, i) => {
      const r = checkReference(d24, c.quad, optionsOf(c).enabled ?? {}, `E4 ${inc} #${i}`);

      add({ ...r, name: `E4 reference ${inc} #${i} (${cfgId(c)})` });
    });
  }

  // E5: single-family identities (D1: VG #2's pair under both armings and random pairs; Growth: random books, both symbols)
  const vg2 = d.subject.quad.d1;

  add({ ...checkD1(d24, vg2, 0, 'VG #2 harmonized'), name: 'E5 D1 VG #2 harmonized vs runNAllocator' });
  add({ ...checkD1(d24, vg2, nativeArm(d24), 'VG #2 native'), name: 'E5 D1 VG #2 native vs runNAllocator' });

  const rd = randomD1(16, 'e5');

  for (let i = 0; i < 8; i++)
    add({ ...checkD1(d24, { GDX: rd[2 * i]!, VGT: rd[2 * i + 1]! }, 0, `random pair ${i}`), name: `E5 D1 random pair ${i}` });

  const rg = randomGrowth(16, 'e5');

  rg.forEach((g, i) => {
    const s = symbols[i % 2]!;

    add({ ...checkGrowth(d24, s, g, `random ${i}`), name: `E5 Growth ${s} random ${i} vs runRiseTrading` });
  });

  // E6: prefix causality (24 random configurations: 3 per cell) on D19, D21, D23 against D24
  const causal = randomCfgs(3, 'causality');

  for (const name of ['D19', 'D21', 'D23'] as const) {
    const early = await openStudyDoor(name, `engineering gates E6 (${name} prefix)`);

    for (const c of causality(early, d24, causal)) add(c);
  }

  // E7: inclusion canonicalization (the disabled book's vector replaced by another configuration's)
  const pairs = randomCfgs(6, 'canonical');

  pairs.forEach((c, i) => {
    if (c.inc === 'B') return;

    const other = pairs[(i + 7) % pairs.length]!;
    const off = c.inc === 'V' ? 'GDX' : 'VGT';
    const altQuad = { ...c.quad, g: { ...c.quad.g, [off]: other.quad.g[off === 'GDX' ? 'VGT' : 'GDX'] } };
    const alt = canonicalOf(c.inc as Inc, altQuad);
    const a = evaluate(d24, c.quad, optionsOf(c));
    const b = evaluate(d24, altQuad, optionsOf(c));
    const diff = firstDiff(a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>).filter(
      (k) => k !== 'id'
    );
    const disabledFunded = b.books[`G:${off}`].lots > 0;

    add({
      name: `E7 canonicalization ${c.inc} #${i}`,
      pass: cfgId(alt) === cfgId(c) && diff.length === 0 && !disabledFunded,
      detail: { sameId: cfgId(alt) === cfgId(c), differing: diff, disabledFunded }
    });
  });

  const failed = checks.filter((c) => !c.pass);
  const record = {
    stage: 'engineering gates',
    checks: checks.length,
    failed: failed.length,
    failures: failed.map((c) => c.name),
    byGate: Object.fromEntries(
      ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7'].map((g) => [
        g,
        { checks: checks.filter((c) => c.name.startsWith(g)).length, failed: failed.filter((c) => c.name.startsWith(g)).length }
      ])
    ),
    results: checks,
    priority3EvaluationDigest: p3EvaluationDigest(),
    p5aCentres,
    seconds: Math.round((Date.now() - t0) / 1000),
    finished: new Date().toISOString()
  };

  sealJson(parityFile, record, 'engineering gates');
  log(`engineering gates: ${checks.length} checks, ${failed.length} failed`);
  return record;
};
