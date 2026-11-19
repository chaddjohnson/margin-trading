// Stage 4 (PROTOCOL.md §8 S4): where the conventional $35,000 drawdown excluded profitable configurations, from
// Assignment 3's own search archives (READ-ONLY SQLite, `.cache/vg-l0-full-joint/jobs/<job>/archive.sqlite`):
//   scan     — per cutoff, every Track I broad lane's 512 SCREEN proposals regenerated with Assignment 3's own code
//              (screenGenomes / pinStratum / decode; labels ['screen', seedKey]) and every fitted centre of the broad and
//              refinement jobs (`configs`), each with its archived compact record (key evalKeyOf(door, cfg, vOptions));
//              the plausibility reasons must reproduce each lane file's sealed-in-cache screenReasons (gate);
//   replay   — the highest-realized-net and the highest-net-with-tolerable-final-loss DD-infeasible centres of each
//              cutoff (≤ 20 per cutoff; never a search) replayed on the cutoff's own door with the full metric bundle.
//   node --experimental-transform-types tools/vg-l0-risk-metrics/exclusions.ts scan | replay [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { decode as decodeRec } from '../../src/growth140-vgt-s8m/store.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { type Cfg, cellOf, cfgId, decode, evalKeyOf, pinStratum, screenGenomes } from '../../src/vg-l0-full-joint/space.ts';
import { cutoffDoor, cutoffEnd, cutoffKeys, fullJoint, repoRoot, resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { openDoor } from '../../src/vg-l0-risk-metrics/doors.ts';
import { reconcile, replay, subjectOfCfg, toLedger } from '../../src/vg-l0-risk-metrics/engine.ts';
import { bundleOf } from '../../src/vg-l0-risk-metrics/bundle.ts';
import { portfolioPath } from '../../src/vg-l0-risk-metrics/metrics.ts';
import { readJson, sealJson } from '../../src/vg-l0-risk-metrics/records.ts';
import { codeDigest, studyGuard } from './common.ts';

const dry = process.argv.includes('--dry');
const freeze = studyGuard();
const t0 = Date.now();
const jobsDir = path.join(repoRoot, '.cache', 'vg-l0-full-joint', 'jobs');
const ceiling = 35_000;

type R = { id: string; net: number; realized: number; unrealized: number; dd: number; lots: number; mixed: boolean; worstLoss: number; peakValue: number; largestWin: number; lossSum: number; error?: string };
const reasonOf = (r: R) => (r.error ? 'error' : r.lots === 0 ? 'no funded lot' : !r.mixed ? 'a family unfunded' : r.net <= 0 ? 'net ≤ 0' : r.dd > ceiling ? 'DD > ceiling' : 'plausible');

const open = (job: string) => {
  const db = new DatabaseSync(path.join(jobsDir, job, 'archive.sqlite'), { readOnly: true });
  const meta = Object.fromEntries((db.prepare('select k, v from meta').all() as { k: string; v: string }[]).map((x) => [x.k, x.v]));
  const get = db.prepare('select json from points where key = ?');

  return { db, meta, rec: (key: string) => {
    const row = get.get(key) as { json: string } | undefined;

    return row ? decodeRec<R>(row.json) : null;
  } };
};

const slim = (r: R, cfg: Cfg, source: string, lane: string | null) => ({
  id: r.id,
  source,
  lane,
  cell: cfg.cell,
  growthEntry: String(cfg.g.entryMethod),
  growthHold: cfg.g.maximumHoldEnabled === true,
  growthInitialStop: cfg.g.initialStopEnabled === true,
  net: r.net,
  realized: r.realized,
  unrealized: r.unrealized,
  dd: r.dd,
  lots: r.lots,
  worstLoss: r.worstLoss,
  peakMultiple: r.peakValue / 100_000,
  cfg
});

const scan = () => {
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    const reasons: Record<string, number> = {};
    let laneMismatch = 0;
    let lanes = 0;
    const excluded = new Map<string, ReturnType<typeof slim>>();
    const centresStats = { fitted: 0, withRecord: 0, ddInfeasible: 0, ddInfeasibleNetAboveBestQualified: 0 };
    const sel = readJson<{ rankings: Record<string, Record<string, { centreNet: number }[]>> }>(path.join(fullJoint.dir, 'results/folds', cut, 'selection.json'));
    const bestQualified = sel.rankings.F!.original![0]!.centreNet; // P0's F primary = the best qualified Track I centre net

    for (const part of ['broad1', 'broad2']) {
      const job = `search-${cut}-${part}`;
      const a = open(job);

      for (const f of fs.readdirSync(path.join(jobsDir, job, 'lanes')).sort()) {
        const lane = JSON.parse(fs.readFileSync(path.join(jobsDir, job, 'lanes', f), 'utf8')) as { key: string; seedKey: string; structure: string; res: 'coarse' | 'fine'; counts: Record<string, number>; failure: { screenReasons: Record<string, number> } };
        const cell = cellOf(lane.structure as never);
        const n = lane.counts.screened!;
        const seen = new Set<string>();
        const mine: Record<string, number> = {};

        lanes++;
        for (const [i, g] of screenGenomes(n, lane.res, 'screen', lane.seedKey).entries()) {
          let c: Cfg;

          try {
            c = decode(pinStratum(g, cell, i, n), lane.res);
          } catch {
            continue;
          }
          if (c.cell !== cell.id) throw new Error(`${lane.key}: a screen genome left the cell`);

          const id = cfgId(c);

          if (seen.has(id)) continue;
          seen.add(id);

          const r = a.rec(evalKeyOf(a.meta.door!, c, vOptions));

          if (!r) throw new Error(`${lane.key}: screen proposal ${id} has no archived record`);

          const why = reasonOf(r);

          mine[why] = (mine[why] ?? 0) + 1;
          reasons[why] = (reasons[why] ?? 0) + 1;
          if (why === 'DD > ceiling') excluded.set(id, slim(r, c, 'screen', lane.key));
        }
        if (JSON.stringify(Object.entries(mine).sort()) !== JSON.stringify(Object.entries(lane.failure.screenReasons).sort())) laneMismatch++;
      }
      a.db.close();
    }

    for (const part of ['broad1', 'broad2', 'refine']) {
      const job = `search-${cut}-${part}`;
      const a = open(job);

      for (const row of a.db.prepare('select key, json from configs').iterate() as Iterable<{ key: string; json: string }>) {
        const c = decodeRec<Cfg>(row.json);

        centresStats.fitted++;

        const r = a.rec(evalKeyOf(a.meta.door!, c, vOptions));

        if (!r) continue;
        centresStats.withRecord++;
        if (r.mixed && r.net > 0 && r.dd > ceiling) {
          centresStats.ddInfeasible++;
          if (r.net > bestQualified) centresStats.ddInfeasibleNetAboveBestQualified++;
          if (!excluded.has(r.id)) excluded.set(r.id, slim(r, c, `fitted centre (${part})`, null));
        }
      }
      a.db.close();
    }

    const ex = [...excluded.values()];
    const above = (x: number) => ex.filter((e) => e.net > x).length;

    out[cut] = {
      door: cutoffDoor[cut],
      lanes,
      laneReasonMismatches: laneMismatch,
      screenReasons: reasons,
      fittedCentres: centresStats,
      bestQualifiedTrackINet: bestQualified,
      ddExcluded: {
        distinct: ex.length,
        netAboveBestQualified: above(bestQualified),
        netAbove200k: above(200_000),
        realizedAboveBestQualified: ex.filter((e) => e.realized > bestQualified).length,
        withTolerableFinalLoss: ex.filter((e) => e.worstLoss >= -17_500).length,
        ddUnder50k: ex.filter((e) => e.dd <= 50_000).length,
        ddUnder50kNetAboveBestQualified: ex.filter((e) => e.dd <= 50_000 && e.net > bestQualified).length
      },
      top: {
        byRealized: [...ex].sort((x, y) => y.realized - x.realized).slice(0, 10),
        byNetTolerableFinalLoss: ex.filter((e) => e.worstLoss >= -17_500).sort((x, y) => y.net - x.net).slice(0, 10)
      }
    };
    console.log(`${cut}: ${lanes} lanes (${laneMismatch} reason mismatches), ${ex.length} DD-excluded, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    if (laneMismatch) throw new Error(`${cut}: the regenerated screen reasons differ from ${laneMismatch} lane file(s)`);
  }

  const record = { stage: 'S4 exclusion scan (archives, read-only)', freeze: freeze.protocol.sha256, code: codeDigest(), ceiling, cutoffs: out, seconds: (Date.now() - t0) / 1000 };

  if (dry) console.log(JSON.stringify(record, null, 1).slice(0, 4000));
  else console.log(sealJson(path.join(resultsDir, 'pipeline', 'exclusions-scan.json'), record, 'S4 exclusion scan'));
};

const replayStage = async () => {
  const sc = readJson<{ cutoffs: Record<string, { top: { byRealized: ReturnType<typeof slim>[]; byNetTolerableFinalLoss: ReturnType<typeof slim>[] }; bestQualifiedTrackINet: number }> }>(path.join(resultsDir, 'pipeline', 'exclusions-scan.json'));
  const cmp = readJson<{ trackN: { topDdExcluded: ReturnType<typeof slim>[] } }>(path.join(resultsDir, 'pipeline', 'exclusions-compare.json'));
  // the top DD-excluded SCREEN proposals by realized net (no search pressure), regenerated as in scan()
  const screenTop = (cut: string, k: number) => {
    const ex: ReturnType<typeof slim>[] = [];

    for (const part of ['broad1', 'broad2']) {
      const job = `search-${cut}-${part}`;
      const a = open(job);

      for (const f of fs.readdirSync(path.join(jobsDir, job, 'lanes')).sort()) {
        const lane = JSON.parse(fs.readFileSync(path.join(jobsDir, job, 'lanes', f), 'utf8')) as { key: string; seedKey: string; structure: string; res: 'coarse' | 'fine'; counts: Record<string, number> };
        const cell = cellOf(lane.structure as never);
        const n = lane.counts.screened!;
        const seen = new Set<string>();

        for (const [i, g] of screenGenomes(n, lane.res, 'screen', lane.seedKey).entries()) {
          let c: Cfg;

          try {
            c = decode(pinStratum(g, cell, i, n), lane.res);
          } catch {
            continue;
          }

          const id = cfgId(c);

          if (seen.has(id)) continue;
          seen.add(id);

          const r = a.rec(evalKeyOf(a.meta.door!, c, vOptions))!;

          if (reasonOf(r) === 'DD > ceiling') ex.push(slim(r, c, 'screen', lane.key));
        }
      }
      a.db.close();
    }
    return ex.sort((x, y) => y.realized - x.realized).slice(0, k);
  };
  const rows: Record<string, unknown>[] = [];

  for (const cut of cutoffKeys) {
    const door = await openDoor(cutoffDoor[cut], `Stage 4: DD-infeasible centres of ${cut} replayed on their own development door (report-only)`);
    const picks = new Map<string, ReturnType<typeof slim> & { why: string[] }>();

    for (const [why, list] of Object.entries(sc.cutoffs[cut]!.top))
      for (const e of list) picks.set(e.id, { ...e, why: [...(picks.get(e.id)?.why ?? []), why] });
    for (const e of screenTop(cut, 5)) picks.set(e.id, { ...e, why: [...(picks.get(e.id)?.why ?? []), 'screen only: top DD-excluded by realized net'] });
    if (cut === 'C24') for (const e of cmp.trackN.topDdExcluded.slice(0, 5)) picks.set(e.id, { ...e, why: [...(picks.get(e.id)?.why ?? []), 'Track N (informed): top DD-excluded by net'] });
    for (const e of picks.values()) {
      const r = replay(door, subjectOfCfg(e.cfg));

      if (Math.abs(r.rec.net - e.net) > 0.005 || Math.abs(r.rec.dd - e.dd) > 0.005) throw new Error(`${e.id}: the replay differs from its archived record`);

      const L = toLedger(r);

      reconcile(r, L);

      const b = bundleOf(door, r, L, portfolioPath(L), { windows: { training: [null, cutoffEnd[cut]] }, closes: [cutoffEnd[cut]] });

      rows.push({ cutoff: cut, bestQualifiedTrackINet: sc.cutoffs[cut]!.bestQualifiedTrackINet, id: e.id, why: e.why, source: e.source, lane: e.lane, cell: e.cell, growth: { entry: e.growthEntry, hold: e.growthHold, initialStop: e.growthInitialStop }, archived: { net: e.net, realized: e.realized, dd: e.dd, worstLoss: e.worstLoss, peakMultiple: e.peakMultiple }, boundedLossExit: b.boundedLossExit, training: b.windows.training, exposure: b.exposures[0], realizedEpisodes: b.realizedEpisodes.slice(0, 2), gapsThroughStop: b.gapsThroughStop.slice(0, 2), stopVerification: b.stopVerification });
    }
    console.log(`${cut}: ${picks.size} replayed, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  const record = { stage: 'S4 DD-infeasible centres replayed', freeze: freeze.protocol.sha256, code: codeDigest(), rows, seconds: (Date.now() - t0) / 1000 };

  if (dry) console.log(JSON.stringify(record, null, 1).slice(0, 4000));
  else console.log(sealJson(path.join(resultsDir, 'pipeline', 'exclusions-replays.json'), record, 'S4 exclusion replays'));
};


// The unbiased comparison: the Sobol screens alone (no search pressure) — the net distribution of plausible versus
// DD-excluded screen proposals — and, at C24, the incumbent-informed Track N archives (every fitted centre).
const compare = () => {
  const q = (xs: number[], p: number) => {
    const s = [...xs].sort((a, b) => a - b);
    const h = (s.length - 1) * p;

    return s.length ? s[Math.floor(h)]! + (h - Math.floor(h)) * (s[Math.ceil(h)]! - s[Math.floor(h)]!) : null;
  };
  const sum = (xs: number[]) => ({ n: xs.length, median: q(xs, 0.5), p90: q(xs, 0.9), p99: q(xs, 0.99), max: xs.length ? Math.max(...xs) : null });
  const out: Record<string, unknown> = {};

  for (const cut of cutoffKeys) {
    const nets: Record<string, number[]> = { plausible: [], 'DD > ceiling': [] };
    const realized: Record<string, number[]> = { plausible: [], 'DD > ceiling': [] };

    for (const part of ['broad1', 'broad2']) {
      const job = `search-${cut}-${part}`;
      const a = open(job);

      for (const f of fs.readdirSync(path.join(jobsDir, job, 'lanes')).sort()) {
        const lane = JSON.parse(fs.readFileSync(path.join(jobsDir, job, 'lanes', f), 'utf8')) as { seedKey: string; structure: string; res: 'coarse' | 'fine'; counts: Record<string, number> };
        const cell = cellOf(lane.structure as never);
        const n = lane.counts.screened!;
        const seen = new Set<string>();

        for (const [i, g] of screenGenomes(n, lane.res, 'screen', lane.seedKey).entries()) {
          let c: Cfg;

          try {
            c = decode(pinStratum(g, cell, i, n), lane.res);
          } catch {
            continue;
          }

          const id = cfgId(c);

          if (seen.has(id)) continue;
          seen.add(id);

          const r = a.rec(evalKeyOf(a.meta.door!, c, vOptions))!;
          const why = reasonOf(r);

          if (why in nets) {
            nets[why]!.push(r.net);
            realized[why]!.push(r.realized);
          }
        }
      }
      a.db.close();
    }
    out[cut] = { screenNet: { plausible: sum(nets.plausible!), ddExcluded: sum(nets['DD > ceiling']!) }, screenRealized: { plausible: sum(realized.plausible!), ddExcluded: sum(realized['DD > ceiling']!) } };
    console.log(`${cut} screens compared, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  // Track N (C24, incumbent-informed): every fitted centre of the two informed jobs
  const informed = { fitted: 0, feasibleByDd: 0, ddExcluded: 0, ddExcludedNetAbove: {} as Record<string, number>, topDdExcluded: [] as ReturnType<typeof slim>[], bestFeasibleNet: -Infinity };
  const refs = { 'New L0 $382,721.46': 382_721.46, 'N/original $388,031.02': 388_031.02, '$350,000': 350_000 };
  const ex: ReturnType<typeof slim>[] = [];

  for (const part of ['informed1', 'informed2']) {
    const a = open(`search-C24-${part}`);

    for (const row of a.db.prepare('select key, json from configs').iterate() as Iterable<{ key: string; json: string }>) {
      const c = decodeRec<Cfg>(row.json);
      const r = a.rec(evalKeyOf(a.meta.door!, c, vOptions));

      informed.fitted++;
      if (!r || !r.mixed || r.net <= 0) continue;
      if (r.dd <= ceiling) {
        informed.feasibleByDd++;
        informed.bestFeasibleNet = Math.max(informed.bestFeasibleNet, r.net);
      } else {
        informed.ddExcluded++;
        ex.push(slim(r, c, `informed fitted centre (${part})`, null));
      }
    }
    a.db.close();
  }
  for (const [k, v] of Object.entries(refs)) informed.ddExcludedNetAbove[k] = ex.filter((e) => e.net > v).length;
  informed.topDdExcluded = ex.sort((x, y) => y.net - x.net).slice(0, 10);

  const record = { stage: 'S4 screen comparison and Track N exclusions (archives, read-only)', freeze: freeze.protocol.sha256, code: codeDigest(), ceiling, cutoffs: out, trackN: informed, seconds: (Date.now() - t0) / 1000 };

  if (dry) console.log(JSON.stringify(record, null, 1).slice(0, 6000));
  else console.log(sealJson(path.join(resultsDir, 'pipeline', 'exclusions-compare.json'), record, 'S4 exclusion comparison'));
};

if (process.argv[2] === 'scan') scan();
else if (process.argv[2] === 'compare') compare();
else if (process.argv[2] === 'replay') await replayStage();
else console.error('usage: exclusions.ts scan | replay [--dry]');
