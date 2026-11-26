// TSLA outcome identity fix — a read-only FINGERPRINT of everything the fix must not change: the git trees of the
// research/ namespace and of the studies and apps around it, the sealed TSLA records (every seals.jsonl entry: sha256
// and read-only mode), the TSLA code digest and whether the study's official stages would now refuse (fail closed), and
// the GPU evaluation (compat) digest with its CPU / CUDA / host groups. It evaluates nothing and writes nothing.
//   node --no-maglev --experimental-transform-types --disable-warning=ExperimentalWarning \
//     tools/tsla-outcome-identity-fix/fingerprint.ts > <file>
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { compatManifest } from '../../src/gpu-backend/compat.ts';
import { freezeFile } from '../../src/tsla-d1-growth/context.ts';
import { codeDigest, codeFiles, readJson } from '../../src/tsla-d1-growth/records.ts';
import { allowedCodeDigests } from '../../src/tsla-d1-growth/stages.ts';

const repo = path.resolve(import.meta.dirname, '../..');
const sha = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git = (...a: string[]) => execFileSync('git', a, { cwd: repo, encoding: 'utf8' }).trim();

const seals = fs
  .readFileSync(path.join(repo, 'research/tsla-d1-growth/results/seals.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l) as { file: string; sha256: string });
const sealsBad = seals
  .filter((s) => {
    const f = path.join(repo, s.file);

    return !(fs.existsSync(f) && sha(f) === s.sha256 && (fs.statSync(f).mode & 0o222) === 0);
  })
  .map((s) => s.file);

const files = [
  'research/tsla-d1-growth/results/outcome.json',
  'research/tsla-d1-growth/FROZEN_SELECTION.json',
  'research/tsla-d1-growth/results/validation/validation.json',
  'research/tsla-d1-growth/results/sequential.json',
  'research/tsla-d1-growth/results/seals.jsonl',
  'research/tsla-d1-growth/results/protocol-freeze.json',
  'research/tsla-d1-growth/reports/tables/outcome-join.json',
  'research/tsla-d1-growth/PROTOCOL.md',
  'research/tsla-d1-growth/AMENDMENTS.md',
  'research/tsla-d1-growth/bundle/tsla-d1-growth-handoff.zip',
  'config/gpu-backend/acceptance.json',
  'src/tsla-d1-growth/outcome.ts',
  'tools/tsla-d1-growth/outcome-join.py'
];
const trees = [
  'research',
  'research/tsla-d1-growth',
  'research/vg-l0-n-successor',
  'src/tsla-d1-growth',
  'tools/tsla-d1-growth',
  'apps/strategy-lab',
  'src/gpu-backend',
  'config/gpu-backend'
];
const frozen = readJson<{ codeDigest: string }>(freezeFile).codeDigest;
const chain = allowedCodeDigests(frozen);
const digest = codeDigest();
const m = compatManifest();
const evaluationPaths = [...m.cpu.files, ...m.cuda.files, ...m.host.files].map((f) => f.path);

console.log(
  JSON.stringify(
    {
      head: git('rev-parse', 'HEAD'),
      branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
      dirty: git('status', '--porcelain').split('\n').filter(Boolean),
      trees: Object.fromEntries(trees.map((p) => [p, git('rev-parse', `HEAD:${p}`)])),
      workingTreeDiffUnderResearch: git('status', '--porcelain', '--', 'research').split('\n').filter(Boolean),
      files: Object.fromEntries(
        files.map((f) => [f, fs.existsSync(path.join(repo, f)) ? sha(path.join(repo, f)) : null])
      ),
      sealedTsla: { total: seals.length, ok: seals.length - sealsBad.length, bad: sealsBad },
      tslaCodeDigest: digest,
      tslaCodeFiles: codeFiles().length,
      tslaCodeClosureOutcomeFiles: codeFiles().filter((f) => f.includes('outcome')),
      tslaFrozenDigestChain: chain,
      tslaOfficialStagesWouldRefuse: !chain.includes(digest),
      gpuCompatDigest: m.digest,
      gpuGroups: { cpu: m.cpu.digest, cuda: m.cuda.digest, host: m.host.digest },
      gpuEvaluationFiles: evaluationPaths.length,
      gpuEvaluationClosureTouchesFix: evaluationPaths.filter(
        (p) => p.includes('tsla') || p.includes('research-outcome')
      )
    },
    null,
    1
  )
);
