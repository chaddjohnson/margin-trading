// gpu-phase5 stage C (PROTOCOL.md §5 item 6): the atomic exporter writes the SAME BYTES as the previous exporter. Every
// door, window, episode and adversarial fixture of the Phase 3 / Phase 4 parity campaigns is exported with the new
// exporter into a fresh directory of this study's cache and its sha256 compared with the sidecar the OLD exporter left
// in research/gpu-phase4/cache and research/gpu-phase3/cache (read only). A second export into the same directory must
// reuse the published file untouched. NON-OFFICIAL; no evaluation.
//   node --experimental-transform-types tools/gpu-phase5/dataset-identity.ts --out <json>
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { type DoorKey, cacheDir, openDoor, repoRoot, writeJson } from '../../src/gpu-phase5/context.ts';
import { fixtureDoor as p4Fixture } from '../../src/gpu-phase4/fixtures.ts';
import { fixtureDoor as p3Fixture } from '../../src/gpu-phase3/fixtures.ts';
import { exportDataset } from '../../src/gpu-backend/dataset.ts';

const args = process.argv.slice(2);
const opt = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1]! : d);
const out = opt('out', '');
const dir = path.join(cacheDir, 'identity');
const old = (study: string, name: string) => {
  const f = path.join(repoRoot, 'research', study, 'cache', `${name}.gb2ds.json`);

  if (!fs.existsSync(f)) return null;
  const x = JSON.parse(fs.readFileSync(f, 'utf8')) as { fileSha256: string; bytes: number; created: string };

  return { sha256: x.fileSha256, bytes: x.bytes, created: x.created };
};
const rows: Record<string, unknown>[] = [];
const check = (name: string, d: ReturnType<typeof exportDataset>, sub: string, refs: [string, ReturnType<typeof old>][]) => {
  const st = fs.statSync(d.file);
  const again = exportDataset.length ? null : null;
  const fileSha = createHash('sha256').update(fs.readFileSync(d.file)).digest('hex');

  void again;
  rows.push({
    name,
    dir: sub,
    sha256: d.sha256,
    fileSha256EqualsReturned: fileSha === d.sha256,
    bytes: st.size,
    published: d.published,
    oldExporter: Object.fromEntries(refs.map(([s, r]) => [s, r ? { sha256: r.sha256, equal: r.sha256 === d.sha256 && r.bytes === st.size, created: r.created } : null])),
    equalsEveryOldExport: refs.filter(([, r]) => r).every(([, r]) => r!.sha256 === d.sha256 && r!.bytes === st.size),
    oldExportsCompared: refs.filter(([, r]) => r).length
  });
};

fs.rmSync(dir, { recursive: true, force: true });
for (const k of ['D19', 'D21', 'D23', 'D24', 'FULL', 'W-QUIET', 'W-CRASH', 'W-BEAR', 'W-TREND', 'E-2020', 'E-2022', 'E-2025'] as DoorKey[]) {
  const door = await openDoor(k, 'gpu-phase5 dataset identity (export only, no evaluation)');
  const d = exportDataset(door, path.join(dir, 'market'));
  const name = path.basename(d.file, '.gb2ds');
  const before = fs.statSync(d.file);
  const d2 = exportDataset(door, path.join(dir, 'market'));
  const after = fs.statSync(d.file);

  check(name, d, 'market', [['gpu-phase4', old('gpu-phase4', name)], ['gpu-phase3', old('gpu-phase3', name)]]);
  Object.assign(rows.at(-1)!, { secondExport: d2.published, untouchedBySecondExport: before.ino === after.ino && before.mtimeMs === after.mtimeMs });
}
// the adversarial fixtures are seeded per study and share their door names: each study's set in its own directory
for (const [study, make] of [['gpu-phase4', p4Fixture], ['gpu-phase3', p3Fixture]] as const)
  for (let s = 0; s < 8; s++) {
    const d = exportDataset(make(s, 420), path.join(dir, `fixtures-${study}`));
    const name = path.basename(d.file, '.gb2ds');

    check(name, d, `fixtures-${study}`, [[study, old(study, name)]]);
  }

const rec = {
  kind: 'gpu-phase5 dataset identity: the atomic exporter against the previous exporter',
  t: new Date().toISOString(),
  datasets: rows.length,
  comparedWithAnOldExport: rows.filter((r) => (r.oldExportsCompared as number) > 0).length,
  oldExportsCompared: rows.reduce((a, r) => a + (r.oldExportsCompared as number), 0),
  rows,
  pass:
    rows.every((r) => r.fileSha256EqualsReturned && r.equalsEveryOldExport && (r.oldExportsCompared as number) > 0) &&
    rows.filter((r) => r.dir === 'market').every((r) => r.published === 'created' && r.secondExport === 'reused' && r.untouchedBySecondExport)
};

if (out) writeJson(out, rec);
console.log(JSON.stringify({ datasets: rec.datasets, oldExportsCompared: rec.oldExportsCompared, pass: rec.pass, bad: rows.filter((r) => !r.equalsEveryOldExport || !(r.oldExportsCompared as number)).map((r) => r.name) }));
process.exitCode = rec.pass ? 0 : 2;
