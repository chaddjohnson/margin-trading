// The parity stage (PROTOCOL.md §9.1): P1–P2 trade-by-trade against the canonical engines, P3 the pool's identities
// and causality, P4 the native reproduction of the fixed single-family controls (development through the physical
// door; full history through the FULL door for the known targets only). Any failure exits 1 and blocks every
// dependent stage.
import path from 'node:path';
import { detailOf as growthDetail, runOf as growthRunOf } from '../growth140-vgt-s8m/engine.ts';
import { resolveControls } from './controls.ts';
import { chronology, log, resultsDir, r2 } from './context.ts';
import { type Door, indexOf, openFullDoor, openPrefixDoor } from './data.ts';
import { run } from './evaluate.ts';
import { codeDigest } from './lab.ts';
import { type Check, canonicalD1, checkD1, checkGrowth, nativeArm, randomD1, randomGrowth } from './parity.ts';
import { sealJson } from './records.ts';
import { benchJoints } from './bench.ts';
import { type Joint, normalize, structureOf } from './space.ts';

const growthDoor = (d: Door) => ({
  name: 'fixture' as const,
  history: d.history,
  warmup: 0,
  dataSha256: d.dataSha256,
  from: d.from,
  to: d.to
});

export const poolIdentities = (door: Door, n: number, label: string): Check[] => {
  const checks: Check[] = [];
  const joints = benchJoints(n);
  let identicalAB = 0;
  let comparedAB = 0;

  for (const j of joints) {
    const x = run(door, j, {}, true);
    const r = x.result;
    const sum = r.lots.reduce((a, l) => a + l.net, 0);
    const problems: string[] = [];

    if (Math.abs(sum - r.net) > 1e-6) problems.push(`Σ lots ${sum} ≠ net ${r.net}`);
    for (const f of r.funding)
      if (f.grant > f.capacity + 1e-6 && j.a.arch === 'B') problems.push(`grant ${f.grant} > capacity ${f.capacity}`);
    if (j.a.arch === 'A') {
      // A: never two lots at once
      const spans = r.lots.map((l) => [l.entryT, l.open ? Infinity : l.fills.at(-1)!.t] as const);

      for (let i = 1; i < spans.length; i++) if (spans[i]![0] < spans[i - 1]![1]) problems.push('A: overlapping lots');
    }
    if (r.peakPrincipal > 100000 + 1e-6) problems.push(`principal ${r.peakPrincipal} above the budget`);

    for (const fam of ['D1', 'G'] as const) {
      const only = run(door, j, { enabled: { D1: fam === 'D1', G: fam === 'G' } }, true).result;

      if (only.lots.some((l) => l.family !== fam)) problems.push(`${fam} alone funded the other family`);
    }

    // B at 100%/100% equals A whenever no partial sale occurs in the funded lots of either
    const s = structureOf(j.g);

    if (s.retain !== 'on') {
      const a = run(door, normalize({ ...j, a: { arch: 'A', d1Target: 1, gTarget: 1, first: j.a.first } }), {}).result;
      const b = run(door, normalize({ ...j, a: { arch: 'B', d1Target: 1, gTarget: 1, first: j.a.first } }), {}).result;

      comparedAB++;
      if (a.net === b.net && a.dd.max === b.dd.max && a.lots.length === b.lots.length) identicalAB++;
      else problems.push('B 100/100 ≠ A without a partial sale');
    }

    checks.push({ name: `P3 ${label} ${x.result.lots.length} lots`, pass: problems.length === 0, detail: problems });
  }

  checks.push({
    name: `P3 ${label} B100/100 = A without partial sales (${identicalAB}/${comparedAB})`,
    pass: identicalAB === comparedAB
  });
  return checks;
};

// Causality: every configuration's run on an earlier door equals its run on a later door through the earlier door's
// last session (decisions, funding, lots and marks never read later data).
export const prefixCausality = (early: Door, late: Door, joints: readonly Joint[]): Check[] =>
  joints.map((j, i) => {
    const a = run(early, j, {}, true).result;
    const b = run(late, j, {}, true).result;
    const end = early.ds.sessionCount - 1;
    const problems: string[] = [];

    for (let s = 0; s <= end; s++)
      if (a.daily[s] !== b.daily[s]) {
        problems.push(`daily mark ${early.ds.dates[s]}: ${a.daily[s]} vs ${b.daily[s]}`);
        break;
      }

    const fa = a.funding.filter((f) => f.s <= end).map((f) => `${f.family}${f.t}${f.outcome}${f.grant}`);
    const fb = b.funding.filter((f) => f.s <= end).map((f) => `${f.family}${f.t}${f.outcome}${f.grant}`);

    if (fa.join() !== fb.join()) problems.push('funding decisions differ');

    return { name: `P3 causality ${early.name}→${late.name} #${i}`, pass: problems.length === 0, detail: problems };
  });

export const runParity = async (name = 'parity') => {
  const checks: Check[] = [];
  const d19 = await openPrefixDoor('D19', 'parity P1–P3 (engineering)');
  const d24 = await openPrefixDoor('D24', 'parity P1–P4 (engineering; controls are known targets)');
  const c = await resolveControls();

  for (const door of [d19, d24]) {
    for (const [l, g] of Object.entries(c.d1))
      for (const arm of [0, nativeArm(door)]) checks.push(checkD1(door, g, arm, `${door.name} ${l}`));
    for (const [i, g] of randomD1(door.name === 'D24' ? 80 : 40, String(door.name)).entries())
      checks.push(checkD1(door, g, 0, `${door.name} random ${i}`));
    for (const [l, g] of Object.entries(c.g)) checks.push(checkGrowth(door, g, `${door.name} ${l}`));
    for (const [i, g] of randomGrowth(door.name === 'D24' ? 80 : 40, String(door.name)).entries())
      checks.push(checkGrowth(door, g, `${door.name} random ${i}`));
  }

  checks.push(...poolIdentities(d24, 48, 'D24'));
  checks.push(...prefixCausality(d19, d24, benchJoints(24)));

  // P4: native reproduction of the fixed single-family controls
  const native: Record<string, unknown> = {};
  const g085dev = growthRunOf(growthDoor(d24), c.g.g085 as never);
  const g4dev = growthRunOf(growthDoor(d24), c.g.g4 as never);
  const t = (name: string, got: number, want: number) => {
    const pass = Math.abs(r2(got) - want) < 0.005;

    checks.push({ name: `P4 ${name}`, pass, detail: { got: r2(got), want } });
  };

  t('08500a60 development net', g085dev.metrics.pnl.totalMarkedNetUsd, 115509.15);
  t('08500a60 development minute DD', g085dev.metrics.drawdown.minute.maximumUsd, 19344.8);
  t('#4 development net', g4dev.metrics.pnl.totalMarkedNetUsd, 92575.71);
  t('#4 development minute DD', g4dev.metrics.drawdown.minute.maximumUsd, 14578.1);

  for (const [l, g] of Object.entries(c.d1))
    for (const [conv, arm] of [
      ['harmonized', 0],
      ['native', nativeArm(d24)]
    ] as const) {
      const r = canonicalD1(d24, g, arm);

      native[`D1 ${l} D24 ${conv}`] = {
        net: r2(r.lots.reduce((a, x) => a + x.net, 0)),
        dd: r2(r.minuteDrawdown.maximum),
        lots: r.lots.length,
        first: r.lots[0] ? d24.ds.dates[r.lots[0].entryIndex] : null
      };
    }

  t(
    'D1 primary development net (B1 at 5 bps, known)',
    (native['D1 primary D24 native'] as { net: number }).net,
    135359.04
  );
  t('D1 primary development minute DD (known)', (native['D1 primary D24 native'] as { dd: number }).dd, 19534.41);

  // the FULL door, for the known full-history targets of the two Growth controls only
  const full = await openFullDoor(
    'parity P4: known full-history targets of the fixed Growth controls (08500a60, #4)',
    'parity-known-targets'
  );
  const boundary = chronology.developmentEnd;

  for (const [l, g, want] of [
    [
      '08500a60',
      c.g.g085,
      { net: 160974.09, realized: 151597.87, unrealized: 9376.22, dd: 19344.8, validation: 45464.93 }
    ],
    ['#4', c.g.g4, { net: 145468.46, dd: 14578.1 }]
  ] as const) {
    const d = growthDetail(growthDoor(full) as never, g as never, boundary);
    const pool = run(full, normalize({ d1: c.d1.primary, g, a: { arch: 'A', d1Target: 1, gTarget: 1, first: 'G' } }), {
      enabled: { D1: false, G: true }
    }).result;

    t(`${l} full net`, d.metrics.totalMarkedNetUsd, want.net);
    t(`${l} full minute DD`, d.minuteDrawdown.maximumUsd, want.dd);
    if ('realized' in want) {
      t(`${l} full realized`, d.metrics.realizedNetUsd, want.realized);
      t(`${l} full unrealized`, d.metrics.unrealizedNetUsd, want.unrealized);
      t(`${l} validation net`, (d.boundary as { validationNet: number }).validationNet, want.validation);
      native[`${l} full trades`] = {
        wins: d.metrics.trades.wins,
        losses: d.metrics.trades.losses,
        open: d.metrics.trades.open
      };
      checks.push({
        name: `P4 ${l} full 5 winners / 3 losers / 1 open`,
        pass: d.metrics.trades.wins === 5 && d.metrics.trades.losses === 3 && d.metrics.trades.open === 1,
        detail: d.metrics.trades
      });
    }
    checks.push({
      name: `P4 ${l} full: pooled engine = canonical (net, minute DD)`,
      pass: Math.abs(pool.net - d.metrics.totalMarkedNetUsd) < 1e-6 && r2(pool.dd.max) === d.minuteDrawdown.maximumUsd,
      detail: { pool: r2(pool.net), dd: r2(pool.dd.max) }
    });
  }

  const failed = checks.filter((x) => !x.pass);
  const record = {
    stage: 'parity',
    evaluationDigest: codeDigest(),
    checks: checks.length,
    failed: failed.length,
    failures: failed,
    native,
    results: checks.map((x) => ({ name: x.name, pass: x.pass, detail: x.detail }))
  };

  sealJson(path.join(resultsDir, 'parity', `${name}.json`), record, name);
  log(`parity: ${checks.length} checks, ${failed.length} failed`);
  if (failed.length) {
    for (const f of failed.slice(0, 20)) log(`FAILED ${f.name}: ${JSON.stringify(f.detail).slice(0, 300)}`);
    process.exit(1);
  }
};
