// PROTOCOL.md §10: the frozen selection and the one-time validation on FULL (2025-01-02 → 2026-10-30, previously
// examined history). `freezeSelection` writes FROZEN_SELECTION.json from the sealed C24 selection (read-only once
// written; it must then be committed). `validate` opens FULL under that file's guard, once: OFF, every role holder and
// the reference, the tests V1–V3 for role holders, and the pre-specified report-only perturbations.
import fs from 'node:fs';
import path from 'node:path';
import { toCsv } from '../multi-etf-allocator/metrics.ts';
import { ceiling, chronology, freezeFile, log, researchDir, resultsDir } from './context.ts';
import { sha256File } from './data.ts';
import { type Detail, d1StressSpecs, frictionStresses, reference } from './diagnostics.ts';
import type { EvalRecord } from './evaluate.ts';
import { codeDigest, runDetails, runJob } from './job.ts';
import { median, quantile } from './select.ts';
import { type Spec, OFF, cellSpec, drawsOf, label, neighbourhoodLabels, specId } from './specs.ts';
import { foldDir, seal, sealed, writeJson } from './stages.ts';

export const frozenSelectionFile = path.join(researchDir, 'FROZEN_SELECTION.json');

export const freezeSelection = async () => {
  if (fs.existsSync(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json exists (never rewritten)');

  const freeze = JSON.parse(fs.readFileSync(freezeFile, 'utf8'));
  const digest = codeDigest();

  if (digest !== freeze.evaluationCodeDigest)
    throw new Error(`evaluation code digest ${digest} ≠ the frozen ${freeze.evaluationCodeDigest}`);

  const c24File = path.join(foldDir('C24'), 'selection.json');
  const c24 = JSON.parse(fs.readFileSync(c24File, 'utf8'));
  const folds = ['C19', 'C21', 'C23', 'C24'].map((name) => {
    const selection = path.join(foldDir(name), 'selection.json');
    const evaluation = path.join(foldDir(name), 'evaluation.json');

    if (!sealed(selection)) throw new Error(`${name}: selection not sealed`);

    return {
      fold: name,
      selection: { file: path.relative(researchDir, selection), sha256: sha256File(selection) },
      evaluation: fs.existsSync(evaluation)
        ? { file: path.relative(researchDir, evaluation), sha256: sha256File(evaluation) }
        : null,
      selected: JSON.parse(fs.readFileSync(selection, 'utf8')).selected.label
    };
  });
  const diagnosticsFile = path.join(resultsDir, 'diagnostics', 'D24', 'diagnostics.json');
  const roleHolders = c24.priority as { key: string; label: string; spec: Spec; roles: string[] }[];
  const primary = roleHolders[0]?.spec ?? reference;
  const primaryCell = primary.eligibility.VGT ?? primary.eligibility.GDX!;
  const primarySet =
    primary.eligibility.VGT && primary.eligibility.GDX ? 'VGT+GDX' : primary.eligibility.VGT ? 'VGT' : 'GDX';

  writeJson(frozenSelectionFile, {
    study: 'vg-balanced-entry-eligibility',
    frozenAt: new Date().toISOString(),
    protocol: freeze.protocol,
    protocolFreeze: { file: 'results/protocol-freeze.json', sha256: sha256File(freezeFile) },
    evaluationCodeDigest: digest,
    amendmentHead: 'E2',
    c24: {
      selection: { file: path.relative(researchDir, c24File), sha256: sha256File(c24File) },
      selected: c24.selected,
      roleHolders: roleHolders.map((r) => ({ label: r.label, roles: r.roles, spec: r.spec })),
      outcome: roleHolders.length
        ? 'role holders frozen in priority order'
        : 'no qualifying improvement: OFF (the control) retained'
    },
    folds,
    reference: {
      label: label(reference),
      spec: reference,
      note: 'report-only upper bound of activity (PROTOCOL.md §9); never a candidate'
    },
    developmentDiagnostics: fs.existsSync(diagnosticsFile)
      ? { file: path.relative(researchDir, diagnosticsFile), sha256: sha256File(diagnosticsFile) }
      : null,
    validation: {
      door: 'FULL',
      window: {
        first: '2025-01-02',
        last: chronology.validationEnd,
        label: '2025–2026 validation on previously examined history'
      },
      runs: ['OFF', ...roleHolders.map((r) => r.label), label(reference)],
      tests: roleHolders.length
        ? {
            V1: 'whole-run minute DD < $35,000',
            V2: '2025–2026 Δ ≥ $0 vs OFF',
            V3: '2025–2026 minute DD (reset at the 2024-12-31 close) < $35,000'
          }
        : 'not applicable: no role holder (V1–V3 apply to role holders only)',
      reportOnly: {
        neighbourhood: {
          subject: label(primary),
          draws: 32,
          seedLabels: neighbourhoodLabels('confirm', 'C24', primarySet, primaryCell)
        },
        d1Stress: { subject: label(primary), family: 'confirm', n: 128, paired: 'OFF at the same D1 point' },
        friction: frictionStresses.map((s) => s.name)
      },
      rule: 'one opening; no retuning; a failure is reported, never repaired; no winner by validation profit'
    }
  });
  fs.chmodSync(frozenSelectionFile, 0o444);
  log(`FROZEN_SELECTION.json written (${sha256File(frozenSelectionFile)}); commit it before \`validate\``);
};

export const validate = async (workers: number) => {
  const outDir = path.join(resultsDir, 'validation');
  const outFile = path.join(outDir, 'validation.json');

  if (sealed(outFile)) throw new Error('the validation is sealed (opened once; never rerun)');
  if (!sealed(frozenSelectionFile)) throw new Error('FROZEN_SELECTION.json must exist and be read-only');

  const guard = { file: frozenSelectionFile, sha256: sha256File(frozenSelectionFile) };
  const frozen = JSON.parse(fs.readFileSync(frozenSelectionFile, 'utf8'));
  const roleHolders = frozen.c24.roleHolders as { label: string; spec: Spec }[];
  const primary: Spec = roleHolders[0]?.spec ?? reference;
  const primaryCell = primary.eligibility.VGT ?? primary.eligibility.GDX!;
  const primarySet =
    primary.eligibility.VGT && primary.eligibility.GDX ? 'VGT+GDX' : primary.eligibility.VGT ? 'VGT' : 'GDX';
  const subjects: Spec[] = [...roleHolders.map((r) => r.spec), reference].filter(
    (spec, i, all) => all.findIndex((other) => specId(other) === specId(spec)) === i
  );
  const purpose = 'one-time validation (FULL)';
  const neighbourhood = drawsOf(primaryCell, 32, neighbourhoodLabels('confirm', 'C24', primarySet, primaryCell)).map(
    (cell) => cellSpec(primarySet as 'VGT' | 'GDX' | 'VGT+GDX', cell)
  );
  const stress = d1StressSpecs(primary, ['confirm']);
  const frictionSpecs = [OFF, ...subjects].flatMap((spec) =>
    frictionStresses
      .filter((s) => !(specId(spec) === specId(OFF) && s.friction.lateEntryFill))
      .map((s) => ({ ...spec, friction: s.friction }) as Spec)
  );
  const records = new Map(
    (
      await runJob({ name: 'validate-FULL', door: 'FULL', purpose, workers, guard }, [
        OFF,
        ...subjects,
        ...neighbourhood,
        ...stress.flatMap((row) => [row.off, row.variant]),
        ...frictionSpecs
      ])
    ).map((r) => [specId(r.spec), r])
  );
  const details = await runDetails<Detail>({ name: 'validate-FULL-detail', door: 'FULL', purpose, workers, guard }, [
    OFF,
    ...subjects
  ]);
  const off = records.get(specId(OFF))!;
  const v = (r: EvalRecord) => r.periods.validation!;
  const dev = (r: EvalRecord) => r.periods.development!;
  const rowOf = (spec: Spec) => {
    const r = records.get(specId(spec))!;
    const isHolder = roleHolders.some((h) => specId(h.spec) === specId(spec));
    const delta = v(r).pnl - v(off).pnl;

    return {
      label: label(spec),
      kind: specId(spec) === specId(OFF) ? 'control' : isHolder ? 'role holder' : 'reference (report-only)',
      validation: {
        pnl: v(r).pnl,
        delta,
        ddReset: v(r).dd,
        lotsEntered: v(r).lotsEntered,
        lateEntered: v(r).lateEntered,
        first: v(r).first,
        last: v(r).last
      },
      development: { pnl: dev(r).pnl, delta: dev(r).pnl - dev(off).pnl, ddReset: dev(r).dd },
      wholeRun: {
        net: r.net,
        delta: r.net - off.net,
        dd: r.dd,
        ddPeakUtc: r.ddPeakUtc,
        ddTroughUtc: r.ddTroughUtc,
        lots: r.lots,
        late: r.late,
        openLots: r.openLots
      },
      years: { 2025: r.periods['2025']?.pnl, 2026: r.periods['2026']?.pnl },
      signatureEqualsOff: r.signature === off.signature,
      tests: isHolder
        ? {
            V1: r.dd < ceiling ? 'PASS' : 'FAIL',
            V2: delta >= 0 ? 'PASS' : 'FAIL',
            V3: v(r).dd < ceiling ? 'PASS' : 'FAIL',
            exercised:
              v(r).lateEntered > 0 ? 'exercised' : 'not exercised by validation (no delayed entry in 2025–2026)'
          }
        : null
    };
  };
  const pairedValidation = stress.map((row) => {
    const o = records.get(specId(row.off))!;
    const x = records.get(specId(row.variant))!;

    return {
      index: row.index,
      delta: v(x).pnl - v(o).pnl,
      wholeDelta: x.net - o.net,
      late: v(x).lateEntered,
      offDd: o.dd,
      variantDd: x.dd,
      unchanged: x.signature === o.signature
    };
  });
  const nb = neighbourhood.map((spec) => records.get(specId(spec))!);
  const out = {
    generatedAt: new Date().toISOString(),
    label: '2025–2026 validation on previously examined history (one opening)',
    guard: { file: 'FROZEN_SELECTION.json', sha256: guard.sha256 },
    window: {
      first: v(off).first,
      last: v(off).last,
      boundaryClose: '2024-12-31',
      note: 'November–December 2026 do not exist locally and are not tested'
    },
    rows: [OFF, ...subjects].map(rowOf),
    reportOnly: {
      neighbourhood: {
        subject: label(primary),
        n: nb.length,
        medianValidationDelta: median(nb.map((r) => v(r).pnl - v(off).pnl)),
        minValidationDelta: Math.min(...nb.map((r) => v(r).pnl - v(off).pnl)),
        maxValidationDelta: Math.max(...nb.map((r) => v(r).pnl - v(off).pnl)),
        lateEnteredInValidation: nb.reduce((t, r) => t + v(r).lateEntered, 0),
        maxWholeRunDd: Math.max(...nb.map((r) => r.dd))
      },
      d1Stress: {
        subject: label(primary),
        n: pairedValidation.length,
        medianValidationDelta: median(pairedValidation.map((p) => p.delta)),
        p10ValidationDelta: quantile(
          pairedValidation.map((p) => p.delta),
          0.1
        ),
        p90ValidationDelta: quantile(
          pairedValidation.map((p) => p.delta),
          0.9
        ),
        sharePositive: pairedValidation.filter((p) => p.delta > 0.005).length / pairedValidation.length,
        shareNegative: pairedValidation.filter((p) => p.delta < -0.005).length / pairedValidation.length,
        shareZero: pairedValidation.filter((p) => Math.abs(p.delta) <= 0.005).length / pairedValidation.length,
        activatedInValidation: pairedValidation.filter((p) => p.late > 0).length,
        medianWholeRunDelta: median(pairedValidation.map((p) => p.wholeDelta)),
        variantShareBelowCeiling:
          pairedValidation.filter((p) => p.variantDd < ceiling).length / pairedValidation.length,
        offShareBelowCeiling: pairedValidation.filter((p) => p.offDd < ceiling).length / pairedValidation.length
      },
      friction: frictionStresses.map((s) => {
        const o = records.get(specId({ ...OFF, friction: s.friction }));

        return {
          stress: s.name,
          off: o ? { validationPnl: v(o).pnl, dd: o.dd } : null,
          subjects: subjects.map((spec) => {
            const x = records.get(specId({ ...spec, friction: s.friction }))!;
            const base = o ?? off;

            return {
              subject: label(spec),
              validationDelta: v(x).pnl - v(base).pnl,
              wholeRunDelta: x.net - base.net,
              dd: x.dd
            };
          })
        };
      })
    }
  };

  fs.mkdirSync(outDir, { recursive: true });

  for (const detail of details) {
    const name = label(detail.record.spec).replace(/[^A-Za-z0-9.+-]+/g, '_');
    const dir = path.join(outDir, name);

    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'lots.csv'), toCsv(detail.lots));
    fs.writeFileSync(path.join(dir, 'transitions.csv'), toCsv(detail.transitions as never));
    fs.writeFileSync(path.join(dir, 'opportunities.csv'), toCsv(detail.opportunities as never));
    fs.writeFileSync(path.join(dir, 'refused-signals.csv'), toCsv(detail.refused));
    fs.writeFileSync(path.join(dir, 'daily-equity.csv'), toCsv(detail.daily));
  }

  fs.writeFileSync(path.join(outDir, 'd1-stress-validation.csv'), toCsv(pairedValidation));
  writeJson(outFile, out);
  seal(outFile, 'one-time validation on FULL');
  log(
    `validation: ${out.rows.map((r) => `${r.label} 2025–26 ${r.validation.pnl.toFixed(2)} (Δ ${r.validation.delta.toFixed(2)}, late ${r.validation.lateEntered})`).join('; ')}`
  );

  return out;
};
