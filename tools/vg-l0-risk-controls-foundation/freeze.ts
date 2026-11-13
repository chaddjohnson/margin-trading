// S1: the protocol freeze (PROTOCOL.md §14), written once before any real-data run.
import fs from 'node:fs';
import path from 'node:path';
import { codeDigest as p3Digest } from '../../src/vg-d1-growth-joint/lab.ts';
import { doorSpecs } from '../../src/vg-d1-growth-joint/context.ts';
import { head, now, rel, repoRoot, seal, sha256File, studyDir } from './common.ts';

const files = (dir: string) =>
  fs
    .readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith('.ts'))
    .map((d) => path.join(d.parentPath, d.name))
    .sort();
const p = (f: string) => path.join(studyDir, f);

seal(
  'protocol-freeze.json',
  {
    kind: 'vg-l0-risk-controls-foundation protocol freeze',
    frozenAt: now(),
    head: head(),
    protocol: { file: rel(p('PROTOCOL.md')), sha256: sha256File(p('PROTOCOL.md')) },
    amendments: { file: rel(p('AMENDMENTS.md')), sha256: sha256File(p('AMENDMENTS.md')) },
    brief: { file: rel(p('brief/BRIEF.md')), sha256: sha256File(p('brief/BRIEF.md')) },
    specification: { file: rel(p('SPECIFICATION.md')), sha256: sha256File(p('SPECIFICATION.md')) },
    adoption: { file: rel(p('STANDARD_ADOPTION.json')), sha256: sha256File(p('STANDARD_ADOPTION.json')) },
    standard: { file: 'docs/research/OPTIMIZATION_STANDARD.md', sha256: sha256File(path.join(repoRoot, 'docs/research/OPTIMIZATION_STANDARD.md')) },
    code: Object.fromEntries(files(path.join(repoRoot, 'src/d1-risk-controls')).map((f) => [rel(f), sha256File(f)])),
    tools: Object.fromEntries(files(path.join(repoRoot, 'tools/vg-l0-risk-controls-foundation')).map((f) => [rel(f), sha256File(f)])),
    sealedDigests: {
      priority3: '147cad7c17eff3fa50442d2cb0ffb9c22cb7ba5091a46d1e14d3351d5cff4e88',
      p5b: '3f902532b651da1939f67d650d381bcf1e27ad3b76b3f2dedef95403fba23e3b',
      shadow: '54304b69941e0481d5d36d52c30e76e724596dadd803c6e41489a3633e8c878e'
    },
    priority3DigestNow: p3Digest(),
    doors: Object.fromEntries(Object.entries(doorSpecs).map(([k, v]) => [k, { last: v.last, sessions: v.sessions, pins: v.pins }])),
    canonical: {
      GDX: { file: 'data/GDX/data.csv', sha256: sha256File(path.join(repoRoot, 'data/GDX/data.csv')) },
      VGT: { file: 'data/VGT/data.csv', sha256: sha256File(path.join(repoRoot, 'data/VGT/data.csv')) }
    }
  },
  'S1 freeze'
);
