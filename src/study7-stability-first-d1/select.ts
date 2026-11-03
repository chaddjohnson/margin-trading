// The selection freeze (PROTOCOL.md §11.2, §11.4): roles per track × path (M, L) taken in the training-side order of
// the selection families (search door only), each going to the first QUALIFIED candidate in that order (validation
// evidence is a veto, never a ranking), distinct at normalized L∞ ≥ 0.10; the tier and the ranked nomination list from
// sealed figures ending 2023-12-29 (pooled confirmation robust profit per year against B1's on the same run). Sealed in
// FROZEN_SELECTION.json before the final door can open; the final door only flags.
import fs from 'fs-extra';
import { type FoldKey, type TrackKey, eligibility, frozenSelectionFile, protocolFreezeFile, schedule, searchFile, validationFile } from './context.ts';
import { configDistance } from './designs.ts';
import type { Books } from './evaluate.ts';
import { requiredSearchJobs, requireAllSearchesSealed } from './gates.ts';
import { codeDigest, fileSha256, git, log, nowIso, readSealed, writeSealed } from './records.ts';

interface Nb {
  robustPerYear: number;
  medianPerYear: number;
  p90Dd: number;
  share: number;
  n: number;
}

interface Candidate {
  id: string;
  pick: string;
  books: Books;
  trainingSelection: Nb;
  evidence: { decisive: { nb: Nb; wilsonLower: number } };
  qualification: { qualified: boolean; failed: string[]; marginal: boolean };
}

interface Validation {
  candidates: Candidate[];
  controls: Record<string, { evidence: { decisive: { nb: Nb } } }>;
  bodyHash: string;
}

export const validatedTracks = async () => {
  const jobs = await requiredSearchJobs();

  return [...new Set(jobs.filter((j) => j.track !== 'V').map((j) => j.track))] as TrackKey[];
};

export const runFreezeSelection = async () => {
  if (await fs.pathExists(frozenSelectionFile)) throw new Error(`${frozenSelectionFile} exists (sealed)`);

  await requireAllSearchesSealed();

  const tracks = await validatedTracks();
  const records: Record<string, { file: string; bodyHash: string; fileSha256: string }> = {};
  const missing: string[] = [];

  for (const job of await requiredSearchJobs()) {
    const sealed = await readSealed<{ bodyHash: string }>(job.file);

    records[job.file] = { file: job.file, bodyHash: sealed.bodyHash, fileSha256: await fileSha256(job.file) };
  }

  const validations: Record<string, Validation> = {};

  for (const track of tracks) {
    for (const fold of ['F19', 'F20', 'M', 'L'] as FoldKey[]) {
      const file = validationFile(track, fold);

      if (!(await fs.pathExists(file))) {
        missing.push(file);
        continue;
      }

      const sealed = await readSealed<Validation>(file);

      validations[`${track}/${fold}`] = sealed;
      records[file] = { file, bodyHash: sealed.bodyHash, fileSha256: await fileSha256(file) };
    }
  }

  if (missing.length) throw new Error(`validation incomplete: ${missing.join(', ')}`);

  const byId = (a: Candidate, b: Candidate) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const roles: Record<string, unknown>[] = [];
  const qualification: Record<string, unknown> = {};

  for (const track of tracks) {
    for (const fold of ['M', 'L'] as FoldKey[]) {
      const validation = validations[`${track}/${fold}`]!;
      const symbols = Object.keys(validation.candidates[0]?.books ?? {});
      const list = validation.candidates;
      const taken: Candidate[] = [];
      const assign = (role: string, ordered: Candidate[]) => {
        const holder = ordered.find(
          (c) => c.qualification.qualified && !taken.includes(c) && taken.every((t) => configDistance(c.books, t.books, symbols) >= schedule.distinct)
        );

        if (holder) {
          taken.push(holder);
          roles.push({ track, path: fold, role, id: holder.id, books: holder.books, trainingSelection: holder.trainingSelection, confirmation: holder.evidence.decisive.nb, wilsonLower: holder.evidence.decisive.wilsonLower, marginal: holder.qualification.marginal });
        } else {
          roles.push({ track, path: fold, role, id: null });
        }
      };
      const profitOrder = [...list].sort((a, b) => b.trainingSelection.robustPerYear - a.trainingSelection.robustPerYear || a.trainingSelection.p90Dd - b.trainingSelection.p90Dd || byId(a, b));

      assign('profit', profitOrder);

      const leader = taken[0] ?? profitOrder[0];
      const robustOrder = list
        .filter((c) => !leader || c.trainingSelection.medianPerYear >= 0.5 * leader.trainingSelection.medianPerYear)
        .sort((a, b) => b.trainingSelection.share - a.trainingSelection.share || a.trainingSelection.p90Dd - b.trainingSelection.p90Dd || byId(a, b));

      assign('robust', robustOrder);
      assign(
        'balanced',
        [...list].sort(
          (a, b) =>
            b.trainingSelection.robustPerYear / b.trainingSelection.p90Dd - a.trainingSelection.robustPerYear / a.trainingSelection.p90Dd ||
            a.trainingSelection.p90Dd - b.trainingSelection.p90Dd ||
            byId(a, b)
        )
      );
      qualification[`${track}/${fold}`] = list.map((c) => ({ id: c.id, pick: c.pick, qualified: c.qualification.qualified, failed: c.qualification.failed, marginal: c.qualification.marginal }));
    }

    for (const fold of ['F19', 'F20'] as FoldKey[]) {
      qualification[`${track}/${fold}`] = validations[`${track}/${fold}`]!.candidates.map((c) => ({ id: c.id, pick: c.pick, qualified: c.qualification.qualified, failed: c.qualification.failed, procedureEvidenceOnly: true }));
    }
  }

  // tier and ranked list from pre-2024 sealed figures (confirmation, run to 2023-12-29) against B1's
  const holders = roles.filter((r) => r.id) as { track: TrackKey; path: FoldKey; role: string; id: string; books: Books; confirmation: Nb; marginal: boolean }[];
  const ranked = holders
    .map((h) => {
      const b1 = validations[`${h.track}/${h.path}`]!.controls.B1!.evidence.decisive.nb;

      return {
        ...h,
        class: h.path === 'M' ? 'M' : 'L',
        tier: h.confirmation.robustPerYear >= b1.robustPerYear ? 'strong' : 'modest',
        b1RobustPerYear: b1.robustPerYear,
        robustPerYear: h.confirmation.robustPerYear
      };
    })
    .sort((a, b) => (a.tier === b.tier ? 0 : a.tier === 'strong' ? -1 : 1) || b.robustPerYear - a.robustPerYear || a.confirmation.p90Dd - b.confirmation.p90Dd || (a.id < b.id ? -1 : 1))
    .map((row, index) => ({ rank: index + 1, ...row }));

  const finalPlan = {
    roleHolders: ranked.map((r) => ({ track: r.track, path: r.path, id: r.id, books: r.books })),
    shortlists: tracks.flatMap((track) =>
      (['M', 'L'] as FoldKey[]).flatMap((fold) => validations[`${track}/${fold}`]!.candidates.map((c) => ({ track, path: fold, id: c.id, books: c.books })))
    )
  };
  const freeze = await readSealed<{ protocol: { sha256: string } }>(protocolFreezeFile);
  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    frozenAt: nowIso(),
    protocol: { freeze: protocolFreezeFile, sha256: freeze.protocol.sha256 },
    git: { branch: git('branch --show-current'), head: git('rev-parse HEAD') },
    code: await codeDigest(),
    records,
    tracks,
    qualification,
    roles,
    ranked,
    finalRules: {
      F1: 'FULL centre minute DD < $35,000',
      F2: 'final sets 1–3 pooled share ≥ 0.90 and pooled p90 < $35,000 on FULL; F2b: in-box pooled likewise when any coordinate is within r of a bound',
      F3: 'FX (2024-01-01 → 2026-10-29) centre net > 0 and pooled final median FX net > 0',
      F4: `best calendar year ≤ ${eligibility.topYearShare * 100}% of FULL net and ex-best-year economy ≥ $${eligibility.exBestPerYear}/yr`,
      marginal: 'pooled share in [0.90, 0.93] or any single final set fails F2',
      blockOnly: 'the final door flags; it never re-ranks, replaces or re-selects'
    },
    finalPlan,
    v: (await fs.pathExists(searchFile('V', 'M', 'diagnostic'))) ? await (await import('./vtrigger.ts')).vTriggerOf() : null
  });

  log(`selection frozen: ${record.file} ${record.bodyHash.slice(0, 12)}; ${ranked.length} role holders`);
};
