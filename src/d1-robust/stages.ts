// Stage commands without a module of their own: the pilot of one window, the determinism re-run (the library traces
// and the first 2,000 discovery evaluations of fold-a arm J, in a fresh process, compared byte for byte with the
// archived log), and the protocol freeze with its list of changes since the pre-ingestion commitment.
import { createHash } from 'node:crypto';
import fs from 'fs-extra';
import { searchBenchmarkBooks } from '../joint-16-etf-d1/benchmarks.ts';
import { type WindowKey, log, nowIso, option, stageDir, writeJson } from './context.ts';
import { eligibleSymbols, trainingUniverse } from './data.ts';
import { Archive } from './archive.ts';
import { runDiscovery } from './discovery.ts';
import { RobustEvaluator } from './evaluator.ts';
import { appendAmendment, freezeProtocol, requireProtocolFrozen } from './freeze.ts';
import { GenomeSpace, Library } from './genome.ts';
import { roundLibrary } from './library.ts';
import { requireParity } from './parity.ts';
import { requireControls } from './controls.ts';
import { runPilot } from './pilot.ts';
import { pinLibrary, readPilotFreeze } from './round.ts';
import { foldDir, readTier } from './walkforward.ts';

const windowOf = (args: string[]): WindowKey => {
  const window = option(args, 'window');

  if (window !== 'fold-a' && window !== 'fold-b' && window !== 'final') {
    throw new Error('--window fold-a|fold-b|final');
  }

  return window;
};

export const runPilotCommand = async (args: string[]) => {
  await requireProtocolFrozen();
  await requireControls();
  await requireParity();

  const window = windowOf(args);
  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const loaded = await trainingUniverse(window, { symbols: universe });
  const evaluator = await RobustEvaluator.create(loaded, window, workers);

  try {
    await runPilot(evaluator, window, universe, tier, await searchBenchmarkBooks());
  } finally {
    await evaluator.close();
  }
};

export const runFreezeProtocol = async (args: string[]) => {
  const file = option(args, 'changes');
  const changes = file ? (await fs.readFile(file, 'utf8')).split('\n').filter((line) => line.trim().length > 0) : [];

  return freezeProtocol(changes);
};

const sha = (text: string) => createHash('sha256').update(text).digest('hex');

// The first `limit` lines of a JSON-lines log.
const head = async (file: string, limit: number) =>
  (await fs.readFile(file, 'utf8')).split('\n').slice(0, limit).join('\n');

export const runDeterminism = async () => {
  await requireProtocolFrozen();
  await requireParity();

  const { tier, workers } = await readTier();
  const universe = await eligibleSymbols();
  const pilot = await readPilotFreeze('fold-a');
  const loaded = await trainingUniverse('fold-a', { symbols: universe });
  const limit = 2000;
  const record: Record<string, unknown> = { generatedAt: nowIso(), round: 'fold-a', arm: 'J', compared: limit };

  for (const [label, count] of [
    ['workers', workers],
    ['single thread', 0]
  ] as const) {
    const evaluator = await RobustEvaluator.create(loaded, 'fold-a', count);
    const library = await roundLibrary('fold-a');

    await pinLibrary(evaluator, library, universe);

    const rerun = stageDir('determinism', `discovery-${count}.jsonl`);
    const archive = new Archive(
      evaluator,
      { arm: 'J', round: 'fold-a', draws: pilot.discoveryDraws, stage: 'disc', references: pilot.references },
      rerun
    );

    await runDiscovery({
      space: new GenomeSpace(universe, new Library(library.vectors)),
      archive,
      round: 'fold-a',
      armLabel: 'fold',
      budget: tier.foldBudget(universe.length),
      tier: tier.key,
      stopAfter: limit
    });
    archive.flush();
    await evaluator.close();

    const original = await head(foldDir('fold-a', 'J', 'discovery.jsonl'), limit);
    const repeated = await head(rerun, limit);
    const n = Math.min(original.split('\n').length, repeated.split('\n').length);
    const a = original.split('\n').slice(0, n).join('\n');
    const b = repeated.split('\n').slice(0, n).join('\n');

    record[label] = { workers: count, lines: n, original: sha(a), rerun: sha(b), identical: a === b };
    await fs.remove(rerun);
    log(`determinism (${label}): ${a === b ? 'identical' : 'DIFFERENT'} over ${n} lines`);
  }

  await writeJson(stageDir('determinism', 'determinism.json'), record);
};

// `amend --stage <stage> --change <text> --reason <text> [--outputs a,b]`: records a technical amendment after the
// freeze (PROTOCOL.md §24 must already hold its text); refused if any listed output of the affected stage exists.
export const runAmend = async (args: string[]) => {
  const stage = option(args, 'stage');
  const change = option(args, 'change');
  const reason = option(args, 'reason');

  if (!stage || !change || !reason) {
    throw new Error('--stage, --change and --reason are required');
  }

  const outputs = (option(args, 'outputs') ?? '').split(',').filter(Boolean);
  const present = (option(args, 'post-outcome-outputs') ?? '').split(',').filter(Boolean);
  const justification = option(args, 'post-outcome-justification');

  if (present.length > 0 && !justification) {
    throw new Error('A post-outcome amendment needs --post-outcome-justification');
  }

  const amendment = await appendAmendment({
    stage,
    change,
    technicalReason: reason,
    stageOutputsAbsent: outputs,
    ...(present.length > 0 ? { postOutcome: { outputsPresent: present, justification: justification! } } : {})
  });

  log(`amendment ${amendment.number} recorded (${amendment.hash.slice(0, 12)})`);
};
