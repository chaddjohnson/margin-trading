// The prospective shadow comparison's frozen constants (research/prospective-b4-b5-shadow/PROTOCOL.md) and its
// write-once freeze. The freeze binds the protocol text, the B4/B5 pool files and books, the code that runs (the
// transitive import closure of the pools and forward commands), the frozen canonical data and market-event files, the
// conventions, and B4's and B5's state at the cutoff on the frozen `all`.
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'fs-extra';
import { nyseCalendarCoverage, nyseEarlyCloses, nyseHolidays } from '#lib';

export const prospective = {
  version: 'prospective-b4-b5-shadow-v1',
  dir: 'research/prospective-b4-b5-shadow',
  cutoff: '2026-10-13',
  firstForwardSession: '2026-10-14',
  pools: ['B4', 'B5'] as const,
  members: ['VOOG', 'VGT', 'XBI', 'XRT', 'KRE', 'GDX'] as const,
  principalCostBps: 5,
  frictionScenariosBps: [0, 2, 10],
  rateScenarios: [0.08, 0.14],
  ladderFractions: [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5], // B4 re-runs for matched borrowing
  annualRate: 0.11,
  evidenceThreshold: { sessions: 252, lotsPerPool: 20 }, // about 12 months of NYSE sessions
  splitMoveLimit: 0.15, // an overnight move beyond ±15% must be a declared split or a confirmed move
  snapshotsRoot: 'data/prospective',
  outputRoot: 'evaluations/pools/forward'
};

export const freezeFileOf = (dir = prospective.dir) => path.join(dir, 'PROTOCOL_FREEZE.json');
export const protocolFileOf = (dir = prospective.dir) => path.join(dir, 'PROTOCOL.md');

export const sha256 = (data: string | Buffer) => crypto.createHash('sha256').update(data).digest('hex');
export const sha256File = async (file: string) => sha256(await fs.readFile(file));
export const hashBody = (body: Record<string, unknown>) => sha256(JSON.stringify(body));

// The transitive closure of relative and #lib/#types imports from the given entry files: the code a command runs.
export const importClosure = async (entries: string[]) => {
  const aliases: Record<string, string> = { '#lib': 'src/lib/index.ts', '#types': 'src/types/index.ts' };
  const seen = new Set<string>();
  const queue = [...entries];

  while (queue.length > 0) {
    const file = path.normalize(queue.pop()!);

    if (seen.has(file)) {
      continue;
    }

    seen.add(file);

    const text = await fs.readFile(file, 'utf8');
    const specifiers = [...text.matchAll(/(?:from\s+|import\s*\(\s*)'([^']+)'/g)].map((match) => match[1]!);

    for (const specifier of specifiers) {
      if (aliases[specifier]) {
        queue.push(aliases[specifier]!);
      } else if (specifier.startsWith('.')) {
        queue.push(path.join(path.dirname(file), specifier));
      }
    }
  }

  return [...seen].sort();
};

export const codeEntries = ['src/app.ts', 'src/app/pools.ts', 'src/pools/cli.ts', 'src/pools/forward/cli.ts'];

// The NYSE calendar is bound append-only (PROTOCOL.md §8): its code (without comments and date literals) must not
// change, every frozen holiday and early close must remain, and dates may be added only after the frozen coverage.
// That lets a reviewed calendar extension (2027 onward) admit later sessions without changing any frozen behaviour.
export const calendarFile = 'src/lib/calendar.ts';

export const normalizedCalendarHash = async (file = calendarFile) =>
  sha256(
    (await fs.readFile(file, 'utf8'))
      .split('\n')
      .filter((line) => !/^\s*\/\//.test(line) && !/^\s*'\d{4}-\d{2}-\d{2}',?\s*(\/\/.*)?$/.test(line))
      .map((line) => line.replace(/last: '\d{4}-\d{2}-\d{2}'/, "last: '<coverage>'"))
      .join('\n')
  );

export const calendarState = () => ({
  coverage: { ...nyseCalendarCoverage },
  holidays: [...nyseHolidays].sort(),
  earlyCloses: [...nyseEarlyCloses].sort()
});

export type CalendarState = ReturnType<typeof calendarState>;

export const calendarAppendOnlyFailures = (frozen: CalendarState, current: CalendarState) => {
  const failures: string[] = [];
  const within = (date: string) => date <= frozen.coverage.last;

  if (current.coverage.first !== frozen.coverage.first || current.coverage.last < frozen.coverage.last) {
    failures.push(
      `the calendar coverage changed from ${frozen.coverage.first}…${frozen.coverage.last} to ${current.coverage.first}…${current.coverage.last}`
    );
  }

  for (const [kind, before, after] of [
    ['holiday', frozen.holidays, current.holidays],
    ['early close', frozen.earlyCloses, current.earlyCloses]
  ] as const) {
    const removed = before.filter((date) => !after.includes(date));
    const added = after.filter((date) => within(date) && !before.includes(date));

    if (removed.length || added.length) {
      failures.push(
        `the calendar's frozen ${kind}s changed (removed ${removed.join(' ') || 'none'}; added within the frozen coverage ${added.join(' ') || 'none'})`
      );
    }
  }

  return failures;
};

export const codeManifest = async (entries = codeEntries) => {
  const files = await importClosure(entries);
  const hashes = Object.fromEntries(
    await Promise.all(
      files.map(
        async (file) =>
          [
            file,
            file === calendarFile ? `append-only ${await normalizedCalendarHash(file)}` : await sha256File(file)
          ] as const
      )
    )
  );

  return { entries, files: hashes, digest: sha256(JSON.stringify(hashes)) };
};

export interface Sealed {
  bodyHash: string;
  [key: string]: unknown;
}

export const writeOnce = async (file: string, body: Record<string, unknown>) => {
  if (await fs.pathExists(file)) {
    throw new Error(`${file} exists: it is written once and never rewritten`);
  }

  const safe = JSON.parse(JSON.stringify(body)) as Record<string, unknown>;
  const sealed = { ...safe, bodyHash: hashBody(safe) };

  await fs.outputFile(file, `${JSON.stringify(sealed, null, 2)}\n`);

  return sealed as Sealed;
};

export const readSealed = async <T extends { bodyHash: string }>(file: string): Promise<T> => {
  const sealed = (await fs.readJson(file)) as T;
  const { bodyHash, ...body } = sealed;

  if (hashBody(body) !== bodyHash) {
    throw new Error(`${file}: the body hash does not verify; the record was changed after it was written`);
  }

  return sealed;
};
