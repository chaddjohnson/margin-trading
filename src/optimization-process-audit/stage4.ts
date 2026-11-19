// Stage 4 (PROTOCOL.md §8): the C24 freeze (every policy's choice in the primary universe E(s, C24) and in the secondary,
// informed final set; the validation plan; the already-known original outcomes; the futility verdict), sealed and
// committed before any new 2025–2026 evaluation; then, only if not futile, the one-time FULL evaluation of every frozen
// choice (all policies), continuous across year-end 2024.
import fs from 'node:fs';
import { Tracker } from '../multi-etf-allocator/engine.ts';
import { type Cut, chronology, codeDir, economics, log, r2, stageFile } from './context.ts';
import { counter } from './compute.ts';
import { consistentInValidation } from './decision.ts';
import { type Features, featureRow } from './mechanism.ts';
import { allPolicies } from './policies.ts';
import { assertCommitted, codeDigest, readJson, rel, sealJson } from './records.ts';
import { type SubjectKey, sources, subjectKeys } from './sources.ts';
import { Archive, confOfEvidence, openDoor, selectionOf, sliceRun } from './subjects.ts';
import { featuresAt } from './stage3.ts';

const cut: Cut = 'C24';
const iso = (t: number) => (Number.isFinite(t) ? `${new Date(t * 1000).toISOString().slice(0, 16).replace('T', ' ')}Z` : null);

type KnownRow = { label: string; validationPnl: number; validationDd: number; wholeDd: number; fullNet: number };

export const runC24Freeze = async () => {
  const analysisSha = assertCommitted(stageFile.analysis);

  if (fs.existsSync(stageFile.c24Freeze)) throw new Error(`${rel(stageFile.c24Freeze)} is sealed`);

  const analysis = readJson<{ futile: boolean; decisions: Record<string, { classification: string }> }>(stageFile.analysis);
  const cnt = counter('stage4 C24 freeze (secondary-universe features, training door D24)');
  const door = await openDoor('D24', 'stage4 C24 freeze: features of the secondary final set (training door D24)');
  const subjects: Record<string, unknown> = {};

  for (const s of subjectKeys) {
    const sel = selectionOf(s, cut);
    const primaryE = featuresAt(s, cut);
    const known = readJson<{ rows: KnownRow[] }>(sources[s].validationRecord).rows;
    const finalRoles = sel.roles.final!.roles;
    const arc = new Archive(sources[s].qualifyJob(cut));
    const secondary: Features[] = [];

    for (const e of sel.evidence.filter((x) => x.selectable && x.qualified)) {
      const existing = primaryE.find((f) => f.label === e.label);
      const roles = Object.entries(finalRoles).filter(([, l]) => l === e.label).map(([r]) => r);

      secondary.push(existing ? { ...existing, roles } : featureRow(door, s, cut, e, arc, roles, cnt).features);
    }

    arc.close();

    const choose = (feats: Features[]) =>
      Object.fromEntries(
        allPolicies().map((p) => {
          const c = p.choose(feats);
          const k = known.find((r) => r.label === c.label);

          return [
            p.key,
            {
              label: c.label,
              id: feats.find((f) => f.label === c.label)?.id ?? null,
              reason: c.reason,
              knownOutcome: k ? { validationPnl: k.validationPnl, resetDd: k.validationDd, wholeDd: k.wholeDd, fullNet: k.fullNet, source: rel(sources[s].validationRecord) } : null
            }
          ];
        })
      );
    const primary = choose(primaryE);
    const sec = choose(secondary);

    if (primary.P0!.label !== sel.roles.independent!.roles['actual-profit']) throw new Error(`${s}: P0's C24 choice is not the sealed independent primary`);
    if (sec.P0!.label !== sel.roles.final!.roles['actual-profit']) throw new Error(`${s}: P0's secondary C24 choice is not the sealed final primary`);

    subjects[s] = {
      primaryUniverse: { set: 'E(s, C24): the qualified independent set', size: primaryE.length, choices: primary },
      secondaryUniverse: { set: 'the final selectable set (informed lanes and controls included; report-only, never chronological evidence)', size: secondary.length, choices: sec, features: secondary }
    };
  }

  const record = {
    stage: 'stage4 C24 freeze (before any new 2025–2026 evaluation)',
    analysis: { file: rel(stageFile.analysis), sha256: analysisSha, classifications: Object.fromEntries(Object.entries(analysis.decisions).map(([k, d]) => [k, d.classification])) },
    futile: analysis.futile,
    futilityRule: 'PROTOCOL.md §7.6: FULL opens only if at least one experimental policy merits further confirmation',
    validationPlan: {
      door: 'FULL 2016-01-04 → 2026-10-30, one continuous run per distinct frozen choice (every policy, both universes)',
      boundary: chronology.developmentEnd,
      labels: 'V1 validation P&L > 0; V2 reset validation DD ≤ $35,000; V3 whole-run DD ≤ $35,000',
      consistency: 'a policy that merits further confirmation is consistent in 2025–2026 iff in both subjects its primary-universe choice passes V1–V3 and in at least one subject its validation P&L ≥ P0’s',
      noFeedback: 'no policy revision, tuning, extra hypothesis, broadened budget or replacement after validation'
    },
    subjects,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.c24Freeze, record, 'stage4 C24 freeze');
  log(`stage4 C24 freeze sealed; futile ${record.futile}`);
  return record;
};

export const runValidation = async () => {
  const guard = assertCommitted(stageFile.c24Freeze);
  const freeze = readJson<{ futile: boolean; analysis: { classifications: Record<string, string> }; subjects: Record<SubjectKey, Record<string, { choices: Record<string, { label: string | null; id: string | null }> }>> }>(stageFile.c24Freeze);

  if (freeze.futile) throw new Error('futility stop (PROTOCOL.md §7.6): FULL stays closed');
  if (fs.existsSync(stageFile.validation)) throw new Error(`${rel(stageFile.validation)} is sealed`);

  const cnt = counter('stage4 one-time validation (FULL)');
  const door = await openDoor('FULL', `stage4 one-time validation behind C24_FREEZE.json ${guard.slice(0, 12)}`, { file: rel(stageFile.c24Freeze), sha256: guard });
  const b = door.dates.indexOf(chronology.developmentEnd);
  const rows: Record<string, unknown>[] = [];

  for (const s of subjectKeys) {
    const sel = selectionOf(s, cut);
    const labels = new Set<string>();

    for (const u of ['primaryUniverse', 'secondaryUniverse'])
      for (const c of Object.values(freeze.subjects[s][u]!.choices)) if (c.label) labels.add(c.label);

    for (const label of labels) {
      const e = sel.evidence.find((x) => x.label === label)!;
      const x = sliceRun(door, confOfEvidence(s, e), chronology.developmentEnd);

      cnt.fresh('full-history validation run', true);

      const tr = new Tracker(0, x.t[0] ?? 0);

      for (let i = 0; i < x.t.length; i++) tr.updateStrict(x.v[i]!, x.t[i]!);

      const st = tr.stats();

      rows.push({
        subject: s,
        label,
        id: e.id,
        developmentNet: e.centre.net,
        validationPnl: x.rec.periods[0]!.after,
        resetDd: x.rec.periods[0]!.dd,
        resetDdPeak: iso(st.peakTime),
        resetDdTrough: iso(st.troughTime),
        fullNet: x.rec.net,
        fullRealized: x.rec.realized,
        fullUnrealized: x.rec.unrealized,
        wholeDd: x.rec.dd,
        wholeDdPeak: iso(x.rec.ddPeakT),
        wholeDdTrough: iso(x.rec.ddTroughT),
        wholeDdRecovery: iso(x.rec.ddRecoveryT),
        lotsAfterBoundary: x.rec.lots - e.centre.lots,
        openAtEnd: x.openAtEnd,
        years: Object.fromEntries(Object.entries(x.rec.years).filter(([y]) => y >= '2025')),
        V1: x.rec.periods[0]!.after > 0,
        V2: x.rec.periods[0]!.dd <= economics.ceiling,
        V3: x.rec.dd <= economics.ceiling,
        boundaryIndex: b
      });
    }

    // P0 reproduces the subject's sealed validation of its C24 primaries to the cent
    const known = readJson<{ rows: { label: string; validationPnl: number; validationDd: number; wholeDd: number }[] }>(sources[s].validationRecord).rows;

    for (const r of rows.filter((x) => x.subject === s)) {
      const k = known.find((x) => x.label === r.label);

      if (k && (k.validationPnl !== r.validationPnl || k.validationDd !== r.resetDd || k.wholeDd !== r.wholeDd))
        throw new Error(`${s} ${r.label}: validation differs from the subject's sealed record`);
      r.reproducesSealed = k ? true : null;
    }
  }

  const rowOf = (s: SubjectKey, label: string | null) => rows.find((r) => r.subject === s && r.label === label) as { validationPnl: number; resetDd: number; wholeDd: number } | undefined;
  const consistency = Object.fromEntries(
    Object.entries(freeze.analysis.classifications)
      .filter(([, c]) => c === 'merits further confirmation')
      .map(([k]) => [
        k,
        consistentInValidation(
          Object.fromEntries(
            subjectKeys.map((s) => {
              const ch = freeze.subjects[s].primaryUniverse!.choices;
              const p = rowOf(s, ch[k]!.label);
              const p0 = rowOf(s, ch.P0!.label);

              return [s, { p: p ? { pnl: p.validationPnl, resetDd: p.resetDd, wholeDd: p.wholeDd } : null, p0: p0 ? { pnl: p0.validationPnl } : null }];
            })
          ) as never
        )
          ? 'consistent in 2025–2026'
          : 'not consistent in 2025–2026'
      ])
  );
  const record = {
    stage: 'stage4 one-time validation (FULL, previously examined history)',
    guard: { file: rel(stageFile.c24Freeze), sha256: guard },
    rows,
    consistency,
    compute: cnt.done(),
    code: codeDigest(codeDir).digest,
    finished: new Date().toISOString()
  };

  sealJson(stageFile.validation, record, 'stage4 validation');
  log(`stage4 validation: ${rows.length} rows; ${JSON.stringify(consistency)}`);
  return record;
};

export const runStage4 = async (args: string[]) => {
  if (args[0] === 'freeze') return runC24Freeze();
  if (args[0] === 'validate') return runValidation();
  throw new Error('stage4 <freeze|validate>');
};

export const _r2 = r2;
