// gpu-phase7 (copy of tools/gpu-phase6/integrity.ts against this study's own baselines, research/gpu-phase7/results/
// baseline/, captured on the post-cleanup tree before any change; the evaluation check allows exactly the two declared
// host-path files). Phase 6's header follows.
// gpu-phase6 (PROTOCOL.md §6 gate E10): historical research files and their integrity checks unchanged, against the
// baselines captured before any change (research/gpu-phase7/results/baseline/):
//   - every tracked file under research/ outside research/gpu-phase7/: the same blob (git ls-files -s) as at baseline;
//     none added, none removed; and the working tree equals the index for them (no uncommitted change);
//   - every study's research preflight: the same PASS line as at baseline (22 studies);
//   - sealed-file protection (tools/gpu-phase5/seal-protect.ts --check, read-only): the same counts, nothing writable,
//     no content difference;
//   - the prospective B4/B5 forward freeze: exactly the baseline's (pre-existing) failure list — nothing new, in
//     particular its bound code closure (src/app.ts …) still verifies;
//   - the GPU compatibility digests: the evaluation digest, CPU closure, CUDA and host groups as at baseline.
// Read-only (it writes only --out).
//   node --no-maglev --experimental-transform-types tools/gpu-phase7/integrity.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot, resultsDir, writeJson } from '../../src/gpu-phase7/context.ts';
import { compatManifest } from '../../src/gpu-backend/compat.ts';

const out = process.argv[process.argv.indexOf('--out') + 1]!;
const B = path.join(resultsDir, 'baseline');
const node = process.execPath;
const ts = ['--no-maglev', '--experimental-transform-types', '--disable-warning=ExperimentalWarning'];
const sh = (cmd: string, args: string[]) => spawnSync(cmd, args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 512 << 20 });
const checks: { name: string; pass: boolean; detail: unknown }[] = [];
const check = (name: string, pass: boolean, detail: unknown) => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};

// tracked research files
{
  const parse = (t: string) =>
    new Map(
      t
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const [blob, file] = l.split('  ');
          return [file!, blob!] as const;
        })
        .filter(([f]) => !f.startsWith('research/gpu-phase7/') && !f.startsWith('research/vg-l0-risk-envelope-pilot/'))
    );
  const before = parse(fs.readFileSync(path.join(B, 'research-tracked-blobs.txt'), 'utf8'));
  const now = parse(
    sh('git', ['ls-files', '-s', 'research'])
      .stdout.split('\n')
      .filter(Boolean)
      .map((l) => {
        const [, blob, , file] = l.split(/\s+/);
        return `${blob}  ${file}`;
      })
      .join('\n')
  );
  const changed = [...before].filter(([f, b]) => now.get(f) !== b).map(([f]) => f);
  const added = [...now.keys()].filter((f) => !before.has(f));
  const dirty = sh('git', ['status', '--porcelain', '--', 'research', ':!research/gpu-phase7', ':!research/vg-l0-risk-envelope-pilot']).stdout.split('\n').filter(Boolean);

  check(`tracked research files outside gpu-phase7 and the pilot proposal unchanged (${before.size})`, changed.length === 0 && added.length === 0 && dirty.length === 0, { changed: changed.slice(0, 10), added: added.slice(0, 10), dirty: dirty.slice(0, 10) });
}
// study preflights
{
  const base = fs.readFileSync(path.join(B, 'preflights.txt'), 'utf8').trim().split('\n');
  const now = base.map((l) => {
    const d = l.split(' ')[0]!;
    const r = sh(node, [...ts, 'src/research-standard/main.ts', '--study', d]);

    return `${d} exit=${r.status} ${(`${r.stdout}${r.stderr}`.split('\n').find((x) => /PASS|FAIL|BLOCK|REFUS/.test(x)) ?? '').slice(0, 80)}`;
  });
  const differ = base.filter((l, i) => l !== now[i]);

  check(`study preflights as at baseline (${base.length}, all PASS)`, differ.length === 0 && base.length === 22 && now.every((l) => / exit=0 PASS /.test(l)), { differ, now: now.slice(0, 3) });
}
// sealed-file protection
{
  const r = sh(node, [...ts, 'tools/gpu-phase5/seal-protect.ts', '--check']);
  const line = JSON.parse(r.stdout.trim().split('\n').at(-1)!) as Record<string, number>;
  const base = JSON.parse(fs.readFileSync(path.join(B, 'seals-check.json'), 'utf8')) as Record<string, number>;
  const keys = ['sealedFiles', 'protected', 'writableVerified', 'contentDiffers', 'matchesAnEarlierSealOnly', 'absent', 'notARegularFile', 'untrackedOrModified'];

  check('sealed-file protection as at baseline (read-only check)', r.status === 0 && keys.every((k) => line[k] === base[k]) && line.writableVerified === 0 && line.contentDiffers === 0, Object.fromEntries(keys.map((k) => [k, [base[k], line[k]]])));
}
// the B4/B5 forward freeze
{
  const r = sh(node, [...ts, '-e', "import('./src/pools/forward/freeze.ts').then(async m=>{const r=await m.verifyProspectiveFreeze();const {freeze,...rest}=r;console.log(JSON.stringify(rest))})"]);
  const now = JSON.parse(r.stdout.trim().split('\n').at(-1)!) as { failures: string[] };
  const base = JSON.parse(fs.readFileSync(path.join(B, 'forward-freeze.json'), 'utf8')) as { failures: string[] };

  check('the B4/B5 forward freeze: the pre-existing failure list exactly, nothing new (its code closure verifies)', JSON.stringify(now.failures) === JSON.stringify(base.failures) && !now.failures.some((f) => /code|src\//.test(f)), { baseline: base.failures.length, now: now.failures.length, new: now.failures.filter((f) => !base.failures.includes(f)) });
}
// compatibility digests
{
  const base = JSON.parse(fs.readFileSync(path.join(B, 'compat.json'), 'utf8')) as Record<string, string>;
  const m = compatManifest();

  // GPU Phase 7: the CPU closure and the CUDA sources exactly as at baseline; in the host group ONLY the two declared
  // files changed (pool.ts: the risk-envelope delivery; toolchain.ts: the default binary path)
  const hostBase = (base as unknown as { hostFiles: Record<string, string> }).hostFiles;
  const hostChanged = m.host.files.filter((f) => hostBase[f.path] !== f.sha256).map((f) => f.path).sort();
  const hostAddedOrRemoved = m.host.files.length !== Object.keys(hostBase).length;

  check(
    'GPU evaluation: CPU closure and CUDA sources as at baseline; host group changed only in pool.ts and toolchain.ts',
    m.cpu.digest === base.cpu && m.cuda.digest === base.cuda && !hostAddedOrRemoved && JSON.stringify(hostChanged) === JSON.stringify(['src/gpu-backend/pool.ts', 'src/gpu-backend/toolchain.ts']),
    { digest: m.digest, baseDigest: base.digest, cpu: [base.cpu, m.cpu.digest], cuda: [base.cuda, m.cuda.digest], hostChanged }
  );
}

const pass = checks.every((c) => c.pass);

writeJson(out, { kind: 'gpu-phase7 integrity of historical research', t: new Date().toISOString(), head: sh('git', ['rev-parse', 'HEAD']).stdout.trim(), checks, summary: `${checks.filter((c) => c.pass).length}/${checks.length} integrity checks pass`, pass });
console.log(`${checks.filter((c) => c.pass).length}/${checks.length} integrity checks pass`);
process.exitCode = pass ? 0 : 2;
