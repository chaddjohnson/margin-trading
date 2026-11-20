// gpu-phase5 (copy of tools/gpu-phase3/tests-record.ts, this study's namespace) gate H7: reads the logs of chains/tests.sh and writes results/tests/npm-test.json and strategy-lab.json.
// npm test passes iff its only failures are the known pre-existing ones (listed below, recorded since 2026-11-06: the
// lowercase allin-original.ts ×6 and the Study 7 data end) and every GPU-backend test passes; Strategy Lab passes iff
// its typecheck, lint, unit tests and e2e pass (one rerun of the known flaky e2e allowed) and state/strategy-lab/ and the
// live dist are untouched.
import fs from 'node:fs';
import path from 'node:path';
import { resultsDir, writeJson } from '../../src/gpu-phase5/context.ts';

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
const unexpected = failures.filter((f) => !known(f));
const totals = {
  tests: n(npm, 'tests'),
  pass: n(npm, 'pass'),
  fail: n(npm, 'fail'),
  cancelled: n(npm, 'cancelled'),
  skipped: n(npm, 'skipped')
};
const npmPass =
  unexpected.length === 0 && failures.length === totals.fail && totals.fail === 7 && totals.cancelled === 0;

writeJson(path.join(D, 'npm-test.json'), {
  kind: 'gpu-phase5 H7 npm test',
  t: new Date().toISOString(),
  command: 'npm test (node --test --test-concurrency=4 src/**/*.test.ts)',
  totals,
  baseline: {
    tests: 1699,
    pass: 1688,
    fail: 7,
    skipped: 4,
    source: 'research/gpu-phase3/results/tests/npm-test.json (after Phase 3)'
  },
  failures: failures.map((f) => ({ ...f, known: known(f) })),
  unexpected,
  rootTsc: /exit=0/.test(txt('root-tsc.txt')) ? 'exit 0' : txt('root-tsc.txt').slice(-600),
  eslintGpu: txt('eslint-gpu.txt')
    .split('\n')
    .filter((l) => /problem|exit=/.test(l)),
  summary: `${totals.tests} tests, ${totals.pass} pass, ${totals.fail} fail (${failures.length - unexpected.length} known pre-existing, ${unexpected.length} unexpected), ${totals.skipped} skipped`,
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
  kind: 'gpu-phase5 H7 Strategy Lab regression',
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
    'Strategy Lab evaluates on its unchanged CPU engine (no file under apps/ changed on this branch; none of the canonical evaluation files changed)',
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
console.log(JSON.stringify({ npm: npmPass, strategyLab: slPass }));
process.exitCode = npmPass && slPass ? 0 : 2;
