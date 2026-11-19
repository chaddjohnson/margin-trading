// The archive scan (PROTOCOL.md §5.1, §7.4; training door only, archive hits only, no fresh simulation): every
// configuration fitted in a subject's independent search job of a cutoff, with its archived centre record and its
// rung-1 (or refinement) 16-draw neighbourhood reconstructed from the archive with the subject's own generator and
// feasibility function. The output is a derived cache (.cache/optimization-process-audit/scan/<s>-<cut>.jsonl) whose
// sha256 the inventory seals; its configurations are re-read from the subject's archive by identity when needed.
import fs from 'node:fs';
import path from 'node:path';
import { writeAtomic } from '../growth140-vgt-s8m/checkpoint.ts';
import type { Cfg as Cfg3B } from '../vg-d1-growth-expanded/config.ts';
import type { GConfig } from '../gdx-growth-standalone/space.ts';
import { type HistCut, cacheRoot, cuts, economics, log, r2 } from './context.ts';
import { sha256File } from './records.ts';
import { type SubjectKey, sources } from './sources.ts';
import {
  Archive,
  type Conf,
  type Rec,
  archivedRecs,
  conf3B,
  conf4A,
  fitOfConf,
  keyOf,
  nbStats,
  plausibleOf,
  searchDraws
} from './subjects.ts';

export const scanFile = (s: SubjectKey, cut: HistCut) => path.join(cacheRoot, 'scan', `${s}-${cut}.jsonl`);

export interface ScanRow {
  id: string;
  cell: string;
  net: number;
  dd: number;
  lots: number;
  episodes: number;
  topEpisode: number;
  topEpisodeShare: number | null;
  years: Record<string, number>;
  exBestYear: number; // centre net minus its best calendar year's P&L
  sessionsHeld: number;
  signature: string;
  plausible: boolean;
  rung: 'r1' | 'refine' | null; // the 16-draw family found complete in the archive
  nb: { n: number; robust: number; median: number; p10: number; p90Dd: number; worstDd: number; worst2Dd: number; distinct: number; sameAsCentre: number; clipped: number; breaches: number } | null;
  violation: number | null;
  feasible: boolean;
}

export const exBestYear = (r: Pick<Rec, 'net' | 'years'>) => {
  const ys = Object.values(r.years ?? {});

  return r2(r.net - (ys.length ? Math.max(...ys) : 0));
};

// The mean of the k = ⌈0.1 n⌉ largest drawdowns (for 16 draws: the worst 2).
export const worstTenthMean = (dds: readonly number[]) => {
  if (dds.length === 0) return NaN;

  const k = Math.ceil(0.1 * dds.length);
  const s = [...dds].sort((a, b) => b - a).slice(0, k);

  return r2(s.reduce((a, b) => a + b, 0) / k);
};

export const confOfArchived = (s: SubjectKey, value: unknown): Conf =>
  s === '3B' ? conf3B(value as Cfg3B) : conf4A((value as { gdx: GConfig }).gdx);

export const scanCut = (s: SubjectKey, cut: HistCut) => {
  const file = scanFile(s, cut);

  if (fs.existsSync(file)) {
    log(`${s} ${cut}: scan exists (${sha256File(file).slice(0, 12)}…)`);
    return file;
  }

  const door = cuts[cut].door;
  const arc = new Archive(sources[s].searchJob(cut));
  const t0 = Date.now();
  const lines: string[] = [];
  let n = 0;

  for (const { id, value } of arc.configs()) {
    const c = confOfArchived(s, value);

    if (c.id !== id) throw new Error(`${s} ${cut}: archived config ${id} rebuilds as ${c.id}`);

    const centre = arc.point(keyOf(door, c.quad, c.options));

    if (!centre) throw new Error(`${s} ${cut}: the centre of ${id} is not archived`);

    const plausible = plausibleOf(c, centre);
    let rung: ScanRow['rung'] = null;
    let nb: ScanRow['nb'] = null;
    let violation: number | null = null;

    if (plausible)
      for (const rg of ['r1', 'refine'] as const) {
        const draws = searchDraws(c, cut, rg);
        const recs = archivedRecs(arc, door, draws);

        if (!recs) continue;

        const st = nbStats(
          centre,
          recs,
          draws.map((d) => d.clipped)
        );

        rung = rg;
        nb = {
          n: st.n,
          robust: st.robust,
          median: st.median,
          p10: st.p10,
          p90Dd: st.p90Dd,
          worstDd: st.worstDd,
          worst2Dd: worstTenthMean(recs.map((r) => r.dd)),
          distinct: st.distinct,
          sameAsCentre: st.sameAsCentre,
          clipped: st.clipped,
          breaches: st.breaches
        };
        violation = fitOfConf(c, rg, centre, st).violation;
        break;
      }
    else violation = fitOfConf(c, 'r1', centre, null).violation;

    const row: ScanRow = {
      id,
      cell: c.cell,
      net: centre.net,
      dd: centre.dd,
      lots: centre.lots,
      episodes: centre.episodes,
      topEpisode: centre.topEpisode,
      topEpisodeShare: Number.isFinite(centre.topEpisodeShare) ? centre.topEpisodeShare : null,
      years: centre.years,
      exBestYear: exBestYear(centre),
      sessionsHeld: centre.sessionsHeld,
      signature: centre.signature,
      plausible,
      rung,
      nb,
      violation,
      feasible: violation === 0
    };

    lines.push(JSON.stringify(row));
    if (++n % 10_000 === 0) log(`${s} ${cut}: ${n} configurations scanned (${Math.round((Date.now() - t0) / 1000)} s)`);
  }

  const reads = arc.reads;

  arc.close();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  writeAtomic(file, `${lines.join('\n')}\n`);
  log(`${s} ${cut}: ${n} configurations, ${reads} archive reads, ${Math.round((Date.now() - t0) / 1000)} s → ${sha256File(file).slice(0, 12)}…`);
  return file;
};

export const readScan = (s: SubjectKey, cut: HistCut): ScanRow[] =>
  fs
    .readFileSync(scanFile(s, cut), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as ScanRow);

export const ceiling = economics.ceiling;
