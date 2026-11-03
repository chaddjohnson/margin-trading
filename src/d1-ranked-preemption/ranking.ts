// Stage B (PROTOCOL.md §8): the two frozen priority rankings of a window, from the sealed Stage A representatives only.
// R1 = mean net per trade; R2 = net per capital-occupied calendar day; an open trade at its liquidation value in both
// numerator and denominator. Higher score = higher priority; exact ties → more trades, then the symbol; unrankable
// symbols last, alphabetically. Each ranking is a sealed write-once file that every later stage re-verifies.
import path from 'node:path';
import fs from 'fs-extra';
import {
  type RankingKey,
  type WindowKey,
  log,
  nowIso,
  rankingKeys,
  rankingsRoot,
  sampleLabel,
  study
} from './context.ts';
import { readSealed, sha256File, writeSealed } from './freeze.ts';
import { requireFrozen } from './guard.ts';
import { stageAFile } from './standalone.ts';

export const rankingFile = (window: WindowKey, key: RankingKey) => path.join(rankingsRoot, window, `${key}.json`);

export interface RankingEntry {
  position: number; // 1 = highest priority
  symbol: string;
  score: number | null; // null: unrankable
  meanNet: number | null;
  netPerDay: number | null;
  trades: number;
  occupiedDays: number;
  net: number | null;
  sample: string;
  credible: boolean;
  status: string;
  phenotype: { candidateId: string; file: string; sha256: string; grid: Record<string, number> } | null;
}

export interface RankingFile {
  [key: string]: unknown;
  bodyHash: string;
  schema: string;
  window: WindowKey;
  metric: RankingKey;
  order: string[];
  entries: RankingEntry[];
}

export const definitions: Record<RankingKey, string> = {
  R1: 'mean net P&L per trade of the representative standalone phenotype: Σ trade nets ÷ trades (every entered trade; a trade open at the search end at its liquidation value at the last close, exit friction and interest to that session included); after 11% simple interest and 5 bps per side',
  R2: 'net P&L per capital-occupied calendar day of the representative standalone phenotype: Σ trade nets ÷ Σ max(1, calendar days from the entry session date to the exit (or search-end) session date); the same trade nets as R1'
};

interface StageASymbol {
  status: string;
  sample: string;
  representative: {
    credible: boolean;
    grid: Record<string, number>;
    candidateId: string;
    phenotypeFile: string;
    metrics: { meanNet: number; netPerDay: number; trades: number; occupiedDays: number; net: number };
  } | null;
}

export const orderOf = (entries: readonly Omit<RankingEntry, 'position'>[]) => {
  const rankable = entries
    .filter((entry) => entry.score !== null && Number.isFinite(entry.score))
    .sort(
      (a, b) => b.score! - a.score! || b.trades - a.trades || (a.symbol < b.symbol ? -1 : a.symbol > b.symbol ? 1 : 0)
    );
  const unrankable = entries
    .filter((entry) => !(entry.score !== null && Number.isFinite(entry.score)))
    .sort((a, b) => (a.symbol < b.symbol ? -1 : 1));

  return [...rankable, ...unrankable].map((entry, index) => ({ ...entry, position: index + 1 }));
};

export const runRankings = async (window: WindowKey) => {
  const guard = await requireFrozen();
  const stageA = await readSealed<{
    bodyHash: string;
    symbols: Record<string, StageASymbol>;
    files: Record<string, string>;
  }>(stageAFile(window));
  const written: Record<string, string> = {};

  for (const key of rankingKeys) {
    const file = rankingFile(window, key);

    if (await fs.pathExists(file)) {
      throw new Error(`${file} exists: the ${window} ranking is sealed`);
    }

    const entries: Omit<RankingEntry, 'position'>[] = [];

    for (const [symbol, record] of Object.entries(stageA.symbols)) {
      const rep = record.representative;
      const phenotypeFile = rep?.phenotypeFile;
      let phenotype: RankingEntry['phenotype'] = null;

      if (rep && phenotypeFile) {
        const sha256 = await sha256File(phenotypeFile);

        if (stageA.files[phenotypeFile] !== sha256) {
          throw new Error(`${phenotypeFile} does not match the sealed Stage A record`);
        }

        phenotype = { candidateId: rep.candidateId, file: phenotypeFile, sha256, grid: rep.grid };
      }

      const score = rep ? (key === 'R1' ? rep.metrics.meanNet : rep.metrics.netPerDay) : null;

      entries.push({
        symbol,
        score: rep && Number.isFinite(score) ? score : null,
        meanNet: rep ? rep.metrics.meanNet : null,
        netPerDay: rep ? rep.metrics.netPerDay : null,
        trades: rep?.metrics.trades ?? 0,
        occupiedDays: rep?.metrics.occupiedDays ?? 0,
        net: rep ? rep.metrics.net : null,
        sample: sampleLabel(rep?.metrics.trades ?? 0),
        credible: rep?.credible ?? false,
        status: record.status,
        phenotype
      });
    }

    const ordered = orderOf(entries);
    const sealed = await writeSealed(file, {
      schema: 'ranked-preemption-ranking',
      schemaVersion: 1,
      study: study.version,
      window,
      metric: key,
      definition: definitions[key],
      ties: 'exact score ties: more trades first, then the symbol alphabetically',
      unrankable: 'symbols without any trade follow every rankable symbol, alphabetically',
      priority: 'position 1 is the highest priority; a pool inherits the relative order of its members',
      frozenAt: nowIso(),
      guard,
      stageA: { file: stageAFile(window), bodyHash: stageA.bodyHash },
      order: ordered.map((entry) => entry.symbol),
      entries: ordered
    });

    written[key] = sealed.bodyHash;
    log(
      `ranking ${window}/${key}: ${ordered
        .slice(0, 8)
        .map((entry) => entry.symbol)
        .join(' ')} … sealed ${sealed.bodyHash.slice(0, 12)}`
    );
  }

  return written;
};

export const readRanking = async (window: WindowKey, key: RankingKey) =>
  readSealed<RankingFile>(rankingFile(window, key));

export const rankingId = (window: WindowKey, key: RankingKey) => `${window}/${key}`;

// Acceptance (PROTOCOL.md §8, §18): each ranked symbol's representative phenotype JSON, run alone through the derived
// engine (fixed, P0, the window's training data), reproduces the sealed R1 and R2 scores from the engine's own lots.
export const recheckRankings = async (window: WindowKey) => {
  const { trainingUniverse } = await import('./data.ts');
  const { engineRun } = await import('./runs.ts');
  const { allocationOf } = await import('./allocation.ts');
  const { fixedLiquidation } = await import('./allocation.ts');
  const { readJson, writeJson, stageDir } = await import('./context.ts');
  const r1 = await readRanking(window, 'R1');
  const r2 = await readRanking(window, 'R2');
  const ranked = r1.entries.filter((entry) => entry.phenotype);
  const loaded = await trainingUniverse(window, { symbols: ranked.map((entry) => entry.symbol) });
  const rows = [];
  let failures = 0;

  for (const entry of ranked) {
    const phenotype = await readJson<{ grid: Record<string, number>; candidateId: string; symbol: string }>(
      entry.phenotype!.file
    );

    if ((await sha256File(entry.phenotype!.file)) !== entry.phenotype!.sha256) {
      throw new Error(`${entry.phenotype!.file} changed after the ranking was sealed`);
    }

    const result = engineRun(
      loaded,
      [
        {
          symbol: entry.symbol,
          vector: { id: phenotype.candidateId, grid: phenotype.grid as never, origin: 'recheck' }
        }
      ],
      'fixed',
      5,
      allocationOf('P0')
    );
    const { sTime } = loaded.universe.instruments[entry.symbol]!.ds;
    const last = result.endIndex;
    let net = 0;
    let days = 0;

    for (const lot of result.lots) {
      const lotNet =
        lot.exitIndex >= 0
          ? lot.net
          : fixedLiquidation(lot as never, lot.exitRawPrice, sTime[last]!, result.config.rate, result.config.costBps)
              .net;

      net += lotNet;
      days += Math.max(1, ((lot.exitIndex >= 0 ? sTime[lot.exitIndex]! : sTime[last]!) - lot.entryTimestamp) / 86400);
    }

    const recomputedR1 = result.lots.length > 0 ? net / result.lots.length : null;
    const recomputedR2 = days > 0 ? net / days : null;
    const sealedR2 = r2.entries.find((other) => other.symbol === entry.symbol)!.score;
    const ok =
      result.lots.length === entry.trades &&
      Math.abs((recomputedR1 ?? NaN) - (entry.score ?? NaN)) < 1e-6 &&
      Math.abs((recomputedR2 ?? NaN) - (sealedR2 ?? NaN)) < 1e-6;

    failures += ok ? 0 : 1;
    rows.push({
      symbol: entry.symbol,
      trades: result.lots.length,
      sealedTrades: entry.trades,
      r1: recomputedR1,
      sealedR1: entry.score,
      r2: recomputedR2,
      sealedR2,
      ok
    });
  }

  const file = stageDir('rankings-check', `${window}.json`);

  await writeJson(file, {
    window,
    checkedAt: new Date().toISOString(),
    r1: r1.bodyHash,
    r2: r2.bodyHash,
    failures,
    rows
  });
  log(`ranking recheck ${window}: ${rows.length - failures}/${rows.length} reproduced by the engine → ${file}`);

  if (failures > 0) {
    throw new Error(`${failures} ranking scores were not reproduced by the full engine`);
  }

  return rows;
};
