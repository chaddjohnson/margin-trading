// The freeze (PROTOCOL.md section 11): every frozen candidate with its per-fold parameters, the extended
// Phase 4 shortlists of Amendment 1, and the hashes of the protocol, the code and the data, written before
// the holdout is read. The holdout command refuses to run without this file.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import path from 'node:path';
import { paretoRanks2d } from '../optimizer/nsga2.ts';
import { loadCandidateTypes } from './candidates.ts';
import { resultsDir, studyDir, vgtCombinedFile } from './constants.ts';
import { sha256Of } from './data.ts';
import type { EntryMode, StrategyParams } from './engine.ts';
import { describeParams } from './params.ts';

export const freezeFile = `${resultsDir}/freeze/freeze.json`;

export const parseCanonical = (text: string): StrategyParams =>
  Object.fromEntries(
    text.split(',').map((pair) => {
      const [key, value] = pair.split('=') as [string, string];

      return [key, key === 'entryMode' ? (value as EntryMode) : Number(value)];
    })
  ) as unknown as StrategyParams;

const parseCsv = (text: string) => {
  const [header, ...lines] = text.trim().split('\n');
  const columns: string[] = [];
  const split = (line: string) => {
    const cells: string[] = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index]!;

      if (quoted) {
        if (char === '"' && line[index + 1] === '"') {
          cell += '"';
          index++;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        cells.push(cell);
        cell = '';
      } else {
        cell += char;
      }
    }

    cells.push(cell);

    return cells;
  };

  columns.push(...split(header!));

  return lines.map((line) => Object.fromEntries(split(line).map((value, index) => [columns[index]!, value])));
};

// Amendment 1: the FINAL pool in robust-front rank order, distinct by (net, drawdown, entries), 10 deep.
export const extendedShortlist = async (family: string, size = 10) => {
  const rows = parseCsv(await fs.readFile(`${resultsDir}/phase4/${family}/FINAL/pool.csv`, 'utf8')).map((row) => ({
    id: row.id!,
    params: parseCanonical(row.canonical!),
    net: Number(row.net),
    dd: Number(row.drawdown),
    entries: Number(row.entries),
    netP25: Number(row.netP25),
    ddP75: Number(row.ddP75)
  }));
  const ranks = paretoRanks2d(
    rows.map((row) => ({ id: row.id, genome: [], objectives: [-row.netP25, row.ddP75], violation: 0 }))
  );
  const ordered = [...rows].sort(
    (a, b) => ranks.get(a.id)! - ranks.get(b.id)! || b.netP25 - a.netP25 || (a.id < b.id ? -1 : 1)
  );
  const seen = new Set<string>();
  const chosen = [];

  for (const row of ordered) {
    const key = `${row.net}|${row.dd}|${row.entries}`;

    if (!seen.has(key)) {
      seen.add(key);
      chosen.push({ ...row, robustRank: ranks.get(row.id)!, describe: describeParams(row.params) });
    }

    if (chosen.length >= size) {
      break;
    }
  }

  return chosen;
};

const codeHash = async () => {
  const files: string[] = ['src/app/trailingBuy.ts'];
  const walk = async (dir: string) => {
    for (const entry of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  };

  await walk('src/trailing-buy');

  const hash = createHash('sha256');

  for (const file of files) {
    hash.update(`${file}\n`).update(await fs.readFile(file));
  }

  return { files: files.length, sha256: hash.digest('hex') };
};

export const writeFreeze = async () => {
  if (await fs.pathExists(freezeFile)) {
    throw new Error(`${freezeFile} already exists; the freeze is written once`);
  }

  const atrContinues = (await fs.readJson(`${resultsDir}/phase3/continuation.json`)).continues as boolean;
  const families = atrContinues ? ['legacy', 'fixed', 'atr'] : ['legacy', 'fixed'];
  const types = await loadCandidateTypes();
  const shortlists = Object.fromEntries(
    await Promise.all(families.map(async (family) => [family, await extendedShortlist(family)] as const))
  );
  const freeze = {
    frozenAtUtc: new Date().toISOString(),
    protocolSha256: sha256Of(await fs.readFile(`${studyDir}/PROTOCOL.md`)),
    stateMachineSha256: sha256Of(await fs.readFile(`${studyDir}/STATE_MACHINE.md`)),
    registeredProtocolHashes: (await fs.readFile(`${studyDir}/PROTOCOL.sha256`, 'utf8')).trim().split('\n'),
    code: await codeHash(),
    data: { file: vgtCombinedFile, sha256: sha256Of(await fs.readFile(vgtCombinedFile)) },
    types,
    shortlists,
    holdout: { from: '2023-01-03', to: '2026-10-14' }
  };

  await fs.ensureDir(path.dirname(freezeFile));
  await fs.writeJson(freezeFile, freeze, { spaces: 1 });
  await fs.writeFile(`${freezeFile}.sha256`, `${sha256Of(await fs.readFile(freezeFile))}  freeze.json\n`);

  return freeze;
};
