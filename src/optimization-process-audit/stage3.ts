// Stage 3 (PROTOCOL.md §7.3–§7.5): the sealed choice record and the hindsight cohort (before any non-published
// next-slice outcome), the next-slice runs, then the sequential policies, the frozen decision rule and the hindsight
// diagnostic. The runner pilot (training door only) lives here too.
import fs from 'node:fs';
import { type HistCut, codeDir, cuts, economics, histCuts, log, r2, stageFile } from './context.ts';
import { counter } from './compute.ts';
import { assertCommitted, codeDigest, readJson, rel, sealJson } from './records.ts';
import { buildCohort, type CohortMember, strata } from './cohort.ts';
import type { Features } from './mechanism.ts';
import { type Choice, allPolicies, profitOrder } from './policies.ts';
import { type SliceOutcome, assertParity, sequentialOf } from './reproduce.ts';
import { type SliceItem, type SliceResult, runSlices } from './runner.ts';
import { confOfArchived } from './scan.ts';
import { type SubjectKey, sources, subjectKeys } from './sources.ts';
import { Archive, type Conf, confOfEvidence, independentSet, selectionOf } from './subjects.ts';
import { classify, futile, subjectVerdict } from './decision.ts';
import { spearman, wilson } from '../vg-d1-growth-diagnostic/risk.ts';

type Mechanism = { features: Features[] };

export const featuresAt = (s: SubjectKey, cut: string) =>
  readJson<Mechanism>(stageFile.mechanism).features.filter((f) => f.subject === s && f.cut === cut);

const roleHoldersOf = (s: SubjectKey, cut: HistCut) => selectionOf(s, cut).roles.independent!.roles;

export const guardsBeforeChoices = () => {
  assertParity();
  assertCommitted(stageFile.mechanism);
  return assertCommitted(stageFile.policyFreeze);
};

// ----- the sealed choice record and cohort (§7.3, §7.4) -----

export const choicesAt = (s: SubjectKey, cut: string) => {
  const e = featuresAt(s, cut);
  const out: Record<string, Choice & { id: string | null; rejectedAttractive: string[] }> = {};

  for (const p of allPolicies()) {
    const c = p.choose(e);
    const chosen = e.find((f) => f.label === c.label);

    out[p.key] = {
      ...c,
      id: chosen?.id ?? null,
      rejectedAttractive: chosen ? e.filter((f) => f.centre.net > chosen.centre.net).sort(profitOrder).map((f) => f.label) : []
    };
  }

  return out;
};

export const runChoices = async () => {
  const freezeSha = guardsBeforeChoices();

  if (fs.existsSync(stageFile.choices)) throw new Error(`${rel(stageFile.choices)} is sealed`);

  const subjects: Record<string, unknown> = {};

  for (const s of subjectKeys) {
    const perCut: Record<string, unknown> = {};

    for (const cut of histCuts) {
      const choices = choicesAt(s, cut);
      const sealedPrimary = roleHoldersOf(s, cut)['actual-profit'];

      if (choices.P0!.label !== sealedPrimary) throw new Error(`${s} ${cut}: P0 chose ${choices.P0!.label}, the sealed primary is ${sealedPrimary}`);

      const cohort = buildCohort(s, cut);
      const ids = new Set(cohort.members.map((m) => m.id));

      for (const [k, c] of Object.entries(choices))
        if (c.id && !ids.has(c.id)) throw new Error(`${s} ${cut}: ${k}'s choice is not in the cohort`);

      perCut[cut] = { eligible: featuresAt(s, cut).length, roleHolders: roleHoldersOf(s, cut), choices, cohort };
    }

    subjects[s] = perCut;
  }

  const record = {
    stage: 'stage3 choices and cohort (sealed and committed before any non-published next-slice outcome)',
    policyFreeze: { file: rel(stageFile.policyFreeze), sha256: freezeSha },
    policies: allPolicies().map(({ key, family, name, formula }) => ({ key, family, name, formula })),
    subjects,
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.choices, record, 'stage3 choices');
  log('stage3 choices sealed');
  return record;
};

// ----- the next-slice runs (§7.4) -----

type ChoicesRecord = {
  subjects: Record<SubjectKey, Record<HistCut, { roleHolders: Record<string, string | null>; choices: Record<string, { label: string | null; id: string | null }>; cohort: { members: CohortMember[] } }>>;
};

const itemsFor = (s: SubjectKey, cut: HistCut, rec: ChoicesRecord): SliceItem[] => {
  const c = rec.subjects[s][cut];
  const ev = new Map(independentSet(s, cut).map((e) => [e.id, e]));
  const marked = new Set<string>([
    ...Object.values(c.choices).map((x) => x.id).filter((x): x is string => !!x),
    ...Object.values(c.roleHolders)
      .filter((l): l is string => !!l)
      .map((l) => independentSet(s, cut).find((e) => e.label === l)!.id)
  ]);
  const arc = new Archive(sources[s].searchJob(cut));
  const items = c.cohort.members.map((m) => {
    const e = ev.get(m.id);
    const conf: Conf = e ? confOfEvidence(s, e) : confOfArchived(s, arc.config(m.id));

    if (conf.id !== m.id) throw new Error(`${s} ${cut}: cohort member ${m.id} rebuilds as ${conf.id}`);
    return { key: `${s}|${cut}|${m.id}`, conf, marks: marked.has(m.id) };
  });

  arc.close();
  return items;
};

export const runOutcomes = async () => {
  assertCommitted(stageFile.policyFreeze);

  const guard = assertCommitted(stageFile.choices);

  if (fs.existsSync(stageFile.outcomes)) throw new Error(`${rel(stageFile.outcomes)} is sealed`);

  const rec = readJson<ChoicesRecord>(stageFile.choices);
  const cnt = counter('stage3 next-slice cohort runs');
  const subjects: Record<string, unknown> = {};

  for (const cut of histCuts)
    for (const s of subjectKeys) {
      const items = itemsFor(s, cut, rec);
      const run = await runSlices({
        job: `cohort-${s}-${cut}`,
        door: cuts[cut].evalDoor,
        boundary: cuts[cut].end,
        purpose: `stage3 cohort ${s} ${cut} next-slice runs (guard CHOICES.json ${guard.slice(0, 12)})`,
        guard: { file: rel(stageFile.choices), sha256: guard },
        items,
        onFresh: () => cnt.fresh('next-slice cohort run', true)
      });
      const members = rec.subjects[s][cut].cohort.members;
      const rows = members.map((m) => {
        const r = run.results.get(`${s}|${cut}|${m.id}`)!;

        if (r.boundaryEquity !== m.training.net)
          throw new Error(`${s} ${cut} ${m.id}: boundary equity ${r.boundaryEquity} ≠ training net ${m.training.net} (causal prefix)`);
        return {
          id: m.id,
          stratum: m.stratum,
          label: m.label,
          sliceNet: r.sliceNet,
          sliceDd: r.sliceDd,
          wholeNet: r.wholeNet,
          wholeDd: r.wholeDd,
          newLots: r.lots - m.training.lots,
          sliceSessionsHeld: r.sessionsHeld - m.training.sessionsHeld,
          openAtBoundary: r.openAtBoundary,
          openAtEnd: r.openAtEnd
        };
      });

      // parity with the subjects' sealed fold evaluations for the published role holders
      const ev = readJson<{ rows: { label: string; sliceNet: number; sliceDd: number }[] }>(sources[s].evaluationRecord(cut));

      for (const row of rows.filter((r) => r.label)) {
        const sealed = ev.rows.find((x) => x.label === row.label);

        if (sealed && (sealed.sliceNet !== row.sliceNet || sealed.sliceDd !== row.sliceDd))
          throw new Error(`${s} ${cut} ${row.label}: slice outcome differs from the sealed fold evaluation`);
      }

      (subjects[s] ??= {} as Record<string, unknown>) as Record<string, unknown>;
      (subjects[s] as Record<string, unknown>)[cut] = { door: cuts[cut].evalDoor, slice: cuts[cut].slice, fresh: run.fresh, archived: run.archived, rows };
      log(`stage3 ${s} ${cut}: ${rows.length} cohort members (${run.fresh} fresh, ${run.archived} archived)`);
    }

  const record = {
    stage: 'stage3 next-slice outcomes of the frozen cohorts',
    guard: { file: rel(stageFile.choices), sha256: guard },
    subjects,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.outcomes, record, 'stage3 outcomes');
  return record;
};

// ----- the analysis (§7.5) -----

type OutRow = { id: string; stratum: string; label: string | null; sliceNet: number; sliceDd: number; wholeNet: number; wholeDd: number; newLots: number; sliceSessionsHeld: number; openAtBoundary: string[]; openAtEnd: string[] };

const auc = (pos: number[], neg: number[]) => {
  if (!pos.length || !neg.length) return null;

  let s = 0;

  for (const p of pos) for (const n of neg) s += p > n ? 1 : p === n ? 0.5 : 0;
  return Math.round((s / (pos.length * neg.length)) * 1e4) / 1e4;
};

const acceptable = (r: OutRow) => r.sliceNet > 0 && r.sliceDd <= economics.ceiling;

export const runAnalysis = async () => {
  assertCommitted(stageFile.outcomes);
  if (fs.existsSync(stageFile.analysis)) throw new Error(`${rel(stageFile.analysis)} is sealed`);

  const choicesRec = readJson<ChoicesRecord>(stageFile.choices);
  const outcomes = readJson<{ subjects: Record<SubjectKey, Record<HistCut, { rows: OutRow[] }>> }>(stageFile.outcomes);
  const cnt = counter('stage3 analysis (archive reads only)');
  const marks = new Map<string, SliceResult & { t?: number[]; v?: number[] }>();

  for (const cut of histCuts)
    for (const s of subjectKeys) {
      const r = await runSlices({
        job: `cohort-${s}-${cut}`,
        door: cuts[cut].evalDoor,
        boundary: cuts[cut].end,
        purpose: `stage3 analysis read-back ${s} ${cut}`,
        items: itemsFor(s, cut, choicesRec),
        onFresh: () => {
          throw new Error('the analysis must not run a fresh simulation');
        }
      });

      for (const [k, v] of r.results) marks.set(k, v);
    }

  const outcomeOf = (s: SubjectKey, cut: HistCut, id: string | null): SliceOutcome | null => {
    if (!id) return null;

    const m = marks.get(`${s}|${cut}|${id}`)!;
    const row = outcomes.subjects[s][cut].rows.find((r) => r.id === id)!;

    if (!m.t) throw new Error(`${s} ${cut} ${id}: marks were not kept`);
    return { label: row.label ?? id, id, sliceNet: m.sliceNet, sliceDd: m.sliceDd, boundaryEquity: m.boundaryEquity, wholeNet: m.wholeNet, wholeDd: m.wholeDd, openAtBoundary: m.openAtBoundary, openAtEnd: m.openAtEnd, t: m.t, v: m.v! };
  };
  const idOfLabel = (s: SubjectKey, cut: HistCut, label: string | null) => (label ? independentSet(s, cut).find((e) => e.label === label)!.id : null);

  // sequential paths: every policy and the contextual archived roles
  const paths: Record<string, Record<SubjectKey, ReturnType<typeof sequentialOf>>> = {};
  const pickOf: Record<string, (s: SubjectKey, cut: HistCut) => string | null> = {};

  for (const p of allPolicies()) pickOf[p.key] = (s, cut) => choicesRec.subjects[s][cut].choices[p.key]!.id;
  for (const role of ['robust-profit', 'balanced', 'lower-drawdown'])
    pickOf[`role ${role} (context)`] = (s, cut) => idOfLabel(s, cut, choicesRec.subjects[s][cut].roleHolders[role] ?? null);

  for (const [name, pick] of Object.entries(pickOf)) {
    paths[name] = {} as Record<SubjectKey, ReturnType<typeof sequentialOf>>;
    for (const s of subjectKeys) paths[name]![s] = sequentialOf(histCuts.map((fold) => ({ fold, o: outcomeOf(s, fold, pick(s, fold)) })));
  }

  // P0 must reproduce the subjects' sealed independent procedure
  for (const s of subjectKeys) {
    const sealed = readJson<{ policies: { name: string; net: number; sequentialDd: number }[] }>(sources[s].sequentialRecord).policies[0]!;

    if (paths.P0![s].net !== sealed.net || paths.P0![s].sequentialDd !== sealed.sequentialDd) throw new Error(`${s}: P0's sequential path differs from the sealed procedure`);
  }

  // the decision rule
  const decisions: Record<string, unknown> = {};

  for (const p of allPolicies().filter((x) => x.key !== 'P0')) {
    const v = Object.fromEntries(
      subjectKeys.map((s) => [s, subjectVerdict({ slices: paths[p.key]![s].parts, ...paths[p.key]![s] }, { slices: paths.P0![s].parts, ...paths.P0![s] })])
    ) as Record<SubjectKey, ReturnType<typeof subjectVerdict>>;

    decisions[p.key] = { verdicts: v, classification: classify(v) };
  }

  const classes = Object.values(decisions).map((d) => (d as { classification: ReturnType<typeof classify> }).classification);

  // per-slice comparison, profit sacrificed, rejected attractive candidates, changed trades and exposure
  const slices: unknown[] = [];

  for (const s of subjectKeys)
    for (const cut of histCuts) {
      const rows = outcomes.subjects[s][cut].rows;
      const rowOf = (id: string | null) => (id ? rows.find((r) => r.id === id)! : null);
      const p0 = rowOf(choicesRec.subjects[s][cut].choices.P0!.id);

      for (const p of allPolicies()) {
        const c = choicesRec.subjects[s][cut].choices[p.key] as unknown as { label: string | null; id: string | null; rejectedAttractive: string[] };
        const r = rowOf(c.id);
        const rejected = c.rejectedAttractive.map((l) => rowOf(idOfLabel(s, cut, l))!);

        slices.push({
          subject: s,
          cut,
          policy: p.key,
          label: c.label,
          sliceNet: r?.sliceNet ?? 0,
          sliceDd: r?.sliceDd ?? 0,
          deltaVsP0: r2((r?.sliceNet ?? 0) - (p0?.sliceNet ?? 0)),
          newLots: r?.newLots ?? 0,
          sliceSessionsHeld: r?.sliceSessionsHeld ?? 0,
          sameAsP0: c.id === (p0?.id ?? null),
          rejectedAttractive: {
            n: rejected.length,
            acceptable: rejected.filter(acceptable).length,
            betterThanChoice: rejected.filter((x) => x.sliceNet > (r?.sliceNet ?? 0)).length,
            bestSliceNet: rejected.length ? Math.max(...rejected.map((x) => x.sliceNet)) : null
          }
        });
      }
    }

  // the hindsight availability diagnostic (never a selectable strategy)
  const hindsight: unknown[] = [];
  const featureKeys = ['net', 'dd', 'lots', 'episodes', 'topEpisodeShare', 'exBestYear', 'r1Robust', 'r1P90Dd', 'r1Worst2Dd'] as const;

  for (const s of subjectKeys)
    for (const cut of histCuts) {
      const members = choicesRec.subjects[s][cut].cohort.members;
      const rows = outcomes.subjects[s][cut].rows;
      const p0Net = rows.find((r) => r.id === choicesRec.subjects[s][cut].choices.P0!.id)!.sliceNet;
      const byStratum = strata.map((st) => {
        const rs = rows.filter((r) => r.stratum === st);
        const acc = rs.filter(acceptable);
        const better = acc.filter((r) => r.sliceNet > p0Net);

        return {
          stratum: st,
          n: rs.length,
          acceptable: acc.length,
          acceptableShare: rs.length ? r2(acc.length / rs.length) : null,
          acceptableWilson: rs.length ? wilson(acc.length, rs.length).map((x) => Math.round(x * 1e4) / 1e4) : null,
          better: better.length,
          betterWilson: rs.length ? wilson(better.length, rs.length).map((x) => Math.round(x * 1e4) / 1e4) : null,
          medianSliceNet: rs.length ? [...rs.map((r) => r.sliceNet)].sort((a, b) => a - b)[Math.floor((rs.length - 1) / 2)] : null
        };
      });
      const e = featuresAt(s, cut);
      const qualifiedRanks = [...e].sort(profitOrder).map((f) => f.label);
      const accS = rows
        .filter((r) => r.stratum === 'S' && acceptable(r))
        .map((r) => ({ label: r.label, sliceNet: r.sliceNet, sliceDd: r.sliceDd, qualified: members.find((m) => m.id === r.id)!.qualified, profitRankInE: qualifiedRanks.indexOf(r.label ?? '') + 1 || null }));
      const assoc = featureKeys.map((k) => {
        const xs: number[] = [];
        const ys: number[] = [];
        const pos: number[] = [];
        const neg: number[] = [];

        for (const m of members) {
          const v = (m.training as unknown as Record<string, number | null>)[k];
          const r = rows.find((x) => x.id === m.id)!;

          if (v === null || v === undefined || !Number.isFinite(v)) continue;
          xs.push(v);
          ys.push(r.sliceNet);
          (acceptable(r) ? pos : neg).push(v);
        }

        return { feature: k, n: xs.length, spearmanWithSliceNet: xs.length > 2 ? r2(spearman(xs, ys)) : null, aucAcceptable: auc(pos, neg) };
      });
      // within E (qualified members): the policy features against the slice outcome
      const eAssoc = (['select.robust', 'select.p90Dd', 'select.worst10Mean', 'select.exBestYearMedian', 'causal.netWithout', 'centre.exBestYear', 'centre.topEpisodeShare', 'centre.net'] as const).map((k) => {
        const [a, b] = k.split('.') as [keyof Features, string];
        const xs: number[] = [];
        const ys: number[] = [];

        for (const f of e) {
          const v = (f[a] as unknown as Record<string, number | null | undefined>)[b];
          const r = rows.find((x) => x.id === f.id);

          if (!r || v === null || v === undefined || !Number.isFinite(v)) continue;
          xs.push(v);
          ys.push(r.sliceNet);
        }

        return { feature: k, n: xs.length, spearmanWithSliceNet: xs.length > 2 ? r2(spearman(xs, ys)) : null };
      });

      hindsight.push({
        subject: s,
        cut,
        cohort: rows.length,
        p0SliceNet: p0Net,
        acceptable: rows.filter(acceptable).length,
        better: rows.filter((r) => acceptable(r) && r.sliceNet > p0Net).length,
        byStratum,
        acceptableShortlisted: accS,
        cohortAssociation: assoc,
        eligibleAssociation: eAssoc
      });
    }

  const record = {
    stage: 'stage3 analysis: sequential policies, the frozen decision rule, the hindsight diagnostic',
    note: 'the hindsight diagnostic is an oracle description of the frozen cohort, never a selectable strategy or an achievable improvement',
    paths,
    decisions,
    futile: futile(classes as ReturnType<typeof classify>[]),
    slices,
    hindsight,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.analysis, record, 'stage3 analysis');
  log(`stage3 analysis: ${JSON.stringify(Object.fromEntries(Object.entries(decisions).map(([k, d]) => [k, (d as { classification: string }).classification])))}; futile ${record.futile}`);
  return record;
};

export const runStage3 = async (args: string[]) => {
  const [sub, ...rest] = args;

  if (sub === 'pilot') return (await import('./pilot.ts')).runPilot();
  if (sub === 'pilot-child') return (await import('./pilot.ts')).runPilotChild(rest[0]!, rest[1]!);
  if (sub === 'choices') return runChoices();
  if (sub === 'run') return runOutcomes();
  if (sub === 'analyse') return runAnalysis();
  throw new Error(`stage3 <pilot|choices|run|analyse>; got ${sub}`);
};
