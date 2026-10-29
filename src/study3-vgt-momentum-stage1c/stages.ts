// The write-once stages before the evaluation windows (PROTOCOL.md §12): audit, freeze-protocol, freeze-code and
// develop-<history> (parity: parity.ts). Each verifies its predecessors and both freezes, loads data only through its
// door, and seals a record whose payloads are hashed.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import { type HistoryKey, files, histories, log, search, stage1bDir, study } from './context.ts';
import { type DoorRecord, assertDoor, loadVgt } from './data.ts';
import { developHistory } from './develop.ts';
import { Pool, defaultWorkers } from './pool.ts';
import {
  assertFreezes,
  assertPredecessors,
  assertRealRoot,
  assertScope,
  codeManifest,
  manifestHash,
  payloadDir,
  protocolHashes,
  readJsonFile,
  recordExists,
  recordPath,
  sha256,
  sha256File,
  toJson,
  writeStage
} from './records.ts';

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });

export const runtimeInfo = (started: number, workers: number) => ({
  seconds: (Date.now() - started) / 1000,
  workers,
  peakRssMb: Math.round(process.resourceUsage().maxRSS / 1024),
  node: process.version
});

// ----- audit -----

// Hashed as opaque bytes (never parsed); tracked files are also covered by the git scope check.
const protectedFiles = [
  'config/phenotypes/D1/VGT.json',
  'src/app/allIn-trailingBuy-postExitContinuation.ts',
  'src/shared-margin-portfolio/strategy.ts',
  'data/partitions.json',
  'data/VGT/dataset-report.json',
  'data/VGT/partition-report.json',
  'CLAUDE.md',
  'docs/claude/context-recovery.md',
  'package.json',
  'package-lock.json',
  'tsconfig.json'
];

export const stageAudit = async () => {
  assertRealRoot();
  assertScope();

  if (recordExists('audit')) {
    throw new Error('refused: audit is sealed');
  }

  const started = Date.now();
  const doors: Record<string, DoorRecord> = {};
  const equivalence: Record<string, { stage1b: string; stage1c: string; match: boolean }> = {};
  const stage1bAudit = readJsonFile<{ door: Record<string, { loadedBarsSha256: string; dataSha256: string }> }>(
    path.join(stage1bDir, 'results', 'records', 'audit.json')
  );
  const qa: Record<string, unknown> = {};

  for (const key of Object.keys(histories) as HistoryKey[]) {
    const { ds, door } = await loadVgt(histories[key].developmentEnd, 'data', { audit: true });

    assertDoor(ds, histories[key].developmentEnd);
    doors[key] = door;

    const reference = stage1bAudit.door[key]!.loadedBarsSha256;

    equivalence[key] = {
      stage1b: reference,
      stage1c: door.loadedBarsSha256,
      match: reference === door.loadedBarsSha256
    };

    if (key === 'H') {
      let short = 0;
      let missingPrints = 0;
      let bigGaps = 0;
      let earlyCloses = 0;

      for (let s = 0; s < ds.sessionCount; s++) {
        if (ds.sBarCount[s]! < 390) {
          short++;
        }

        if (ds.sBarCount[s]! < 300) {
          earlyCloses++;
        }

        if (Number.isNaN(ds.sClosingPrint[s]!)) {
          missingPrints++;
        }

        if (s > 0 && Math.abs(ds.sOpen[s]! / ds.sClose[s - 1]! - 1) > 0.03) {
          bigGaps++;
        }
      }

      qa.sessions = ds.sessionCount;
      qa.bars = ds.barCount;
      qa.sessionsWithFewerThan390Minutes = short;
      qa.sessionsWithFewerThan300Minutes = earlyCloses;
      qa.sessionsWithoutClosingPrint = missingPrints;
      qa.overnightGapsAbove3pct = bigGaps;
    }
  }

  if (!Object.values(equivalence).every((e) => e.match)) {
    throw new Error(`audit: the bounded loader differs from Stage 1b's datasets: ${JSON.stringify(equivalence)}`);
  }

  const lineage = (paths: string[]) => {
    const list = git('ls-files', ...paths)
      .split('\n')
      .filter(Boolean);
    const manifest = Object.fromEntries(list.map((file) => [file, sha256File(file)]));

    return { files: list.length, digest: sha256(toJson(manifest)), manifest };
  };
  const stage1 = lineage(['research/study3-vgt-momentum', 'src/study3-vgt-momentum']);
  const stage1b = lineage([stage1bDir, 'src/study3-vgt-momentum-stage1b']);
  const logs = path.join(path.dirname(files.codeFreeze), 'logs');
  const baselineFile = path.join(logs, 'baseline-tests-dataless.json');
  const incidentFile = path.join(logs, 'baseline-tests.json');

  return writeStage('audit', {
    door: doors,
    summary: {
      equivalence,
      dataFileSha256FromStage1b: stage1bAudit.door.H!.dataSha256,
      qa,
      stage1: { files: stage1.files, digest: stage1.digest },
      stage1b: { files: stage1b.files, digest: stage1b.digest },
      protected: Object.fromEntries(protectedFiles.map((file) => [file, sha256File(file)])),
      baselineTests: fs.existsSync(baselineFile) ? readJsonFile(baselineFile) : null,
      // the incident run (main checkout with data/ present; PROTOCOL §1 item 6b): pass/fail counts only
      baselineTestsIncident: fs.existsSync(incidentFile) ? readJsonFile(incidentFile) : null,
      runtime: runtimeInfo(started, 0)
    },
    payloads: { stage1Manifest: stage1.manifest, stage1bManifest: stage1b.manifest }
  });
};

// ----- freezes -----

export const stageFreezeProtocol = () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('freeze-protocol');

  if (fs.existsSync(files.protocolFreeze)) {
    throw new Error('refused: the protocol is frozen');
  }

  const body = {
    study: study.id,
    frozenAt: new Date().toISOString(),
    hashes: protocolHashes(),
    head: git('rev-parse', 'HEAD').trim()
  };
  const record = { ...body, bodyHash: sha256(toJson(body)) };

  fs.outputFileSync(files.protocolFreeze, toJson(record));
  return record;
};

export const stageFreezeCode = () => {
  assertRealRoot();
  assertScope();
  assertPredecessors('freeze-code');
  assertFreezes(false);

  if (fs.existsSync(files.codeFreeze)) {
    throw new Error('refused: the code is frozen');
  }

  const manifest = codeManifest();
  const parity = readJsonFile<{ summary: { codeManifestHash: string; pass: boolean } }>(recordPath('parity'));

  if (!parity.summary.pass) {
    throw new Error('refused: the parity record does not pass');
  }

  if (parity.summary.codeManifestHash !== manifestHash(manifest)) {
    throw new Error('refused: the code differs from the code parity ran under');
  }

  const record = {
    study: study.id,
    frozenAt: new Date().toISOString(),
    manifest,
    manifestHash: manifestHash(manifest)
  };

  fs.outputFileSync(files.codeFreeze, toJson(record));
  return record;
};

// ----- develop -----

export const stageDevelop = async (history: HistoryKey, workers?: number) => {
  const stage = `develop-${history}`;

  assertRealRoot();
  assertScope();
  assertPredecessors(stage);
  assertFreezes(true);

  if (recordExists(stage)) {
    throw new Error(`refused: ${stage} is sealed`);
  }

  const started = Date.now();
  const end = histories[history].developmentEnd;
  const { ds, door } = await loadVgt(end);

  assertDoor(ds, end);

  const pool = new Pool(ds, workers ?? defaultWorkers(), end);
  const archiveFile = path.join(payloadDir(stage), 'archive.jsonl.gz');

  log(`${stage}: ${ds.sessionCount} sessions to ${ds.lastDate}, ${pool.size} workers`);

  const result = await developHistory(pool, ds, history, archiveFile);

  await pool.close();

  const summarisePick = (p: (typeof result.picks)[string]) =>
    p
      ? {
          cell: p.cell,
          policy: p.policy,
          score: p.score,
          phi: p.champion.phi,
          net: p.champion.summary.net,
          minuteDd: p.champion.summary.minuteDd
        }
      : null;

  return writeStage(stage, {
    door,
    summary: {
      history,
      developmentEnd: end,
      planned: search.caps.perHistory,
      used: result.used,
      duplicates: result.duplicates,
      firstPassEvaluations: result.firstPassEvaluations,
      deepEvaluations: result.deepEvaluations,
      fixedParentEvaluations: result.fixedParentEvaluations,
      archiveRows: result.archiveRows,
      deepPairs: result.deep.chosen,
      picks: Object.fromEntries(Object.entries(result.picks).map(([k, p]) => [k, summarisePick(p)])),
      fixedParent: Object.fromEntries(
        Object.entries(result.fixedParent).map(([m, f]) => [
          m,
          {
            outcome: f.outcome,
            gated: summarisePick(f.gated),
            forced: summarisePick(f.forced),
            deltaCenterRod: f.deltaCenterRod
          }
        ])
      ),
      nearMiss: result.deep.nearMiss.length,
      runtime: runtimeInfo(started, pool.size)
    },
    payloads: {
      selection: {
        history,
        options: result.options,
        deep: result.deep,
        picks: result.picks,
        fixedParent: Object.fromEntries(
          Object.entries(result.fixedParent).map(([m, f]) => [
            m,
            { outcome: f.outcome, gated: f.gated, forced: f.forced, deltaCenterRod: f.deltaCenterRod }
          ])
        )
      },
      cells: result.cells,
      fixedParentCells: Object.fromEntries(Object.entries(result.fixedParent).map(([m, f]) => [m, f.summary]))
    },
    written: { archive: archiveFile }
  });
};
