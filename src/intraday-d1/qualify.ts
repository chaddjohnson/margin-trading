// Qualification on the development door (S8/qualify.ts:89-223) and the sealed selection (S8/select.ts): each
// shortlist member's evidence (confirm 3 × 128 pooled, in-box pair, half/wide, stresses) and gates Q1–Q8, E1, E2;
// "infeasible on training" members forced unqualified; B1's confirmation evidence for the tier; CSCV PBO (report-only)
// over the 64 best rung-2 configurations × half-year attributions from 2018H1; the selection → confirmation decay.
// Roles (profit / robust / balanced / ≤ 2 ledger-distinct extras) at L∞ ≥ 0.10 in the selection-family order; ranking
// by tier (confirmation robust/yr ≥ B1's) then robust/yr, p90 DD, ID. The freeze seals FROZEN_SELECTION.json.
import { pboOf } from '../d1-robust/pbo.ts';
import { spearman } from '../study8-expanded-regime-d1/stats.ts';
import {
  chronology,
  developmentDoor,
  eligibility,
  execution,
  frozenSelectionFile,
  type Grid,
  schedule,
  stresses,
  testGates,
  validationDoor
} from './context.ts';
import { b1Grid, dailyFit } from './control.ts';
import { type Evidence, evidenceOf, qualificationOf } from './evidence.ts';
import { compactFit, floorsOf } from './fitness.ts';
import { type DoorView, type Lab, baseSettings, runGrid } from './lab.ts';
import { codeDigest, fileSha256, log, nowIso, protocolSha256, readSealed, sha256, writeSealed } from './seal.ts';
import { describe, distance, valuesOf, engineParamsOf } from './space.ts';
import type { Fit } from './fitness.ts';

interface SearchRecord {
  shortlist: {
    rank: number;
    pick: string;
    id: string;
    grid: Grid;
    describe: string;
    selection: { pooled: { nb: Fit['nb'] } };
  }[];
  rung2: { id: string; grid: Grid; violation: number; nb: Fit['nb'] }[];
  bodyHash: string;
}

const compactEvidence = (ev: Evidence) => {
  const { neighbourNets, fit, centre, ...rest } = ev;
  const { record, ...centreView } = centre;

  void neighbourNets;
  return {
    ...rest,
    fit: compactFit(fit),
    centre: { ...centreView, periods: record.periods, signature: record.signature }
  };
};

export const runQualification = async (lab: Lab, view: DoorView, searchFile: string, out: string) => {
  const search = await readSealed<SearchRecord>(searchFile);
  const floors = floorsOf(view.y, 2016, 2024);
  const options = { prefix: 'confirm' as const, fold: 'DEV' as const, floors, trainKey: 'DEV' };
  const candidates = [];

  for (const item of search.shortlist) {
    const evidence = await evidenceOf(lab, item.grid, options);
    const qualification = qualificationOf(evidence, floors, 'DEV');
    const ledger = runGrid(view, item.grid).lots.map((lot) => `${lot.entryTime}|${lot.open ? 'open' : lot.exitTime}`);

    if (item.pick === 'infeasible on training') {
      qualification.qualified = false;
      qualification.failed.push('infeasible on training');
    }

    log(
      `${item.id} [${item.pick}] ${qualification.qualified ? 'qualified' : `failed ${qualification.failed.join(',')}`}`
    );
    candidates.push({
      rank: item.rank,
      pick: item.pick,
      id: item.id,
      grid: item.grid,
      describe: item.describe,
      trainingSelection: item.selection.pooled.nb,
      evidence: compactEvidence(evidence),
      qualification,
      ledger
    });
  }

  // B1 (daily D1 primary) confirmation evidence on the same door, its own Study 8 box and radii
  const b1Families = [1, 2, 3].map((rep) => ({ name: `confirm#${rep}`, n: 128, labels: ['confirm', 'V', 'DEV', rep] }));
  const b1 = dailyFit(view, b1Families, floors, 'confirm 1–3');
  const b1Stress = Object.fromEntries(
    stresses.map(({ key, ...overrides }) => {
      const f = dailyFit(view, [], floors, key, { ...{ ...baseSettings }, ...overrides });

      return [key, { net: f.centreRecord.net, dd: f.centreRecord.dd }];
    })
  );
  const controls = {
    B1: {
      grid: b1Grid,
      decisive: { nb: b1.nb, violation: b1.violation, parts: b1.parts },
      centre: { ...b1.centre, periods: b1.centreRecord.periods },
      stress: b1Stress
    }
  };

  // PBO (report-only): the 64 best rung-2 configurations, half-year attributions 2018H1 → 2024H2
  const r2 = [...search.rung2]
    .sort(
      (a, b) =>
        (a.violation === 0 ? 0 : 1) - (b.violation === 0 ? 0 : 1) ||
        b.nb.robustPerYear - a.nb.robustPerYear ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, 64);
  const halves = view.ranges.map((r) => r.key).filter((k) => /^\d{4}H[12]$/.test(k) && k >= '2018H1' && k <= '2024H2');
  const blocks = halves.length % 2 === 0 ? halves : halves.slice(1);
  const records = await lab.points(r2.map((item) => ({ grid: item.grid, settings: { ...baseSettings } })));
  const matrix = records.map((record) => blocks.map((key) => record.periods[key] ?? 0));
  const pbo =
    r2.length >= 2 && blocks.length >= 2 ? pboOf(matrix, blocks.length) : { pbo: NaN, splits: 0, configs: r2.length };
  const selectionRobust = candidates.map((c) => c.trainingSelection.robustPerYear);
  const confirmationRobust = candidates.map((c) => c.evidence.decisive.nb.robustPerYear);
  const record = await writeSealed(out, {
    stage: 'QUALIFICATION',
    at: nowIso(),
    search: { file: searchFile, bodyHash: search.bodyHash },
    floors,
    candidates,
    controls,
    pbo: { ...pbo, blocks },
    decay: {
      selectionRobustPerYear: selectionRobust,
      confirmationRobustPerYear: confirmationRobust,
      spearman: candidates.length >= 3 ? spearman(selectionRobust, confirmationRobust) : NaN
    }
  });

  log(`qualification sealed ${record.file} ${record.bodyHash.slice(0, 12)}`);
  return record;
};

export const jaccard = (a: readonly string[], b: readonly string[]) => {
  const left = new Set(a);
  const right = new Set(b);
  let both = 0;

  for (const key of left) if (right.has(key)) both++;

  const union = left.size + right.size - both;

  return union ? both / union : 1;
};

interface Candidate {
  id: string;
  grid: Grid;
  pick: string;
  describe: string;
  trainingSelection: Fit['nb'];
  qualification: { qualified: boolean; failed: string[]; marginal: boolean };
  ledger: string[];
  evidence: { decisive: { nb: Fit['nb'] } };
}

// S8/select.ts assignRoles, on this grid's distance.
export const assignRoles = (list: readonly Candidate[]) => {
  const byId = (a: Candidate, b: Candidate) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const taken: Candidate[] = [];
  const out: { role: string; holder: Candidate | null }[] = [];
  const assign = (role: string, ordered: readonly Candidate[]) => {
    const holder = ordered.find(
      (c) =>
        c.qualification.qualified &&
        !taken.includes(c) &&
        taken.every((t) => distance(c.grid, t.grid) >= schedule.distinct) &&
        (role !== 'extra' || taken.every((t) => jaccard(c.ledger, t.ledger) < 0.5))
    );

    if (holder) {
      taken.push(holder);
      out.push({ role, holder });
    } else if (role !== 'extra') {
      out.push({ role, holder: null });
    }

    return holder;
  };
  const sel = (c: Candidate) => c.trainingSelection;
  const profitOrder = [...list].sort(
    (a, b) => sel(b).robustPerYear - sel(a).robustPerYear || sel(a).p90Dd - sel(b).p90Dd || byId(a, b)
  );

  assign('profit', profitOrder);

  const leader = taken[0] ?? profitOrder[0];

  assign(
    'robust',
    list
      .filter((c) => !leader || sel(c).medianPerYear >= 0.5 * sel(leader).medianPerYear)
      .sort((a, b) => sel(b).share - sel(a).share || sel(a).p90Dd - sel(b).p90Dd || byId(a, b))
  );
  assign(
    'balanced',
    [...list].sort(
      (a, b) =>
        sel(b).robustPerYear / sel(b).p90Dd - sel(a).robustPerYear / sel(a).p90Dd ||
        sel(a).p90Dd - sel(b).p90Dd ||
        byId(a, b)
    )
  );

  for (let k = 0; k < 2; k++) if (!assign('extra', list)) break;

  return out;
};

export const rulebook = () => ({
  eligibility,
  testGates,
  stresses,
  schedule,
  execution,
  chronology,
  developmentDoor,
  validationDoor
});

export const runFreeze = async (qualificationFile: string, searchFile: string, protocolCommit: string) => {
  const qualification = await readSealed<{
    candidates: Candidate[];
    controls: { B1: { decisive: { nb: Fit['nb'] } } };
    bodyHash: string;
  }>(qualificationFile);
  const roles = assignRoles(qualification.candidates);
  const b1 = qualification.controls.B1.decisive.nb;
  const holders = roles
    .filter((r) => r.holder)
    .map((r) => {
      const h = r.holder!;

      return {
        role: r.role,
        id: h.id,
        grid: h.grid,
        describe: h.describe,
        values: valuesOf(h.grid),
        engineParams: engineParamsOf(valuesOf(h.grid)),
        tier: h.evidence.decisive.nb.robustPerYear >= b1.robustPerYear ? 'strong' : 'modest',
        robustPerYear: h.evidence.decisive.nb.robustPerYear,
        b1RobustPerYear: b1.robustPerYear,
        confirmation: h.evidence.decisive.nb,
        marginal: h.qualification.marginal
      };
    })
    .sort(
      (a, b) =>
        (a.tier === b.tier ? 0 : a.tier === 'strong' ? -1 : 1) ||
        b.robustPerYear - a.robustPerYear ||
        a.confirmation.p90Dd - b.confirmation.p90Dd ||
        (a.id < b.id ? -1 : 1)
    )
    .map((row, index) => ({ rank: index + 1, ...row }));
  const code = await codeDigest();
  const book = rulebook();
  const record = await writeSealed(frozenSelectionFile, {
    stage: 'FROZEN_SELECTION',
    at: nowIso(),
    protocol: { sha256: await protocolSha256(), commit: protocolCommit },
    code,
    data: { developmentPrefixSha256: developmentDoor.prefixSha256, validationFileSha256: validationDoor.fileSha256 },
    rulebook: { sha256: sha256(JSON.stringify(book)), values: book },
    records: {
      search: { file: searchFile, sha256: await fileSha256(searchFile) },
      qualification: {
        file: qualificationFile,
        sha256: await fileSha256(qualificationFile),
        bodyHash: qualification.bodyHash
      }
    },
    roles: roles.map((r) => ({ role: r.role, id: r.holder?.id ?? null })),
    ranked: holders,
    preferred: holders[0] ?? null,
    b1: { grid: b1Grid, confirmation: b1 },
    validationPlan: {
      door: 'whole canonical file, sha256 pinned, recorded splits forward-adjusted; opened once',
      window: `${validationDoor.start} → ${validationDoor.lastCompleteSession} (one continuous causal run from ${chronology.firstSession})`,
      gates:
        'T1–T7 (Study 8 S8/test.ts:94-155, single book, adapted episodes), veto only; never reorder, replace or rescue',
      families: 'test 1–3 (3 × 128) + in-box pair + half/wide; labels test/V/VAL/rep',
      reported: 'per-year 2016–2026 (2026 partial), development vs validation, 2025, 2026 and combined'
    }
  });

  log(
    `selection frozen ${record.file} ${record.bodyHash.slice(0, 12)}; preferred ${holders[0]?.id ?? 'none'} ${holders[0] ? describe(holders[0].grid) : ''}`
  );
  return record;
};
