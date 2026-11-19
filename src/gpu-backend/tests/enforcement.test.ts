// The enforcement trust boundary (GPU Phase 3, standard 3.0.0 §9.7, §9.10): every file of the GPU backend is either an
// evaluation file (compiled into the binary's digest: it can change a request or a result) or an enforcement file
// (pinned by the acceptance record: it can change who may run what, or how acceptance is judged) — a new worker,
// loader or gate file cannot exist outside the acceptance; and the recorded acceptance re-verifies with the independent
// verifier (tools/gpu-backend/verify-acceptance.sh, Python and git, no code shared with acceptance.ts), which also
// detects a tampered pin, a changed evaluation digest and a modified evidence file.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { hostFiles, policyFiles } from '../compat.ts';
import { acceptanceFile } from '../acceptance.ts';
import { repoRoot } from '../toolchain.ts';

// development tools of the backend that neither run in an official job nor judge acceptance
const devTools = new Set([
  'tools/gpu-backend/check-v8math.ts',
  'tools/gpu-backend/layout-dump.cpp',
  'tools/gpu-backend/v8math-check.cu'
]);

test('every GPU-backend file is classified: evaluation (in the binary digest) or enforcement (pinned by the acceptance)', () => {
  const classified = new Set([...hostFiles, ...policyFiles]);
  const backend = fs
    .readdirSync(path.join(repoRoot, 'src/gpu-backend'), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => path.relative(repoRoot, path.join(e.parentPath, e.name)));
  const tools = fs.readdirSync(path.join(repoRoot, 'tools/gpu-backend')).map((f) => `tools/gpu-backend/${f}`);
  const loose = [...backend, ...tools].filter((f) => !classified.has(f) && !devTools.has(f));

  assert.deepEqual(
    loose,
    [],
    `unclassified GPU-backend files: ${loose.join(', ')} — add each to hostFiles or policyFiles (src/gpu-backend/compat.ts)`
  );
  for (const f of [...hostFiles, ...policyFiles])
    assert.ok(fs.existsSync(path.join(repoRoot, f)), `${f} is listed but missing`);
  assert.equal(new Set(hostFiles.filter((f) => policyFiles.includes(f))).size, 0, 'a file is in both groups');
});

test('the recorded acceptance re-verifies independently; a tampered pin, digest or evidence file does not', () => {
  if (!fs.existsSync(acceptanceFile)) return; // no accepted evaluator: the official gate itself is closed
  const record = JSON.parse(fs.readFileSync(acceptanceFile, 'utf8'));

  if (record.schema !== 2) return; // the MERGE GATE (policy.test.ts) refuses a schema-1 record
  const verify = (file: string) =>
    spawnSync('tools/gpu-backend/verify-acceptance.sh', ['--record', file], { cwd: repoRoot, encoding: 'utf8' });
  const ok = verify(path.relative(repoRoot, acceptanceFile));

  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /VERIFIED/);

  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-verify-'));

  try {
    const write = (name: string, x: unknown) => {
      fs.writeFileSync(path.join(d, name), JSON.stringify(x));
      return path.join(d, name);
    };
    const pin = structuredClone(record);

    pin.policy.files = pin.policy.files.map((f: { path: string; sha256: string }) =>
      f.path === 'src/gpu-backend/purpose.ts' ? { ...f, sha256: '0'.repeat(64) } : f
    );
    const a = verify(write('pin.json', pin));

    assert.equal(a.status, 1);
    assert.match(a.stdout, /FAIL policy files/);
    const dig = structuredClone(record);

    dig.compat.digest = 'f'.repeat(64);
    const b = verify(write('digest.json', dig));

    assert.equal(b.status, 1);
    assert.match(b.stdout, /FAIL evaluation digest/);
    if (record.evidence.length) {
      const ev = structuredClone(record);

      ev.evidence[0].sha256 = '0'.repeat(64);
      const c = verify(write('evidence.json', ev));

      assert.equal(c.status, 1);
      assert.match(c.stdout, /FAIL evidence files/);
    }
  } finally {
    fs.rmSync(d, { recursive: true, force: true });
  }
});
