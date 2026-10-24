// Frozen strategy sources: research programs pin a strategy file's sha256 so that a change to its definition stops
// their frozen stages. The dataset migrations (data/<SYMBOL>/data.csv, src/lib/dataset.ts and src/lib/evaluation.ts)
// edited every strategy file's data plumbing, never its rules. checkStrategyDefinition tells the two apart exactly:
// it reads the pinned revision from git (refusing one whose sha256 isn't the pin), applies the documented plumbing
// edits below, each of which must match exactly once, and requires the result to equal the current file byte for
// byte. Any other difference, in code or comments, is a changed definition.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';

const sha256 = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');

export const gitFileAt = (revision: string, file: string) =>
  execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const printWidth = 120;

const libImport = (names: string[]) => {
  const line = `import { ${names.join(', ')} } from '#lib';`;

  return line.length <= printWidth ? line : `import {\n${names.map((name) => `  ${name}`).join(',\n')}\n} from '#lib';`;
};

const replaceOnce = (text: string, from: string, to: string, label: string) => {
  const matches = text.split(from).length - 1;

  if (matches !== 1) {
    throw new Error(`dataset plumbing: expected exactly one ${label}, found ${matches}`);
  }

  return text.replace(from, () => to);
};

const legacyWarmupComment = `// - Warmup: no setup arms before session index 90, the first session with 90 complete previous sessions for
//   the reference high. Earlier sessions are still processed, marked and reported.
`;

const warmupComment = (
  swing: boolean
) => `// - Warmup: no setup arms before the first session with tickWindowSize complete previous sessions for the
//   reference high${swing ? ' (swingLookback sessions for the rolling low that arms here)' : ''}. A partition run (src/lib/evaluation.ts) counts the warm-up sessions read
//   before its window, so after a full warm-up the window's first session can arm. Warm-up sessions are only read
//   for the rolling window: never traded, marked or reported, and the run starts flat, with no setup, stop,
//   restriction, episode or continuation window from them. Window sessions before arming are processed and reported.
`;

const legacyFileLine = '  const file = optional(dataFile) ?? `data/${symbol}/${symbol}-2016-2025-1-minute.csv`;\n';
const legacyFilter =
  '  const sessions = allSessions.filter((session) => session.time >= startTimestamp && session.time <= endTimestamp);\n';

// A trailing-buy strategy file's data plumbing as it was before 2026-10-23 (a fixed default data file and a date
// filter), rewritten as today: the dataset resolver, the evaluation window with its warm-up history, the summary's
// dataset record and the command line's dataset selection. Exact text in, exact text out.
export const withDatasetPlumbing = (source: string) => {
  const swing = source.includes('const swingLookback = ');
  const importPattern = /^import \{ ([^}\n]*loadCsvMinuteBacktestData[^}\n]*) \} from '#lib';$/m;
  const importLine = source.match(importPattern);

  if (!importLine) {
    throw new Error("dataset plumbing: no single-line '#lib' import of loadCsvMinuteBacktestData");
  }

  let text = replaceOnce(source, legacyWarmupComment, warmupComment(swing), 'warm-up comment');

  text = replaceOnce(
    text,
    importLine[0],
    libImport([...importLine[1]!.split(', '), 'resolveDataset', 'selectDataset', 'strategyRunSessions']),
    "'#lib' import"
  );
  text = replaceOnce(
    text,
    legacyFileLine,
    '  const dataset = resolveDataset(symbol, dataFile);\n  const file = dataset.file;\n',
    'default data file'
  );

  const tickWindowLine = text.match(
    new RegExp(`${legacyFilter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(  const tickWindowSize = \\d+;[^\\n]*\\n)`)
  );

  if (!tickWindowLine) {
    throw new Error('dataset plumbing: the date filter is not followed by tickWindowSize');
  }

  text = replaceOnce(
    text,
    tickWindowLine[0],
    `${tickWindowLine[1]}  // The evaluation window and, for a partition, the warm-up sessions before it (src/lib/evaluation.ts): \`sessions\`
  // is the window, \`history\` the warm-up followed by the window, so history[warmup + index] is sessions[index].
  const {
    sessions,
    history,
    warmup,
    report: datasetReport
  } = strategyRunSessions(allSessions, ${
    swing
      ? '{\n    dataset,\n    startDate,\n    endDate,\n    warmupSessions: Math.max(tickWindowSize, swingLookback)\n  }'
      : '{ dataset, startDate, endDate, warmupSessions: tickWindowSize }'
  });
`,
    'date filter'
  );
  text = replaceOnce(
    text,
    'sessions.slice(Math.max(0, index - tickWindowSize), index)',
    'history.slice(Math.max(0, warmup + index - tickWindowSize), warmup + index)',
    'reference-high window'
  );

  if (swing) {
    text = replaceOnce(
      text,
      '      ...sessions.slice(Math.max(0, index - swingLookback), index).map((windowSession) => windowSession.low)\n',
      '      ...history\n        .slice(Math.max(0, warmup + index - swingLookback), warmup + index)\n        .map((windowSession) => windowSession.low)\n',
      'swing-low window'
    );
    text = replaceOnce(text, 'if (index < swingLookback || ', 'if (warmup + index < swingLookback || ', 'swing guard');
  }

  text = replaceOnce(text, '    if (index === 0) {', '    if (warmup + index === 0) {', 'first-session skip');

  if (text.includes('if (index < tickWindowSize || !isDip(bar.close)) {')) {
    text = replaceOnce(
      text,
      'if (index < tickWindowSize || !isDip(bar.close)) {',
      'if (warmup + index < tickWindowSize || !isDip(bar.close)) {',
      'arming guard'
    );
  } else if (!swing) {
    text = replaceOnce(text, 'if (index < tickWindowSize) {', 'if (warmup + index < tickWindowSize) {', 'arming guard');
  }

  text = replaceOnce(
    text,
    '      dataFile: file,\n',
    '      dataFile: file,\n      dataset: datasetReport,\n',
    'summary'
  );
  text = replaceOnce(
    text,
    '    dataFile,\n    outDir,',
    '    dataFile: selectDataset(symbol, dataFile),\n    outDir,',
    'command-line dataset'
  );

  return text;
};

export interface DefinitionCheck {
  file: string;
  pinnedSha256: string;
  currentSha256: string;
  revision: string;
  status: 'identical' | 'dataset plumbing only';
}

// Whether `file` is still the definition pinned by `pinnedSha256`, whose text is `file` at git `revision`. Throws
// when the definition changed (or the revision isn't the pin).
export const checkStrategyDefinition = async (file: string, pinnedSha256: string, revision: string) => {
  const current = await fs.readFile(file, 'utf8');
  const currentSha256 = sha256(current);
  const result = (status: DefinitionCheck['status']): DefinitionCheck => ({
    file,
    pinnedSha256,
    currentSha256,
    revision,
    status
  });

  if (currentSha256 === pinnedSha256) {
    return result('identical');
  }

  const pinned = gitFileAt(revision, file);

  if (sha256(pinned) !== pinnedSha256) {
    throw new Error(`${file} at ${revision} hashes to ${sha256(pinned)}, not the pinned ${pinnedSha256}`);
  }

  let expected: string;

  try {
    expected = withDatasetPlumbing(pinned);
  } catch (error) {
    throw new Error(
      `${file}: the pinned revision ${revision} is not a dataset-plumbing ancestor: ${(error as Error).message}`
    );
  }

  if (expected !== current) {
    const line = expected.split('\n').findIndex((text, index) => text !== current.split('\n')[index]) + 1;

    throw new Error(
      `${file} differs from its pinned definition (${pinnedSha256.slice(0, 16)} at ${revision}) beyond the dataset plumbing, first at line ${line}: the definition changed`
    );
  }

  return result('dataset plumbing only');
};

// A source file as a completed research program froze it: its path, the git revision holding those bytes, and their
// sha256. Programs whose frozen stages run a strategy file read it this way, so later deliberate edits to the live
// file (new parameters, the dataset plumbing) don't change what they reproduce.
export interface FrozenSource {
  file: string;
  revision: string;
  sha256: string;
}

export const frozenSourcesRoot = '.cache/frozen-sources';

// The frozen bytes from git, refused unless they hash to the pin.
export const frozenSourceText = (source: FrozenSource) => {
  const text = gitFileAt(source.revision, source.file);
  const actual = sha256(text);

  if (actual !== source.sha256) {
    throw new Error(`${source.file} at ${source.revision} hashes to ${actual}, not the pinned ${source.sha256}`);
  }

  return text;
};

// Writes the frozen file under .cache/frozen-sources/<revision>/<file> (inside the package, so its '#lib', '#types'
// and package imports resolve) and returns its absolute path, for a dynamic import.
export const materializeFrozenSource = async (source: FrozenSource, root = frozenSourcesRoot) => {
  const target = path.resolve(root, source.revision, source.file);

  if ((await fs.pathExists(target)) && sha256(await fs.readFile(target)) === source.sha256) {
    return target;
  }

  const temporary = `${target}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;

  await fs.outputFile(temporary, frozenSourceText(source));
  await fs.rename(temporary, target);
  return target;
};
