// BTC research phenotypes (config/research-phenotypes/btcusdt-d1/*.json) and the data door. A phenotype is written
// from the sealed records only, never by hand, and its door says the last UTC day it may be run through: the day
// before the holdout unless the holdout was opened for exactly that phenotype by the single authorised evaluation.
import fs from 'node:fs';
import path from 'node:path';
import { type Chronology, dateOf } from './calendar.ts';
import { study } from './context.ts';
import { stopFills } from './costs.ts';
import { type D1Grid, gridOfJson, jsonOfGrid, paramSpecs } from './params.ts';
import { procedure } from './protocol.ts';

export interface PhenotypeFile {
  schemaVersion: 1;
  study: string;
  id: string;
  status: 'diagnostic' | 'research-only' | 'holdout-evaluated research-only';
  description: string;
  architecture: string;
  engine: string;
  parameters: Record<string, string | number>;
  units: Record<string, string>;
  calendar: string;
  venue: string;
  account: string;
  costScenario: string;
  dataSnapshot: {
    file: string;
    snapshotPrefixSha256: string;
    seriesSha256: string;
    historyStart: string;
    lastDay: string;
  };
  boundaries: Record<string, unknown>;
  dataDoor: { latestPermittedDay: string; holdoutEvaluated: boolean; reason: string };
  origin: Record<string, unknown>;
  evidence: Record<string, unknown>;
  gateFailures: string[];
  seeds: Record<string, unknown>;
  liveTrading: 'not authorised: historical research only';
}

export const phenotypePath = (id: string) => path.join(study.phenotypeDir, `${id}.json`);

export const listPhenotypes = (): PhenotypeFile[] =>
  fs.existsSync(study.phenotypeDir)
    ? fs
        .readdirSync(study.phenotypeDir)
        .filter((file) => file.endsWith('.json'))
        .sort()
        .map((file) => JSON.parse(fs.readFileSync(path.join(study.phenotypeDir, file), 'utf8')) as PhenotypeFile)
    : [];

export const readPhenotype = (id: string) => {
  const file = phenotypePath(id);

  if (!/^[a-z0-9-]+$/.test(id) || !fs.existsSync(file)) {
    const known = listPhenotypes().map((phenotype) => phenotype.id);

    throw new Error(`Unknown BTC phenotype '${id}' (known: ${known.join(', ') || 'none written yet'})`);
  }

  const phenotype = JSON.parse(fs.readFileSync(file, 'utf8')) as PhenotypeFile;

  if (phenotype.id !== id || phenotype.study !== study.id) {
    throw new Error(`${file}: id/study mismatch`);
  }

  return { phenotype, grid: gridOfJson(phenotype.parameters, file) };
};

export const unitsOf = () =>
  Object.fromEntries(
    paramSpecs.map((spec) => [
      spec.key,
      `${spec.unit === 'percent' ? 'percent string, 0.1-point grid' : 'whole UTC calendar days'}: ${spec.meaning}`
    ])
  );

export const commonFields = (
  chronology: Chronology,
  snapshot: { rawFile: string; snapshotPrefixSha256: string; seriesSha256: string }
) => ({
  schemaVersion: 1 as const,
  study: study.id,
  architecture: 'D1 (src/app/allIn-trailingBuy-postExitContinuation.ts rules) adapted to the BTC clock',
  engine: `${study.version}: reference src/btcusdt-d1/engine.ts, fast replay src/btcusdt-d1/fast.ts`,
  units: unitsOf(),
  calendar: 'UTC calendar days (00:00:00 UTC boundaries), 24/7 trading, decisions at completed minutes',
  venue: 'BTCUSDT spot minute bars of unverified venue provenance (consistent with Binance spot; no local metadata)',
  account:
    'cash-funded spot: 100,000 USDT start, at most 100,000 USDT gross notional per entry, no borrowing, no leverage, cash earns 0',
  costScenario: `principal: fee ${procedure.settings.principal.costs.feeBps} bps + impact ${procedure.settings.principal.costs.impactBps} bps per side; stops at ${stopFills.adverse}`,
  dataSnapshot: {
    file: snapshot.rawFile,
    snapshotPrefixSha256: snapshot.snapshotPrefixSha256,
    seriesSha256: snapshot.seriesSha256,
    historyStart: dateOf(chronology.historyStartDay),
    lastDay: dateOf(chronology.lastDay)
  },
  boundaries: {
    armingFrom: dateOf(chronology.armStartDay),
    folds: chronology.folds.map((fold) => ({
      label: fold.label,
      selection: [dateOf(fold.selection.startDay), dateOf(fold.selection.endDay - 1)],
      validation: [dateOf(fold.validation.startDay), dateOf(fold.validation.endDay - 1)]
    })),
    finalSelection: [dateOf(chronology.final.selection.startDay), dateOf(chronology.final.selection.endDay - 1)],
    holdout: [dateOf(chronology.holdout.startDay), dateOf(chronology.holdout.endDay - 1)]
  },
  seeds: { seedRoot: procedure.seedRoot, sobol: 'deriveSeed(seedRoot, "sobol")', procedure: procedure.version },
  liveTrading: 'not authorised: historical research only' as const
});

export const writePhenotype = (phenotype: PhenotypeFile) => {
  const file = phenotypePath(phenotype.id);
  const text = `${JSON.stringify(phenotype, null, 2)}\n`;

  if (fs.existsSync(file)) {
    if (fs.readFileSync(file, 'utf8') !== text) {
      throw new Error(`${file} exists with different content; phenotypes are written once from the sealed records`);
    }

    return file;
  }

  fs.mkdirSync(study.phenotypeDir, { recursive: true });
  fs.writeFileSync(file, text, { flag: 'wx' });

  return file;
};

export const parametersOf = (grid: D1Grid) => jsonOfGrid(grid);
