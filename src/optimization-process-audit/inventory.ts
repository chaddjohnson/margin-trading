// Stage 1 inventory (PROTOCOL.md §5.1): archive completeness and provenance, counts by promotion stage and structural
// group, training metrics available per stage, duplicate ledgers, and the eligible sets with their training-only
// evidence. No next-period outcome is read or ranked. Also writes SOURCE_MANIFEST.json (sealed).
import fs from 'node:fs';
import path from 'node:path';
import {
  type HistCut,
  allCuts,
  codeDir,
  freezeFile,
  histCuts,
  log,
  r2,
  researchDir,
  stageFile
} from './context.ts';
import { assertCommitted, codeDigest, readJson, rel, sealJson, sha256File } from './records.ts';
import { type ScanRow, readScan, scanFile } from './scan.ts';
import { type SubjectKey, sources, subjectKeys, subjectSeals } from './sources.ts';
import { Archive, activeInputsOf, confOfEvidence, eligibleSet, independentSet, selectionOf } from './subjects.ts';

export type Stage = 'S' | 'R3' | 'R2' | 'F' | 'P' | 'U' | 'M';
export const stageOrder: Stage[] = ['S', 'R3', 'R2', 'F', 'P', 'U', 'M'];
export const stageLabel: Record<Stage, string> = {
  S: 'shortlisted (qualification set)',
  R3: 'rung 3, not shortlisted',
  R2: 'rung 2, not promoted to rung 3',
  F: 'rung-1 feasible, not promoted to rung 2',
  P: 'centre plausible, rung-1 infeasible',
  U: 'centre implausible (screened out)',
  M: 'centre plausible, rung-1 family not archived (unmeasured)'
};

interface LaneRec {
  key: string;
  shortlist: { id: string }[];
  r2: { id: string }[];
  r3: { id: string }[];
}

export const laneSets = (s: SubjectKey, cut: HistCut) => {
  const rec = readJson<{ lanes: LaneRec[] }>(sources[s].searchRecord(cut));
  const S = new Set<string>();
  const R3 = new Set<string>();
  const R2 = new Set<string>();

  for (const l of rec.lanes) {
    for (const x of l.shortlist) S.add(x.id);
    for (const x of l.r3) R3.add(x.id);
    for (const x of l.r2) R2.add(x.id);
  }

  return { S, R3, R2 };
};

export const stageOf = (r: ScanRow, sets: ReturnType<typeof laneSets>): Stage => {
  if (sets.S.has(r.id)) return 'S';
  if (sets.R3.has(r.id)) return 'R3';
  if (sets.R2.has(r.id)) return 'R2';
  if (!r.plausible) return 'U';
  if (r.rung === null) return 'M';
  return r.feasible ? 'F' : 'P';
};

const q = (xs: number[], p: number) => {
  if (!xs.length) return null;

  const s = [...xs].sort((a, b) => a - b);
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);

  return r2(s[lo]! + (s[Math.min(lo + 1, s.length - 1)]! - s[lo]!) * (i - lo));
};

const summaryOf = (rows: ScanRow[]) => ({
  n: rows.length,
  distinctLedgers: new Set(rows.map((r) => r.signature)).size,
  net: { p50: q(rows.map((r) => r.net), 0.5), p90: q(rows.map((r) => r.net), 0.9), max: q(rows.map((r) => r.net), 1) },
  dd: { p50: q(rows.map((r) => r.dd), 0.5) },
  lots: { p50: q(rows.map((r) => r.lots), 0.5) },
  episodes: { p50: q(rows.map((r) => r.episodes), 0.5) },
  topEpisodeShare: { p50: q(rows.filter((r) => r.topEpisodeShare !== null).map((r) => r.topEpisodeShare!), 0.5) },
  exBestYear: { p50: q(rows.map((r) => r.exBestYear), 0.5) },
  r1Robust: { p50: q(rows.filter((r) => r.nb).map((r) => r.nb!.robust), 0.5) },
  r1P90Dd: { p50: q(rows.filter((r) => r.nb).map((r) => r.nb!.p90Dd), 0.5) },
  r1Distinct: { p50: q(rows.filter((r) => r.nb).map((r) => r.nb!.distinct), 0.5) },
  r1SameAsCentre: { p50: q(rows.filter((r) => r.nb).map((r) => r.nb!.sameAsCentre), 0.5) }
});

export const runInventory = async () => {
  assertCommitted(freezeFile);
  if (fs.existsSync(stageFile.inventory)) throw new Error(`${rel(stageFile.inventory)} is sealed`);

  const freeze = readJson<{ subjects: Record<SubjectKey, { archives: { file: string; sha256: string }[] }> }>(freezeFile);
  const subjects: Record<string, unknown> = {};

  for (const s of subjectKeys) {
    const src = sources[s];
    const perCut: Record<string, unknown> = {};

    for (const cut of allCuts) {
      const sel = selectionOf(s, cut);
      const indep = independentSet(s, cut);
      const elig = eligibleSet(s, cut);
      const roles = sel.roles.independent!.roles;
      const roleOf = (label: string) => Object.entries(roles).filter(([, l]) => l === label).map(([r]) => r);
      const profitRank = [...elig].sort((a, b) => b.centre.net - a.centre.net);
      const robustRank = [...elig].sort((a, b) => b.select.robust - a.select.robust);
      const archives = [src.searchJob(cut), src.qualifyJob(cut)].map((f) => {
        const a = new Archive(f);
        const pin = freeze.subjects[s].archives.find((x) => x.file === rel(f))!;
        const out = { file: rel(f), sha256: pin.sha256, binding: a.meta(), points: a.count('points'), configs: a.count('configs') };

        a.close();
        return out;
      });
      let funnel: unknown = null;

      if (cut !== 'C24') {
        const rows = readScan(s, cut as HistCut);
        const sets = laneSets(s, cut as HistCut);
        const byStage: Record<string, ScanRow[]> = {};
        const byCell: Record<string, Record<string, number>> = {};

        for (const r of rows) {
          const st = stageOf(r, sets);

          (byStage[st] ??= []).push(r);
          (byCell[r.cell] ??= {})[st] = (byCell[r.cell]![st] ?? 0) + 1;
        }

        const missingS = [...sets.S].filter((id) => !rows.some((r) => r.id === id));

        funnel = {
          scan: { file: rel(scanFile(s, cut as HistCut)), sha256: sha256File(scanFile(s, cut as HistCut)), rows: rows.length },
          fitted: rows.length,
          plausible: rows.filter((r) => r.plausible).length,
          measured: rows.filter((r) => r.rung !== null).length,
          measuredBy: { r1: rows.filter((r) => r.rung === 'r1').length, refine: rows.filter((r) => r.rung === 'refine').length },
          feasible: rows.filter((r) => r.feasible).length,
          distinctLedgers: { fitted: new Set(rows.map((r) => r.signature)).size, feasible: new Set(rows.filter((r) => r.feasible).map((r) => r.signature)).size },
          lanes: { shortlisted: sets.S.size, r3: sets.R3.size, r2: sets.R2.size, shortlistedNotInArchive: missingS },
          byStage: Object.fromEntries(stageOrder.filter((st) => byStage[st]).map((st) => [st, { label: stageLabel[st], ...summaryOf(byStage[st]!) }])),
          byCell
        };
      }

      perCut[cut] = {
        door: cut,
        archives,
        independentSet: { members: indep.length, qualified: elig.length, failed: indep.filter((e) => !e.qualified).map((e) => ({ label: e.label, failed: e.failed })) },
        roles,
        funnel,
        eligible: elig.map((e) => {
          const c = confOfEvidence(s, e);

          return {
            label: e.label,
            id: e.id,
            cell: c.cell,
            roles: roleOf(e.label),
            activeInputs: activeInputsOf(c),
            centre: {
              net: e.centre.net,
              realized: e.centre.realized,
              unrealized: e.centre.unrealized,
              dd: e.centre.dd,
              lots: e.centre.lots,
              episodes: e.centre.episodes,
              topEpisode: e.centre.topEpisode,
              topEpisodeShare: e.centre.topEpisodeShare,
              years: e.centre.years,
              sessionsHeld: e.centre.sessionsHeld
            },
            profitRank: profitRank.indexOf(e) + 1,
            robustRank: robustRank.indexOf(e) + 1,
            select: {
              robust: e.select.robust,
              median: e.select.median,
              p10: e.select.p10,
              p90Dd: e.select.p90Dd,
              worstDd: e.select.worstDd,
              breachShare: e.select.breachShare,
              distinct: e.select.distinct,
              sameAsCentre: e.select.sameAsCentre,
              clipped: e.select.clipped,
              n: e.select.n
            },
            confirmQualificationOnly: { p10: e.confirm.p10, p90Dd: e.confirm.p90Dd, breachShare: e.confirm.breachShare }
          };
        })
      };
    }

    subjects[s] = {
      study: src.study,
      title: src.title,
      sealedRecords: subjectSeals(src).records.length,
      evaluationDigest: src.evaluationDigest(),
      cuts: perCut
    };
  }

  const record = {
    stage: 'stage1 inventory',
    note: 'training-door and archive evidence only; no next-period outcome is read or ranked',
    subjects,
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.inventory, record, 'stage1 inventory');

  // SOURCE_MANIFEST.json: every sealed source record and archive this audit reads, with sha256.
  const manifest = {
    kind: 'optimization-process-audit source manifest',
    note: 'read-only sources; nothing is written into a subject directory. Archives are git-ignored and regenerable by the subjects\' RUN_COMMANDS.',
    subjects: Object.fromEntries(
      subjectKeys.map((s) => {
        const src = sources[s];
        const recs = [
          ...allCuts.flatMap((c) => [src.searchRecord(c), src.selectionRecord(c), ...(c === 'C24' ? [] : [src.evaluationRecord(c)])]),
          src.sequentialRecord,
          src.frozenSelection,
          src.validationRecord
        ];

        return [
          s,
          {
            study: src.study,
            records: recs.map((f) => ({ file: rel(f), sha256: sha256File(f) })),
            archives: freeze.subjects[s].archives,
            scans: histCuts.map((c) => ({ file: rel(scanFile(s, c)), sha256: sha256File(scanFile(s, c)), derived: 'archive scan (training door, archive hits only)' }))
          }
        ];
      })
    ),
    written: new Date().toISOString()
  };

  sealJson(path.join(researchDir, 'SOURCE_MANIFEST.json'), manifest, 'source manifest');
  log('stage1 inventory sealed');
  return record;
};
