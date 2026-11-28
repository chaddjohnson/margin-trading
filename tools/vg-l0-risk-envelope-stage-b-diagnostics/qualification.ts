// RES-BD 1.0.0 — Stage B's union qualification of one cutoff, replayed from a sha256-verified COPY of the official
// qualification archive with ZERO evaluations (PROTOCOL.md §3.3; Stage A's established method,
// tools/vg-l0-risk-envelope-sensitivity/qualification.ts, on Stage B's modules):
//   1. Stage B's frozen qualification (src/vg-l0-risk-envelope-stage-b/qualify.ts qualifyMembers, members from the sealed
//      search: stages.ts membersOf) is re-run over a Lab whose pool refuses every evaluation; its evidence must equal the
//      sealed evidence (sealedEvidence form, compared in the store's encoding) and its requested count the sealed one;
//   2. every member's confirmation family (3 × 128) and selection family (2 × 128) are regenerated (drawsOf / famOf,
//      labels (kind, rep, cutoff)) and read back draw by draw; pooledStats must reproduce the sealed family statistics;
//   3. every member's archived official GPU centre record (vOptions, risk) is kept for Diagnostic B's bit-for-bit
//      parity check.
// Output (git-ignored intermediate): .cache/vg-l0-risk-envelope-stage-b-diagnostics/qualification-<cut>.json.gz
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/…/qualification.ts --cutoff C21
import fs from 'node:fs';
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { checkEnvelope } from '../../src/gpu-backend/lab.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { cfgId } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import { fidelity, pooledStats } from '../../src/vg-l0-risk-families/qualify.ts';
import { type CutoffKey, cutoffs, setQuiet } from '../../src/vg-l0-risk-envelope-stage-b/context.ts';
import { type Evidence, qualifyMembers, sealedEvidence } from '../../src/vg-l0-risk-envelope-stage-b/qualify.ts';
import { membersOf, qualificationFile } from '../../src/vg-l0-risk-envelope-stage-b/stages.ts';
import { plain, readSealed } from '../../src/vg-l0-risk-envelope-stage-b/records.ts';
import { archiveCopy, archiveOriginal, baselineOf, cacheRoot, purposeOf, repoRoot, replayLab, sha256Stream, utc, writeJsonGz } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);
setQuiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C19|C21|C24');

const t0 = Date.now();
const job = `${cut}-qualify`;
const expect = baselineOf(job);

if ((await sha256Stream(archiveOriginal(job))) !== expect) throw new Error(`${job}: the original differs from its baseline`);
if ((await sha256Stream(archiveCopy(job))) !== expect) throw new Error(`${job}: the copy differs from the baseline`);

const sealed = readSealed<{ evidence: Evidence[]; backend: string; codeDigest: string; requested: number; members: number; door: string }>(qualificationFile(cut));
const { lab, calls } = await replayLab(cut, job, { backend: sealed.backend, codeDigest: sealed.codeDigest });
const rowsAtOpen = lab.store.count('points');
const { members } = membersOf(cut);

if (members.length !== sealed.evidence.length || members.length !== sealed.members) throw new Error(`${cut}: ${members.length} members ≠ ${sealed.evidence.length} sealed`);

// 1. the frozen qualification, replayed
const { evidence, requested } = await qualifyMembers(lab, members, cut);

if (lab.fresh !== 0 || calls.run !== 0) throw new Error(`${cut}: the qualification replay computed ${lab.fresh} evaluations / called the pool ${calls.run} times`);

const diffs = deepDiff(sealed.evidence, plain(evidence.map(sealedEvidence)), '$', [], 40);

if (diffs.length) throw new Error(`${cut}: replayed qualification evidence ≠ sealed at ${diffs.map((d) => d.path).join(', ')}`);
if (requested !== sealed.requested) throw new Error(`${cut}: requested ${requested} ≠ sealed ${sealed.requested}`);
console.log(`[${utc()}] ${cut}: qualification replay = sealed evidence (${evidence.length} members, ${requested} requested, 0 fresh)`);

// 2. the draws and 3. the archived GPU centre records
const compact = (r: SRec) => {
  if (r.error) return { error: String(r.error) };

  const e = checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'draw');

  return { net: r.net, dd: r.dd, plL: e.principalLossLiquidation, plM: e.principalLossMarked, bdL: e.bankedDdLiquidation, bdM: e.bankedDdMarked, lots: r.lots, mixed: r.mixed, signature: r.signature };
};
const rows = [];

for (const m of members) {
  const fam = async (kind: 'select' | 'confirm', reps: number) => {
    const fams = [];

    for (let rep = 1; rep <= reps; rep++) {
      const draws = drawsOf(m.cfg, famOf(kind, [kind, rep, cut]));
      const recs = (await lab.evalMany(draws.map((x) => ({ cfg: x.cfg, options: vOptions, risk: true })), `audit ${kind}`)) as SRec[];

      fams.push({ draws, recs });
    }
    return fams;
  };
  const [centre] = (await lab.evalMany([{ cfg: m.cfg, options: vOptions, risk: true }], 'audit centre')) as SRec[];
  const confirm = pooledStats(centre!, await fam('confirm', fidelity.confirmReps));
  const select = pooledStats(centre!, await fam('select', fidelity.selectReps));
  const e = sealed.evidence.find((x) => x.id === cfgId(m.cfg))!;
  const check = deepDiff(plain({ c: e.confirm, ct: e.confirmTail, s: e.select }), plain({ c: confirm.nb, ct: confirm.tail, s: select.nb }), '$', [], 5);

  if (check.length) throw new Error(`${cut} ${m.label}: pooled family statistics ≠ sealed (${check.map((d) => d.path).join(', ')})`);
  rows.push({
    id: cfgId(m.cfg),
    label: e.label,
    shortlistedBy: e.shortlistedBy,
    centreGpu: centre,
    confirm: { drawn: confirm.drawn, unique: confirm.unique, draws: confirm.recs.map((r) => compact(r as SRec)) },
    select: { drawn: select.drawn, unique: select.unique, draws: select.recs.map((r) => compact(r as SRec)) }
  });
}
if (lab.fresh !== 0 || calls.run !== 0) throw new Error(`${cut}: the draw reads computed ${lab.fresh} evaluations / called the pool ${calls.run} times`);

const rowsAtClose = lab.store.count('points');

if (rowsAtClose !== rowsAtOpen) throw new Error(`${cut}: the qualification copy's row count changed`);

const out = {
  kind: 'RES-BD 1.0.0 qualification replay and draws (Stage B qualification archive; zero evaluations)',
  cutoff: cut,
  door: cutoffs[cut].door,
  archive: { original: path.relative(repoRoot, archiveOriginal(job)), copy: path.relative(repoRoot, archiveCopy(job)), sha256: expect, rows: rowsAtOpen },
  binding: { backend: sealed.backend, codeDigest: sealed.codeDigest },
  reproduction: { members: evidence.length, requested, sealedRequested: sealed.requested, evidenceIdentical: true, pooledStatisticsIdentical: true },
  zeroEvaluations: { fresh: lab.fresh, refusingPoolCalls: calls.run, archiveHits: lab.hits, rowsAtOpen, rowsAtClose },
  members: rows,
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: utc()
};

await lab.close('qualification-replay-end');

if ((await sha256Stream(archiveOriginal(job))) !== expect) throw new Error(`${job}: the ORIGINAL archive changed`);

const file = path.join(cacheRoot, `qualification-${cut}.json.gz`);

fs.mkdirSync(cacheRoot, { recursive: true });

const sha = writeJsonGz(file, out);

console.log(JSON.stringify({ cut, members: rows.length, requested, fresh: lab.fresh, refusals: calls.run, hits: lab.hits, file: path.relative(repoRoot, file), sha256: sha, seconds: out.seconds }));
