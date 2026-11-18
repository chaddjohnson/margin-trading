// Shared helpers of the stage runners (tools/vg-l0-risk-metrics/): the study guard (the adoption preflight in code, the
// frozen protocol unchanged), the code digest, and pinned reads of the audited studies' records.
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../../src/research-standard/preflight.ts';
import { STUDY, repoRoot, researchDir, resultsDir } from '../../src/vg-l0-risk-metrics/context.ts';
import { readJson, sha256File, sha256Text } from '../../src/vg-l0-risk-metrics/records.ts';

export const freezeFile = path.join(resultsDir, 'protocol-freeze.json');

// sha256 over the sorted (path, sha256) list of the study's code (src and tools), computed ONCE at process start so that a
// record carries the digest of the code its process started with
const digestAt = () => {
  const files: string[] = [];
  const walk = (d: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const f = path.join(d, e.name);

      if (e.isDirectory()) walk(f);
      else if (f.endsWith('.ts')) files.push(f);
    }
  };

  walk(path.join(repoRoot, 'src', STUDY));
  walk(path.join(repoRoot, 'tools', STUDY));
  files.sort();
  return { digest: sha256Text(files.map((f) => `${path.relative(repoRoot, f)} ${sha256File(f)}`).join('\n')), files: files.length, at: new Date().toISOString() };
};
const startDigest = digestAt();

export const codeDigest = () => startDigest;

// every stage: the adoption preflight in code and the frozen protocol unchanged
export const studyGuard = () => {
  requireStandardAdoption(researchDir, { repoRoot });
  if (!fs.existsSync(freezeFile)) throw new Error('the protocol is not frozen');

  const f = readJson<{ protocol: { sha256: string } }>(freezeFile);
  const now = sha256File(path.join(researchDir, 'PROTOCOL.md'));

  if (now !== f.protocol.sha256) throw new Error(`PROTOCOL.md changed after the freeze (${now})`);
  return f;
};
