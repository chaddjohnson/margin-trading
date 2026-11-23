// gpu-phase8 (copy of tools/gpu-phase6/tests-record.ts, this study's namespace; the stale reason also accepts the evaluation change) gates E8, E9, E7 (Strategy Lab part): reads the logs of
// chains/tests.sh and writes results/tests/npm-test.json, strategy-lab.json and strategy-lab-portfolio-parity.json.
// npm test passes iff its only failures are the known pre-existing ones (listed below, recorded since 2026-11-06: the
// lowercase allin-original.ts ×6 and the Study 7 data end) and every GPU-backend test passes; Strategy Lab passes iff
// its typecheck, lint, unit tests and e2e pass (one rerun of the known flaky e2e allowed) and state/strategy-lab/ and the
// live dist are untouched.
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase8/context.ts';

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
// GPU Phase 7: the record in force is stale for the evaluation change (pool.ts, toolchain.ts) and the enforcement change
// (lab.ts, entrypoints) alike
const staleReason = /the enforcement code changed since acceptance|the GPU evaluator was verified against other sources/.test(npm);
const beforeRecord = failures.filter((f) => !known(f) && recordInForce(f));
const unexpected = failures.filter((f) => !known(f) && !(recordInForce(f) && staleReason));
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
  totals.fail === 7 + beforeRecord.length &&
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
  recordInForceBeforeRecord: {
    tests: beforeRecord,
    staleReason,
    rule: 'amendment A4: accepted only with the stale-enforcement reason; rerun after the new record must pass (results/tests/record-in-force-after.txt)'
  },
  rootTsc: /exit=0/.test(txt('root-tsc.txt')) ? 'exit 0' : txt('root-tsc.txt').slice(-600),
  eslintGpu: txt('eslint-gpu.txt')
    .split('\n')
    .filter((l) => /problem|exit=/.test(l)),
  summary: `${totals.tests} tests, ${totals.pass} pass, ${totals.fail} fail (${failures.filter(known).length} known pre-existing, ${beforeRecord.length} record-in-force before the new record (A4), ${unexpected.length} unexpected), ${totals.skipped} skipped`,
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
const distNewer = Number(txt('strategy-lab-dist-newer-after.txt').trim());
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
  liveDistUntouched: { filesNewerThanProtocolFreeze: distNewer, method: 'UI built into a scratch directory' },
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
