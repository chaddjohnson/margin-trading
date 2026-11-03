// A9 — the diagnostic checkpoint (PROTOCOL.md §6.9): a sealed manifest of every Part A record (body and file hashes),
// every Part A table (file hashes), the protocol freeze, the parity and data records, the code digest, the data
// hashes, the git state and the Part A commands. Part B refuses to run until this manifest is committed.
import path from 'node:path';
import fs from 'fs-extra';
import { bookOrder, diagnosticManifestFile, protocolFreezeFile, resultsDir } from './context.ts';
import { verifySealed } from './data.ts';
import { codeDigest, fileSha256, git, log, nowIso, protocolSha256, writeSealed } from './records.ts';

const required = [
  'protocol_freeze.json',
  'parity/parity.json',
  'data/data-audit.json',
  'partA/A1-evidence.json',
  'partA/A2-baseline.json',
  'partA/A3-WDEV.json',
  'partA/A3-W23.json',
  'partA/A3-W13.json',
  'partA/A3-W29.json',
  'partA/A4-decomposition-WDEV.json',
  'partA/A4-decomposition-W23.json',
  'partA/A4-decomposition-W29.json',
  'partA/A5-b1.json',
  'partA/A6-ablations.json',
  'partA/A7-events.json',
  'partA/A8-execution.json'
];

export const partACommands = [
  'npm run study6 -- freeze-protocol',
  'npm run study6 -- parity',
  'npm run study6 -- data',
  'npm run study6 -- a1',
  'npm run study6 -- a2',
  'npm run study6 -- a3 WDEV',
  'npm run study6 -- a3 W23',
  'npm run study6 -- a3 W13',
  'npm run study6 -- a3 W29',
  'npm run study6 -- a4 WDEV',
  'npm run study6 -- a4 W23',
  'npm run study6 -- a4 W29',
  'npm run study6 -- a5',
  'npm run study6 -- a6',
  'npm run study6 -- a7',
  'npm run study6 -- a8',
  'npm run study6 -- diagnostic-freeze'
];

export const runDiagnosticFreeze = async () => {
  const records: Record<string, { bodyHash: string; fileSha256: string }> = {};

  for (const name of required) {
    const file = path.join(resultsDir, name);

    if (!(await fs.pathExists(file))) {
      throw new Error(`the diagnostic checkpoint needs ${file}`);
    }

    const record = (await fs.readJson(file)) as Record<string, unknown>;

    if (!verifySealed(record)) {
      throw new Error(`${file}: the body hash does not verify`);
    }

    records[name] = { bodyHash: record.bodyHash as string, fileSha256: await fileSha256(file) };
  }

  // Track O engineering gates (PROTOCOL.md §8.1), included when present.
  for (const name of ['parity/p4.json', 'parity/r-om.json']) {
    const file = path.join(resultsDir, name);

    if (await fs.pathExists(file)) {
      const record = (await fs.readJson(file)) as Record<string, unknown>;

      if (!verifySealed(record)) {
        throw new Error(`${file}: the body hash does not verify`);
      }

      records[name] = { bodyHash: record.bodyHash as string, fileSha256: await fileSha256(file) };
    }
  }

  const tables: Record<string, string> = {};

  for (const dir of ['partA']) {
    const files = (await fs.readdir(path.join(resultsDir, dir), { recursive: true }))
      .map(String)
      .filter((name) => name.endsWith('.csv'))
      .sort();

    for (const name of files) {
      tables[path.join(dir, name)] = await fileSha256(path.join(resultsDir, dir, name));
    }
  }

  const data = Object.fromEntries(
    await Promise.all(bookOrder.map(async (symbol) => [symbol, await fileSha256(`data/${symbol}/data.csv`)] as const))
  );
  const record = await writeSealed(diagnosticManifestFile, {
    stage: 'A9-diagnostic-checkpoint',
    at: nowIso(),
    protocol: { sha256: await protocolSha256(), freeze: (await fs.readJson(protocolFreezeFile)).bodyHash },
    git: { branch: git('branch --show-current'), head: git('rev-parse HEAD'), status: git('status --short') },
    code: await codeDigest(),
    data,
    frozenFiles: Object.fromEntries(
      await Promise.all(
        [
          'config/pools/B5.json',
          'config/pools/B4.json',
          ...bookOrder.map((symbol) => `config/phenotypes/D1/${symbol}.json`),
          'research/prospective-b4-b5-shadow/PROTOCOL_FREEZE.json'
        ].map(async (file) => [file, await fileSha256(file)] as const)
      )
    ),
    records,
    tables,
    commands: partACommands
  });

  log(`diagnostic checkpoint: ${record.file} ${record.bodyHash.slice(0, 12)}; commit it before Part B`);
};
