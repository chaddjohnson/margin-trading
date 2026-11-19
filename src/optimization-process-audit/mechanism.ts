// Stage 1 mechanism audit and the feature menu (PROTOCOL.md §5.4, §5.5, §6). Training doors only.
//
// - Features of every E(s, c) member: the sealed centre, the selection family (2 × 128 from archive hits, pooled as the
//   subject pooled it) with tail severity and per-draw subperiod/episode statistics, and the centre's CAUSAL net
//   without new funding in its leading winning episode (a fresh training-door rerun; window = the episode's first
//   decision session → its last exit, PROTOCOL.md §5.5).
// - Episode reproduction across neighbours: fresh detailed reruns of selection rep-1 (128 draws) for the published role
//   holders and the C24 independent primaries.
// - The 4A eligibility interaction: the Growth engine's own decision log (Priority 3A's observer) for the C24 primary
//   and the C24 robust-profit holder of the final set, on D24.
import fs from 'node:fs';
import { observe } from '../vg-d1-growth-diagnostic/observer.ts';
import { episodesOf } from '../vg-d1-growth-joint/evaluate.ts';
import type { Door } from '../vg-d1-growth-joint/data.ts';
import { type Cut, allCuts, codeDir, cuts, freezeFile, histCuts, log, r2, stageFile } from './context.ts';
import { counter } from './compute.ts';
import { assertParity } from './reproduce.ts';
import { assertCommitted, codeDigest, readJson, rel, sealJson } from './records.ts';
import { exBestYear, worstTenthMean } from './scan.ts';
import { type SubjectKey, sources, subjectKeys } from './sources.ts';
import {
  Archive,
  type Conf,
  type Rec,
  type SealedEvidence,
  archivedRecs,
  confOfEvidence,
  detailedRun,
  eligibleSet,
  evaluateConf,
  familyDraws,
  openDoor,
  selectionDraws,
  selectionOf,
  tailOf
} from './subjects.ts';

const med = (xs: number[]) => {
  if (!xs.length) return null;

  const s = [...xs].sort((a, b) => a - b);
  const m = (s.length - 1) / 2;

  return r2((s[Math.floor(m)]! + s[Math.ceil(m)]!) / 2);
};

const quant = (xs: number[], p: number) => {
  if (!xs.length) return null;

  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);

  return r2(s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo));
};

// The leading winning episode of a detailed run: window from its first lot's decision session to its last exit.
export const leadingEpisode = (door: Door, x: ReturnType<typeof detailedRun>['x']) => {
  const r = x.result;
  const eps = episodesOf(r)
    .filter((e) => e.net > 0)
    .sort((a, b) => b.net - a.net);
  const top = eps[0];

  if (!top) return null;

  const last = Number.isFinite(top.last) ? Math.min(top.last, r.endIndex) : r.endIndex;
  const lots = r.lots.filter((l) => l.entryS >= top.first && l.entryS <= last);
  const firstDecision = Math.min(...lots.map((l) => l.trade.dS));

  return {
    firstS: firstDecision,
    firstEntryS: top.first,
    lastS: last,
    first: door.dates[firstDecision]!,
    firstEntry: door.dates[top.first]!,
    last: door.dates[last]!,
    net: r2(top.net),
    lots: top.lots
  };
};

export interface Features {
  subject: SubjectKey;
  cut: Cut;
  label: string;
  id: string;
  cell: string;
  roles: string[];
  centre: {
    net: number;
    dd: number;
    lots: number;
    episodes: number;
    topEpisode: number;
    topEpisodeShare: number;
    years: Record<string, number>;
    exBestYear: number;
    worstYear: number;
    positiveYears: number;
    years_n: number;
    sessionsHeld: number;
  };
  select: {
    n: number;
    robust: number;
    median: number;
    p10: number;
    p90Dd: number;
    p95Dd: number;
    worst10Mean: number;
    worstDd: number;
    breachShare: number;
    breachInterval: number[];
    distinct: number;
    sameAsCentre: number;
    clipped: number;
    exBestYearMedian: number | null;
    exBestYearP10: number | null;
    topEpisodeShareMedian: number | null;
    lotsMedian: number | null;
    zeroLotDraws: number;
  };
  causal: {
    window: { first: string; firstEntry: string; last: string } | null;
    episodeNet: number;
    lots: number;
    netWithout: number; // the causal rerun's net (centre net when there is no winning episode)
    ddWithout: number;
    arithmetic: number; // centre net − the episode's booked net
  };
  confirmQualificationOnly: { p10: number; p90Dd: number };
}

export const featuresOf = (s: SubjectKey, cut: Cut, e: SealedEvidence, c: Conf, recs: Rec[], clipped: number[], causal: Features['causal'], roles: string[]): Features => {
  const ys = Object.values(e.centre.years ?? {});
  const tail = tailOf(e.centre, recs.map((rec, i) => ({ rec, clipped: clipped[i]! })));

  return {
    subject: s,
    cut,
    label: e.label,
    id: e.id,
    cell: c.cell,
    roles,
    centre: {
      net: e.centre.net,
      dd: e.centre.dd,
      lots: e.centre.lots,
      episodes: e.centre.episodes,
      topEpisode: e.centre.topEpisode,
      topEpisodeShare: e.centre.topEpisodeShare,
      years: e.centre.years,
      exBestYear: exBestYear(e.centre),
      worstYear: ys.length ? r2(Math.min(...ys)) : 0,
      positiveYears: ys.filter((y) => y > 0).length,
      years_n: ys.length,
      sessionsHeld: e.centre.sessionsHeld
    },
    select: {
      n: recs.length,
      robust: e.select.robust,
      median: e.select.median,
      p10: e.select.p10,
      p90Dd: e.select.p90Dd,
      p95Dd: tail.p95Dd,
      worst10Mean: tail.worst10Mean,
      worstDd: tail.worstDd,
      breachShare: tail.breachShare,
      breachInterval: tail.breachInterval,
      distinct: e.select.distinct,
      sameAsCentre: e.select.sameAsCentre,
      clipped: e.select.clipped,
      exBestYearMedian: med(recs.map((r) => exBestYear(r))),
      exBestYearP10: quant(recs.map((r) => exBestYear(r)), 0.1),
      topEpisodeShareMedian: med(recs.filter((r) => Number.isFinite(r.topEpisodeShare)).map((r) => r.topEpisodeShare)),
      lotsMedian: med(recs.map((r) => r.lots)),
      zeroLotDraws: recs.filter((r) => r.lots === 0).length
    },
    causal,
    confirmQualificationOnly: { p10: e.confirm.p10, p90Dd: e.confirm.p90Dd }
  };
};

// The feature row of one qualified member (archive hits for the selection family; two fresh training-door runs for the
// causal no-new-funding net). Used for E(s, c) here and for the secondary C24 universe in Stage 4.
export const featureRow = (
  door: Door,
  s: SubjectKey,
  cut: Cut,
  e: SealedEvidence,
  arc: Archive,
  roles: string[],
  cnt: ReturnType<typeof counter>
) => {
  const c = confOfEvidence(s, e);
  const draws = selectionDraws(c, cut);
  const recs = archivedRecs(arc, cuts[cut].door, draws);

  if (!recs) throw new Error(`${s} ${cut} ${e.label}: a selection draw is not archived`);

  const d = detailedRun(door, c);

  cnt.fresh('training centre detailed (causal window)');
  if (d.rec.net !== e.centre.net || d.rec.dd !== e.centre.dd) throw new Error(`${s} ${cut} ${e.label}: centre rerun differs from the sealed centre`);

  const top = leadingEpisode(door, d.x);
  let causal: Features['causal'];

  if (top) {
    const b = evaluateConf(door, c, { blackouts: [{ first: top.first, last: top.last }] });

    cnt.fresh('training causal blackout rerun');
    causal = { window: { first: top.first, firstEntry: top.firstEntry, last: top.last }, episodeNet: top.net, lots: top.lots, netWithout: b.net, ddWithout: b.dd, arithmetic: r2(e.centre.net - top.net) };
  } else causal = { window: null, episodeNet: 0, lots: 0, netWithout: e.centre.net, ddWithout: e.centre.dd, arithmetic: e.centre.net };

  return { features: featuresOf(s, cut, e, c, recs, draws.map((x) => x.clipped), causal, roles), c, top };
};

export const runMechanism = async () => {
  const cnt = counter('stage1 mechanism');

  assertCommitted(freezeFile);
  assertParity();
  if (fs.existsSync(stageFile.mechanism)) throw new Error(`${rel(stageFile.mechanism)} is sealed`);

  const features: Features[] = [];
  const episodes: unknown[] = [];

  for (const cut of allCuts) {
    const door = await openDoor(cuts[cut].door, `stage1 mechanism ${cut}: features, causal reruns, neighbour episodes (training door)`);

    for (const s of subjectKeys) {
      const sel = selectionOf(s, cut);
      const roles = sel.roles.independent!.roles;
      const roleOf = (label: string) => Object.entries(roles).filter(([, l]) => l === label).map(([r]) => r);
      const arc = new Archive(sources[s].qualifyJob(cut));

      for (const e of eligibleSet(s, cut)) {
        const { features: f, c, top } = featureRow(door, s, cut, e, arc, roleOf(e.label), cnt);

        features.push(f);

        // neighbour episode reproduction for the published role holders (C19–C23) and the C24 independent roles
        const isRoleHolder = roleOf(e.label).length > 0;

        if (isRoleHolder && top) {
          const rep1 = familyDraws(c, 'select', ['select', 1, cut], 128).filter((x) => x.id !== c.id && !(x as { dup?: boolean }).dup);
          const seen = new Set<string>();
          let overlap = 0;
          let positive = 0;
          let concentrated = 0;
          const inWindowShares: number[] = [];
          const nets: number[] = [];

          for (const dr of rep1) {
            if (seen.has(dr.id)) continue;
            seen.add(dr.id);

            const nd = detailedRun(door, { quad: dr.quad, options: dr.options });

            cnt.fresh('training neighbour detailed (episode reproduction)');

            const ntop = leadingEpisode(door, nd.x);
            const inWin = nd.x.result.lots.filter((l) => l.entryS >= top.firstEntryS && l.entryS <= top.lastS).reduce((a, l) => a + l.net, 0);

            nets.push(nd.rec.net);
            if (nd.rec.net > 0) {
              positive++;
              inWindowShares.push(inWin / nd.rec.net);
              if (Number.isFinite(nd.rec.topEpisodeShare) && nd.rec.topEpisodeShare > 0.5) concentrated++;
            }
            if (ntop && ntop.firstEntryS <= top.lastS && ntop.lastS >= top.firstEntryS) overlap++;
          }

          episodes.push({
            subject: s,
            cut,
            label: e.label,
            roles: roleOf(e.label),
            centreWindow: { firstEntry: top.firstEntry, last: top.last, net: top.net, share: e.centre.topEpisodeShare },
            draws: seen.size,
            leadingEpisodeOverlapsCentre: overlap,
            overlapShare: r2(overlap / Math.max(1, seen.size)),
            positiveDraws: positive,
            medianShareOfNetInCentreWindow: med(inWindowShares),
            drawsOver50pctInOneEpisode: concentrated,
            medianNet: med(nets)
          });
        }
      }

      cnt.hits('selection draws (features)', arc.reads);
      arc.close();
      log(`mechanism ${s} ${cut}: ${eligibleSet(s, cut).length} members`);
    }
  }

  // ----- the 4A eligibility interaction (D24) -----
  const door24 = await openDoor('D24', 'stage1 mechanism: 4A eligibility decision logs (training door D24)');
  const sel24 = selectionOf('4A', 'C24');
  const subjects4A = [sel24.roles.independent!.roles['actual-profit']!, sel24.roles.final!.roles['robust-profit']!];
  const eligibility: unknown[] = [];

  for (const label of subjects4A) {
    const e = sel24.evidence.find((x) => x.label === label)!;
    const c = confOfEvidence('4A', e);
    const ob = observe(door24, c.quad, c.options, { books: 0 }, true);

    cnt.fresh('training observer run (4A eligibility)');

    const g = ob.growth['G:GDX']!.run as unknown as { simulation: { log: { entries: { event: string; session: number; disposition?: string; reason?: string; [k: string]: unknown }[] } } };
    const entries = g.simulation.log.entries;
    const counts: Record<string, number> = {};
    const reasons: Record<string, number> = {};

    for (const x of entries) {
      counts[x.event] = (counts[x.event] ?? 0) + 1;
      if (x.event === 'base_signal' || x.event === 'opportunity_invalidated') {
        const k = `${x.event}: ${x.disposition ?? ''} ${String(x.reason ?? '').split(/[:—]/)[0]!.trim()}`;

        reasons[k] = (reasons[k] ?? 0) + 1;
      }
    }

    const gdx = c.raw as Record<string, unknown>;

    eligibility.push({
      label,
      id: e.id,
      settings: Object.fromEntries(
        Object.entries(gdx).filter(([k]) => /^(entryMethod|advance|recentLow|eligibility|trendFilter|continuation|trailing|maximumLosing|initialStop|trendRetention|drawdownRecovery)/.test(k))
      ),
      events: counts,
      reasons,
      timeline: entries
        .filter((x) => x.event !== 'mark')
        .map((x) => ({ date: door24.dates[x.session], ...Object.fromEntries(Object.entries(x).filter(([k]) => k !== 'session')) })),
      lots: ob.result.lots.map((l) => ({ entry: door24.dates[l.entryS], decision: door24.dates[l.trade.dS], exit: l.open ? null : door24.dates[l.fills.at(-1)!.s], net: r2(l.net) }))
    });
  }

  const record = {
    stage: 'stage1 mechanism audit and feature menu',
    note: 'training doors only; confirmation statistics are carried for qualification reference only and never enter a feature',
    features,
    episodes,
    eligibility4A: eligibility,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.mechanism, record, 'stage1 mechanism');
  log(`stage1 mechanism: ${features.length} feature rows, ${episodes.length} neighbour-episode audits`);
  return record;
};

export const _hist = histCuts;
export const _w = worstTenthMean;
