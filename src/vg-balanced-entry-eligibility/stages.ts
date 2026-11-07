// The study's stages (PROTOCOL.md §6–§10). Each runs jobs through job.ts and writes its records under results/.
// Selections are sealed when written (read-only file, sha256 logged in results/seals.jsonl).
import fs from 'node:fs';
import path from 'node:path';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { type DoorName, ages, ceiling, chronology, etfSets, folds, log, resultsDir } from './context.ts';
import { sha256File } from './data.ts';
import type { EvalRecord } from './evaluate.ts';
import { runJob } from './job.ts';
import { type Candidate, assignRoles, candidateOf, canonicalRankOf, frontier, refinementTrigger } from './select.ts';
import {
  type Cell,
  type Spec,
  OFF,
  blockOf,
  cellSpec,
  drawsOf,
  gridE,
  gridSpecs,
  label,
  neighbourhoodLabels,
  productDraws,
  specId
} from './specs.ts';

export const writeJson = (file: string, value: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify(value, (_k, v) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v), 2)}\n`
  );
};

export const seal = (file: string, what: string) => {
  fs.chmodSync(file, 0o444);

  const entry = { t: new Date().toISOString(), file: path.relative(resultsDir, file), sha256: sha256File(file), what };

  fs.appendFileSync(path.join(resultsDir, 'seals.jsonl'), `${JSON.stringify(entry)}\n`);
  log(`sealed ${entry.file} (${entry.sha256.slice(0, 16)}…): ${what}`);

  return entry;
};

export const sealed = (file: string) => fs.existsSync(file) && (fs.statSync(file).mode & 0o222) === 0;

const foldOf = (name: string) => {
  const fold = folds.find((f) => f.name === name);

  if (!fold) throw new Error(`no fold ${name}`);

  return fold;
};

export const foldDir = (name: string) => path.join(resultsDir, 'folds', name);

const byKey = (records: readonly EvalRecord[]) => new Map(records.map((r) => [specId(r.spec), r]));

// §6–§7 on one fold's own door.
export const searchFold = async (name: string, workers: number) => {
  const fold = foldOf(name);
  const door = fold.door as DoorName;
  const dir = foldDir(name);
  const selectionFile = path.join(dir, 'selection.json');

  if (sealed(selectionFile)) throw new Error(`${name}: selection already sealed (do not rerun)`);

  const purpose = `${name} selection search`;
  const grid = gridSpecs();
  const gridRecords = byKey(
    await runJob({ name: `grid-${door}`, door, purpose, workers }, [OFF, ...grid.map((g) => g.spec)])
  );
  const off = gridRecords.get(specId(OFF))!;

  // Exploratory neighbourhoods: the 3 × 3 grid block plus 16 seeded draws from the local box, for every grid point.
  const draws = new Map<string, Spec[]>();

  for (const g of grid) {
    draws.set(
      specId(g.spec),
      drawsOf(g.cell, 16, neighbourhoodLabels('explore', name, g.set, g.cell)).map((cell) => cellSpec(g.set, cell))
    );
  }

  const exploreRecords = byKey(
    await runJob({ name: `explore-${door}`, door, purpose, workers }, [...draws.values()].flat())
  );
  const exploreOf = (set: (typeof etfSets)[number], cell: Cell) => [
    ...blockOf(cell).map((c) => gridRecords.get(specId(cellSpec(set, c)))!),
    ...draws.get(specId(cellSpec(set, cell)))!.map((spec) => exploreRecords.get(specId(spec))!)
  ];
  let candidates: Candidate[] = grid.map((g) =>
    candidateOf(
      g.spec,
      g.set,
      gridRecords.get(specId(g.spec))!,
      off,
      exploreOf(g.set, g.cell),
      null,
      canonicalRankOf(g.set, g.cell, ages, gridE)
    )
  );

  // Confirmation neighbourhoods: 32 independent draws, only for exploratory-eligible configurations.
  const eligible = candidates.filter((c) => c.exploratoryEligible);
  const confirmDraws = new Map<string, Spec[]>();

  for (const c of eligible) {
    const g = grid.find((item) => specId(item.spec) === c.key)!;

    confirmDraws.set(
      c.key,
      drawsOf(g.cell, 32, neighbourhoodLabels('confirm', name, g.set, g.cell)).map((cell) => cellSpec(g.set, cell))
    );
  }

  const confirmRecords =
    confirmDraws.size > 0
      ? byKey(await runJob({ name: `confirm-${door}`, door, purpose, workers }, [...confirmDraws.values()].flat()))
      : new Map<string, EvalRecord>();

  candidates = grid.map((g) => {
    const key = specId(g.spec);
    const confirm = confirmDraws.get(key)?.map((spec) => confirmRecords.get(specId(spec))!) ?? null;

    return candidateOf(
      g.spec,
      g.set,
      gridRecords.get(key)!,
      off,
      exploreOf(g.set, g.cell),
      confirm,
      canonicalRankOf(g.set, g.cell, ages, gridE)
    );
  });

  // The ETF-specific refinement (frozen trigger and budget).
  const trigger = refinementTrigger(candidates);
  const refined: Candidate[] = [];

  if (trigger.triggered) {
    const combos: { spec: Spec; vgt: Cell; gdx: Cell }[] = [];

    for (const v of trigger.vgt)
      for (const g of trigger.gdx)
        combos.push({
          spec: { eligibility: { VGT: v.cells.VGT!, GDX: g.cells.GDX! } },
          vgt: v.cells.VGT!,
          gdx: g.cells.GDX!
        });

    const explore = new Map(
      combos.map((c) => [
        specId(c.spec),
        productDraws(c.vgt, c.gdx, 24, ['explore-etf', name, c.vgt.A, c.vgt.e, c.gdx.A, c.gdx.e])
      ])
    );
    const confirm = new Map(
      combos.map((c) => [
        specId(c.spec),
        productDraws(c.vgt, c.gdx, 32, ['confirm-etf', name, c.vgt.A, c.vgt.e, c.gdx.A, c.gdx.e])
      ])
    );
    const records = byKey(
      await runJob({ name: `refine-${door}`, door, purpose: `${name} ETF-specific refinement`, workers }, [
        ...combos.map((c) => c.spec),
        ...[...explore.values()].flat(),
        ...[...confirm.values()].flat()
      ])
    );

    combos.forEach((c, i) => {
      const key = specId(c.spec);

      refined.push(
        candidateOf(
          c.spec,
          'VGT+GDX (ETF-specific)',
          records.get(key)!,
          off,
          explore.get(key)!.map((s) => records.get(specId(s))!),
          confirm.get(key)!.map((s) => records.get(specId(s))!),
          10000 + i
        )
      );
    });
  }

  const all = [...candidates, ...refined];
  const { roles, priority, selected } = assignRoles(all);
  const rows = [off, ...grid.map((g) => gridRecords.get(specId(g.spec))!)];
  const classes = new Map<string, string[]>();

  for (const r of rows) classes.set(r.signature, [...(classes.get(r.signature) ?? []), label(r.spec)]);

  const front = frontier(rows.map((r) => ({ label: label(r.spec), net: r.net, dd: r.dd })));
  const selection = {
    fold: name,
    door,
    lastSession: off.lastSession,
    generatedAt: new Date().toISOString(),
    rule: 'PROTOCOL.md §7 (frozen)',
    off: { net: off.net, dd: off.dd, lots: off.lots, signature: off.signature },
    counts: {
      grid: grid.length,
      activated: candidates.filter((c) => c.late > 0).length,
      changed: candidates.filter((c) => c.changed).length,
      exploratoryEligible: all.filter((c) => c.exploratoryEligible).length,
      qualified: all.filter((c) => c.qualified).length,
      equivalenceClasses: classes.size
    },
    refinement: { triggered: trigger.triggered, combinations: refined.length },
    roles: Object.fromEntries(
      Object.entries(roles).map(([role, c]) => [role, c ? { key: c.key, label: c.label, spec: c.spec } : null])
    ),
    priority: priority.map((c) => ({ key: c.key, label: c.label, spec: c.spec, roles: c.roles })),
    selected: selected
      ? { key: selected.key, label: selected.label, spec: selected.spec }
      : { key: specId(OFF), label: 'OFF', spec: OFF, reason: 'no qualifying improvement' },
    equivalenceClasses: [...classes.entries()].map(([signature, members]) => ({
      signature,
      size: members.length,
      offEquivalent: signature === off.signature,
      members
    })),
    frontier: front,
    lowerRiskChoices: candidates
      .filter((c) => c.ddDelta < 0)
      .map((c) => ({ label: c.label, delta: c.delta, ddDelta: c.ddDelta })),
    candidates: all.map(({ spec, ...c }) => ({ ...c, spec }))
  };

  writeJson(selectionFile, selection);
  fs.writeFileSync(
    path.join(dir, 'candidates.csv'),
    toCsv(
      all.map((c) => ({
        label: c.label,
        set: c.set,
        net: c.net,
        dd: c.dd,
        delta: c.delta,
        ddDelta: c.ddDelta,
        lateLots: c.late,
        changed: c.changed,
        exploreMedianDelta: c.explore.medianDelta,
        exploreP10Delta: c.explore.p10Delta,
        exploreMaxDd: c.explore.maxDd,
        exploreDistinct: c.explore.distinctSignatures,
        exploreShareUnchanged: c.explore.shareUnchangedVsOff,
        confirmMedianDelta: c.confirm?.medianDelta ?? '',
        confirmShareBelow: c.confirm?.shareBelowCeiling ?? '',
        exploratoryEligible: c.exploratoryEligible,
        qualified: c.qualified,
        roles: c.roles.join(' ')
      }))
    )
  );
  seal(selectionFile, `${name} selection (door ${door})`);
  log(
    `${name}: ${selection.counts.activated} activated, ${selection.counts.exploratoryEligible} exploratory-eligible, ${selection.counts.qualified} qualified; selected ${selection.selected.label}`
  );

  return selection;
};

// §8: a fold's selected configuration (and its other role holders) against OFF on the evaluation door.
export const evaluateFold = async (name: string, workers: number) => {
  const fold = foldOf(name);

  if (fold.evaluationDoor === 'FULL') throw new Error('C24 is evaluated by the one-time validation');

  const selectionFile = path.join(foldDir(name), 'selection.json');

  if (!sealed(selectionFile)) throw new Error(`${name}: the selection is not sealed`);

  const selection = JSON.parse(fs.readFileSync(selectionFile, 'utf8'));
  const outFile = path.join(foldDir(name), 'evaluation.json');

  if (sealed(outFile)) throw new Error(`${name}: evaluation already sealed (do not rerun)`);

  const specs: Spec[] = [OFF, selection.selected.spec, ...selection.priority.map((p: { spec: Spec }) => p.spec)];
  const unique = [...new Map(specs.map((s) => [specId(s), s])).values()];
  const records = byKey(
    await runJob(
      {
        name: `eval-${name}-${fold.evaluationDoor}`,
        door: fold.evaluationDoor as DoorName,
        purpose: `${name} evaluation`,
        workers
      },
      unique
    )
  );
  const off = records.get(specId(OFF))!;
  const period = `${name}-eval`;
  const rows = unique.map((spec) => {
    const r = records.get(specId(spec))!;
    const p = r.periods[period]!;
    const o = off.periods[period]!;

    return {
      label: label(spec),
      selected: specId(spec) === selection.selected.key,
      roles: selection.priority.find((x: { key: string }) => x.key === specId(spec))?.roles ?? [],
      evaluation: {
        first: p.first,
        last: p.last,
        pnl: p.pnl,
        delta: p.pnl - o.pnl,
        ddReset: p.dd,
        lateEntered: p.lateEntered,
        lotsEntered: p.lotsEntered
      },
      wholeRun: { net: r.net, delta: r.net - off.net, dd: r.dd, ddBelowCeiling: r.dd < ceiling, late: r.late },
      signatureEqualsOff: r.signature === off.signature
    };
  });

  writeJson(outFile, {
    fold: name,
    evaluationDoor: fold.evaluationDoor,
    period: fold.evaluation,
    selectionSha256: sha256File(selectionFile),
    generatedAt: new Date().toISOString(),
    rows
  });
  seal(outFile, `${name} evaluation on ${fold.evaluationDoor}`);

  return rows;
};

export { chronology };
