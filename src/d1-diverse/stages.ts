// The study's bookkeeping commands (PROTOCOL.md §20, §23): the stage-A schedule record, the design commitment, a
// reviewed pre-outcome change, the protocol freeze, an amendment, and the determinism re-run.
import readline from 'node:readline';
import fs from 'fs-extra';
import { gridKeyOf } from '../d1-robust/neighbourhood.ts';
import {
  legacy,
  log,
  nowIso,
  option,
  readJson,
  scheduleFile,
  stageDir,
  study,
  universeFile,
  writeJson
} from './context.ts';
import { eligibleSymbols } from './data.ts';
import { appendAmendment, appendChange, commitDesign, freezeProtocol, sha256 } from './freeze.ts';
import { sobolLibrary } from './library.ts';
import { parityFile } from './parity.ts';
import { reproduceFile } from './reproduce.ts';
import { archiveLog, readTier, runSearch } from './round.ts';
import { buildSchedule } from './schedule.ts';

const legacyCheckFile = stageDir('legacy', 'legacy-check.json');

// The schedule over a universe (the expected one at the commitment; the re-audited one at the freeze must equal it).
export const writeSchedule = async (universe: string[]) => {
  const schedule = buildSchedule(universe, sobolLibrary().vectors);
  const record = {
    generatedAt: nowIso(),
    sha256: schedule.sha256,
    universe,
    bands: study.schedule.bands,
    configurations: schedule.configs.length,
    appearances: schedule.appearances,
    fills: schedule.fills,
    keys: schedule.configs.map(
      (config) =>
        `${config.band}:${config.books.map((book) => `${book.symbol}=${gridKeyOf(book.vector.grid)}`).join('|')}`
    )
  };

  if (await fs.pathExists(scheduleFile)) {
    const existing = await readJson<{ sha256: string }>(scheduleFile);

    if (existing.sha256 !== schedule.sha256) {
      throw new Error(
        `${scheduleFile} exists with a different schedule (${existing.sha256.slice(0, 12)} ≠ ${schedule.sha256.slice(0, 12)})`
      );
    }

    return existing;
  }

  await writeJson(scheduleFile, record);
  log(`schedule: ${record.configurations} configurations, sha256 ${record.sha256.slice(0, 16)}`);

  return record;
};

export const runCommitDesign = async () => {
  const universe = (await readJson<{ eligible: string[] }>(legacy.universeFile)).eligible.sort();
  const schedule = await writeSchedule(universe);

  return commitDesign(schedule.sha256);
};

export const runChange = async (args: string[]) => {
  const change = option(args, 'change');
  const reason = option(args, 'reason');
  const review = option(args, 'review') ?? '';
  const outputs = args.includes('--outputs') ? args.slice(args.indexOf('--outputs') + 1) : [];

  if (!change || !reason) {
    throw new Error('change needs --change "…" --reason "…" [--review "…"] [--outputs <paths that must not exist>]');
  }

  const record = await appendChange({ change, reason, review, outputsAbsent: outputs });

  log(`change ${record.number} recorded (${record.hash.slice(0, 12)})`);

  return record;
};

export const runFreezeProtocol = async () => {
  for (const [file, label] of [
    [legacyCheckFile, 'legacy-check'],
    [reproduceFile, 'reproduce'],
    [parityFile, 'parity']
  ] as const) {
    const record = await readJson<{ pass?: boolean; passed?: boolean }>(file).catch(() => undefined);

    if (!(record?.pass ?? record?.passed)) {
      throw new Error(`${label} has not passed: the freeze binds only a verified state`);
    }
  }

  const universe = await eligibleSymbols(universeFile);
  const schedule = await writeSchedule(universe);

  if (!schedule) {
    throw new Error('No schedule');
  }

  return freezeProtocol({ [legacyCheckFile]: '', [reproduceFile]: '', [parityFile]: '' });
};

export const runAmend = async (args: string[]) => {
  const stage = option(args, 'stage');
  const change = option(args, 'change');
  const reason = option(args, 'reason');
  const review = option(args, 'review') ?? '';
  const outputs = args.includes('--outputs') ? args.slice(args.indexOf('--outputs') + 1) : [];

  if (!stage || !change || !reason) {
    throw new Error('amend needs --stage <stage> --change "…" --reason "…" --review "…" --outputs <paths>');
  }

  const amendment = await appendAmendment({
    stage,
    change,
    technicalReason: reason,
    review,
    stageOutputsAbsent: outputs
  });

  log(`amendment ${amendment.number} recorded (${amendment.hash.slice(0, 12)})`);

  return amendment;
};

// The determinism re-run (§18) after the fold-a search: stage A + the first 2,000 stage-B evaluations of fold-a's J
// arm in a fresh process with the worker pool, and the first 2,000 evaluations in a single thread, compared line for
// line with the original archive log.
// The first n nonempty lines of a log, streamed (a full archive log can approach V8's string limit).
const firstLines = async (file: string, n: number) => {
  const lines: string[] = [];
  const reader = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });

  for await (const line of reader) {
    if (line) {
      lines.push(line);
    }

    if (lines.length >= n) {
      reader.close();
      break;
    }
  }

  return lines;
};

export const runDeterminism = async () => {
  const file = stageDir('determinism', 'determinism.json');

  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: the determinism re-run is recorded once`);
  }

  const scheduleSize = (await readJson<{ configurations: number }>(scheduleFile)).configurations;
  const prefix = scheduleSize + study.determinism.stageBEvaluations;
  const original = await firstLines(archiveLog('fold-a', 'J-u'), prefix);
  const { workers } = await readTier();
  const results: Record<string, unknown> = {};

  for (const [runner, count, threads] of [
    ['worker pool', scheduleSize + study.determinism.stageBEvaluations, workers],
    ['single thread', study.determinism.stageBEvaluations, 0]
  ] as const) {
    const root = stageDir('determinism', runner.replace(' ', '-'));

    await fs.remove(root);
    await runSearch('fold-a', { logRoot: root, stopAfter: count, arms: ['J-u'], workers: threads });

    const lines = await firstLines(`${root}/J-u/archive.jsonl`, count);
    const reference = original.slice(0, count);

    results[runner] = {
      compared: lines.length,
      identical: lines.length === count && lines.every((line, index) => line === reference[index]),
      sha256: sha256(lines.join('\n')),
      referenceSha256: sha256(reference.join('\n'))
    };
  }

  await writeJson(file, { generatedAt: nowIso(), results });
  log(`determinism: ${JSON.stringify(results)}`);

  if (!Object.values(results).every((item) => (item as { identical: boolean }).identical)) {
    throw new Error('The determinism re-run differs from the original log');
  }

  return results;
};
