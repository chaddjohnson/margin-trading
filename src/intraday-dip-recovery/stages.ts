// The research stages of the CLI (PROTOCOL.md §10–§16). Every stage after the protocol freeze checks the preflight
// (requireStandardAdoption), the frozen protocol's sha256 and the evaluation-code digest (or an acknowledged amendment),
// refuses to overwrite a sealed record, and opens only its permitted door. `--pilot` runs the engineering pilot on the
// pseudo-fold P18 (outputs in the git-ignored cache; never a study record).
import fs from 'node:fs';
import path from 'node:path';
import { requireStandardAdoption } from '../research-standard/preflight.ts';
import { budgets } from './budgets.ts';
import { bench } from './bench.ts';
import {
  type Cutoff,
  type DoorKey,
  type FamilyKey,
  amendmentsFile,
  briefFile,
  cacheDir,
  chronology,
  cutoffs,
  dataSha256,
  familyKeys,
  ladder,
  log,
  prefixDoors,
  protocolFile,
  resultFile,
  studyDir,
  stresses
} from './context.ts';
import { openFullDoor, openPrefixDoor } from './data.ts';
import { type DoorView, type RuleSet, type RunSpec, dailyParams, recOf, run, runDaily, viewOf } from './evaluate.ts';
import type { RunResult } from './engine.ts';
import { Lab, StopRequested } from './lab.ts';
import { concentrationOf, ledgerOf, lastSessionOn, sequentialOf, sliceOf, windowsOf, yearTableOf } from './post.ts';
import { type Behaviour, type Evidence, type Member, decide, evidenceOf } from './qualify.ts';
import { resources } from './resources.ts';
import { runParity } from './parity.ts';
import { type LaneResult, runLane } from './search.ts';
import { codeDigest, fileSha256, git, nowIso, readJson, sha256, stableJson, writeSealed, writeSealedText } from './seal.ts';
import { type Candidate, candidateOf, describe, designOf, diagnosticGrids, idOf, incumbentGrids, parseId } from './space.ts';
import { minuteClock, sessionClock } from '../intraday-d1/periods.ts';
import { simulate } from './engine.ts';
import { settingsOf } from './evaluate.ts';

type Opts = { option: (name: string, fallback?: string) => string | undefined; flag: (name: string) => boolean };

const freezeFile = resultFile('protocol-freeze.json');
const frozenSelectionFile = path.join(studyDir, 'FROZEN_SELECTION.json');

// ---- guards ---------------------------------------------------------------------------------------------------------

const acknowledgedDigests = () => {
  const dir = resultFile('amendments');

  if (!fs.existsSync(dir)) return [] as string[];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => readJson<{ codeDigest?: string }>(path.join(dir, f)).codeDigest)
    .filter((d): d is string => Boolean(d));
};

export const requireFrozen = () => {
  const r = requireStandardAdoption(studyDir, { repoRoot: process.cwd() });

  for (const n of r.notices) log(`preflight notice: ${n}`);
  if (!fs.existsSync(freezeFile)) throw new Error('the protocol is not frozen (results/protocol-freeze.json is missing)');

  const f = readJson<{ protocolSha256: string; codeDigest: string }>(freezeFile);

  if (fileSha256(protocolFile) !== f.protocolSha256) throw new Error('PROTOCOL.md changed after the freeze');

  const now = codeDigest().digest;

  if (now !== f.codeDigest && !acknowledgedDigests().includes(now))
    throw new Error(`the evaluation code changed after the freeze (${now.slice(0, 12)}… ≠ ${f.codeDigest.slice(0, 12)}…) without an acknowledged amendment`);

  log(`preflight passed (standard ${r.version}); protocol frozen; code digest ${now.slice(0, 12)}…`);
};

const isCommitted = (file: string) => {
  try {
    git('ls-files', '--error-unmatch', file);
    git('diff', '--quiet', 'HEAD', '--', file);
    return git('log', '-1', '--format=%H', '--', file);
  } catch {
    return null;
  }
};

const cutoffOf = (key: string | undefined, pilot: boolean): Cutoff => {
  const c = cutoffs[(key ?? '') as Cutoff['key']];

  if (!c) throw new Error(`unknown cutoff ${key}`);
  if (pilot !== (c.key === 'P18')) throw new Error(pilot ? 'the pilot runs on P18 only' : 'P18 is the pilot fold');

  return c;
};

const out = (pilot: boolean, ...parts: string[]) => (pilot ? path.join(cacheDir, 'pilot', ...parts) : resultFile(...parts));

const save = (pilot: boolean, file: string, body: Record<string, unknown>, stage: string) => {
  if (pilot) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(body, null, 1)}\n`);
    return { file, sha256: sha256(fs.readFileSync(file)) };
  }

  return writeSealed(file, body, stage);
};

const saveText = (pilot: boolean, file: string, text: string, stage: string) => {
  if (pilot) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    return;
  }

  writeSealedText(file, text, stage);
};

const withLab = async <T>(lab: Lab, fn: () => Promise<T>) => {
  await lab.start();

  try {
    return await fn();
  } catch (error) {
    if (error instanceof StopRequested || lab.stopReason) {
      lab.archive.flush();
      lab.checkpoint({ stopped: lab.stopReason ?? String(error) });
      log(`stopped (${lab.stopReason ?? (error as Error).message}); progress archived; rerun the same command to resume`);
      (error as Error & { exitCode?: number }).exitCode = 75;
    }

    throw error;
  } finally {
    await lab.close();
  }
};

const csvOf = (rows: Record<string, unknown>[]) => {
  if (!rows.length) return '';

  const cols = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : String(v ?? '');

    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };

  return `${cols.join(',')}\n${rows.map((r) => cols.map((c) => cell(r[c])).join(',')).join('\n')}\n`;
};

// ---- members ------------------------------------------------------------------------------------------------------

export const informedSeeds = (family: FamilyKey) => {
  const all = [
    ...incumbentGrids.map((g) => ({ id: `incumbent ${g.id}`, candidate: candidateOf(family, g.grid) })),
    ...diagnosticGrids.map((g) => ({ id: `diagnostic ${g.id}`, candidate: candidateOf(family, g.grid) }))
  ];

  return [...new Map(all.map((s) => [idOf(s.candidate), s])).values()];
};

const lanesAt = (cut: Cutoff) =>
  cut.key === 'C24' ? (['indep', 'informed', 'explore2'] as const) : (['indep'] as const);

const membersOf = (cut: Cutoff, pilot: boolean): Member[] => {
  const members: Member[] = [];

  for (const lane of lanesAt(cut))
    for (const family of familyKeys) {
      const file = out(pilot, 'search', cut.key, `${lane}-${family}.json`);

      if (!fs.existsSync(file)) throw new Error(`the search record ${file} is missing`);

      const rec = readJson<LaneResult>(file);

      for (const s of rec.shortlist)
        members.push({
          id: s.id,
          candidate: { family: s.family, grid: s.grid },
          lane,
          source: `${cut.key}-${lane}-${family} ${s.slot}`,
          ...(lane === 'explore2' ? { settings: { costBps: 2 } } : {})
        });
    }

  if (cut.key === 'C24')
    for (const family of familyKeys)
      for (const g of incumbentGrids) {
        const c = candidateOf(family, g.grid);

        members.push({ id: idOf(c), candidate: c, lane: 'incumbent', source: `intraday-D1 incumbent ${g.id} as ${family}` });
      }

  // one evidence per (id, cost lane); the first source is kept, the others listed
  const seen = new Map<string, Member>();

  for (const m of members) {
    const k = `${m.id}|${m.settings?.costBps ?? 5}`;
    const prev = seen.get(k);

    if (prev) prev.source += `; ${m.source}`;
    else seen.set(k, { ...m });
  }

  return [...seen.values()];
};

// ---- the commands ---------------------------------------------------------------------------------------------------

export const commands: Record<string, (o: Opts) => Promise<void>> = {
  bench: async (o) => {
    const res = await bench({
      door: o.option('door', 'D24') as DoorKey,
      centres: Number(o.option('centres', '96')),
      workers: Number(o.option('workers', '12')),
      gcEvery: Number(o.option('gc', '1024')),
      label: o.option('label', 'b')!
    });
    const file = path.join(cacheDir, 'pilot', 'bench.jsonl');

    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `${JSON.stringify({ at: nowIso(), ...res })}\n`);
  },

  parity: async (o) => {
    const started = Date.now();
    const { results, failures } = await runParity();
    const body = { stage: 'parity', at: nowIso(), code: codeDigest(), passed: failures.length === 0, failures, results, runtimeSeconds: (Date.now() - started) / 1000 };

    log(`parity: ${failures.length} failures in ${body.runtimeSeconds.toFixed(0)} s`);
    for (const f of failures.slice(0, 40)) log(`  FAILED ${f}`);
    if (o.flag('dry')) return;

    writeSealed(resultFile('parity', failures.length ? `parity-attempt${o.option('attempt', '1')}-failed.json` : 'parity.json'), body, 'parity');
    if (failures.length) process.exitCode = 1;
  },

  // The protocol freeze (after the pilot): the hashes, the code digest, pins, budgets and the resource contract.
  'freeze-protocol': async () => {
    const r = requireStandardAdoption(studyDir, { repoRoot: process.cwd() });

    if (!fs.existsSync(resultFile('parity', 'parity.json'))) throw new Error('the sealed parity record is missing');

    const parity = readJson<{ passed: boolean; code: { digest: string } }>(resultFile('parity', 'parity.json'));
    const code = codeDigest();

    if (!parity.passed) throw new Error('parity did not pass');

    const body = {
      stage: 'protocol-freeze',
      at: nowIso(),
      standard: { version: r.version },
      protocolSha256: fileSha256(protocolFile),
      adoptionSha256: fileSha256(path.join(studyDir, 'STANDARD_ADOPTION.json')),
      briefSha256: fileSha256(briefFile),
      amendmentsSha256: fileSha256(amendmentsFile),
      complianceMapSha256: fileSha256(path.join(studyDir, 'STANDARD_COMPLIANCE_MAP.md')),
      findingsSha256: fileSha256(path.join(studyDir, 'EXISTING_FINDINGS_AND_CHANGE_MAP.md')),
      parity: { file: resultFile('parity', 'parity.json'), sha256: fileSha256(resultFile('parity', 'parity.json')), codeDigest: parity.code.digest },
      codeDigest: code.digest,
      codeFiles: code.files,
      data: { file: 'data/VGT/data.csv', sha256: dataSha256, doors: prefixDoors },
      head: git('rev-parse', 'HEAD'),
      budgets,
      resources
    };

    writeSealed(freezeFile, body, 'protocol-freeze');
    log(`protocol frozen: ${body.protocolSha256.slice(0, 12)}…, code ${code.digest.slice(0, 12)}…; commit it before searching`);
  },

  search: async (o) => {
    const pilot = o.flag('pilot');
    const cut = cutoffOf(o.option('cutoff'), pilot);
    const lane = o.option('lane', 'indep') as 'indep' | 'informed' | 'explore2';
    const family = o.option('family') as FamilyKey;

    if (!familyKeys.includes(family)) throw new Error(`unknown family ${family}`);
    if (!pilot) requireFrozen();
    if (lane !== 'indep' && !(cut.key === 'C24' || pilot)) throw new Error(`the ${lane} lane runs at C24 only`);

    const tag = pilot ? o.option('tag', '') : '';
    const file = out(pilot, 'search', cut.key, `${lane}-${family}${tag ? `-${tag}` : ''}.json`);

    if (!pilot && fs.existsSync(file)) throw new Error(`${file} is sealed; a completed search never reruns`);
    if (!pilot && fs.existsSync(resultFile('qualify', `${cut.key}.json`))) throw new Error(`${cut.key} is qualified already`);

    const job = `${pilot ? 'pilot-' : ''}${cut.key}-${lane}-${family}${tag ? `-${tag}` : ''}`;
    const lab = new Lab(job, cut.door, `search ${job}`, {
      workers: Number(o.option('workers', String(resources.workers))),
      ...(o.option('kill-after') ? { killAfter: Number(o.option('kill-after')) } : {})
    });
    const result = await withLab(lab, () =>
      runLane(lab, {
        cutoff: cut.key,
        lane,
        family,
        settings: lane === 'explore2' ? { costBps: 2 } : {},
        budget: pilot ? budgets.pilot : budgets[lane],
        ...(lane === 'informed' ? { seeds: informedSeeds(family) } : {})
      })
    );
    const body = {
      stage: 'search',
      at: nowIso(),
      job,
      door: cut.door,
      doorSha256: prefixDoors[cut.door as Exclude<DoorKey, 'FULL'>].sha256,
      codeDigest: codeDigest().digest,
      counters: lab.counters,
      archive: { file: lab.archive.file, records: lab.archive.size, loadedOnStart: lab.archive.loaded },
      elapsedSeconds: lab.elapsedSeconds,
      memory: lab.memoryLog.slice(-5),
      ...result
    };

    save(pilot, file, body, `search ${job}`);
    log(`${job}: ${result.counts.distinctProposals} proposals, ${lab.counters.requested} evaluations (${lab.counters.fresh} fresh), shortlist ${result.counts.shortlist}, ${lab.elapsedSeconds.toFixed(0)} s`);
  },

  qualify: async (o) => {
    const pilot = o.flag('pilot');
    const cut = cutoffOf(o.option('cutoff'), pilot);

    if (!pilot) requireFrozen();

    const file = out(pilot, 'qualify', `${cut.key}.json`);

    if (!pilot && fs.existsSync(file)) throw new Error(`${file} is sealed`);

    const members = membersOf(cut, pilot);
    const lab = new Lab(`${pilot ? 'pilot-' : ''}${cut.key}-qualify`, cut.door, `qualification ${cut.key}`, {
      workers: Number(o.option('workers', String(resources.workers)))
    });
    const evidence = await withLab(lab, async () => {
      const list: { evidence: Evidence; behaviour: Behaviour }[] = [];

      for (const m of members) {
        list.push(await evidenceOf(lab, cut.key, m));
        log(`${cut.key} ${m.id} (${m.lane}): net ${list.at(-1)!.evidence.centre.net.toFixed(0)}, qualified ${list.at(-1)!.evidence.qualified}`);
      }

      return list;
    });
    const selectable = evidence.filter((e) => e.evidence.lane !== 'explore2');
    const decision = decide(selectable);
    const independent = decide(evidence.filter((e) => e.evidence.lane === 'indep'));
    const exploratory = decide(evidence.filter((e) => e.evidence.lane === 'explore2'));
    const body = {
      stage: 'qualify',
      at: nowIso(),
      cutoff: cut.key,
      door: cut.door,
      codeDigest: codeDigest().digest,
      counters: lab.counters,
      gates: 'Q1 centre net > 0; Q2 centre maximum minute DD ≤ $35,000; Q3 confirmation (3 × 128) p90 maximum minute DD ≤ $35,000',
      selectableLanes: cut.key === 'C24' ? ['indep', 'informed', 'incumbent'] : ['indep'],
      decision,
      independent,
      exploratory2bp: exploratory,
      members: evidence.map((e) => e.evidence),
      entries: Object.fromEntries(evidence.map((e) => [`${e.evidence.id}|${e.evidence.lane}`, e.behaviour.entries]))
    };

    save(pilot, file, body, `qualify ${cut.key}`);
    log(`${cut.key}: ${decision.qualified.length} of ${selectable.length} selectable members qualified; primary ${decision.primary ?? 'none'}`);
  },

  // A fold's frozen selection (its independent primary and roles), sealed — and committed before its slice opens.
  'seal-fold': async (o) => {
    const pilot = o.flag('pilot');
    const cut = cutoffOf(o.option('cutoff'), pilot);

    if (!pilot) requireFrozen();
    if (cut.key === 'C24') throw new Error('C24 is frozen by freeze-selection');

    const q = readJson<{ decision: ReturnType<typeof decide>; members: Evidence[] }>(out(pilot, 'qualify', `${cut.key}.json`));
    const ids = [...new Set([q.decision.roles.actualProfit, q.decision.roles.robustProfit, q.decision.roles.balanced, q.decision.roles.lowerDrawdown].filter((x): x is string => Boolean(x)))];
    const body = {
      stage: 'fold-selection',
      at: nowIso(),
      cutoff: cut.key,
      qualification: { file: out(pilot, 'qualify', `${cut.key}.json`), sha256: fileSha256(out(pilot, 'qualify', `${cut.key}.json`)) },
      primary: q.decision.primary,
      roles: q.decision.roles,
      members: ids.map((id) => {
        const e = q.members.find((m) => m.id === id && m.lane === 'indep')!;

        return { id, family: e.family, grid: e.grid, describe: e.describe, developmentNet: e.centre.net, developmentDd: e.centre.dd };
      }),
      slice: cut.slice,
      evalDoor: cut.evalDoor
    };

    save(pilot, out(pilot, 'folds', `${cut.key}-selection.json`), body, `fold selection ${cut.key}`);
    log(`${cut.key} selection sealed: primary ${body.primary ?? 'none'}; commit it before fold-eval`);
  },

  'fold-eval': async (o) => {
    const pilot = o.flag('pilot');
    const cut = cutoffOf(o.option('cutoff'), pilot);
    const selFile = out(pilot, 'folds', `${cut.key}-selection.json`);

    if (!pilot) {
      requireFrozen();
      if (!isCommitted(selFile)) throw new Error(`${selFile} must be committed before its slice opens`);
    }

    const sel = readJson<{ members: { id: string; family: FamilyKey; grid: Candidate['grid'] }[]; primary: string | null; roles: Record<string, string | null> }>(selFile);
    const view = viewOf(openPrefixDoor(cut.evalDoor as Exclude<DoorKey, 'FULL'>, `fold evaluation ${cut.key} (selection ${fileSha256(selFile).slice(0, 12)})`));
    const rows = sel.members.map((m) => {
      const s = sliceOf(view, { ruleSet: m.family, grid: m.grid }, cut.end, cut.slice[1]);

      return {
        id: m.id,
        roles: Object.entries(sel.roles).filter(([, v]) => v === m.id).map(([k]) => k),
        sliceNet: s.net,
        sliceResetDd: s.resetDd.maximum,
        wholeRunDdToSliceEnd: s.wholeDd.maximum,
        lotsInSlice: s.lotsInSlice,
        crossing: s.crossing,
        openAtEnd: s.openAtEnd
      };
    });
    const controls = [
      { id: 'daily D1 primary (harmonized)', r: () => sliceDaily(view, cut) },
      { id: `intraday-D1 ${incumbentGrids[0]!.id} (L0)`, r: () => sliceOf(view, { ruleSet: 'L0', grid: incumbentGrids[0]!.grid }, cut.end, cut.slice[1]) }
    ].map((c) => {
      const s = c.r();

      return { id: c.id, sliceNet: s.net, sliceResetDd: s.resetDd.maximum, lotsInSlice: s.lotsInSlice };
    });
    const body = { stage: 'fold-evaluation', at: nowIso(), cutoff: cut.key, evalDoor: cut.evalDoor, slice: cut.slice, selection: { file: selFile, sha256: fileSha256(selFile), commit: pilot ? null : isCommitted(selFile) }, members: rows, controlsDescriptive: controls };

    save(pilot, out(pilot, 'folds', `${cut.key}-evaluation.json`), body, `fold evaluation ${cut.key}`);
    for (const r of rows) log(`${cut.key} ${r.id}: slice net ${r.sliceNet.toFixed(0)}, reset DD ${r.sliceResetDd.toFixed(0)}`);
  },

  sequential: async (o) => {
    const pilot = o.flag('pilot');

    if (!pilot) requireFrozen();

    const parts = [];

    for (const key of pilot ? (['P18'] as const) : (['C19', 'C21', 'C23'] as const)) {
      const cut = cutoffs[key];
      const selFile = out(pilot, 'folds', `${key}-selection.json`);

      if (!fs.existsSync(out(pilot, 'folds', `${key}-evaluation.json`))) throw new Error(`${key} is not evaluated`);

      const sel = readJson<{ primary: string | null; members: { id: string; family: FamilyKey; grid: Candidate['grid'] }[] }>(selFile);
      const view = viewOf(openPrefixDoor(cut.evalDoor as Exclude<DoorKey, 'FULL'>, `sequential procedure ${key}`));
      const m = sel.members.find((x) => x.id === sel.primary);
      const slice = m ? sliceOf(view, { ruleSet: m.family, grid: m.grid }, cut.end, cut.slice[1]) : null;

      parts.push({ cutoff: key, id: sel.primary, slice, cutCloseTime: view.door.sessions[lastSessionOn(view, cut.end)]!.closeTime });
    }

    const seq = sequentialOf(parts);
    const every = parts.every((p) => p.id);
    const verdict = !every ? 'incomplete (a fold has no primary)' : seq.net > 0 && seq.minuteDd <= 35_000 ? 'supported' : 'unsupported';
    const body = { stage: 'sequential', at: nowIso(), rule: 'supported iff every fold produced a primary, the sequential net > 0 and the sequential minute DD ≤ $35,000', everyFoldHasPrimary: every, ...seq, verdict };

    save(pilot, out(pilot, 'folds', 'sequential.json'), body, 'sequential');
    log(`sequential: net ${seq.net.toFixed(0)}, DD ${seq.minuteDd.toFixed(0)}, verdict ${verdict}`);
  },

  // The L0–L5 rule ladder on fixed development-era vectors (explanatory; development door only).
  ablation: async (o) => {
    const pilot = o.flag('pilot');

    if (!pilot) requireFrozen();

    const view = viewOf(openPrefixDoor(pilot ? 'P18' : 'D24', `${pilot ? 'pilot ' : ''}ablation L0–L5 (development)`));
    const vectors = ablationVectors();
    const rungs = ['L0', 'L1', 'L2', 'L3', 'L4', 'L5'] as const;
    const rows: Record<string, unknown>[] = [];
    const detail: Record<string, unknown>[] = [];

    for (const v of vectors) {
      let prev: RunResult | null = null;

      for (const rung of rungs) {
        const r = v.session ? runSession(view, rung, {}) : run(view, { ruleSet: rung, grid: v.grid! });
        const s = summaryOf(r);
        const delta = prev ? ledgerDelta(prev, r) : null;

        rows.push({ vector: v.key, provenance: v.provenance, rung, ...s, ...(delta ?? {}) });
        prev = r;
      }

      detail.push({ vector: v.key, provenance: v.provenance, describe: v.describe });
    }

    save(pilot, out(pilot, 'ablation', 'ablation.json'), { stage: 'ablation', at: nowIso(), door: view.door.key, vectors: detail, rows }, 'ablation');
    saveText(pilot, out(pilot, 'ablation', 'ablation.csv'), csvOf(rows), 'ablation');
    log(`ablation: ${vectors.length} vectors × ${rungs.length} rungs`);
  },

  // The controls on development, native and harmonized (to the cent; PROTOCOL.md §4).
  controls: async (o) => {
    const pilot = o.flag('pilot');

    if (!pilot) requireFrozen();

    const view = viewOf(openPrefixDoor(pilot ? 'P18' : 'D24', `${pilot ? 'pilot ' : ''}controls (development)`));
    const rows = controlRuns(view).map((c) => ({ key: c.key, convention: c.convention, provenance: c.provenance, ...summaryOf(c.r) }));

    save(pilot, out(pilot, 'controls', 'development.json'), { stage: 'controls', at: nowIso(), door: view.door.key, rows }, 'controls');
    for (const r of rows) log(`control ${r.key} (${r.convention}): net ${(r.net as number).toFixed(2)}, DD ${(r.dd as number).toFixed(2)}`);
  },

  // Report-only development diagnostics of the C24 frozen set and the controls (before the validation freeze).
  diagnostics: async (o) => {
    const pilot = o.flag('pilot');

    if (!pilot) requireFrozen();

    const q = readJson<C24Qualification>(out(pilot, 'qualify', pilot ? 'P18.json' : 'C24.json'));
    const view = viewOf(openPrefixDoor(pilot ? 'P18' : 'D24', `${pilot ? 'pilot ' : ''}C24 diagnostics (development)`));
    const set = c24Set(q);
    const subjects = set.map((m) => ({ key: `${m.id}${m.lane === 'explore2' ? ' (2 bps)' : ''}`, spec: { ruleSet: m.family as RuleSet, grid: m.grid, settings: m.lane === 'explore2' ? { costBps: 2 } : {} } as RunSpec }));
    const out2: Record<string, unknown>[] = [];

    for (const s of subjects) {
      const r = run(view, s.spec);
      const ledger = ledgerOf(view, r);
      const slug = s.key.replace(/[^A-Za-z0-9.-]+/g, '_');

      saveText(pilot, out(pilot, 'diagnostics', 'ledgers', `${slug}.csv`), csvOf(ledger as never), 'diagnostics ledger');
      saveText(pilot, out(pilot, 'diagnostics', 'years', `${slug}.csv`), csvOf(yearTableOf(view, r) as never), 'diagnostics years');
      out2.push({
        key: s.key,
        summary: summaryOf(r),
        concentration: concentrationOf(view, s.spec, r),
        capacity: {
          medianParticipationCausal: median(ledger.map((l) => l.participationCausal).filter(Number.isFinite)),
          flagged: ledger.filter((l) => l.capacityFlag).length
        },
        costCurve: Object.fromEntries([0, 2, 5, 10, 20].map((c) => [`${c}bps`, recOf(run(view, { ...s.spec, settings: { ...s.spec.settings, costBps: c } })).net]))
      });
    }

    save(pilot, out(pilot, 'diagnostics', 'diagnostics.json'), { stage: 'diagnostics', at: nowIso(), door: view.door.key, subjects: out2 }, 'diagnostics');
    log(`diagnostics: ${out2.length} subjects`);
  },

  // The C24 frozen selection (primary, roles, catalog, shortlist, diagnostics, the validation plan), sealed — and
  // committed before the validation door opens.
  'freeze-selection': async (o) => {
    const pilot = o.flag('pilot');
    const qf = pilot ? 'qualify/P18.json' : 'qualify/C24.json';
    const records = [qf, 'folds/sequential.json', 'diagnostics/diagnostics.json', 'ablation/ablation.json', 'controls/development.json'];
    const rf = (f: string) => out(pilot, ...f.split('/'));

    if (!pilot) requireFrozen();

    for (const f of records) if (!fs.existsSync(rf(f))) throw new Error(`${rf(f)} is missing`);

    const q = readJson<C24Qualification>(rf(qf));
    const seq = readJson<{ verdict: string; net: number; minuteDd: number }>(rf('folds/sequential.json'));
    const body = {
      stage: 'FROZEN_SELECTION',
      at: nowIso(),
      protocolSha256: fileSha256(protocolFile),
      codeDigest: codeDigest().digest,
      dataSha256,
      records: Object.fromEntries(records.map((f) => [f, fileSha256(rf(f))])),
      primary: q.decision.primary,
      roles: q.decision.roles,
      catalog: q.decision.catalog,
      pareto: q.decision.pareto,
      independent: { primary: q.independent.primary, roles: q.independent.roles },
      exploratory2bp: { primary: q.exploratory2bp.primary, roles: q.exploratory2bp.roles },
      sequentialVerdict: seq,
      set: c24Set(q),
      validationPlan: validationPlan
    };

    save(pilot, pilot ? path.join(cacheDir, 'pilot', 'FROZEN_SELECTION.json') : frozenSelectionFile, body, 'freeze-selection');
    log(`FROZEN_SELECTION sealed: primary ${body.primary ?? 'none'}; commit it before validate`);
  },

  validate: async (o) => {
    // --pilot: the whole path on D19 with 2017 / 2018 standing in for 2024 / 2025 (engineering only; FULL never opens)
    const pilot = o.flag('pilot');
    const fsel = pilot ? path.join(cacheDir, 'pilot', 'FROZEN_SELECTION.json') : frozenSelectionFile;
    const boundary = pilot ? { development: '2017', first: '2018' } : { development: '2024', first: '2025' };

    if (!pilot) requireFrozen();

    const committed = pilot ? 'pilot' : isCommitted(frozenSelectionFile);

    if (!committed) throw new Error('FROZEN_SELECTION.json must be committed before the validation door opens');
    if (!pilot && fs.existsSync(resultFile('validation', 'validation.json'))) throw new Error('validation is sealed; it runs once');

    const frozen = readJson<{ set: SetMember[]; primary: string | null; roles: Record<string, string | null>; catalog: { id: string }[] }>(fsel);
    const frozenSha = fileSha256(fsel);
    const view = viewOf(
      pilot
        ? openPrefixDoor('D19', 'pilot validation path (engineering; 2017/2018 stand in for 2024/2025)')
        : openFullDoor({ frozenSha256: frozenSha, committed: true }, `validation (FROZEN_SELECTION ${frozenSha.slice(0, 12)}, commit ${committed.slice(0, 12)})`)
    );
    const ceiling = 35_000;
    const rows: Record<string, unknown>[] = [];

    for (const m of frozen.set) {
      const spec: RunSpec = { ruleSet: m.family as RuleSet, grid: m.grid, settings: m.lane === 'explore2' ? { costBps: 2 } : {} };
      const w = windowsOf(view, spec, boundary);
      const slug = `${m.id}${m.lane === 'explore2' ? ' (2 bps)' : ''}`.replace(/[^A-Za-z0-9.-]+/g, '_');

      saveText(pilot, out(pilot, 'validation', 'ledgers', `${slug}.csv`), csvOf(ledgerOf(view, w.result) as never), 'validation ledger');
      saveText(pilot, out(pilot, 'validation', 'years', `${slug}.csv`), csvOf(w.years as never), 'validation years');
      rows.push({
        id: m.id,
        lane: m.lane,
        tags: m.tags,
        family: m.family,
        development: w.development,
        y2025: w.y2025,
        y2026: w.y2026,
        validation: w.validation,
        validationResetDd: w.validationResetDd.maximum,
        wholeRunDd: w.wholeRunDd.maximum,
        wholeRunDdTrough: new Date(w.wholeRunDd.troughTime * 1000).toISOString(),
        full: w.full,
        lotsAfterBoundary: w.lotsAfterBoundary,
        crossingBoundary: w.crossingBoundary,
        openAtEnd: w.openAtEnd,
        V1: w.validation > 0,
        V2: w.validationResetDd.maximum <= ceiling,
        V3: w.wholeRunDd.maximum <= ceiling,
        stresses: Object.fromEntries(stresses.map(({ key, ...st }) => [key, windowsOf(view, { ...spec, settings: { ...spec.settings, ...st } }, boundary).validation])),
        years: w.years
      });
    }

    // report-only: the confirmation rep-1 family (128 draws) on FULL for the primary and the role and catalog members
    const nbIds = new Set([frozen.primary, ...Object.values(frozen.roles), ...frozen.catalog.map((c) => c.id)].filter((x): x is string => Boolean(x)));
    const neighbourhoods: Record<string, unknown> = {};

    for (const id of nbIds) {
      const c = parseId(id);
      const d = designOf(c, { name: 'confirm1', n: 128, labels: ['nbhd', 'confirm', 1, pilot ? 'P18' : 'C24'] });
      const vals = d.draws.map((x) => {
        const w = windowsOf(view, { ruleSet: x.candidate.family, grid: x.candidate.grid }, boundary);

        return { validation: w.validation, wholeRunDd: w.wholeRunDd.maximum, validationResetDd: w.validationResetDd.maximum };
      });
      const v = vals.map((x) => x.validation).sort((a, b) => a - b);

      neighbourhoods[id] = {
        n: vals.length,
        medianValidation: v[v.length >> 1],
        p10Validation: v[Math.floor(v.length * 0.1)],
        positiveShare: vals.filter((x) => x.validation > 0).length / vals.length,
        wholeRunBreachShare: vals.filter((x) => x.wholeRunDd > ceiling).length / vals.length,
        validationBreachShare: vals.filter((x) => x.validationResetDd > ceiling).length / vals.length
      };
    }

    const controls = controlRuns(view, boundary).map((c) => {
      const w = c.window();

      return { key: c.key, convention: c.convention, development: w.development, y2025: w.y2025, y2026: w.y2026, validation: w.validation, validationResetDd: w.validationResetDd.maximum, wholeRunDd: w.wholeRunDd.maximum, full: w.full };
    });

    save(pilot, out(pilot, 'validation', 'validation.json'), { stage: 'validation', at: nowIso(), door: 'FULL', frozenSelectionSha256: frozenSha, frozenCommit: committed, endpoint: chronology.endpoint, splits: view.door.splits, members: rows, neighbourhoods, controls }, 'validation');
    log(`validation: ${rows.length} members; primary ${frozen.primary ?? 'none'}`);
  }
};

// ---- helpers --------------------------------------------------------------------------------------------------------

interface C24Qualification {
  decision: ReturnType<typeof decide>;
  independent: ReturnType<typeof decide>;
  exploratory2bp: ReturnType<typeof decide>;
  members: Evidence[];
}

interface SetMember {
  id: string;
  lane: string;
  family: string;
  grid: Candidate['grid'];
  tags: string[];
  qualified: boolean;
}

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);

  return s.length ? s[s.length >> 1]! : NaN;
};

// The frozen C24 set: every evaluated member (selectable, independent, informed, incumbent and the 2-bp lane) with its
// tags (roles, catalog, Pareto, diagnostic); the diagnostic catalog = the best non-qualified member of each family.
const c24Set = (q: C24Qualification): SetMember[] => {
  const tags = new Map<string, string[]>();
  const tag = (id: string | null, t: string) => {
    if (!id) return;
    tags.set(id, [...(tags.get(id) ?? []), t]);
  };

  for (const [role, id] of Object.entries(q.decision.roles)) if (role !== 'lowerDrawdownNote') tag(id as string | null, `role:${role}`);
  if (q.decision.primary) tag(q.decision.primary, 'primary');
  for (const c of q.decision.catalog) tag(c.id, 'catalog');
  for (const id of q.decision.pareto) tag(id, 'pareto');
  for (const [role, id] of Object.entries(q.independent.roles)) if (role !== 'lowerDrawdownNote') tag(id as string | null, `independent:${role}`);

  for (const f of familyKeys) {
    const best = q.members.filter((m) => m.family === f && !m.qualified && m.lane !== 'explore2').sort((a, b) => b.centre.net - a.centre.net)[0];

    if (best) tag(best.id, 'diagnostic (not qualified)');
  }

  return q.members.map((m) => ({
    id: m.id,
    lane: m.lane,
    family: m.family,
    grid: m.grid,
    qualified: m.qualified,
    tags: m.lane === 'explore2' ? ['exploratory 2 bps', ...(q.exploratory2bp.primary === m.id ? ['exploratory primary'] : [])] : tags.get(m.id) ?? []
  }));
};

const validationPlan = {
  door: 'FULL: the whole canonical file (sha256 pinned), the recorded 8:1 split of 2026-04-21 forward-adjusted; opened once, after this record is committed',
  window: '2025-01-02 → 2026-10-30, one continuous causal run from 2016-01-04 (nothing liquidated or reset at 2024-12-31)',
  members: 'every member of `set` (labelled by lane and tags) and the controls',
  tests: 'V1 validation P&L (marked net at the end − at the 2024-12-31 close) > 0; V2 validation reset minute DD ≤ $35,000; V3 whole-run minute DD ≤ $35,000 — reported for every member, decisive for none: no reselection, retuning, range or rule change, rescue search or role change follows any result',
  reportOnly: '2025 and 2026 (partial) separately; per-year marked P&L and reset DD; the stresses (0/2/10/20 bps, 14%, next-open, +25 bps slippage, minute low); the confirmation rep-1 family (128 draws, labels nbhd/confirm/1/C24) on FULL for the primary, role and catalog members; ledgers; the controls native and harmonized',
  disclosure: 'validation on previously examined history, not an untouched holdout'
};

const summaryOf = (r: RunResult) => {
  const closed = r.lots.filter((l) => !l.open);
  const holds = closed.map((l) => (l.exitTime - l.entryTime) / 60).sort((a, b) => a - b);

  return {
    net: r.net,
    realized: r.realized,
    unrealized: r.unrealized,
    grossPreCost: r.lots.reduce((t, l) => t + l.gross + l.costs, 0),
    friction: r.costs,
    interest: r.interest,
    dd: r.minuteDrawdown.maximum,
    ddPeak: new Date(r.minuteDrawdown.peakTime * 1000).toISOString(),
    ddTrough: new Date(r.minuteDrawdown.troughTime * 1000).toISOString(),
    trades: r.lots.length,
    wins: r.lots.filter((l) => l.net > 0).length,
    losses: r.lots.filter((l) => l.net <= 0).length,
    worstLoss: r.lots.reduce((m, l) => Math.min(m, l.net), 0),
    bestWin: r.lots.reduce((m, l) => Math.max(m, l.net), 0),
    medianHoldMinutes: holds.length ? holds[holds.length >> 1]! : 0,
    sameSessionShare: closed.length ? closed.filter((l) => l.exitSession === l.entrySession).length / closed.length : 0,
    overnightShare: closed.length ? closed.filter((l) => l.exitSession !== l.entrySession).length / closed.length : 0,
    exitReasons: r.lots.reduce<Record<string, number>>((m, l) => ((m[l.exitReason || 'open'] = (m[l.exitReason || 'open'] ?? 0) + 1), m), {})
  };
};

const ledgerDelta = (a: RunResult, b: RunResult) => {
  const key = (l: RunResult['lots'][number]) => `${l.entryBar}`;
  const exitKey = (l: RunResult['lots'][number]) => `${l.entryBar}:${l.exitBar}`;
  const ea = new Set(a.lots.map(key));
  const eb = new Set(b.lots.map(key));
  const xa = new Set(a.lots.map(exitKey));

  return {
    entriesKept: b.lots.filter((l) => ea.has(key(l))).length,
    entriesAdded: b.lots.filter((l) => !ea.has(key(l))).length,
    entriesRemoved: a.lots.filter((l) => !eb.has(key(l))).length,
    tradesIdentical: b.lots.filter((l) => xa.has(exitKey(l))).length,
    exitsChanged: b.lots.filter((l) => ea.has(key(l)) && !xa.has(exitKey(l))).length,
    netChange: b.net - a.net
  };
};

// The fixed ablation vectors (PROTOCOL.md §8): their provenance is declared; every intraday-D1 vector is an INFORMED
// control (selected or diagnosed on 2016–2024 by the completed study), never an independent seed.
const ablationVectors = () => {
  const byId = (id: string) => diagnosticGrids.find((g) => g.id === id)!.grid;

  return [
    { key: 'A1', grid: incumbentGrids[0]!.grid, session: false, provenance: 'informed: intraday-D1 frozen shortlist #1 (the near-miss)', describe: describe(candidateOf('F4', incumbentGrids[0]!.grid)) },
    { key: 'A2', grid: byId('id-2.k.1v.19.1q.19.1b.v.1p'), session: false, provenance: 'informed: intraday-D1 diagnostics, most profitable genuinely intraday archive configuration', describe: describe(candidateOf('F4', byId('id-2.k.1v.19.1q.19.1b.v.1p'))) },
    { key: 'A3', grid: byId('id-0.1p.17.1q.1r.9.2b.17.1f'), session: false, provenance: 'informed: intraday-D1 diagnostics, best B5 configuration', describe: describe(candidateOf('F4', byId('id-0.1p.17.1q.1r.9.2b.17.1f'))) },
    { key: 'A4', grid: byId('id-3.1p.15.1h.1s.5.1.h.k'), session: false, provenance: 'informed: intraday-D1 diagnostics, best B30 configuration', describe: describe(candidateOf('F4', byId('id-3.1p.15.1h.1s.5.1.h.k'))) },
    { key: 'A5', grid: null, session: true, provenance: 'control: daily D1 primary on the session clock (L0 = canonical D1 under this study’s economics)', describe: 'session clock, X 21.6% Y 0.3% stop 7.3% hold 8 days L 74 sessions buffer 2.9% P 9% W 60 sessions' }
  ];
};

const runSession = (view: DoorView, rung: keyof typeof ladder, settings: RunSpec['settings'], extra: { endSession?: number; segmentEnds?: number[]; marks?: boolean } = {}) =>
  simulate(view.market, sessionClock(view.market, view.door.sessions), ladder[rung], dailyParams, settingsOf(settings), { armFromSession: view.armFrom, endSession: extra.endSession ?? view.end, ...(extra.segmentEnds ? { segmentEnds: extra.segmentEnds } : {}) }, { marks: extra.marks ?? false });

const sliceDaily = (view: DoorView, cut: Cutoff) => {
  const c = lastSessionOn(view, cut.end);
  const e = lastSessionOn(view, cut.slice[1]);
  const r = runDaily(view, {}, 'harmonized', { endSession: e, segmentEnds: [c] });
  const close = view.door.sessions[c]!.closeTime;

  return { net: r.dailyMarks[e]! - r.dailyMarks[c]!, resetDd: r.segments[1]!.drawdown, lotsInSlice: r.lots.filter((l) => l.entryTime > close).length };
};

// The controls: native (each one's own conventions) and harmonized (this study's economics and arming date).
const controlRuns = (view: DoorView, boundary = { development: '2024', first: '2025' }) => {
  const yearEnds = view.yearEnds;
  const d1Native = () => runDaily(view, { costBps: 0 }, 'native');
  const d1Harm = () => runDaily(view, {}, 'harmonized');
  const id1 = () => run(view, { ruleSet: 'L0', grid: incumbentGrids[0]!.grid });
  const windowOfRun = (r: () => RunResult, spec: (s: number[]) => RunResult) => () => {
    const full = spec(yearEnds);
    const d24 = yearEnds.find((e) => view.door.sessions[e]!.date.startsWith(boundary.development))!;
    const d25 = yearEnds.find((e) => view.door.sessions[e]!.date.startsWith(boundary.first))!;
    const v = spec([d24]);

    void r;
    return {
      development: full.dailyMarks[d24]!,
      y2025: d25 !== undefined ? full.dailyMarks[d25]! - full.dailyMarks[d24]! : NaN,
      y2026: d25 !== undefined ? full.net - full.dailyMarks[d25]! : NaN,
      validation: full.net - full.dailyMarks[d24]!,
      validationResetDd: v.segments[1]?.drawdown ?? { maximum: NaN, peakTime: NaN, troughTime: NaN },
      wholeRunDd: full.minuteDrawdown,
      full: full.net
    };
  };

  return [
    { key: 'daily D1 primary', convention: 'native: canonical D1 (costs 0, 11%, no arming date, stop fills)', provenance: 'config/phenotypes/D1/VGT.json primary', r: d1Native(), window: windowOfRun(d1Native, (s) => runDaily(view, { costBps: 0 }, 'native', { segmentEnds: s })) },
    { key: 'daily D1 primary', convention: 'harmonized: 5 bps, 11%, arming 2016-02-01 (= research/intraday-d1-vgt B1)', provenance: 'config/phenotypes/D1/VGT.json primary', r: d1Harm(), window: windowOfRun(d1Harm, (s) => runDaily(view, {}, 'harmonized', { segmentEnds: s })) },
    { key: `intraday-D1 ${incumbentGrids[0]!.id}`, convention: 'native = harmonized: L0 (intraday D1), 5 bps, 11%, arming 2016-02-01', provenance: 'research/intraday-d1-vgt frozen shortlist #1 (no role holder; diagnostic near-miss)', r: id1(), window: windowOfRun(id1, (s) => run(view, { ruleSet: 'L0', grid: incumbentGrids[0]!.grid, segmentEnds: s })) }
  ];
};

export { minuteClock };
