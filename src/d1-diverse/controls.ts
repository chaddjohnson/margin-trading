// `npm run diverse-d1 -- controls --window <w>` (PROTOCOL.md §7): the reference controls of one window — 9 strata ×
// 64 random, unoptimized configurations (identical in every window), each evaluated at its centre (0/2/5/10 bps; block
// marks at 5 bps) and on N1 `calib` (n = 64, block marks); the October 25 study's machinery checks (zero-amplitude draws
// reproduce the base; replay = full engine on 8 random neighbours per stratum; reflection stays inside the box; pooled
// shareAbove of active controls in 0.5 ± 0.05 with exact ties counted ½); and the calibration of the drawdown
// references R_m, R_t by the October 25 study's unchanged rule. Training data only; no candidate exists here.
import fs from 'fs-extra';
import type { IntParams } from '../d1-refinement/families.ts';
import { canonicalBooks, keyOf } from '../d1-robust/evaluate.ts';
import { RobustEvaluator } from '../d1-robust/evaluator.ts';
import { pickDistinct } from '../d1-robust/genome.ts';
import { type Book, applySigns, neighbourOf, stepPattern, vectorOfGrid } from '../d1-robust/neighbourhood.ts';
import { type NeighbourRecord, calibrateReferences, median, summarize } from '../d1-robust/stats.ts';
import { box, inBox } from '../multi-etf-d1/space.ts';
import { Rng } from '../optimizer/rng.ts';
import type { Grid } from '../portfolio-aware-d1/phenotypes.ts';
import { replayAgainstFull } from '../portfolio-aware-d1/parity.ts';
import { type WindowKey, log, nowIso, stageDir, study, tierFile, readJson } from './context.ts';
import { doorRecordOf, eligibleSymbols, trainingUniverse } from './data.ts';
import { provenance, readSealed, requireFrozen, sha256, writeSealed } from './freeze.ts';
import { sobolLibrary } from './library.ts';
import { blocksOfLoaded } from './parity.ts';
import { requireParity } from './parity.ts';
import { requireReproduced } from './reproduce.ts';
import { type RiskReferences, temporalNet, temporalRecord } from './scores.ts';

export interface ControlConfig {
  key: string;
  stratum: number;
  index: number;
  books: Book[];
}

export const controlsDir = (window: WindowKey, ...parts: string[]) => stageDir('controls', window, ...parts);
export const calibrationFile = (window: WindowKey) => controlsDir(window, 'calibration.json');

// The 576 configurations (window-independent).
export const controlConfigs = (universe: readonly string[]): ControlConfig[] => {
  const library = sobolLibrary().vectors;
  const configs: ControlConfig[] = [];

  for (const stratum of study.controls.strata) {
    for (let index = 0; index < study.controls.perStratum; index++) {
      const rng = Rng.from(study.seedLabel, 'control-config', stratum, index);
      const members = pickDistinct(universe, Math.min(stratum, universe.length), rng).sort();
      const books = members.map((symbol) => ({ symbol, vector: library[rng.int(library.length)]! }));

      configs.push({ key: keyOf(books), stratum, index, books });
    }
  }

  return configs;
};

export interface ControlRecord {
  key: string;
  stratum: number;
  index: number;
  books: number;
  centre: Record<string, { net: number; minuteDrawdown: number; lots: number; lotYears: number }>;
  netT: number;
  nbJ: ReturnType<typeof summarize>;
  nbT: ReturnType<typeof summarize>;
  j0: number;
  t0: number;
  eligible: boolean;
  active: boolean;
  zeroAmplitudeEqual: boolean;
}

export const isEligibleControl = (centre5: { minuteDrawdown: number; lots: number }) =>
  centre5.minuteDrawdown <= study.controls.eligibleMaxDrawdown && centre5.lots >= study.controls.eligibleMinLots;

export interface Calibration {
  bodyHash: string;
  window: WindowKey;
  references: RiskReferences;
  controlsSha256: string;
  eligible: number;
  checks: Record<string, unknown>;
}

export const readCalibration = async (window: WindowKey) =>
  (await readSealed(calibrationFile(window))) as unknown as Calibration;

export const runControls = async (window: WindowKey) => {
  await requireFrozen();
  await requireReproduced();
  await requireParity();

  if (await fs.pathExists(calibrationFile(window))) {
    throw new Error(`${calibrationFile(window)} exists: the calibration is written once`);
  }

  const started = Date.now();
  const { workers, traceCacheCapacity } = await readJson<{ workers: number; traceCacheCapacity?: number }>(tierFile);
  const universe = await eligibleSymbols();
  const loaded = await trainingUniverse(window, { symbols: universe });
  const label = study.neighbourWindowLabel(window);
  const evaluator = await RobustEvaluator.create(loaded, label, workers, traceCacheCapacity ?? 150000);
  const blocks = blocksOfLoaded(loaded);
  const configs = controlConfigs(universe);
  const books = configs.map((config) => canonicalBooks(config.books));
  const centres: Record<number, Awaited<ReturnType<RobustEvaluator['centres']>>> = {};

  for (const costBps of study.costsBps) {
    centres[costBps] = await evaluator.centres(
      books,
      costBps,
      costBps === study.principalCostBps ? { markIndices: blocks.markIndices } : {}
    );
  }

  const calib = (await evaluator.neighbourRecords(books, {
    stage: 'calib',
    cls: 'N1',
    n: study.draws.calib,
    costBps: study.principalCostBps,
    markIndices: blocks.markIndices
  })) as NeighbourRecord[][];

  // The zero-amplitude draw of every control.
  const zero = books.map((config) =>
    config.map((book) => ({
      symbol: book.symbol,
      vector: vectorOfGrid(
        applySigns(book.vector.grid, stepPattern(label, 'calib', 'N1', 0).get(book.symbol)!, 0),
        'zero amplitude'
      )
    }))
  );
  const zeroRecords = (await evaluator.run(
    zero.map((config) => ({ mode: 'neighbour' as const, books: config, costBps: study.principalCostBps, moved: 0 }))
  )) as NeighbourRecord[];
  const records: ControlRecord[] = configs.map((config, c) => {
    const five = centres[study.principalCostBps]![c]!;
    const nbJ = summarize(five.net, calib[c]!);
    const nbT = summarize(temporalNet(five.net, five.markAt), calib[c]!.map(temporalRecord));

    return {
      key: config.key,
      stratum: config.stratum,
      index: config.index,
      books: books[c]!.length,
      centre: Object.fromEntries(
        study.costsBps.map((costBps) => {
          const e = centres[costBps]![c]!;

          return [costBps, { net: e.net, minuteDrawdown: e.minuteDrawdown, lots: e.lots, lotYears: e.lotYears }];
        })
      ),
      netT: temporalNet(five.net, five.markAt),
      nbJ,
      nbT,
      j0: nbJ.p50 - study.complexityPenalty * books[c]!.length,
      t0: nbT.p50 - study.complexityPenalty * books[c]!.length,
      eligible: isEligibleControl(five),
      active: five.lots >= study.controls.activeMinLots,
      zeroAmplitudeEqual:
        zeroRecords[c]!.net === five.net &&
        zeroRecords[c]!.drawdown === five.minuteDrawdown &&
        zeroRecords[c]!.lots === five.lots
    };
  });

  // Machinery checks.
  const active = records.filter((record) => record.active);
  let above = 0;
  let ties = 0;
  let draws = 0;

  for (const record of active) {
    const c = configs.findIndex((config) => config.key === record.key);

    for (const neighbour of calib[c]!) {
      draws++;
      above += neighbour.net > record.centre[study.principalCostBps]!.net ? 1 : 0;
      ties += neighbour.net === record.centre[study.principalCostBps]!.net ? 1 : 0;
    }
  }

  const shareAbove = (above + ties / 2) / Math.max(1, draws);
  const parityRng = Rng.from(study.seedLabel, window, 'controls-parity');
  const parityNeighbours: { key: string; draw: number; differences: number }[] = [];

  for (const stratum of study.controls.strata) {
    const members = configs.filter((config) => config.stratum === stratum);

    for (let i = 0; i < study.controls.parityNeighboursPerStratum; i++) {
      const config = members[parityRng.int(members.length)]!;
      const draw = parityRng.int(study.draws.calib);
      const neighbour = canonicalBooks(neighbourOf(config.books, label, 'calib', 'N1', draw));
      const outcome = replayAgainstFull(
        loaded,
        neighbour.map((book) => book.symbol),
        evaluator.phenotypes(neighbour),
        study.principalCostBps
      );

      parityNeighbours.push({ key: config.key, draw, differences: outcome.differences.length });
    }
  }

  let outOfBox = 0;
  let boundary = 0;
  let boundaryMoves = 0;

  for (const config of configs) {
    for (let draw = 0; draw < study.draws.calib; draw++) {
      const neighbour = neighbourOf(config.books, label, 'calib', 'N1', draw);

      for (const book of config.books) {
        const moved = neighbour.find((item) => item.symbol === book.symbol)!.vector.grid;

        outOfBox += inBox(moved as unknown as IntParams) ? 0 : 1;

        box.forEach((spec) => {
          const key = spec.key as keyof Grid;
          const value = book.vector.grid[key];

          if (value === spec.min || value === spec.max) {
            boundary++;
            boundaryMoves += moved[key] !== value ? 1 : 0;
          }
        });
      }
    }
  }

  const checks = {
    shareAbove: {
      value: shareAbove,
      activeControls: active.length,
      draws,
      pass: Math.abs(shareAbove - 0.5) <= study.controls.shareAboveTolerance
    },
    zeroAmplitude: {
      equal: records.filter((record) => record.zeroAmplitudeEqual).length,
      of: records.length,
      pass: records.every((record) => record.zeroAmplitudeEqual)
    },
    replayNeighbours: {
      compared: parityNeighbours.length,
      differences: parityNeighbours.reduce((t, row) => t + row.differences, 0),
      pass: parityNeighbours.every((row) => row.differences === 0)
    },
    reflection: {
      outOfBox,
      boundarySamples: boundary,
      boundaryMoveFrequency: boundary > 0 ? boundaryMoves / boundary : NaN,
      pass:
        outOfBox === 0 &&
        (boundary === 0 || Math.abs(boundaryMoves / boundary - 2 / 3) <= study.controls.boundaryMoveTolerance)
    }
  };
  const passed = Object.values(checks).every((check) => check.pass);
  const references = calibrateReferences(
    records
      .filter((record) => record.eligible)
      .map((record) => ({ stratum: record.stratum, ddMedian: record.nbJ.ddMedian, dd90: record.nbJ.dd90 }))
  );
  const controlsText = `${records.map((record) => JSON.stringify(record, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))).join('\n')}\n`;

  await fs.outputFile(controlsDir(window, 'controls.jsonl'), controlsText);
  await evaluator.close();

  if (!passed) {
    await fs.outputJson(controlsDir(window, 'machinery-failed.json'), { generatedAt: nowIso(), checks }, { spaces: 2 });
    throw new Error(`The machinery checks failed in ${window} (study stopped): ${JSON.stringify(checks)}`);
  }

  const record = await writeSealed(calibrationFile(window), {
    window,
    generatedAt: nowIso(),
    provenance: await provenance(),
    door: doorRecordOf('trainingUniverse', loaded, window),
    blocks,
    controls: records.length,
    eligible: records.filter((item) => item.eligible).length,
    eligibleByStratum: Object.fromEntries(
      study.controls.strata.map((stratum) => [
        stratum,
        records.filter((item) => item.eligible && item.stratum === stratum).length
      ])
    ),
    medianDrawdownOfEligible: median(records.filter((item) => item.eligible).map((item) => item.nbJ.ddMedian)),
    references,
    checks,
    controlsSha256: sha256(controlsText),
    seconds: (Date.now() - started) / 1000
  });

  log(
    `${window} controls: ${records.length} controls, ${record.eligible as number} eligible, checks passed, calibration ${record.bodyHash.slice(0, 12)}`
  );

  return record;
};

export const readControls = async (window: WindowKey): Promise<ControlRecord[]> => {
  const calibration = await readCalibration(window);
  const text = await fs.readFile(controlsDir(window, 'controls.jsonl'), 'utf8');

  if (sha256(text) !== calibration.controlsSha256) {
    throw new Error(`${controlsDir(window, 'controls.jsonl')} does not hash to its calibration record`);
  }

  return text
    .split('\n')
    .filter(Boolean)
    .map(
      (line) =>
        JSON.parse(line, (_k, v) =>
          v === 'NaN' ? NaN : v === 'Infinity' ? Infinity : v === '-Infinity' ? -Infinity : v
        ) as ControlRecord
    );
};
