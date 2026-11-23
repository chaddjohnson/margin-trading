// gpu-phase8 (copy of tools/gpu-phase6/tests-record.ts, this study's namespace; the stale reason also accepts the evaluation change) gates E8, E9, E7 (Strategy Lab part): reads the logs of
// chains/tests.sh and writes results/tests/npm-test.json, strategy-lab.json and strategy-lab-portfolio-parity.json.
// npm test passes iff its only failures are the known pre-existing ones (listed below, recorded since 2026-11-06: the
// lowercase allin-original.ts ×6 and the Study 7 data end), the record-in-force tests before the record (A4, E2) and the
// two declared consequences of the Growth engine revision (E3, checked below), and every GPU-backend test passes; Strategy Lab passes iff
// its typecheck, lint, unit tests and e2e pass (one rerun of the known flaky e2e allowed) and state/strategy-lab/ and the
// live dist are untouched.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase8/context.ts';

const D = path.join(resultsDir, 'tests');
const txt = (f: string) => (fs.existsSync(path.join(D, f)) ? fs.readFileSync(path.join(D, f), 'utf8') : '');
const n = (t: string, k: string) => Number(new RegExp(`ℹ ${k} (\\d+)`).exec(t)?.[1] ?? NaN);
const npm = txt('npm-test.txt');
const failures = [...npm.matchAll(/test at (\S+?):\d+:\d+\n✖ (.+?) \(\d/g)].map((m) => ({ file: m[1]!, test: m[2]! }));
const known = (f: { file: string; test: string }) =>
  /src\/intraday-study\/tests\/study\.test\.ts|src\/minute-optimizer\/tests\/goldenMaster\.test\.ts|src\/trailing-buy\/tests\/goldenMaster\.test\.ts/.test(
    f.file
  ) ||
  (f.file === 'src/study7-runners/tests/runners.test.ts' && /parity with the sealed Study 7 final door/.test(f.test));
// amendment A4: the two tests of the record IN FORCE fail until the new record exists — accepted here only with the
// stale-enforcement reason; they must pass in the rerun after the record (results/tests/record-in-force-after.txt)
const recordInForce = (f: { file: string; test: string }) =>
  (f.file === 'src/gpu-backend/tests/policy.test.ts' && /^MERGE GATE: a recorded GPU acceptance still matches/.test(f.test)) ||
  (f.file === 'src/gpu-backend/tests/enforcement.test.ts' && /^the recorded acceptance re-verifies independently/.test(f.test)) ||
  // amendment E2 (GPU Phase 8): the repository test running every study's preflight fails while the record in force is
  // stale (studies requiring the GPU backend are blocked by §9.9); it must pass in the rerun after the record
  (f.file === 'src/research-standard/tests/preflight.test.ts' && /^every study that declares an adoption passes the preflight/.test(f.test));
// amendment E3 (GPU Phase 8): two tests of the completed Priority 5A study pin the BYTES of the canonical Growth engine
// file (riseTrading.ts v1.4.0, sha256 78b3423c…) and the line range its copied orchestrator was diffed against. The
// declared Growth engine revision 1.5.0 (Priority 4 RULE_SPECIFICATION §5; this record's CPU closure) edits that file, so
// both fail by construction. A completed study's guard is never edited or relaxed: they are accepted here as DECLARED
// CONSEQUENCES only if, computed below, (a) at the base commit 5d587bb2 the file is the pinned v1.4.0 and 5A's diff
// equals its recorded orchestrator.diff (the study verifies at its own commit), (b) 5A's code and research are unchanged
// since the base, and (c) in this same npm run 5A's behavioural test (D24: the lifecycle books equal the canonical books
// on the current engine) and the revision 1.5.0 OFF-parity test (the fixture captured from the unedited engine) pass.
const BASE = '5d587bb2';
const P5A = 'src/vg-growth-funding-lifecycle/tests/parity.test.ts';
const consequenceTests = [/^the canonical source is the pinned riseTrading\.ts v1\.4\.0$/, /^it differs from simulateTrading only by the recorded LIFECYCLE insertions$/];
const isConsequence = (f: { file: string; test: string }) => f.file === P5A && consequenceTests.some((r) => r.test(f.test));
const gitOut = (...a: string[]) => spawnSync('git', a, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 1 << 28 });
const baseEngine = gitOut('show', `${BASE}:src/growth-trading/riseTrading.ts`).stdout;
const baseDiffOk = (() => {
  const lines = fs.readFileSync(path.join(repoRoot, 'src/vg-growth-funding-lifecycle/lifecycle.ts'), 'utf8').split('\n');
  const start = lines.findIndex((l) => l.startsWith('export const simulateLifecycle'));
  const dir = fs.mkdtempSync(path.join(resultsDir, '..', 'cache', 'p5a-'));

  try {
    fs.writeFileSync(path.join(dir, 'a'), `${baseEngine.split('\n').slice(495, 1062).join('\n')}\n`);
    fs.writeFileSync(path.join(dir, 'b'), lines.slice(start).join('\n'));
    const d = spawnSync('diff', [path.join(dir, 'a'), path.join(dir, 'b')], { encoding: 'utf8' }).stdout;

    return d === fs.readFileSync(path.join(repoRoot, 'research/vg-growth-funding-lifecycle/results/engine/orchestrator.diff'), 'utf8');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})();
const passedIn = (name: RegExp) => npm.split('\n').some((l) => /^\s*✔ /.test(l) && name.test(l));
const consequenceChecks = {
  basePinned: createHash('sha256').update(baseEngine).digest('hex') === '78b3423caf2ec09f17be4a35ceac01b5d510ca9370cb2d7fbb5b162e48e4018b',
  baseOrchestratorDiff: baseDiffOk,
  p5aUnchangedSinceBase: gitOut('diff', '--quiet', BASE, 'HEAD', '--', 'src/vg-growth-funding-lifecycle', 'research/vg-growth-funding-lifecycle').status === 0,
  p5aBehaviourPasses: passedIn(/^\s*✔ real data \(D24\): L0 lifecycle books equal the canonical books/),
  offParity150Passes: passedIn(/^\s*✔ Growth engine revision 1\.5\.0 with the staged trailing stop OFF = the 1\.4\.0 baseline/)
};
const consequenceOk = Object.values(consequenceChecks).every(Boolean);
// GPU Phase 7: the record in force is stale for the evaluation change (pool.ts, toolchain.ts) and the enforcement change
// (lab.ts, entrypoints) alike
const staleReason = /the enforcement code changed since acceptance|the GPU evaluator was verified against other sources/.test(npm);
const beforeRecord = failures.filter((f) => !known(f) && recordInForce(f));
const consequences = failures.filter((f) => !known(f) && isConsequence(f));
const unexpected = failures.filter((f) => !known(f) && !(recordInForce(f) && staleReason) && !(isConsequence(f) && consequenceOk));
const totals = {
  tests: n(npm, 'tests'),
  pass: n(npm, 'pass'),
  fail: n(npm, 'fail'),
  cancelled: n(npm, 'cancelled'),
  skipped: n(npm, 'skipped')
};
const npmPass =
  unexpected.length === 0 &&
  failures.length === totals.fail &&
  totals.fail === 7 + beforeRecord.length + consequences.length &&
  consequences.length <= 2 &&
  beforeRecord.length <= 3 &&
  totals.cancelled === 0 &&
  totals.tests > 1710;

writeJson(path.join(D, 'npm-test.json'), {
  kind: 'gpu-phase8 E8 npm test',
  t: new Date().toISOString(),
  command: 'npm test (node --test --test-concurrency=4 src/**/*.test.ts)',
  totals,
  baseline: {
    tests: 1723,
    fail: 7,
    source: 'research/gpu-phase6/results/tests/npm-test.json (after Phase 6: 1,723 tests, 7 known failures); GPU Phase 7 adds 14 risk-envelope tests'
  },
  failures: failures.map((f) => ({ ...f, known: known(f) })),
  unexpected,
  declaredConsequences: {
    tests: consequences,
    checks: consequenceChecks,
    accepted: consequenceOk,
    rule: 'amendment E3: the completed Priority 5A study pins the bytes of riseTrading.ts v1.4.0; the declared Growth engine revision 1.5.0 edits it. Accepted only with the computed checks (the study verifies at its own commit 5d587bb2; its behaviour test and the OFF-parity fixture pass at HEAD). Not relaxed or edited; they remain failing at HEAD and must be disclosed (a merge into main inherits them)'
  },
  recordInForceBeforeRecord: {
    tests: beforeRecord,
    staleReason,
    rule: 'amendment A4: accepted only with the stale-enforcement reason; rerun after the new record must pass (results/tests/record-in-force-after.txt)'
  },
  rootTsc: /exit=0/.test(txt('root-tsc.txt')) ? 'exit 0' : txt('root-tsc.txt').slice(-600),
  eslintGpu: txt('eslint-gpu.txt')
    .split('\n')
    .filter((l) => /problem|exit=/.test(l)),
  summary: `${totals.tests} tests, ${totals.pass} pass, ${totals.fail} fail (${failures.filter(known).length} known pre-existing, ${beforeRecord.length} record-in-force before the new record (A4), ${consequences.length} declared consequences of the engine revision (E3), ${unexpected.length} unexpected), ${totals.skipped} skipped`,
  pass: npmPass
});

const ok = (f: string) => /exit=0/.test(txt(f));
const vitest = txt('strategy-lab-vitest.txt');
const e2e = txt('strategy-lab-e2e.txt');
const e2eRerun = txt('strategy-lab-e2e-rerun.txt');
const passedOf = (t: string) => Number(/(\d+) passed/.exec(t)?.[1] ?? 0);
const failedOf = (t: string) => Number(/(\d+) failed/.exec(t)?.[1] ?? 0);
const stateBefore = txt('strategy-lab-state-before.txt').trim();
const stateAfter = txt('strategy-lab-state-after.txt').trim();
// amendment E3: chains/tests.sh (copied from Phase 7) counted files newer than results/protocol-freeze.json, which this
// study does not have (find failed; its count 0 is vacuous). The check is computed here against the commit time of this
// study's protocol (its freeze) instead.
const freezeTime = gitOut('log', '-1', '--format=%cI', '--', 'research/gpu-phase8/PROTOCOL.md').stdout.trim();
const distNewerList = spawnSync('find', ['apps/strategy-lab/dist', '-type', 'f', '-newermt', freezeTime], { cwd: repoRoot, encoding: 'utf8' });
const distNewer = distNewerList.status === 0 && freezeTime !== '' ? distNewerList.stdout.split('\n').filter(Boolean).length : NaN;
const e2eOk = ok('strategy-lab-e2e.txt') || (e2eRerun !== '' && ok('strategy-lab-e2e-rerun.txt'));
const slPass =
  ok('strategy-lab-typecheck.txt') &&
  ok('strategy-lab-lint.txt') &&
  ok('strategy-lab-vitest.txt') &&
  ok('strategy-lab-build.txt') &&
  e2eOk &&
  stateBefore === stateAfter &&
  stateBefore.length === 64 &&
  distNewer === 0;

writeJson(path.join(D, 'strategy-lab.json'), {
  kind: 'gpu-phase8 E9 Strategy Lab regression',
  t: new Date().toISOString(),
  typecheck: ok('strategy-lab-typecheck.txt') ? 0 : 1,
  lint: ok('strategy-lab-lint.txt') ? 0 : 1,
  vitest: { summary: (vitest.match(/Tests\s+.*$/m) ?? [''])[0].trim(), exit: ok('strategy-lab-vitest.txt') ? 0 : 1 },
  e2e: {
    passed: passedOf(e2e),
    failed: failedOf(e2e),
    rerun: e2eRerun ? { passed: passedOf(e2eRerun), failed: failedOf(e2eRerun) } : 'not needed'
  },
  evaluator:
    'Strategy Lab evaluates on its unchanged CPU engine, now under --no-maglev (server start, runners, NODE_FLAGS, Vitest execArgv, Playwright web server); no canonical evaluation file changed',
  liveDistUntouched: {
    filesNewerThanProtocolFreeze: distNewer,
    freeze: `research/gpu-phase8/PROTOCOL.md committed ${freezeTime}`,
    method: 'UI built into a scratch directory; counted by find -newermt at the record (amendment E3: the chain\'s own count referenced a file this study does not have)'
  },
  stateStrategyLab: {
    before: stateBefore,
    after: stateAfter,
    unchanged: stateBefore === stateAfter,
    method: 'sha256 of sorted (path, size, mtime) of every file under state/strategy-lab/'
  },
  summary: `typecheck ${ok('strategy-lab-typecheck.txt') ? 'ok' : 'FAIL'}, lint ${ok('strategy-lab-lint.txt') ? 'ok' : 'FAIL'}, vitest ${(vitest.match(/Tests\s+.*$/m) ?? ['?'])[0].trim()}, e2e ${passedOf(e2e)} passed / ${failedOf(e2e)} failed${e2eRerun ? ` (rerun ${passedOf(e2eRerun)} / ${failedOf(e2eRerun)})` : ''}, state ${stateBefore === stateAfter ? 'unchanged' : 'CHANGED'}, live dist ${distNewer === 0 ? 'untouched' : 'CHANGED'}`,
  pass: slPass
});
// E7: Strategy Lab's portfolio parity (the five frozen pooled candidates against their archived records)
const pp = fs.existsSync(path.join(D, 'portfolio-parity.json'))
  ? (JSON.parse(fs.readFileSync(path.join(D, 'portfolio-parity.json'), 'utf8')) as Record<string, unknown>)
  : null;
const ppLog = txt('portfolio-parity.txt');
const ppPass = ok('portfolio-parity.txt') && /ALL VERIFIED/.test(ppLog) && pp?.allVerified === true && /node --no-maglev /.test(ppLog); // npm echoes the script line

writeJson(path.join(D, 'strategy-lab-portfolio-parity.json'), {
  kind: 'gpu-phase8 E7 Strategy Lab portfolio parity',
  t: new Date().toISOString(),
  command: 'npm --prefix apps/strategy-lab run portfolio-parity (node --no-maglev …)',
  output: 'research/gpu-phase8/results/tests/portfolio-parity.json',
  outputSha256: pp ? (await import('node:crypto')).createHash('sha256').update(fs.readFileSync(path.join(D, 'portfolio-parity.json'))).digest('hex') : null,
  logTail: ppLog.trim().split('\n').slice(-8),
  summary: ppLog.trim().split('\n').filter((l) => /VERIFIED|DIFFER|FAIL/.test(l)).slice(-3).join(' | '),
  pass: ppPass
});
console.log(JSON.stringify({ npm: npmPass, strategyLab: slPass, portfolioParity: ppPass }));
process.exitCode = npmPass && slPass && ppPass ? 0 : 2;
