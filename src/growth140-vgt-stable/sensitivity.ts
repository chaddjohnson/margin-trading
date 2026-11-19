// #4's sensitivity diagnosis (PROTOCOL.md §12), on the development door D24: reproduction, one-at-a-time scans
// (fine: centre ± R at the schema step; wide: the whole box), the switches OFF, the pairwise interactions of the six
// most sensitive inputs, joint perturbations at four scales and on input subsets, ledger and decision-event diffs of
// the decisive points, and a regional scan for a nearby stable region (64-draw neighbourhoods).
import { matchWinners } from '../growth140-vgt-s8m/trades.ts';
import { quantile } from '../study5-gdx-b5-three-etf/grid.ts';
import { log, rules } from './context.ts';
import type { Detail, StableRecord } from './engine.ts';
import { bandedOrder, fitsOf, nbView, stripRecords } from './fitness.ts';
import type { Lab } from './pool.ts';
import {
  type Config,
  type NumGene,
  activeGenes,
  configId,
  effectiveOf,
  fineGenomeOf,
  fineStepOf,
  neighbourhood,
  radiusValue,
  repair,
  roundStep,
  structureOf
} from './space.ts';

// The seven inputs the brief names, in its order.
export const namedInputs = [
  'recoveryRetracementPercent',
  'intradayLossBufferPercent',
  'initialStopAtrMultiple',
  'recentLowLookbackBars',
  'trendChangeMinimumReturnPercent',
  'eligibilityMaxAgeSessions',
  'recoveryConfirmationSessions'
];

export const expected4Development = { net: 92575.71, dd: 14578.1 };

const set = (c: Config, key: string, v: number): Config | null => {
  try {
    return effectiveOf(repair({ ...c, [key]: v }));
  } catch {
    return null;
  }
};

export const oatValues = (c: Config, gene: NumGene) => {
  const step = fineStepOf(gene);
  const centre = c[gene.key] as number;
  const R = radiusValue(gene);
  const fine: number[] = [];
  const wide: number[] = [];

  for (let v = roundStep(centre - R, step); v <= centre + R + 1e-9; v = roundStep(v + step, step))
    if (v >= gene.min - 1e-9 && v <= gene.max + 1e-9 && Math.abs(v - centre) > 1e-9) fine.push(v);
  for (let v = gene.min; v <= gene.max + 1e-9; v = roundStep(v + gene.step, step))
    if (Math.abs(v - centre) > 1e-9 && !fine.some((f) => Math.abs(f - v) < 1e-9)) wide.push(roundStep(v, step));

  return { fine, wide };
};

const delta = (r: StableRecord, base: StableRecord) => ({
  dNet: Math.round((r.net - base.net) * 100) / 100,
  dDd: Math.round((r.dd - base.dd) * 100) / 100
});

export const ledgerDiff = (cand: Detail, base: Detail) => {
  const m = matchWinners(cand.trades, base.trades);
  const losingHold = (d: Detail) =>
    Math.max(0, ...d.trades.filter((t) => t.status === 'closed' && t.net < 0).map((t) => t.calendarDaysHeld));
  const key = (e: { date: string; status: string; reason: string | null }) => `${e.date}|${e.status}|${e.reason}`;
  const be = new Set((base.events ?? []).map(key));
  const ce = new Set((cand.events ?? []).map(key));
  const changed = [
    ...new Set(
      [...(base.events ?? []), ...(cand.events ?? [])]
        .filter((e) => be.has(key(e)) !== ce.has(key(e)))
        .map((e) => e.date)
    )
  ].sort();

  return {
    dropsMajorWinner: m.lostControlWinners.filter((l) => l.net >= 10000),
    lostWinners: m.lostControlWinners,
    retained: m.retained,
    retimed: m.retimed,
    newWinningMoves: m.newWinningMoves,
    extraLoss: m.candidateLosses > m.controlLosses || m.candidateLossSum < m.controlLossSum - 1000,
    losses: {
      candidate: m.candidateLosses,
      control: m.controlLosses,
      candidateSum: m.candidateLossSum,
      controlSum: m.controlLossSum
    },
    extendedLosingHold: losingHold(cand) > losingHold(base) + 1,
    losingHoldDays: { candidate: losingHold(cand), control: losingHold(base) },
    eventDatesChanged: changed.slice(0, 20),
    eventChanges: changed.length
  };
};

export const runSensitivity = async (lab: Lab, c4: Config, y: number, pilot = false) => {
  const s = structureOf(c4);
  const genes = activeGenes(s);
  const base = await lab.point(c4);
  const baseDetail = await lab.detail<Detail>(c4, { events: true });
  const reproduction = {
    expected: expected4Development,
    observed: { net: base.net, dd: base.dd, trades: base.trades, wins: base.wins, losses: base.losses },
    matches: base.net === expected4Development.net && base.dd === expected4Development.dd
  };

  log(`#4 development reproduction: net ${base.net} dd ${base.dd} (${reproduction.matches ? 'matches' : 'DIFFERS'})`);
  if (!pilot && !reproduction.matches)
    throw new Error('#4 does not reproduce its development figures; stop and investigate');

  // 1. one at a time
  const oat: Record<string, any> = {};

  for (const gene of genes) {
    const { fine, wide } = oatValues(c4, gene);
    const configs = [...fine, ...wide].map((v) => [v, set(c4, gene.key, v)] as const).filter(([, c]) => c);
    const recs = await lab.points(configs.map(([, c]) => c!));
    const rows = configs.map(([v], i) => ({
      value: v,
      fine: fine.includes(v),
      net: recs[i]!.net,
      dd: recs[i]!.dd,
      trades: recs[i]!.trades,
      wins: recs[i]!.wins,
      losses: recs[i]!.losses,
      lossSum: recs[i]!.lossSum,
      same: recs[i]!.signature === base.signature,
      ...delta(recs[i]!, base)
    }));
    const f = rows.filter((r) => r.fine);

    oat[gene.key] = {
      centre: c4[gene.key],
      radius: radiusValue(gene),
      step: fineStepOf(gene),
      unit: gene.key.endsWith('Percent')
        ? 'percent'
        : gene.key.endsWith('Multiple')
          ? '× ATR'
          : gene.key.endsWith('Days')
            ? 'calendar days'
            : gene.key.endsWith('Bars')
              ? 'bars'
              : 'sessions',
      fineShareBig: f.length ? f.filter((r) => Math.abs(r.dNet) > 10000).length / f.length : 0,
      fineMeanAbs: f.length ? f.reduce((a, r) => a + Math.abs(r.dNet), 0) / f.length : 0,
      fineSameLedger: f.length ? f.filter((r) => r.same).length / f.length : 0,
      fineMin: Math.min(...f.map((r) => r.net)),
      fineMax: Math.max(...f.map((r) => r.net)),
      nearestBigBelow:
        [...f]
          .filter((r) => r.value < (c4[gene.key] as number) && Math.abs(r.dNet) > 10000)
          .sort((p, q) => q.value - p.value)[0]?.value ?? null,
      nearestBigAbove:
        [...f]
          .filter((r) => r.value > (c4[gene.key] as number) && Math.abs(r.dNet) > 10000)
          .sort((p, q) => p.value - q.value)[0]?.value ?? null,
      rows
    };
  }

  // every enabled optional rule switched OFF
  const offKeys = [
    'trendFilterEnabled',
    'eligibilityEnabled',
    'drawdownRecoveryGateEnabled',
    'maximumHoldEnabled',
    'intradayLossBufferEnabled',
    'initialStopEnabled',
    'retentionEnabled',
    'continuationEnabled'
  ].filter((k) => c4[k] === true);
  const offMoves = offKeys.map((k) => effectiveOf({ ...c4, [k]: false }));
  const offRecs = await lab.points(offMoves);
  const switches = offMoves.map((m, i) => ({
    off: offKeys[i],
    id: configId(m),
    net: offRecs[i]!.net,
    dd: offRecs[i]!.dd,
    trades: offRecs[i]!.trades,
    wins: offRecs[i]!.wins,
    losses: offRecs[i]!.losses,
    ...delta(offRecs[i]!, base)
  }));

  // 2. the six most sensitive inputs (share of fine points moving net by > $10k, then mean |Δ|), and their pairs
  const ranked = Object.entries(oat)
    .sort(([, a], [, b]) => b.fineShareBig - a.fineShareBig || b.fineMeanAbs - a.fineMeanAbs)
    .map(([k]) => k);
  const top = ranked.slice(0, 6);
  const offsets = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];
  const valueAt = (key: string, o: number) => {
    const g = genes.find((x) => x.key === key)!;
    const v = roundStep((c4[key] as number) + o * radiusValue(g), fineStepOf(g));

    return Math.min(g.max, Math.max(g.min, v));
  };
  const pairs: any[] = [];

  for (let i = 0; i < top.length; i++)
    for (let j = i + 1; j < top.length; j++) {
      const [a, b] = [top[i]!, top[j]!];
      const grid: { oa: number; ob: number; c: Config }[] = [];

      for (const oa of offsets)
        for (const ob of offsets) {
          const c = set(set(c4, a, valueAt(a, oa)) ?? c4, b, valueAt(b, ob));

          if (c) grid.push({ oa, ob, c });
        }

      const recs = await lab.points(grid.map((g) => g.c));
      const at = (oa: number, ob: number) => recs[grid.findIndex((g) => g.oa === oa && g.ob === ob)]!;
      const cells = grid.map((g, k) => {
        const d = recs[k]!.net - base.net;
        const inter = d - (at(g.oa, 0).net - base.net) - (at(0, g.ob).net - base.net);

        return {
          oa: g.oa,
          ob: g.ob,
          va: g.c[a],
          vb: g.c[b],
          net: recs[k]!.net,
          dd: recs[k]!.dd,
          dNet: Math.round(d * 100) / 100,
          interaction: Math.round(inter * 100) / 100
        };
      });
      const off = cells.filter((x) => x.oa !== 0 && x.ob !== 0);

      pairs.push({
        a,
        b,
        meanAbsInteraction: off.reduce((s0, x) => s0 + Math.abs(x.interaction), 0) / off.length,
        maxAbsInteraction: Math.max(...off.map((x) => Math.abs(x.interaction))),
        shareBigInteraction: off.filter((x) => Math.abs(x.interaction) > 10000).length / off.length,
        cells
      });
    }

  pairs.sort((p, q) => q.meanAbsInteraction - p.meanAbsInteraction);

  // 3. joint perturbations: every active input at scales 0.25/0.5/1/1.5 R; and subsets at scale 1
  const joint: Record<string, any> = {};
  const jointFamilies = [
    ...[0.25, 0.5, 1, 1.5].map((scale) => ({
      key: `all@${scale}`,
      f: { name: `sens-joint-${scale}`, n: 256, labels: ['sens-joint', scale], scale }
    })),
    { key: 'named7@1', f: { name: 'sens-named', n: 256, labels: ['sens-named'], scale: 1, genes: namedInputs } },
    {
      key: 'others@1',
      f: {
        name: 'sens-others',
        n: 256,
        labels: ['sens-others'],
        scale: 1,
        genes: genes.map((g) => g.key).filter((k) => !namedInputs.includes(k))
      }
    },
    { key: 'top6@1', f: { name: 'sens-top6', n: 256, labels: ['sens-top6'], scale: 1, genes: top } }
  ];
  const jointPoints: Record<string, { config: Config; r: StableRecord }[]> = {};

  for (const { key, f } of jointFamilies) {
    const pts = neighbourhood(c4, f);
    const recs = await lab.points(pts.map((p) => p.config));
    const nb = nbView(recs);

    jointPoints[key] = pts.map((p, i) => ({ config: p.config, r: recs[i]! }));
    joint[key] = {
      ...nb,
      sameLedgerShare: recs.filter((r) => r.signature === base.signature).length / recs.length,
      netQuantiles: [0.05, 0.1, 0.25, 0.5, 0.75, 0.9].map((qq) => ({
        q: qq,
        net: quantile(
          recs.map((r) => r.net),
          qq
        )
      })),
      lossesMedian: quantile(
        recs.map((r) => r.losses),
        0.5
      ),
      winsMedian: quantile(
        recs.map((r) => r.wins),
        0.5
      )
    };
  }

  // 4. ledger and decision-event diffs of the decisive points
  const decisive: { why: string; config: Config }[] = [];

  for (const [key, o] of Object.entries(oat)) {
    for (const v of [o.nearestBigBelow, o.nearestBigAbove])
      if (v !== null)
        decisive.push({ why: `${key} = ${v} (nearest fine value moving net by > $10k)`, config: set(c4, key, v)! });
  }

  for (const [key, v] of [
    ['recoveryRetracementPercent', 44.9],
    ['recoveryRetracementPercent', 45.1],
    ['recoveryRetracementPercent', 40],
    ['recoveryRetracementPercent', 50],
    ['intradayLossBufferPercent', 2.8],
    ['intradayLossBufferPercent', 3.0],
    ['intradayLossBufferPercent', 2.5],
    ['intradayLossBufferPercent', 3.5]
  ] as const)
    decisive.push({ why: `${key} = ${v} (exact-value check)`, config: set(c4, key, v)! });

  const worst = [...jointPoints['all@1']!].sort((p, q) => p.r.net - q.r.net).slice(0, 8);

  for (const w of worst)
    decisive.push({ why: `joint scale 1: one of the 8 lowest nets (${w.r.net})`, config: w.config });

  const ledgers = [];
  const seen = new Set<string>();

  for (const d of decisive) {
    const id = configId(d.config);

    if (seen.has(id)) continue;
    seen.add(id);

    const det = await lab.detail<Detail>(d.config, { events: true });

    ledgers.push({
      why: d.why,
      id,
      net: det.record.net,
      dd: det.record.dd,
      ...ledgerDiff(det, baseDetail),
      trades: det.trades.map((t) => ({
        entry: t.entryDate,
        exit: t.exitDate,
        net: t.net,
        reason: t.exitReason,
        days: t.calendarDaysHeld
      }))
    });
  }

  // 5. the regional scan: #4 shifted along each of the six sensitive inputs by ±R/2 and ±R, and the 16 best scale-0.5
  // joint points with DD ≤ $35k, each with a 64-draw neighbourhood (common draws), against #4's own
  const regionCentres: { why: string; config: Config }[] = [{ why: '#4', config: c4 }];

  for (const key of top)
    for (const o of [-1, -0.5, 0.5, 1]) {
      const c = set(c4, key, valueAt(key, o));

      if (c && configId(c) !== configId(c4)) regionCentres.push({ why: `${key} ${o > 0 ? '+' : ''}${o} R`, config: c });
    }

  for (const p of [...jointPoints['all@0.5']!]
    .filter((p) => p.r.dd <= rules.ceiling)
    .sort((p, q) => q.r.net - p.r.net)
    .slice(0, 16))
    regionCentres.push({ why: 'joint scale 0.5, top-16 net', config: p.config });

  const uniq = [...new Map(regionCentres.map((r) => [configId(r.config), r])).values()];
  const RF = { name: 'region', n: 64, labels: ['region'] };
  const fits = await fitsOf(
    lab,
    uniq.map((u) => ({ config: u.config, genome: fineGenomeOf(u.config) })),
    [RF],
    'region',
    y
  );
  const region = fits.map((f, i) => ({ why: uniq[i]!.why, ...stripRecords(f), feasible: f.violation === 0 }));
  const order = bandedOrder(
    region.filter((r) => r.feasible).map((r) => ({ id: r.id, robust: r.nb.robustNet, p90: r.nb.p90Dd }))
  );

  return {
    reproduction,
    base: {
      net: base.net,
      dd: base.dd,
      trades: base.trades,
      wins: base.wins,
      losses: base.losses,
      exposure: base.exposure,
      lossSum: base.lossSum,
      topMove: base.topMove,
      topMoveShare: base.topMoveShare,
      netExTopMove: base.netExTopMove
    },
    baseTrades: baseDetail.trades,
    baseEpisodes: baseDetail.episodes,
    oat,
    switches,
    sensitiveOrder: ranked,
    top6: top,
    pairs,
    joint,
    ledgers,
    region: {
      centres: region,
      bandedOrder: order,
      best: order[0] ?? null,
      four: region.find((r) => r.why === '#4') ?? null
    }
  };
};
