// The study CLI (research/intraday-dip-recovery-vgt/RUN_COMMANDS.md). Every command runs from the repository root.
//   launch --unit NAME [--wait] -- <command …>   a transient systemd user unit inside the study slice
//   coverage | doors | parity | tests are engineering; the research stages call requireStandardAdoption first.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { STUDY, log, prefixDoors, resultFile, studyDir } from './context.ts';
import { coverageScan, openPrefixDoor } from './data.ts';
import { resources } from './resources.ts';
import { nowIso, recordDoor, verifySeals, writeSealed } from './seal.ts';

const args = process.argv.slice(2);
const command = args[0];
const option = (name: string, fallback?: string) => {
  const k = args.indexOf(`--${name}`);

  return k >= 0 ? args[k + 1]! : fallback;
};
const flag = (name: string) => args.includes(`--${name}`);

export const preflight = () => {
  const r = requireStandardAdoption(studyDir, { repoRoot: process.cwd() });

  for (const n of r.notices) log(`preflight notice: ${n}`);
  log(`preflight passed (standard ${r.version}, scope ${r.scope})`);
  return r;
};

const setSlice = () => {
  const r = spawnSync(
    'systemctl',
    [
      '--user',
      'set-property',
      '--runtime',
      resources.slice,
      `MemoryHigh=${resources.memoryHigh}`,
      `MemoryMax=${resources.memoryMax}`,
      `MemorySwapMax=${resources.memorySwapMax}`
    ],
    { encoding: 'utf8' }
  );

  if (r.status !== 0) throw new Error(`could not set the slice limits: ${r.stderr}`);
};

const launch = () => {
  const unit = option('unit');
  const at = args.indexOf('--');

  if (!unit || at < 0) throw new Error('launch --unit NAME [--wait] -- <command …>');

  const rest = args.slice(at + 1);
  const logFile = path.resolve(resultFile('logs', `${unit}.log`));

  fs.mkdirSync(path.dirname(logFile), { recursive: true });

  // Start the slice (a no-op unit) so its limits can be set before the job starts inside it.
  spawnSync('systemd-run', ['--user', `--slice=${resources.slice}`, '--collect', '--quiet', 'true'], { encoding: 'utf8' });
  setSlice();

  const r = spawnSync(
    'systemd-run',
    [
      '--user',
      `--unit=${unit}`,
      `--slice=${resources.slice}`,
      '--collect',
      '--same-dir',
      '-p',
      'KillMode=mixed',
      '-p',
      'TimeoutStopSec=120',
      '-p',
      'Restart=no',
      '-p',
      `StandardOutput=append:${logFile}`,
      '-p',
      `StandardError=append:${logFile}`,
      ...(flag('wait') ? ['--wait'] : []),
      process.execPath,
      '--expose-gc',
      '--max-old-space-size=8192',
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      path.join('src', 'intraday-dip-recovery', 'main.ts'),
      ...rest
    ],
    { encoding: 'utf8', stdio: 'inherit' }
  );

  log(`unit ${unit} ${flag('wait') ? `finished with status ${r.status}` : 'started'}; log ${logFile}`);
  process.exitCode = r.status ?? 1;
};

const commands: Record<string, () => Promise<void> | void> = {
  launch,

  // The measured coverage and the common complete endpoint: the timestamp field of every row, never a price.
  coverage: () => {
    const c = coverageScan();
    const last = c.sessions.at(-1)!;

    recordDoor({
      door: 'FULL (timestamps only)',
      purpose: 'coverage: the timestamp field of every row; no price parsed',
      bytes: c.bytes,
      sha256: c.sha256,
      lastRowUtc: c.lastRowUtc,
      lastSession: last.date
    });
    const body = {
      stage: 'coverage',
      at: nowIso(),
      method: 'timestamp field of every row only (no price parsed); New York dates; regular session 09:30 to the scheduled close (13:00 on early-close days); complete = regular bars and a row at or after the scheduled close; NYSE trading days from src/lib/calendar.ts',
      file: c.file,
      bytes: c.bytes,
      sha256: c.sha256,
      rows: c.rows,
      lastRowUtc: c.lastRowUtc,
      sessions: c.sessions.length,
      firstSession: c.sessions[0]!.date,
      lastSession: last.date,
      lastSessionRegularBars: last.regular,
      lastSessionClosingPrint: last.closingPrint,
      lastSessionRowsAfterClose: last.afterClose,
      missingTradingDays: c.missing,
      unexpectedSessions: c.extra,
      incompleteSessions: c.sessions.filter((s) => !(s.closingPrint || s.afterClose > 0)).map((s) => s.date),
      commonCompleteEndpoint: c.endpoint,
      perYear: Object.entries(
        c.sessions.reduce<Record<string, { sessions: number; bars: number; earlyCloses: number }>>((m, s) => {
          const y = s.date.slice(0, 4);

          m[y] ??= { sessions: 0, bars: 0, earlyCloses: 0 };
          m[y].sessions++;
          m[y].bars += s.regular;
          if (s.early) m[y].earlyCloses++;
          return m;
        }, {})
      ).map(([year, v]) => ({ year, ...v }))
    };

    writeSealed(resultFile('data', 'coverage.json'), body, 'coverage');
    log(`coverage: ${body.sessions} sessions ${body.firstSession} → ${body.lastSession}; endpoint ${body.commonCompleteEndpoint}; missing ${body.missingTradingDays.length}`);
  },

  // Every development door: size, sha256, rows, last row, sessions (opened and logged).
  doors: () => {
    const out = Object.values(prefixDoors).map((pin) => {
      const d = openPrefixDoor(pin.key, 'engineering: door verification');
      const bars = d.sessions.reduce((t, s) => t + s.bars.length, 0);

      return {
        key: pin.key,
        last: pin.last,
        bytes: d.bytes,
        rows: d.rows,
        sha256: d.sha256,
        lastRowUtc: pin.lastRowUtc,
        sessions: d.sessions.length,
        firstSession: d.sessions[0]!.date,
        lastSession: d.lastSession,
        regularBars: bars,
        closingPrints: d.sessions.filter((s) => s.closingPrint !== undefined).length,
        earlyCloses: d.sessions.filter((s) => s.isEarlyClose).length
      };
    });

    writeSealed(resultFile('data', 'doors.json'), { stage: 'doors', at: nowIso(), doors: out }, 'doors');
    for (const d of out) log(`${d.key}: ${d.sessions} sessions → ${d.lastSession}, ${d.regularBars} bars, ${d.bytes} bytes`);
  },

  verify: () => {
    const v = verifySeals();

    log(`seals: ${v.count} records, ${v.problems.length} problems`);
    for (const p of v.problems) log(`  ${p}`);
    if (v.problems.length) process.exitCode = 1;
  },

  preflight: () => void preflight()
};

const extra = async () => {
  const mod = await import('./stages.ts');

  return mod.commands as Record<string, (o: { option: typeof option; flag: typeof flag }) => Promise<void>>;
};

const main = async () => {
  if (!command) throw new Error(`usage: npm run dip-recovery -- <command>; study ${STUDY}`);

  if (commands[command]) {
    await commands[command]!();
    return;
  }

  const more = await extra();

  if (!more[command]) throw new Error(`unknown command ${command}`);

  await more[command]!({ option, flag });
};

main().catch((error: Error & { exitCode?: number }) => {
  console.error(error.stack ?? error.message);
  process.exitCode = error.exitCode ?? 1;
});
