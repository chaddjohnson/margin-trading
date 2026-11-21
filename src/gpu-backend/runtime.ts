// gpu-backend: the JAVASCRIPT ENGINE CONFIGURATION of every process that produces official results or parity evidence
// (GPU Phase 5; research/gpu-phase5/PARITY_ROOT_CAUSE.md).
//
// Node 24's V8 (13.6) runs hot code through three compilers: Sparkplug (baseline), Maglev (mid-tier) and TurboFan. With
// Maglev enabled, GPU Phase 5 reproduced a V8 defect in the UNCHANGED canonical code: two objects created by one object
// literal (`{ t, date, m, liq, r, lot }` in src/vg-l0-risk-metrics/metrics.ts portfolioPath) shared the storage of
// their number fields, so the first object silently took the numbers of the next one. It is timing-dependent (it
// follows when optimized code is installed, and is far more frequent on a loaded machine), it happens in freshly
// started processes and in warm ones, and it produced the CPU parity reference's wrong risk-envelope inputs with
// correct books, pooled replay and record. The same construct — object literals with number fields created in a loop —
// builds the canonical records (recordOf, riskInputsOf), on the CPU reference side AND in the GPU host path's worker
// threads. With `--no-maglev` the defect did not occur in the same experiments (the evidence and its limits are in the
// report above).
//
// Therefore the engine's JavaScript runs WITHOUT Maglev wherever a result matters:
//   - the official gate (official.ts) and the official runner (officialRunner.ts) refuse a process that was not started
//     with `--no-maglev` (V8 options are process-wide: the host pipeline's worker threads inherit them);
//   - the CPU parity-reference workers are forked with it (the acceptance study's harness);
//   - the acceptance campaign's tools run with it and record the engine configuration in their evidence;
//   - (GPU Phase 6, research/gpu-phase6/) every legacy CPU research runner (legacyRunner.ts) and Strategy Lab's server
//     and runners refuse a process started without it, and the legacy runner gate installs the CHILD-PROCESS GUARD below,
//     so that the Node children of frozen runner code — which fork their workers with an explicit execArgv that would
//     otherwise drop the flag — start with it too.
// `--no-maglev` only removes one optimizing tier (Sparkplug and TurboFan remain); it changes no JavaScript semantics.
//
// How the flag travels (the one place that knows it; nothing else duplicates this logic):
//   - the first process: `node --no-maglev …` on the command line (npm scripts, systemd units, launchers). NODE_OPTIONS
//     cannot carry it (Node refuses V8 options there) and is never relied on;
//   - worker threads: V8 options are process-wide, a worker cannot opt out (its own `execArgv` holds Node options only);
//   - child processes: `fork()` without an explicit execArgv inherits process.execArgv; one with an explicit execArgv,
//     or a `spawn(process.execPath, …)`, gets the flag only if the caller adds it — `engineExecArgv` / `withEngineFlag`
//     for code that can be edited, `installChildEngineGuard()` for frozen code that cannot.
import childProcess from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { promisify } from 'node:util';
import { PolicyError } from './purpose.ts';

export const ENGINE_FLAG = '--no-maglev';

// the Node options a child process that evaluates must be started with (fork / spawn execArgv)
export const engineExecArgv = [ENGINE_FLAG] as const;

// Maglev is off iff the process's options contain `--no-maglev` and no other Maglev option (a later `--maglev`,
// `--stress-maglev`, `--maglev-future`, … would re-enable or alter it). `--jitless` is not accepted as a substitute: it
// is another configuration, with no evidence behind it.
export const maglevDisabled = (execArgv: readonly string[] = process.execArgv) =>
  execArgv.includes(ENGINE_FLAG) && execArgv.every((a) => a === ENGINE_FLAG || !/maglev/i.test(a));

export interface EngineRuntime {
  node: string;
  v8: string;
  maglev: 'disabled' | 'enabled';
  execArgv: string[];
}

export const engineRuntime = (): EngineRuntime => ({
  node: process.version,
  v8: process.versions.v8,
  maglev: maglevDisabled() ? 'disabled' : 'enabled',
  execArgv: [...process.execArgv]
});

export const runtimeProblem = (execArgv: readonly string[] = process.execArgv) =>
  maglevDisabled(execArgv)
    ? null
    : `this Node process was not started with ${ENGINE_FLAG} (its options: ${execArgv.join(' ') || 'none'}): V8's Maglev compiler can silently corrupt number fields of freshly created objects (research/gpu-phase5/PARITY_ROOT_CAUSE.md); start it as \`node ${ENGINE_FLAG} …\``;

// fail closed: `what` names the caller for the error (e.g. "official GPU session", "parity evidence")
export const requireEngineRuntime = (what: string) => {
  const p = runtimeProblem();

  if (p) throw new PolicyError('runtime-maglev', `${what}: ${p}`);
};

// ----- launching Node children with the engine configuration -----

const isMaglevOption = (a: string) => /maglev/i.test(a) && a !== ENGINE_FLAG;

// the Node options of a child process: `--no-maglev` first, never twice; another Maglev option is refused (fail closed)
export const withEngineFlag = (execArgv: readonly string[] = []): string[] => {
  const bad = execArgv.filter(isMaglevOption);

  if (bad.length)
    throw new PolicyError(
      'runtime-maglev',
      `a Node child process was to start with ${bad.join(' ')}: the engine runs only without V8's Maglev (${ENGINE_FLAG}; research/gpu-phase5/PARITY_ROOT_CAUSE.md)`
    );
  return [ENGINE_FLAG, ...execArgv.filter((a) => a !== ENGINE_FLAG)];
};

// the argument vector of `spawn(process.execPath, args)`: the Node options before the script (or `-e`/`-p` code) get
// the flag; the script's own arguments are never inspected or changed
export const withEngineFlagArgs = (args: readonly string[]): string[] => {
  let i = 0;

  while (i < args.length && args[i]!.startsWith('-') && !['-e', '--eval', '-p', '--print', '-', '--'].includes(args[i]!))
    i++;
  return [...withEngineFlag(args.slice(0, i)), ...args.slice(i)];
};

// a command that starts this Node binary (or a `node` from PATH)
const isNodeCommand = (file: unknown) =>
  typeof file === 'string' &&
  (file === process.execPath || path.basename(file) === 'node' || path.basename(file) === path.basename(process.execPath));

const GUARD = Symbol.for('margin-trading.childEngineGuard');

// THE CHILD-PROCESS GUARD. Installed by a process that runs code it cannot edit (the frozen legacy runners, behind
// legacyRunner.ts): from then on every Node child process this process starts — `fork()` (always a Node child), and
// `spawn` / `spawnSync` / `execFile` / `execFileSync` of this Node binary or of `node` — starts with `--no-maglev`
// added to its Node options, whatever execArgv or arguments the caller passed. The ESM bindings of `node:child_process`
// are refreshed (module.syncBuiltinESMExports), so `import { fork } from 'node:child_process'` sees the guarded
// function as well. Nothing else is changed: the child's script, its arguments, environment, stdio, IPC and
// serialization are the caller's. Non-Node commands (the GPU server, git, nvidia-smi, shells) are untouched. Idempotent;
// the process itself must already run without Maglev (requireEngineRuntime) — the guard only carries the flag on.
export const installChildEngineGuard = () => {
  const cp = childProcess as unknown as Record<string | symbol, unknown>;

  if (cp[GUARD]) return false;

  const original = {
    fork: childProcess.fork,
    spawn: childProcess.spawn,
    spawnSync: childProcess.spawnSync,
    execFile: childProcess.execFile,
    execFileSync: childProcess.execFileSync
  };
  // fork(module, args?, options?): the options' execArgv (default: process.execArgv, which already carries the flag)
  const fork = function (this: unknown, modulePath: string, ...rest: unknown[]) {
    const argsGiven = Array.isArray(rest[0]);
    const args = argsGiven ? (rest[0] as string[]) : [];
    const optIndex = argsGiven ? 1 : 0;
    const options = (rest[optIndex] && typeof rest[optIndex] === 'object' ? rest[optIndex] : {}) as {
      execArgv?: string[];
    };
    const next = { ...options, execArgv: withEngineFlag(options.execArgv ?? process.execArgv) };

    return (original.fork as (...a: unknown[]) => unknown).call(this, modulePath, args, next);
  };
  // spawn-like(file, args?, …): a Node command gets the flag before its script
  const nodeArgs =
    (fn: (...a: unknown[]) => unknown) =>
    function (this: unknown, file: unknown, ...rest: unknown[]) {
      if (!isNodeCommand(file)) return fn.call(this, file, ...rest);
      if (Array.isArray(rest[0])) rest[0] = withEngineFlagArgs(rest[0] as string[]);
      else rest.unshift([ENGINE_FLAG]);
      return fn.call(this, file, ...rest);
    };

  const execFile = nodeArgs(original.execFile as never) as ((...a: unknown[]) => unknown) & Record<symbol, unknown>;
  const promisified = (original.execFile as unknown as Record<symbol, (...a: unknown[]) => unknown>)[promisify.custom];

  // util.promisify(execFile) keeps resolving { stdout, stderr }, with the same argument handling
  if (promisified) execFile[promisify.custom] = nodeArgs(promisified);
  cp.fork = fork;
  cp.spawn = nodeArgs(original.spawn as never);
  cp.spawnSync = nodeArgs(original.spawnSync as never);
  cp.execFile = execFile;
  cp.execFileSync = nodeArgs(original.execFileSync as never);
  cp[GUARD] = true;
  syncBuiltinESMExports();
  return true;
};

export const childEngineGuardInstalled = () => Boolean((childProcess as unknown as Record<symbol, unknown>)[GUARD]);
