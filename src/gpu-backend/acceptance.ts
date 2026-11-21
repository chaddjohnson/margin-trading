// gpu-backend: the GPU ACCEPTANCE RECORD (config/gpu-backend/acceptance.json) — the single file that says a specific
// evaluator build is accepted for official optimization: its status, the compatibility digest of the evaluation sources
// it was verified against (the CPU closure, CUDA, the host path), the enforcement and acceptance machinery it was
// verified with (the policy group, every file pinned), the Git revision whose files these are, the binary's sha256, the
// compiler and flags, the device (UUID) and driver it was verified on, the capability set, and the parity / sanitizer /
// optimizer / reliability / enforcement evidence (paths and hashes). It is written only by an acceptance study's
// generator after every gate passed; it is never edited by hand. Without it — or when it no longer matches the working
// tree (an evaluation source or an enforcement file changed), the Git history (the accepted revision is not an ancestor
// of HEAD), the binary, or the device — official optimization is refused (fail closed).
//
// Schema 2 (GPU Phase 3) adds the policy group and the source revision; a schema-1 record (Phase 2) does not pin the
// enforcement code and is refused as INVALID. What these checks are NOT: a signature. Anyone who can commit can rewrite
// a file and its pin together; the root of trust is the reviewed Git history (research/gpu-phase3/
// GPU_ENFORCEMENT_INTEGRITY.md), and tools/gpu-backend/verify-acceptance.sh re-verifies a record without this module.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { type CompatManifest, type Group, compatManifest, groupDigest, policyFiles, staleFiles } from './compat.ts';
import { repoRoot } from './toolchain.ts';

// ENFORCEMENT FILES OUTSIDE src/gpu-backend/ (GPU Phase 6): the job isolation module that the official gate and the
// Lab rely on (src/gpu-jobs/: who may own a job, its dataset cache). It is enforcement, not evaluation — it never
// changes a request or a result — and it is pinned by the acceptance record like policyFiles: a record that does not pin
// these files is refused, and any change to them makes the acceptance STALE (docs/gpu/PARITY_CHECKLIST.md §2a). They are
// listed here rather than in compat.ts because compat.ts belongs to the evaluation digest compiled into the binary.
export const ENFORCEMENT_EXTRAS = [
  'src/gpu-jobs/jobs.ts',
  'src/gpu-jobs/lock.ts',
  'src/gpu-jobs/cli.ts',
  'src/gpu-jobs/tests/jobs.test.ts',
  'src/gpu-jobs/tests/jobChild.ts'
];
// every enforcement file an acceptance record of this tree must pin
export const requiredPolicyFiles = () => [...policyFiles, ...ENFORCEMENT_EXTRAS];

export const acceptanceFile = path.join(repoRoot, 'config', 'gpu-backend', 'acceptance.json');
export const ACCEPTANCE_SCHEMA = 2;

export interface AcceptanceRecord {
  kind: 'gpu-backend acceptance';
  schema: 2;
  status: 'ACCEPTED' | 'NOT_ACCEPTED';
  study: string; // the acceptance study (its report states the evidence)
  acceptedAt: string;
  standard: { version: string; sha256: string };
  compat: Pick<
    CompatManifest,
    'digest' | 'cpu' | 'cuda' | 'host' | 'nvcc' | 'nvccFlags' | 'protocolVersion' | 'datasetVersion' | 'version'
  >;
  policy: Group & { generator: string }; // the enforcement and acceptance machinery, and the generator of this record
  source: { commit: string; tree: string; branch: string }; // the Git revision whose files were verified
  hostPath: { defaultWorkers: number; modes: string[] };
  binary: { path: string; sha256: string };
  device: { uuid: string; name: string; driver: string; cc: string };
  capabilities: string; // the supported capability mask (hex)
  domain: { name: string; features: string }; // the official optimization domain the evidence covers
  // the JavaScript engine configuration the evidence was produced under and official runs must use (runtime.ts; from
  // GPU Phase 5 — absent in earlier records)
  runtime?: {
    node: string;
    v8: string;
    maglev: string;
    execArgv: string[];
    requiredOptions: string[];
    enforcedBy: string;
  };
  evidence: { name: string; path: string; sha256: string; pass: boolean }[];
  blockers: string[]; // empty when ACCEPTED
  supersedes: { study: string; acceptedAt: string; sha256: string } | null;
}

export interface AcceptanceCheck {
  ok: boolean;
  status: 'ACCEPTED' | 'NOT_ACCEPTED' | 'MISSING' | 'STALE' | 'INVALID';
  reasons: string[];
  record: AcceptanceRecord | null;
}

const sha256File = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const git = (...args: string[]) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });

// Static check (no GPU needed): the record exists, has schema 2, is ACCEPTED, its evidence files are intact, every
// evaluation and enforcement file it pins is unchanged in the working tree, it pins every enforcement file this tree
// requires, and its source revision is an ancestor of HEAD. `binary` / `uuid` add the live identity checks.
export const checkAcceptance = (o: { file?: string; binary?: string; uuid?: string } = {}): AcceptanceCheck => {
  const file = o.file ?? acceptanceFile;

  if (!fs.existsSync(file))
    return {
      ok: false,
      status: 'MISSING',
      reasons: [
        `no GPU acceptance record (${path.relative(repoRoot, file)}): official GPU optimization is blocked until an acceptance study passes every gate`
      ],
      record: null
    };

  let r: AcceptanceRecord;

  try {
    r = JSON.parse(fs.readFileSync(file, 'utf8')) as AcceptanceRecord;
  } catch (e) {
    return {
      ok: false,
      status: 'INVALID',
      reasons: [`unreadable acceptance record: ${(e as Error).message}`],
      record: null
    };
  }
  const reasons: string[] = [];

  if (r.kind !== 'gpu-backend acceptance')
    return { ok: false, status: 'INVALID', reasons: ['not a gpu-backend acceptance record'], record: r };
  if (r.schema !== ACCEPTANCE_SCHEMA || !r.policy?.files || !r.source?.commit)
    return {
      ok: false,
      status: 'INVALID',
      reasons: [
        `acceptance schema ${r.schema} does not pin the enforcement code and the source revision (schema ${ACCEPTANCE_SCHEMA} required): regenerate it with an acceptance study`
      ],
      record: r
    };
  if (r.status !== 'ACCEPTED')
    reasons.push(`status ${r.status}: ${(r.blockers ?? []).join('; ') || 'no reason recorded'}`);

  const evalStale = staleFiles({ cpu: r.compat.cpu, cuda: r.compat.cuda, host: r.compat.host });
  const policyStale = staleFiles({
    cpu: { files: [], digest: '' },
    cuda: { files: [], digest: '' },
    host: { files: [], digest: '' },
    policy: r.policy
  });
  const now = compatManifest();
  const list = (x: string[]) => `${x.slice(0, 12).join(', ')}${x.length > 12 ? ` (+${x.length - 12})` : ''}`;

  if (evalStale.length)
    reasons.push(
      `the GPU evaluator was verified against other sources; changed since acceptance: ${list(evalStale)}. Port the change to CUDA, rerun the parity suite on Apollo and regenerate the acceptance record`
    );
  else if (now.digest !== r.compat.digest)
    reasons.push(
      `compatibility digest ${now.digest.slice(0, 16)} ≠ accepted ${r.compat.digest.slice(0, 16)} (a source was added to the mirrored closure or the host path)`
    );
  if (policyStale.length)
    reasons.push(
      `the enforcement code changed since acceptance: ${list(policyStale)}. Re-verify the enforcement (docs/gpu/PARITY_CHECKLIST.md §2a) and regenerate the acceptance record`
    );

  const pinned = new Set(r.policy.files.map((f) => f.path));
  const unpinned = requiredPolicyFiles().filter((f) => !pinned.has(f));

  if (unpinned.length)
    reasons.push(`the acceptance does not pin enforcement file(s) this tree requires: ${list(unpinned)}`);
  if (groupDigest(r.policy.files) !== r.policy.digest)
    reasons.push('the policy group digest does not match its own file list');
  if (!pinned.has(r.policy.generator)) reasons.push(`the record's generator ${r.policy.generator} is not pinned`);

  const anc = git('merge-base', '--is-ancestor', r.source.commit, 'HEAD');

  if (anc.error || anc.status !== 0)
    reasons.push(
      `the accepted source revision ${r.source.commit.slice(0, 12)} is not an ancestor of HEAD (${anc.error ? `git unavailable: ${anc.error.message}` : anc.stderr.trim() || 'not in this history'})`
    );

  for (const e of r.evidence ?? []) {
    const f = path.join(repoRoot, e.path);

    if (!e.pass) reasons.push(`evidence ${e.name} did not pass`);
    else if (!fs.existsSync(f)) reasons.push(`evidence ${e.name} missing (${e.path})`);
    else if (sha256File(f) !== e.sha256) reasons.push(`evidence ${e.name} changed since acceptance (${e.path})`);
  }
  if (o.binary) {
    if (!fs.existsSync(o.binary)) reasons.push(`GPU binary ${o.binary} missing`);
    else if (sha256File(o.binary) !== r.binary.sha256)
      reasons.push(
        `GPU binary sha256 ${sha256File(o.binary).slice(0, 16)} ≠ accepted ${r.binary.sha256.slice(0, 16)} (a stale or different build)`
      );
  }
  if (o.uuid && o.uuid !== r.device.uuid)
    reasons.push(`device ${o.uuid} ≠ the accepted device ${r.device.uuid} (rerun the parity suite on this GPU)`);

  return {
    ok: reasons.length === 0,
    status: reasons.length === 0 ? 'ACCEPTED' : r.status !== 'ACCEPTED' ? 'NOT_ACCEPTED' : 'STALE',
    reasons,
    record: r
  };
};

// The pinned files (evaluation and enforcement) that differ from HEAD's committed content: an official run starts only
// from committed, unmodified pinned files (its attestation names the commit).
export const uncommittedPinnedFiles = (r: AcceptanceRecord) => {
  const files = [r.compat.cpu, r.compat.cuda, r.compat.host, r.policy].flatMap((g) => g.files.map((f) => f.path));
  const d = git('status', '--porcelain', '--', ...files);

  if (d.error || d.status !== 0) return [`git unavailable (${d.error?.message ?? d.stderr.trim()})`];
  return d.stdout.split('\n').filter(Boolean);
};

export const headCommit = () => git('rev-parse', 'HEAD').stdout.trim();
