// PROTOCOL.md §9: the report-only development diagnostics on D24 (written after the C24 selection was sealed; nothing
// here can change a selection). The reference configuration (VGT+GDX, A 20, E 5%) and every finalist (none at C24)
// against OFF: full ledgers, the matched comparison, the paired D1 stress, friction and execution stresses, the
// invalidation sensitivity on the grid, and episode concentration (arithmetic removal and causal blackout reruns).
import fs from 'node:fs';
import path from 'node:path';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { type DoorName, ceiling, log, resultsDir } from './context.ts';
import type { EvalRecord, detailOf } from './evaluate.ts';
import { runDetails, runJob } from './job.ts';
import { median, quantile } from './select.ts';
import { type Spec, OFF, cellSpec, d1Points, gridSpecs, label, specId } from './specs.ts';
import { foldDir, writeJson } from './stages.ts';

export type Detail = ReturnType<typeof detailOf>;

export const reference: Spec = cellSpec('VGT+GDX', { A: 20, e: 50 });

export const frictionStresses: { name: string; friction: NonNullable<Spec['friction']> }[] = [
  { name: '10 bps per side', friction: { costBps: 10 } },
  { name: '20 bps per side', friction: { costBps: 20 } },
  { name: '14% interest', friction: { rate: 0.14 } },
  { name: 'next-open stop fills', friction: { stopFill: 'next-open' } },
  { name: '+25 bps stop slippage', friction: { stopSlippageBps: 25 } },
  { name: 'delayed entries at the fill minute high', friction: { lateEntryFill: 'fill-minute high' } }
];

const lotKey = (lot: Detail['lots'][number]) => `${lot.symbol}|${lot.entryUtc}|${lot.exitUtc}`;

// Matched comparison of two ledgers (PROTOCOL.md §9).
export const matched = (off: Detail, variant: Detail) => {
  const offKeys = new Map(off.lots.map((lot) => [lotKey(lot), lot]));
  const varKeys = new Map(variant.lots.map((lot) => [lotKey(lot), lot]));
  const unchanged = variant.lots.filter((lot) => offKeys.has(lotKey(lot)));
  const late = variant.lots.filter((lot) => lot.kind !== 'fresh');
  const newFresh = variant.lots.filter((lot) => lot.kind === 'fresh' && !offKeys.has(lotKey(lot)));
  const displaced = off.lots.filter((lot) => !varKeys.has(lotKey(lot)));
  const sum = (lots: Detail['lots']) => lots.reduce((total, lot) => total + lot.net, 0);

  return {
    unchanged: { lots: unchanged.length, net: sum(unchanged) },
    late: { lots: late.length, net: sum(late), rows: late },
    newFresh: { lots: newFresh.length, net: sum(newFresh), rows: newFresh },
    displaced: { lots: displaced.length, net: sum(displaced), rows: displaced },
    delta: sum(variant.lots) - sum(off.lots),
    identity: Math.abs(sum(late) + sum(newFresh) - sum(displaced) - (sum(variant.lots) - sum(off.lots))) < 0.005
  };
};

// Pool-level episodes over the union of two ledgers: a new episode starts when an entry is > 10 sessions after the
// previous exit (across both ETFs).
export const episodes = (off: Detail, variant: Detail) => {
  const dates = off.daily.map((row) => row.date);
  const index = (date: string) => dates.indexOf(date);
  const lastIndex = dates.length - 1;
  const all = [
    ...off.lots.map((lot) => ({ run: 'off' as const, lot })),
    ...variant.lots.map((lot) => ({ run: 'variant' as const, lot }))
  ].sort((a, b) => index(a.lot.entryDate!) - index(b.lot.entryDate!));
  const out: { first: string; last: string; off: number; variant: number; delta: number; lots: number }[] = [];
  let current: (typeof out)[number] | undefined;
  let currentExit = -Infinity;

  for (const { run, lot } of all) {
    const entry = index(lot.entryDate!);
    const exit = lot.exitDate ? index(lot.exitDate) : lastIndex;

    if (!current || entry - currentExit > 10) {
      current = {
        first: lot.entryDate!,
        last: lot.exitDate || dates[lastIndex]!,
        off: 0,
        variant: 0,
        delta: 0,
        lots: 0
      };
      out.push(current);
      currentExit = -Infinity;
    }

    current[run] += lot.net;
    current.delta = current.variant - current.off;
    current.lots++;

    if (exit > currentExit) {
      currentExit = exit;
      current.last = dates[exit]!;
    }
  }

  return out;
};

const pairedStats = (pairs: { off: EvalRecord; variant: EvalRecord }[]) => {
  const deltas = pairs.map((p) => p.variant.net - p.off.net);

  return {
    n: pairs.length,
    medianDelta: median(deltas),
    p10Delta: quantile(deltas, 0.1),
    p90Delta: quantile(deltas, 0.9),
    meanDelta: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    sharePositive: deltas.filter((d) => d > 0.005).length / deltas.length,
    shareZero: deltas.filter((d) => Math.abs(d) <= 0.005).length / deltas.length,
    shareNegative: deltas.filter((d) => d < -0.005).length / deltas.length,
    shareUnchangedLedger: pairs.filter((p) => p.variant.signature === p.off.signature).length / pairs.length,
    activated: pairs.filter((p) => p.variant.late > 0).length,
    lateLots: pairs.reduce((total, p) => total + p.variant.late, 0),
    lateNet: pairs.reduce((total, p) => total + p.variant.lateNet, 0),
    offP90Dd: quantile(
      pairs.map((p) => p.off.dd),
      0.9
    ),
    variantP90Dd: quantile(
      pairs.map((p) => p.variant.dd),
      0.9
    ),
    offShareBelowCeiling: pairs.filter((p) => p.off.dd < ceiling).length / pairs.length,
    variantShareBelowCeiling: pairs.filter((p) => p.variant.dd < ceiling).length / pairs.length,
    medianDdDelta: median(pairs.map((p) => p.variant.dd - p.off.dd))
  };
};

export const d1StressSpecs = (variant: Spec, families: readonly ('explore' | 'confirm')[]) => {
  const rows: { family: string; index: number; off: Spec; variant: Spec; clipped: number }[] = [];

  for (const family of families)
    for (const point of d1Points(family)) {
      if (point.duplicate) continue;

      rows.push({
        family,
        index: point.index,
        off: { eligibility: {}, d1: point.books },
        variant: { ...variant, d1: point.books },
        clipped: point.clipped.length
      });
    }

  return rows;
};

const writeDetail = (dir: string, detail: Detail) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'lots.csv'), toCsv(detail.lots));
  fs.writeFileSync(path.join(dir, 'opportunities.csv'), toCsv(detail.opportunities.map((o) => ({ ...o })) as never));
  fs.writeFileSync(path.join(dir, 'transitions.csv'), toCsv(detail.transitions as never));
  fs.writeFileSync(path.join(dir, 'refused-signals.csv'), toCsv(detail.refused));
  fs.writeFileSync(path.join(dir, 'daily-equity.csv'), toCsv(detail.daily));
  writeJson(path.join(dir, 'record.json'), {
    ...detail.record,
    minuteDrawdown: detail.minuteDrawdown,
    window: detail.window
  });
};

export const diagnose = async (door: DoorName, workers: number) => {
  const dir = path.join(resultsDir, 'diagnostics', door);
  const selection = JSON.parse(fs.readFileSync(path.join(foldDir('C24'), 'selection.json'), 'utf8'));
  const finalists: Spec[] = selection.priority.map((p: { spec: Spec }) => p.spec);
  const subjects = [reference, ...finalists.filter((spec) => specId(spec) !== specId(reference))];
  const purpose = 'report-only development diagnostics';

  // 1. ledgers and the matched comparison
  const compared = [...subjects, cellSpec('VGT', { A: 20, e: 50 })];
  const details = await runDetails<Detail>({ name: `detail-${door}`, door, purpose, workers }, [OFF, ...compared]);
  const off = details[0]!;

  writeDetail(path.join(dir, 'OFF'), off);

  const comparisons = details.slice(1).map((detail) => {
    const name = label(detail.record.spec).replace(/[^A-Za-z0-9.+-]+/g, '_');

    writeDetail(path.join(dir, name), detail);

    return {
      label: label(detail.record.spec),
      dir: name,
      net: detail.record.net,
      dd: detail.record.dd,
      delta: detail.record.net - off.record.net,
      ddDelta: detail.record.dd - off.record.dd,
      matched: matched(off, detail),
      episodes: episodes(off, detail),
      periods: Object.fromEntries(
        Object.entries(detail.record.periods).map(([k, v]) => [
          k,
          { pnl: v.pnl, offPnl: off.record.periods[k]?.pnl, dd: v.dd, offDd: off.record.periods[k]?.dd }
        ])
      )
    };
  });

  // 2. the paired D1 stress (64 exploratory + 128 confirmation points), reference and finalists
  const stress = subjects.flatMap((spec) =>
    d1StressSpecs(spec, ['explore', 'confirm']).map((row) => ({ ...row, subject: label(spec) }))
  );
  const stressRecords = new Map(
    (
      await runJob(
        { name: `d1-${door}`, door, purpose: `${purpose}: D1 stress`, workers },
        stress.flatMap((row) => [row.off, row.variant])
      )
    ).map((r) => [specId(r.spec), r])
  );
  const d1 = subjects.map((spec) => ({
    subject: label(spec),
    families: Object.fromEntries(
      (['explore', 'confirm'] as const).map((family) => [
        family,
        {
          ...pairedStats(
            stress
              .filter((row) => row.subject === label(spec) && row.family === family)
              .map((row) => ({
                off: stressRecords.get(specId(row.off))!,
                variant: stressRecords.get(specId(row.variant))!
              }))
          ),
          clippedPoints: stress.filter((row) => row.subject === label(spec) && row.family === family && row.clipped > 0)
            .length
        }
      ])
    ),
    points: stress
      .filter((row) => row.subject === label(spec))
      .map((row) => {
        const o = stressRecords.get(specId(row.off))!;
        const v = stressRecords.get(specId(row.variant))!;

        return {
          family: row.family,
          index: row.index,
          offNet: o.net,
          variantNet: v.net,
          delta: v.net - o.net,
          offDd: o.dd,
          variantDd: v.dd,
          late: v.late,
          lateNet: v.lateNet,
          offLots: o.lots,
          variantLots: v.lots,
          clipped: row.clipped
        };
      })
  }));

  // 3. friction and execution stresses
  const frictionSpecs = [OFF, ...subjects].flatMap((spec) =>
    frictionStresses
      .filter((s) => !(specId(spec) === specId(OFF) && s.friction.lateEntryFill))
      .map((s) => ({ name: s.name, spec: { ...spec, friction: s.friction } as Spec, base: spec }))
  );
  const frictionRecords = new Map(
    (
      await runJob(
        { name: `friction-${door}`, door, purpose: `${purpose}: friction`, workers },
        frictionSpecs.map((f) => f.spec)
      )
    ).map((r) => [specId(r.spec), r])
  );
  const friction = frictionStresses.map((s) => {
    const o = frictionRecords.get(specId({ ...OFF, friction: s.friction.lateEntryFill ? {} : s.friction }));

    return {
      stress: s.name,
      off: o ? { net: o.net, dd: o.dd } : null,
      subjects: subjects.map((spec) => {
        const v = frictionRecords.get(specId({ ...spec, friction: s.friction }))!;
        const base = s.friction.lateEntryFill ? off.record : o!;

        return {
          subject: label(spec),
          net: v.net,
          dd: v.dd,
          delta: v.net - base.net,
          ddDelta: v.dd - base.dd,
          late: v.late
        };
      })
    };
  });

  // 4. the invalidation sensitivity on the grid (never candidates)
  const sensitivity = [];

  for (const invalidation of ['minute close', 'none'] as const) {
    const specs = gridSpecs().map((g) => ({ ...g.spec, invalidation }));
    const records = await runJob(
      {
        name: `invalidation-${invalidation.replace(' ', '-')}-${door}`,
        door,
        purpose: `${purpose}: invalidation sensitivity`,
        workers
      },
      specs
    );
    const deltas = records.map((r) => r.net - off.record.net);

    sensitivity.push({
      invalidation,
      activated: records.filter((r) => r.late > 0).length,
      distinctLedgers: new Set(records.map((r) => r.signature)).size,
      medianDelta: median(deltas),
      minDelta: Math.min(...deltas),
      maxDelta: Math.max(...deltas),
      positive: deltas.filter((d) => d > 0.005).length,
      negative: deltas.filter((d) => d < -0.005).length,
      maxDd: Math.max(...records.map((r) => r.dd)),
      aboveCeiling: records.filter((r) => r.dd >= ceiling).length,
      rows: records.map((r) => ({
        label: label(r.spec),
        net: r.net,
        delta: r.net - off.record.net,
        dd: r.dd,
        late: r.late,
        lateNet: r.lateNet
      }))
    });
  }

  // 5. concentration: arithmetic removal and causal blackout reruns (both runs, the same sessions)
  const concentration = [];

  for (const [i, c] of comparisons.entries()) {
    const subject = compared[i]!;
    const eps = c.episodes;
    const total = c.delta;
    const largestPositive = [...eps].sort((a, b) => b.delta - a.delta)[0];
    const largestWin = [...eps].sort((a, b) => b.variant - a.variant)[0];
    const picks = [
      {
        name: 'largest positive-Δ episode',
        episode: largestPositive && largestPositive.delta > 0.005 ? largestPositive : undefined
      },
      { name: "the configuration's largest winning episode", episode: largestWin },
      { name: 'largest negative-Δ episode', episode: [...eps].sort((a, b) => a.delta - b.delta)[0] }
    ];
    const blackoutSpecs = picks
      .filter((p) => p.episode)
      .flatMap((p) => [
        { ...OFF, blackouts: [{ first: p.episode!.first, last: p.episode!.last }] },
        { ...subject, blackouts: [{ first: p.episode!.first, last: p.episode!.last }] }
      ]);
    const records = blackoutSpecs.length
      ? new Map(
          (
            await runJob(
              { name: `blackout-${door}-${c.dir}`, door, purpose: `${purpose}: causal episode reruns`, workers },
              blackoutSpecs
            )
          ).map((r) => [specId(r.spec), r])
        )
      : new Map<string, EvalRecord>();

    concentration.push({
      label: c.label,
      totalDelta: total,
      episodes: eps.length,
      picks: picks.map((p) => {
        if (!p.episode) return { name: p.name, episode: null };

        const b = [{ first: p.episode.first, last: p.episode.last }];
        const o = records.get(specId({ ...OFF, blackouts: b }))!;
        const v = records.get(specId({ ...subject, blackouts: b }))!;

        return {
          name: p.name,
          episode: p.episode,
          arithmetic: { label: 'arithmetic removal (no rerun)', deltaWithout: total - p.episode.delta },
          causal: {
            label: 'causal rerun: no new funding in the episode sessions, both runs',
            offNet: o.net,
            variantNet: v.net,
            delta: v.net - o.net,
            offDd: o.dd,
            variantDd: v.dd
          }
        };
      })
    });
  }

  const out = {
    door,
    generatedAt: new Date().toISOString(),
    note: 'report-only (PROTOCOL.md §9); never a candidate',
    reference: label(reference),
    finalists: finalists.map(label),
    off: { net: off.record.net, dd: off.record.dd, lots: off.record.lots },
    comparisons,
    d1,
    friction,
    sensitivity,
    concentration
  };

  writeJson(path.join(dir, 'diagnostics.json'), out);
  fs.writeFileSync(
    path.join(dir, 'd1-stress-points.csv'),
    toCsv(d1.flatMap((s) => s.points.map((p) => ({ subject: s.subject, ...p }))))
  );
  log(
    `diagnostics ${door}: ${comparisons.map((c) => `${c.label} Δ ${c.delta.toFixed(2)} (late ${c.matched.late.lots}, displaced ${c.matched.displaced.lots}, new fresh ${c.matched.newFresh.lots})`).join('; ')}`
  );

  return out;
};
