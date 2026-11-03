// The legacy research inputs: the files the completed research programs pinned by sha256 before the minute data moved
// to data/<SYMBOL>/data.csv. config/archive/legacy-research-inputs.json lists each one with its hash, the research
// documents that pin it and its exact derivation, and `npm run legacy-archive -- build` reconstructs them, byte for
// byte, under data/archive/legacy-research-inputs/ (src/legacy-archive/). Only the frozen research programs read them,
// through legacyResearchFile; strategies and new optimizations use the partitions (src/lib/dataset.ts), and nothing
// falls back from one to the other: a missing or different archive file fails the program's own hash check.
import path from 'node:path';
import fs from 'fs-extra';

export const legacyArchiveManifestFile = 'config/archive/legacy-research-inputs.json';

export type LegacyArchiveSource =
  // The first `rows` rows of data/<symbol>/data.csv, none of them in the final partition.
  | { kind: 'canonical-prefix'; symbol: string; rows: number }
  // Lines firstLine..lastLine (1-based, inclusive) of a file whose own sha256 is recorded.
  | { kind: 'lines'; file: string; fileSha256: string; firstLine: number; lastLine: number };

export interface LegacyArchiveEntry {
  legacyPath: string; // the path the research used, for example data/VGT/VGT-2016-2025-1-minute.csv
  sha256: string;
  bytes: number;
  rows: number;
  firstRow: string;
  lastRow: string;
  pinnedBy: string[];
  source: LegacyArchiveSource;
}

export interface LegacyArchiveManifest {
  schemaVersion: 1;
  id: string;
  description: string;
  root: string;
  files: LegacyArchiveEntry[];
}

let manifest: LegacyArchiveManifest | undefined;

export const readLegacyArchiveManifest = (): LegacyArchiveManifest => {
  manifest ??= fs.readJsonSync(legacyArchiveManifestFile) as LegacyArchiveManifest;
  return manifest;
};

export const legacyArchiveEntry = (legacyPath: string) => {
  const entry = readLegacyArchiveManifest().files.find((file) => file.legacyPath === legacyPath);

  if (!entry) {
    throw new Error(`${legacyPath} is not a legacy research input in ${legacyArchiveManifestFile}`);
  }

  return entry;
};

// Where the archive keeps a legacy input: its path under the archive root instead of data/.
export const legacyArchivePath = (legacyPath: string) =>
  path.join(readLegacyArchiveManifest().root, legacyArchiveEntry(legacyPath).legacyPath.replace(/^data\//, ''));

// The file a frozen research program reads for one of its pinned legacy inputs. The program still checks the hash.
export const legacyResearchFile = (legacyPath: string) => legacyArchivePath(legacyPath);

// The legacy minute file of a symbol, data/<SYMBOL>/<SYMBOL>-2016-2025-1-minute.csv, in the archive.
export const legacyMinuteFile = (symbol: string) =>
  legacyResearchFile(`data/${symbol}/${symbol}-2016-2025-1-minute.csv`);

export const legacyArchiveHint = (legacyPath: string) =>
  `${legacyArchivePath(legacyPath)} is the archived ${legacyPath}; rebuild it with \`npm run legacy-archive -- build\``;
