// gpu-backend: the GPU ACCEPTANCE RECORD (config/gpu-backend/acceptance.json) — the single file that says a specific
// evaluator build is accepted for official optimization: its status, the compatibility digest of the sources it was
// verified against, the binary's sha256, the compiler and flags, the device (UUID) and driver it was verified on, the
// capability set, and the parity / sanitizer / mini-optimization / reliability evidence (paths and hashes). It is written
// only by an acceptance study (research/gpu-phase2/ for the first one) after every gate passed; it is never edited by
// hand. Without it — or when it no longer matches the working tree (a mirrored CPU source changed), the binary, or the
// device — official optimization is refused (fail closed).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { compatManifest, staleFiles, type CompatManifest } from './compat.ts';
import { repoRoot } from './toolchain.ts';

export const acceptanceFile = path.join(repoRoot, 'config', 'gpu-backend', 'acceptance.json');

export interface AcceptanceRecord {
  kind: 'gpu-backend acceptance';
  schema: 1;
  status: 'ACCEPTED' | 'NOT_ACCEPTED';
  study: string; // the acceptance study (its report states the evidence)
  acceptedAt: string;
  standard: { version: string; sha256: string };
  compat: Pick<CompatManifest, 'digest' | 'cpu' | 'cuda' | 'host' | 'nvcc' | 'nvccFlags' | 'protocolVersion' | 'datasetVersion'>;
  binary: { path: string; sha256: string };
  device: { uuid: string; name: string; driver: string; cc: string };
  capabilities: string; // the supported capability mask (hex)
  domain: { name: string; features: string }; // the official optimization domain the evidence covers
  evidence: { name: string; path: string; sha256: string; pass: boolean }[];
  blockers: string[]; // empty when ACCEPTED
}

export interface AcceptanceCheck {
  ok: boolean;
  status: 'ACCEPTED' | 'NOT_ACCEPTED' | 'MISSING' | 'STALE' | 'INVALID';
  reasons: string[];
  record: AcceptanceRecord | null;
}

const sha256File = (f: string) => createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// Static check (no GPU needed): the record exists, is ACCEPTED, its evidence files are intact and the working tree's
// compatibility digest still equals the one it was verified against. `binary` / `uuid` add the live identity checks.
export const checkAcceptance = (o: { file?: string; binary?: string; uuid?: string } = {}): AcceptanceCheck => {
  const file = o.file ?? acceptanceFile;

  if (!fs.existsSync(file))
    return { ok: false, status: 'MISSING', reasons: [`no GPU acceptance record (${path.relative(repoRoot, file)}): official GPU optimization is blocked until an acceptance study passes every gate`], record: null };

  let r: AcceptanceRecord;

  try {
    r = JSON.parse(fs.readFileSync(file, 'utf8')) as AcceptanceRecord;
  } catch (e) {
    return { ok: false, status: 'INVALID', reasons: [`unreadable acceptance record: ${(e as Error).message}`], record: null };
  }
  const reasons: string[] = [];

  if (r.kind !== 'gpu-backend acceptance' || r.schema !== 1) return { ok: false, status: 'INVALID', reasons: ['not a gpu-backend acceptance record (schema 1)'], record: r };
  if (r.status !== 'ACCEPTED') reasons.push(`status ${r.status}: ${(r.blockers ?? []).join('; ') || 'no reason recorded'}`);

  const stale = staleFiles(r.compat);
  const now = compatManifest();

  if (stale.length) reasons.push(`the GPU evaluator was verified against other sources; changed since acceptance: ${stale.slice(0, 12).join(', ')}${stale.length > 12 ? ` (+${stale.length - 12})` : ''}. Port the change to CUDA, rerun the parity suite on Apollo and regenerate the acceptance record`);
  else if (now.digest !== r.compat.digest) reasons.push(`compatibility digest ${now.digest.slice(0, 16)} ≠ accepted ${r.compat.digest.slice(0, 16)} (a source was added to the mirrored closure)`);
  for (const e of r.evidence ?? []) {
    const f = path.join(repoRoot, e.path);

    if (!e.pass) reasons.push(`evidence ${e.name} did not pass`);
    else if (!fs.existsSync(f)) reasons.push(`evidence ${e.name} missing (${e.path})`);
    else if (sha256File(f) !== e.sha256) reasons.push(`evidence ${e.name} changed since acceptance (${e.path})`);
  }
  if (o.binary) {
    if (!fs.existsSync(o.binary)) reasons.push(`GPU binary ${o.binary} missing`);
    else if (sha256File(o.binary) !== r.binary.sha256) reasons.push(`GPU binary sha256 ${sha256File(o.binary).slice(0, 16)} ≠ accepted ${r.binary.sha256.slice(0, 16)} (a stale or different build)`);
  }
  if (o.uuid && o.uuid !== r.device.uuid) reasons.push(`device ${o.uuid} ≠ the accepted device ${r.device.uuid} (rerun the parity suite on this GPU)`);

  return { ok: reasons.length === 0, status: reasons.length === 0 ? 'ACCEPTED' : r.status !== 'ACCEPTED' ? 'NOT_ACCEPTED' : 'STALE', reasons, record: r };
};
