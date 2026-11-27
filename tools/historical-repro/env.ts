// A TEMPORARY historical-reproduction environment for a completed study whose own code checks a canonical file's WHOLE
// sha256 (standard 4.0.0 §1.14; docs/data-updates/2026-11-27-assignment-1/HISTORICAL_COMPATIBILITY.md). The canonical
// files only grow by appending rows, so every earlier version is exactly a byte prefix of today's file (its vintage,
// config/market-data/vintages.json). This tool rebuilds the study's expected input from that prefix, verified, in a
// detached worktree at the study's own commit OUTSIDE the repository — it never edits the study, its sealed records or
// the canonical files, and the copies are removed with the environment (no second permanent dataset).
//
//   node --experimental-transform-types --disable-warning=ExperimentalWarning tools/historical-repro/env.ts prepare \
//     --commit <rev> --dir <absolute empty directory outside the repository> \
//     --data VGT=<whole-file sha256 the study pins> [--data GDX=<sha256> …] [--copy <ignored input, e.g. .cache/<study>/doors> …]
//     [--seals research/<study>/results/seals.jsonl …]
//   … tools/historical-repro/env.ts remove --dir <the same directory>
//
// prepare: (1) resolves each pin to its verified byte prefix of data/<SYM>/data.csv (src/lib/canonicalPrefix.ts
// historicalPin: the whole current file, or a registered vintage verified by hashing the prefix) and refuses anything
// else; (2) `git worktree add --detach <dir>/tree <rev>`; (3) writes data/<SYM>/data.csv in the worktree as exactly those
// bytes, re-hashes the copy and makes it read-only; (4) copies each --copy path (git-ignored inputs such as prefix-door
// caches) from this checkout, every file re-hashed; (4b) restores the read-only mode of every sealed record a --seals
// log lists, after verifying its sha256 against the log; (5) links node_modules (read-only use) and the git-ignored generated
// sources; (6) writes <dir>/REPRODUCTION.json (commit, pins, copies, hashes, time). Run the study's command inside
// <dir>/tree, then `remove`.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { historicalPin } from '../../src/lib/canonicalPrefix.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MARKER = 'REPRODUCTION.json';
const argv = process.argv.slice(2);
const command = argv[0];
const all = (name: string) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]!] : []));
const one = (name: string) => all(name)[0];
const fail = (m: string): never => {
  throw new Error(`historical-repro: ${m}`);
};

const sha256File = (file: string) => {
  const h = createHash('sha256');
  const fd = fs.openSync(file, 'r');
  const buf = Buffer.allocUnsafe(1 << 22);
  try {
    for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0; ) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest('hex');
};

// Copy exactly the first `bytes` bytes of `from` to `to` (streamed).
const copyPrefix = (from: string, to: string, bytes: number) => {
  const src = fs.openSync(from, 'r');
  const dst = fs.openSync(to, 'wx');
  const buf = Buffer.allocUnsafe(1 << 22);
  try {
    for (let done = 0; done < bytes; ) {
      const n = fs.readSync(src, buf, 0, Math.min(buf.length, bytes - done), done);
      if (n <= 0) fail(`${from} ended before ${bytes} bytes`);
      fs.writeSync(dst, buf, 0, n);
      done += n;
    }
  } finally {
    fs.closeSync(src);
    fs.closeSync(dst);
  }
};

const dirArg = () => {
  const d = one('--dir') ?? fail('--dir is required');
  if (!path.isAbsolute(d)) fail('--dir must be absolute');
  const rel = path.relative(repoRoot, d);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) fail(`--dir ${d} is inside the repository: use a scratch directory outside it`);
  return d;
};

if (command === 'prepare') {
  const dir = dirArg();
  const commit = one('--commit') ?? fail('--commit is required');
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) fail(`${dir} is not empty`);
  const rev = execFileSync('git', ['rev-parse', '--verify', `${commit}^{commit}`], { cwd: repoRoot, encoding: 'utf8' }).trim();

  // (1) every pin is a verified prefix of today's canonical file, before anything is created
  const pins = all('--data').map((spec) => {
    const m = /^([A-Z0-9.-]{1,12})=([0-9a-f]{64})$/.exec(spec) ?? fail(`--data ${spec}: expected SYMBOL=<sha256>`);
    const symbol = m[1]!;
    const file = path.join(repoRoot, 'data', symbol, 'data.csv');
    if (!fs.existsSync(file)) fail(`${file} does not exist`);
    const pin = historicalPin(file, symbol, m[2]!) ?? fail(`${symbol} ${m[2]}: not the current file and not a registered, verified vintage (config/market-data/vintages.json)`);
    return { symbol, file, ...pin, wholeFile: pin.bytes === fs.statSync(file).size };
  });
  if (!pins.length) fail('at least one --data SYMBOL=<sha256> is required');

  // (2) the worktree at the study's commit, outside the repository
  fs.mkdirSync(dir, { recursive: true });
  const tree = path.join(dir, 'tree');
  execFileSync('git', ['worktree', 'add', '--detach', tree, rev], { cwd: repoRoot, stdio: 'inherit' });
  // a provisional marker at once, so that `remove` can always clean up a partly prepared environment
  fs.writeFileSync(path.join(dir, MARKER), `${JSON.stringify({ kind: 'historical reproduction environment', schema: 1, commit: rev, tree, state: 'preparing' }, null, 1)}\n`);

  // (3) the canonical files as their verified prefixes
  const data = pins.map((p) => {
    const to = path.join(tree, 'data', p.symbol, 'data.csv');
    fs.mkdirSync(path.dirname(to), { recursive: true });
    copyPrefix(p.file, to, p.bytes);
    const got = sha256File(to);
    if (got !== p.sha256 || fs.statSync(to).size !== p.bytes) fail(`${to}: the copy hashes to ${got}, not ${p.sha256}`);
    fs.chmodSync(to, 0o444);
    return { symbol: p.symbol, path: `data/${p.symbol}/data.csv`, bytes: p.bytes, sha256: p.sha256, source: path.relative(repoRoot, p.file), wholeCurrentFile: p.wholeFile };
  });

  // (4) git-ignored inputs copied from this checkout, every file re-hashed
  const copies: { path: string; bytes: number; sha256: string }[] = [];
  const copy = (rel: string) => {
    const from = path.join(repoRoot, rel);
    const to = path.join(tree, rel);
    const st = fs.statSync(from);
    if (st.isDirectory()) {
      for (const n of fs.readdirSync(from).sort()) copy(path.join(rel, n));
      return;
    }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    const a = sha256File(from);
    const b = sha256File(to);
    if (a !== b) fail(`${rel}: the copy differs`);
    copies.push({ path: rel, bytes: st.size, sha256: a });
  };
  for (const rel of all('--copy')) {
    if (path.isAbsolute(rel) || rel.split(path.sep).includes('..')) fail(`--copy ${rel}: a path relative to the repository root`);
    if (rel === 'data' || rel.startsWith(`data${path.sep}`)) fail('--copy never copies canonical data: use --data (verified prefixes)');
    copy(rel);
  }

  // (4b) sealed records: git does not keep the read-only mode a study's seal requires (sha256 AND mode 0444); restore it
  // for every file a seals log lists, only after its sha256 is verified against that log (a changed file stays unsealed)
  const sealed: { log: string; files: number; absent: string[] }[] = [];
  for (const rel of all('--seals')) {
    const log = path.join(tree, rel);
    if (!fs.existsSync(log)) fail(`--seals ${rel}: not in the worktree`);
    const lines = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as { file?: string; sha256?: string });
    let n = 0;
    const absent: string[] = [];
    for (const x of lines) {
      if (!x.file || !x.sha256) continue;
      const f = path.join(tree, x.file);
      // a sealed git-ignored file (a cache) is not in a fresh worktree: listed, not restored (the study's own seal check
      // then reports it; copy it with --copy if the reproduction needs it)
      if (!fs.existsSync(f)) {
        absent.push(x.file);
        continue;
      }
      if (sha256File(f) !== x.sha256) fail(`${x.file} does not match its seal in ${rel}`);
      fs.chmodSync(f, 0o444);
      n++;
    }
    sealed.push({ log: rel, files: n, absent });
  }

  // (5) dependencies and git-ignored generated sources
  fs.symlinkSync(path.join(repoRoot, 'node_modules'), path.join(tree, 'node_modules'));
  const generated = 'src/four-family/generated';
  if (fs.existsSync(path.join(repoRoot, generated)) && !fs.existsSync(path.join(tree, generated))) copy(generated);

  // (6) the record of the environment
  const record = {
    kind: 'historical reproduction environment',
    schema: 1,
    created: new Date().toISOString(),
    commit: rev,
    tree,
    data,
    copies,
    sealed,
    state: 'ready',
    note: 'temporary: remove with tools/historical-repro/env.ts remove --dir <dir>; never a canonical dataset'
  };
  fs.writeFileSync(path.join(dir, MARKER), `${JSON.stringify(record, null, 1)}\n`);
  console.log(JSON.stringify({ ...record, copies: `${copies.length} file(s)` }, null, 1));
  console.log(`\nrun the study's command inside ${tree}; then: tools/historical-repro/env.ts remove --dir ${dir}`);
} else if (command === 'remove') {
  const dir = dirArg();
  const marker = path.join(dir, MARKER);
  if (!fs.existsSync(marker)) fail(`${dir} has no ${MARKER}: not an environment made by this tool`);
  const record = JSON.parse(fs.readFileSync(marker, 'utf8')) as { tree: string };
  if (path.dirname(record.tree) !== dir) fail(`${MARKER} names a tree outside ${dir}`);
  for (const d of [path.join(record.tree, 'data')]) if (fs.existsSync(d)) fs.chmodSync(d, 0o755);
  execFileSync('git', ['worktree', 'remove', '--force', record.tree], { cwd: repoRoot, stdio: 'inherit' });
  fs.rmSync(dir, { recursive: true, force: true });
  execFileSync('git', ['worktree', 'prune'], { cwd: repoRoot });
  console.log(`removed ${dir}`);
} else {
  console.error('usage: env.ts prepare --commit <rev> --dir <dir> --data SYM=<sha256> [--copy <path>] | env.ts remove --dir <dir>');
  process.exitCode = 2;
}
