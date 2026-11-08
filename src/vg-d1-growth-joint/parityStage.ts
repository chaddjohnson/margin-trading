// The parity stage (PROTOCOL.md §15.1): P1–P4 against the canonical engines, Priority 2's frozen engine and the
// independent reference, P5 the pool's causality (shorter-prefix invariance), P6 the native and sealed reproduction
// targets — on development doors only (D19, D21, D24). Any failure exits 1 and blocks every dependent stage.
import fs from 'node:fs';
import path from 'node:path';
import { resolveControls } from './controls.ts';
import { cacheRoot, log, repoRoot, resultsDir, r2 } from './context.ts';
import { type Door, openPrefixDoor } from './data.ts';
import { evaluate, run } from './evaluate.ts';
import { codeDigest } from './lab.ts';
import {
  type Check,
  canonicalD1,
  canonicalGrowth,
  checkD1,
  checkGrowth,
  checkP2,
  checkReference,
  nativeArm,
  oneSymbol,
  randomD1,
  randomGrowth,
  randomQuads
} from './parity.ts';
import { readJson, sealJson, sha256Text } from './records.ts';
import { type Quad, d1Placeholder } from './space.ts';
import { gPlaceholder } from './controls.ts';

// Causality: every configuration's run on an earlier door equals its run on a later door through the earlier door's
// last session (decisions, funding, lots and marks never read later data).
export const prefixCausality = (early: Door, late: Door, quads: readonly Quad[]): Check[] =>
  quads.map((q, i) => {
    const a = run(early, q, {}, true).result;
    const b = run(late, q, {}, true).result;
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
    if (a.dd.max > 0 && b.dd.troughT <= a.dd.troughT && b.dd.max < a.dd.max) problems.push('drawdown prefix');

    return { name: `P5 causality ${early.name}→${late.name} #${i}`, pass: problems.length === 0, detail: problems };
  });

// Priority 2's sealed C24 development figures of its fixed controls (research/vgt-d1-growth-joint, sealed record
// results/folds/C24/selection.json, sha256 d04570f6…), and Study 8's sealed F24 training centre of VG #2.
const p2Selection = 'research/vgt-d1-growth-joint/results/folds/C24/selection.json';
const p2SelectionSha = 'd04570f65dad650ecd66059d0e9a6db09589b645cb7b1a25b568a808057975da';
const s8Qualification = 'research/study8-expanded-regime-d1/results/qualify/VG/F24/qualification.json';

export const runParity = async (name = 'parity', dry = false) => {
  const checks: Check[] = [];
  const t0 = Date.now();
  const d19 = await openPrefixDoor('D19', 'parity P1–P5 (engineering)');
  const d21 = await openPrefixDoor('D21', 'parity P5 causality (engineering)');
  const d24 = await openPrefixDoor('D24', 'parity P1–P6 (engineering; controls are known targets)');
  const c = await resolveControls();
  const fill = { d1: d1Placeholder, g: gPlaceholder };

  for (const door of [d19, d24]) {
    const big = door.name === 'D24';

    // P1: VG #2's pair and each book alone, the D1 primary, random books and pairs; both arming conventions
    for (const arm of [0, nativeArm(door)]) {
      checks.push(checkD1(door, c.d1.vg2, arm, `${door.name} VG#2 pair`));
      checks.push(checkD1(door, { GDX: c.d1.vg2.GDX }, arm, `${door.name} VG#2 GDX book`));
      checks.push(checkD1(door, { VGT: c.d1.vg2.VGT }, arm, `${door.name} VG#2 VGT book`));
      checks.push(checkD1(door, { VGT: c.d1.primary }, arm, `${door.name} D1 primary`));
    }

    const rd = randomD1(big ? 120 : 60, String(door.name));

    for (let i = 0; i < rd.length / 3; i++) {
      checks.push(checkD1(door, { GDX: rd[3 * i]!, VGT: rd[3 * i + 1]! }, 0, `${door.name} random pair ${i}`));
      checks.push(checkD1(door, { [i % 2 ? 'VGT' : 'GDX']: rd[3 * i + 2]! }, 0, `${door.name} random book ${i}`));
    }

    // P2: the Growth controls on their symbols (and on the other symbol), random configurations on both symbols
    for (const [l, g] of Object.entries(c.g))
      for (const s of ['GDX', 'VGT'] as const) checks.push(checkGrowth(door, s, g, `${door.name} ${l}`));
    for (const s of ['GDX', 'VGT'] as const)
      for (const [i, g] of randomGrowth(big ? 40 : 20, `${door.name}-${s}`).entries())
        checks.push(checkGrowth(door, s, g, `${door.name} random ${i}`));

    // P3: one-symbol D1 + Growth pools against Priority 2's frozen engine (both symbols, both priorities)
    const pd = randomD1(big ? 48 : 24, `${door.name}-p3`);
    const pg = randomGrowth(big ? 48 : 24, `${door.name}-p3`);

    for (const first of ['D1', 'G'] as const) {
      checks.push(checkP2(door, 'VGT', oneSymbol('VGT', c.d1.primary, c.g.g4, first, fill), `${door.name} primary+#4 ${first}`));
      checks.push(
        checkP2(door, 'VGT', oneSymbol('VGT', c.d1.primary, c.g.g085, first, fill), `${door.name} primary+08500a60 ${first}`)
      );
    }
    for (let i = 0; i < pd.length; i++)
      checks.push(
        checkP2(
          door,
          i % 2 ? 'VGT' : 'GDX',
          oneSymbol(i % 2 ? 'VGT' : 'GDX', pd[i]!, pg[i]!, i % 4 < 2 ? 'D1' : 'G', fill),
          `${door.name} random ${i}`
        )
      );

    // P4: cross-symbol pools against the reference: four components, the Growth pair, D1·GDX + Growth·VGT and the
    // reverse, and single components with partial exits
    const quads = randomQuads(big ? 64 : 32, String(door.name));

    quads.forEach((q, i) => {
      const kinds: [string, Record<string, boolean>][] = [
        ['four components', {}],
        ['Growth pair', { 'D1:GDX': false, 'D1:VGT': false }],
        ['D1·GDX + Growth·VGT', { 'D1:VGT': false, 'G:GDX': false }],
        ['D1·VGT + Growth·GDX', { 'D1:GDX': false, 'G:VGT': false }]
      ];
      const [kname, enabled] = kinds[i % kinds.length]!;

      checks.push(checkReference(door, q, enabled, `${door.name} ${kname} #${i}`));
    });
  }

  // P5: causality D19 → D24 and D21 → D24
  checks.push(...prefixCausality(d19, d24, randomQuads(24, 'causality-19')));
  checks.push(...prefixCausality(d21, d24, randomQuads(12, 'causality-21')));

  // P6: native and sealed reproduction targets (development; every one a known result)
  const targets: Record<string, unknown> = {};
  const t = (label: string, got: number, want: number) => {
    const pass = Math.abs(r2(got) - want) < 0.005;

    checks.push({ name: `P6 ${label}`, pass, detail: { got: r2(got), want } });
  };
  const s8 = readJson<{ candidates: { id: string; evidence: { centre: { record: Record<string, number> } } }[] }>(
    path.join(repoRoot, s8Qualification)
  ).candidates.find((x) => x.id === 'VGT:d1-bd80e32ee4+GDX:d1-7b99d2833d')!.evidence.centre.record;
  const vgNative = canonicalD1(d24, c.d1.vg2, nativeArm(d24));
  const vgNet = vgNative.lots.reduce((a, l) => a + l.net, 0);

  t('VG #2 native development net (Study 8 F24 training centre)', vgNet, s8.net!);
  t('VG #2 native development minute DD', vgNative.minuteDrawdown.maximum, Math.round(s8.dd! * 100) / 100);
  checks.push({
    name: 'P6 VG #2 native development lots / refusals (36 / 14)',
    pass: vgNative.lots.length === s8.lots && vgNative.signals.filter((x) => x.outcome === 'refused').length === s8.refused,
    detail: { lots: vgNative.lots.length, refused: vgNative.signals.filter((x) => x.outcome === 'refused').length }
  });
  targets['VG #2 D24 native'] = { net: r2(vgNet), dd: r2(vgNative.minuteDrawdown.maximum), lots: vgNative.lots.length };

  const harm = canonicalD1(d24, c.d1.vg2, 0);

  targets['VG #2 D24 harmonized'] = {
    net: r2(harm.lots.reduce((a, l) => a + l.net, 0)),
    dd: r2(harm.minuteDrawdown.maximum),
    lots: harm.lots.length,
    firstEntry: harm.lots[0] ? d24.dates[harm.lots[0].entryIndex] : null
  };

  const sel = fs.readFileSync(path.join(repoRoot, p2Selection));

  if (sha256Text(sel) !== p2SelectionSha) throw new Error(`${p2Selection} is not Priority 2's sealed record`);

  const p2 = JSON.parse(sel.toString('utf8')) as { evidence: { label: string; centre: { net: number; dd: number; lots: number } }[] };
  const p2c = (label: string) => p2.evidence.find((e) => e.label === `control: ${label}`)!.centre;
  const vgtOnly = { 'D1:GDX': false, 'G:GDX': false } as const;

  for (const [label, q] of [
    ['D1 primary + Growth #4 · A', oneSymbol('VGT', c.d1.primary, c.g.g4, 'D1', fill)],
    ['D1 primary + Growth 08500a60 · A', oneSymbol('VGT', c.d1.primary, c.g.g085, 'D1', fill)]
  ] as const) {
    const r = evaluate(d24, q, { enabled: vgtOnly });
    const want = p2c(label);

    t(`Priority 2 sealed ${label}: net`, r.net, want.net);
    t(`Priority 2 sealed ${label}: minute DD`, r.dd, want.dd);
    checks.push({ name: `P6 Priority 2 sealed ${label}: lots`, pass: r.lots === want.lots, detail: { got: r.lots, want: want.lots } });
  }

  for (const [label, g, want] of [
    ['Growth #4 alone', c.g.g4, p2c('Growth #4 alone')],
    ['Growth 08500a60 alone', c.g.g085, p2c('Growth 08500a60 alone')]
  ] as const) {
    const canon = canonicalGrowth(d24, 'VGT', g);

    t(`${label} development net`, canon.metrics.pnl.totalMarkedNetUsd, want.net);
    t(`${label} development minute DD`, canon.metrics.drawdown.minute.maximumUsd, want.dd);
  }

  const prim = canonicalD1(d24, { VGT: c.d1.primary }, nativeArm(d24));

  t('D1 primary development net (B1 at 5 bps)', prim.lots.reduce((a, l) => a + l.net, 0), p2c('D1 primary alone').net);
  t('D1 primary development minute DD', prim.minuteDrawdown.maximum, p2c('D1 primary alone').dd);

  const failed = checks.filter((x) => !x.pass);
  const record = {
    stage: 'parity',
    evaluationDigest: codeDigest(),
    doors: ['D19', 'D21', 'D24'],
    checks: checks.length,
    failed: failed.length,
    failures: failed,
    targets,
    seconds: Math.round((Date.now() - t0) / 1000),
    results: checks.map((x) => ({ name: x.name, pass: x.pass, detail: x.detail }))
  };
  const file = dry
    ? path.join(cacheRoot, 'parity-dry', `${name}-${Date.now()}.json`)
    : path.join(resultsDir, 'parity', `${name}.json`);

  if (dry) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(record, null, 1));
  } else sealJson(file, record, name);

  log(`parity: ${checks.length} checks, ${failed.length} failed (${record.seconds} s) → ${path.relative(repoRoot, file)}`);
  if (failed.length) {
    for (const f of failed.slice(0, 30)) log(`FAILED ${f.name}: ${JSON.stringify(f.detail).slice(0, 400)}`);
    process.exit(1);
  }
};
