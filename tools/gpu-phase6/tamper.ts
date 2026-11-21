// gpu-phase6 (copy of tools/gpu-phase5/tamper.ts, this study's namespace) tamper suite, the main-checkout side (PROTOCOL.md §6 gate E4): creates a throwaway clone of the committed HEAD
// (git clone --shared, under this study's git-ignored cache), links node_modules read-only, runs
// tools/gpu-phase6/tamper-sandbox.ts inside it (every modification happens in the clone, never in the main checkout),
// writes the result and removes the clone. The main checkout must be committed (the clone is HEAD).
//   node --no-maglev --experimental-transform-types tools/gpu-phase6/tamper.ts --out research/gpu-phase6/results/policy/tamper-final.json
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { cacheDir, repoRoot, writeJson } from '../../src/gpu-phase6/context.ts';
import { serverBinary } from '../../src/gpu-backend/toolchain.ts';

const args = process.argv.slice(2);
const out = args[args.indexOf('--out') + 1]!;
const box = path.join(cacheDir, 'tamper-sandbox');
const git = (...a: string[]) => spawnSync('git', a, { cwd: repoRoot, encoding: 'utf8' });
const head = git('rev-parse', 'HEAD').stdout.trim();
const dirty = git('status', '--porcelain', '--', 'src', 'tools', 'config').stdout.trim();

if (dirty) throw new Error(`commit the source first (the sandbox is a clone of HEAD): ${dirty.slice(0, 300)}`);
fs.rmSync(box, { recursive: true, force: true });
if (git('clone', '--quiet', '--shared', '--no-checkout', repoRoot, box).status !== 0) throw new Error('clone failed');
spawnSync('git', ['checkout', '--quiet', '--detach', head], { cwd: box });
fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(box, 'node_modules'));
// the checkout's local excludes (.git/info/exclude: they hide the generated sources below; a clone does not copy them)
fs.copyFileSync(path.join(repoRoot, '.git', 'info', 'exclude'), path.join(box, '.git', 'info', 'exclude'));
// git-ignored generated sources a full checkout has (src/four-family/generated/: *.ts and the self-ignoring .gitignore;
// the entrypoint audit's digest of a registered legacy runner covers them), copied so the clone is the same source tree
for (const f of git('ls-files', '--others', '--ignored', '--exclude-standard', 'src')
  .stdout.split('\n')
  .filter(Boolean)) {
  fs.mkdirSync(path.dirname(path.join(box, f)), { recursive: true });
  fs.copyFileSync(path.join(repoRoot, f), path.join(box, f));
}

let result: Record<string, unknown>;

try {
  const r = spawnSync(
    process.execPath,
    ['--no-maglev', '--experimental-transform-types', '--disable-warning=ExperimentalWarning', 'tools/gpu-phase6/tamper-sandbox.ts'],
    {
      cwd: box,
      env: { ...process.env, GPU_BACKEND_BINARY: serverBinary, GPU_POLICY_PURPOSE: '' },
      encoding: 'utf8',
      timeout: 3_600_000,
      maxBuffer: 64 * 2 ** 20
    }
  );

  process.stderr.write(r.stderr);
  result = {
    ...JSON.parse(r.stdout.trim().split('\n').at(-1)!),
    sandbox: path.relative(repoRoot, box),
    mainHead: head,
    binary: path.relative(repoRoot, serverBinary)
  };
} finally {
  fs.unlinkSync(path.join(box, 'node_modules'));
  fs.rmSync(box, { recursive: true, force: true });
}
writeJson(out, result);
console.log(`${result.passed}/${result.cases} tamper cases pass; baseline ${result.baselineOk ? 'ok' : 'NOT OK'}`);
process.exitCode = result.pass ? 0 : 2;
