// RES-A 1.0.0 stage S1b — the pilot's union qualification of one cutoff, replayed from a COPY of the official qualification
// archive with ZERO evaluations (PROTOCOL.md §3, §4 A1 / A4):
//   1. the frozen qualification (src/vg-l0-risk-envelope-pilot/qualify.ts qualifyMembers, the same members from the sealed
//      search records: stages.ts membersOf) is re-run over a Lab whose pool refuses every evaluation; its evidence must
//      equal the sealed qualification evidence (after the pilot's own per-lot row drop), or the audit stops;
//   2. every member's pooled confirmation family (3 × 128, de-duplicated as pooledStats does) and selection family
//      (2 × 128) are read back draw by draw, so every policy's breach counts, excess magnitudes and p90s can be computed on
//      exactly the draws the pilot used.
// Output (git-ignored intermediate): .cache/vg-l0-risk-envelope-sensitivity/qualification-<cut>.json.gz
//   GPU_POLICY_PURPOSE=diagnostic node --no-maglev --experimental-transform-types tools/vg-l0-risk-envelope-sensitivity/qualification.ts --cutoff C21
import path from 'node:path';
import { deepDiff } from '../../src/gpu-phase1/compare.ts';
import { setQuiet as setA3Quiet } from '../../src/vg-l0-full-joint/context.ts';
import { vOptions } from '../../src/vg-l0-full-joint/nl0.ts';
import { cfgId } from '../../src/vg-l0-full-joint/space.ts';
import type { SRec } from '../../src/vg-l0-full-joint/evaluate.ts';
import { drawsOf, famOf } from '../../src/vg-l0-full-joint/qualify.ts';
import { fidelity, pooledStats } from '../../src/vg-l0-risk-families/qualify.ts';
import { checkEnvelope } from '../../src/gpu-backend/lab.ts';
import { type CutoffKey, cutoffs } from '../../src/vg-l0-risk-envelope-pilot/context.ts';
import { type Evidence, qualifyMembers } from '../../src/vg-l0-risk-envelope-pilot/qualify.ts';
import { membersOf, qualificationFile, sealedEvidence } from '../../src/vg-l0-risk-envelope-pilot/stages.ts';
import { plain, readSealed } from '../../src/vg-l0-risk-envelope-pilot/records.ts';
import { archiveCopy, cacheRoot, purposeOf, replayLab, sha256File, utc, writeJsonGz } from './common.ts';

purposeOf(['diagnostic']);
setA3Quiet(true);

const args = process.argv.slice(2);
const cut = args[args.indexOf('--cutoff') + 1] as CutoffKey;

if (!cutoffs[cut]) throw new Error('--cutoff C21|C24');

const t0 = Date.now();
const job = `${cut}-qualify`;
const archiveSha256AtStart = sha256File(archiveCopy(job));
const sealed = readSealed<{ evidence: Evidence[]; backend: string; codeDigest: string; requested: number; members: number }>(qualificationFile(cut));
const lab = await replayLab(cut, job, { backend: sealed.backend, codeDigest: sealed.codeDigest });
const { members } = membersOf(cut);

if (members.length !== sealed.evidence.length) throw new Error(`${cut}: ${members.length} members ≠ ${sealed.evidence.length} sealed`);

// 1. the frozen qualification, replayed
const { evidence, requested } = await qualifyMembers(lab, members, cut);

if (lab.fresh !== 0) throw new Error(`${cut}: the qualification replay computed ${lab.fresh} evaluations`);

const diffs = deepDiff(plain(evidence.map(sealedEvidence)), sealed.evidence, '$', [], 40);

if (diffs.length) throw new Error(`${cut}: replayed qualification evidence ≠ sealed at ${diffs.map((d) => d.path).join(', ')}`);
if (requested !== sealed.requested) throw new Error(`${cut}: requested ${requested} ≠ sealed ${sealed.requested}`);
console.log(`[${utc()}] ${cut}: qualification replay = sealed evidence (${evidence.length} members, ${requested} requested, 0 fresh)`);

// 2. the draws, member by member (exactly qualifyMembers's families and pooledStats's de-duplication)
const compact = (r: SRec) => {
  if (r.error) return { error: String(r.error) };

  const e = checkEnvelope((r as SRec & { envelope?: unknown }).envelope, 'draw');

  return { net: r.net, dd: r.dd, plL: e.principalLossLiquidation, plM: e.principalLossMarked, bdL: e.bankedDdLiquidation, bdM: e.bankedDdMarked, lots: r.lots, signature: r.signature, mixed: r.mixed };
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

  // the pooled families must reproduce the sealed statistics exactly
  const check = deepDiff(plain({ c: confirm.nb, s: select.nb }), plain({ c: e.confirm, s: e.select }), '$', [], 5);

  if (check.length) throw new Error(`${cut} ${m.label}: pooled family statistics ≠ sealed (${check.map((d) => d.path).join(', ')})`);
  rows.push({
    id: cfgId(m.cfg),
    label: e.label,
    shortlistedBy: e.shortlistedBy,
    confirm: { drawn: confirm.drawn, unique: confirm.unique, draws: confirm.recs.map((r) => compact(r as SRec)) },
    select: { drawn: select.drawn, unique: select.unique, draws: select.recs.map((r) => compact(r as SRec)) }
  });
}
if (lab.fresh !== 0) throw new Error(`${cut}: the draw reads computed ${lab.fresh} evaluations`);

const out = {
  kind: 'RES-A 1.0.0 qualification draws (archive replay; zero evaluations)',
  cutoff: cut,
  archive: { copy: path.relative(cacheRoot, archiveCopy(job)), sha256AtStart: archiveSha256AtStart },
  binding: { backend: sealed.backend, codeDigest: sealed.codeDigest },
  reproduction: { members: evidence.length, requested, sealedRequested: sealed.requested, evidenceIdentical: true, pooledStatisticsIdentical: true },
  compute: { fresh: lab.fresh, archiveHits: lab.hits },
  members: rows,
  seconds: Math.round((Date.now() - t0) / 1000),
  finished: utc()
};

await lab.close('audit-qualification-end');

const file = path.join(cacheRoot, `qualification-${cut}.json.gz`);
const sha = writeJsonGz(file, out);

console.log(JSON.stringify({ cut, members: rows.length, fresh: lab.fresh, hits: lab.hits, file: path.relative(cacheRoot, file), sha256: sha, seconds: out.seconds }));
